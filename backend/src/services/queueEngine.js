const { v4: uuidv4 } = require('uuid');
const DailySequence = require('../models/DailySequence');
const Token = require('../models/Token');
const Counter = require('../models/Counter');
const Store = require('../models/Store');
const { getSupabase } = require('../config/supabase');
const {
  isEmail,
  dispatchPassConfirmation,
  dispatchNearTurnAlert,
  dispatchExistingPassReminder
} = require('./notificationService');

/**
 * Returns YYYY-MM-DD date key in given timezone
 */
function getDateKey(timezone = 'Asia/Kolkata') {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
}

let cachedSupabaseStoreId = null;

async function getSupabaseStoreId(supabase) {
  if (cachedSupabaseStoreId) return cachedSupabaseStoreId;
  try {
    const { data } = await supabase.from('stores').select('id').limit(1).single();
    if (data?.id) {
      cachedSupabaseStoreId = data.id;
    }
  } catch (_) {}
  return cachedSupabaseStoreId;
}

/**
 * Sync Token state to Supabase PostgreSQL table (triggers Supabase Realtime)
 */
async function syncTokenToSupabase(tokenDoc) {
  const supabase = getSupabase();
  if (!supabase || !tokenDoc) return;
  try {
    const supabaseStoreId = await getSupabaseStoreId(supabase);

    const payload = {
      uuid: tokenDoc.uuid,
      store_id: supabaseStoreId,
      date_key: tokenDoc.dateKey,
      token_number: tokenDoc.tokenNumber,
      token_code: tokenDoc.tokenCode || `A-${String(tokenDoc.tokenNumber).padStart(2, '0')}`,
      service_type: tokenDoc.serviceType || 'GENERAL',
      priority: Boolean(tokenDoc.priority),
      customer_name: tokenDoc.customerName,
      customer_phone: tokenDoc.customerPhone,
      status: tokenDoc.status,
      queue_position: Number(tokenDoc.queuePosition),
      snooze_count: tokenDoc.snoozeCount || 0,
      hold_until: tokenDoc.holdUntil || null,
      notifications_sent: tokenDoc.notificationsSent || [],
      called_at: tokenDoc.calledAt || null,
      completed_at: tokenDoc.completedAt || null
    };

    const { error } = await supabase
      .from('tokens')
      .upsert(payload, { onConflict: 'uuid' });

    if (error) {
      console.warn('[Supabase Realtime Sync] Upsert notice:', error.message);
    } else {
      console.log(`[Supabase Realtime Sync] Token ${tokenDoc.tokenCode} synced (${tokenDoc.status})`);
    }
  } catch (err) {
    console.warn('[Supabase Realtime Sync] Error:', err.message);
  }
}

/**
 * Check if customer already has an active token for today
 * Status in ['WAITING', 'CALLED', 'SERVING']
 */
async function findActiveCustomerToken(storeId, contact, timezone = 'Asia/Kolkata') {
  const dateKey = getDateKey(timezone);

  const query = {
    storeId,
    dateKey,
    status: { $in: ['WAITING', 'CALLED', 'SERVING'] }
  };

  if (isEmail(contact)) {
    query.customerEmail = contact.trim().toLowerCase();
  } else {
    query.customerPhone = contact.replace(/[^\d+]/g, '');
  }

  const activeToken = await Token.findOne(query).populate('assignedCounterId');
  return activeToken;
}

/**
 * 1. Smart Token Issuance with De-duplication Check & Notification #1 (SMS or Email)
 */
async function issueOrRetrieveToken(storeId, customerName, contact, timezone = 'Asia/Kolkata', serviceType = 'GENERAL', frontendBaseUrl = 'http://localhost:3000') {
  const dateKey = getDateKey(timezone);
  const emailContact = isEmail(contact);
  const cleanContact = emailContact ? contact.trim().toLowerCase() : contact.replace(/[^\d+]/g, '');

  // 1. De-duplication Check: Active Token Exists for Today?
  const existingToken = await findActiveCustomerToken(storeId, cleanContact, timezone);
  if (existingToken) {
    const webLink = `${frontendBaseUrl}/ticket/${existingToken.uuid}`;
    
    // Send reminder via SMS or Email
    dispatchExistingPassReminder(cleanContact, {
      customerName: existingToken.customerName,
      tokenCode: existingToken.tokenCode || `#${existingToken.tokenNumber}`,
      webLink
    }).catch(err => console.warn('[Existing Pass Reminder] Error:', err.message));

    // Ensure synced to Supabase
    syncTokenToSupabase(existingToken);

    return { token: existingToken, isExisting: true };
  }

  // 2. NO: Generate New Token
  // Atomic increment of daily sequential number
  const seqDoc = await DailySequence.findOneAndUpdate(
    { storeId, dateKey },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const tokenNumber = seqDoc.seq;

  // Format Token Code Prefix:
  const prefixMap = {
    GENERAL: 'A',
    BILLING: 'B',
    PHARMACY: 'P',
    PRIORITY: 'S'
  };
  const prefix = prefixMap[serviceType] || 'A';
  const tokenCode = `${prefix}-${String(tokenNumber).padStart(2, '0')}`;
  const isPriority = serviceType === 'PRIORITY';

  // Smart Queue Position Calculation
  let nextQueuePosition;
  if (isPriority) {
    const waitingTokens = await Token.find({ storeId, dateKey, status: 'WAITING' })
      .sort({ queuePosition: 1 })
      .limit(2);

    if (waitingTokens.length === 0) {
      nextQueuePosition = 100;
    } else if (waitingTokens.length === 1) {
      nextQueuePosition = waitingTokens[0].queuePosition + 50;
    } else {
      nextQueuePosition = (waitingTokens[0].queuePosition + waitingTokens[1].queuePosition) / 2;
    }
  } else {
    const highestToken = await Token.findOne({ storeId, dateKey })
      .sort({ queuePosition: -1 })
      .select('queuePosition');

    nextQueuePosition = highestToken ? highestToken.queuePosition + 100 : 100;
  }

  // Persist new token
  const token = await Token.create({
    uuid: uuidv4(),
    storeId,
    dateKey,
    tokenNumber,
    tokenCode,
    serviceType,
    priority: isPriority,
    customerName,
    customerPhone: emailContact ? '' : cleanContact,
    customerEmail: emailContact ? cleanContact : null,
    contactType: emailContact ? 'EMAIL' : 'PHONE',
    status: 'WAITING',
    queuePosition: nextQueuePosition,
    notificationsSent: []
  });

  // 3. Send Notification #1 (SMS #1 or Email #1)
  const webLink = `${frontendBaseUrl}/ticket/${token.uuid}`;
  dispatchPassConfirmation(cleanContact, {
    customerName,
    tokenCode,
    webLink
  }).then((res) => {
    if (res.success) {
      Token.findByIdAndUpdate(token._id, {
        $push: {
          notificationsSent: {
            channel: emailContact ? 'EMAIL' : 'SMS',
            event: 'TOKEN_CREATED',
            status: 'SENT',
            timestamp: new Date()
          }
        }
      }).exec();
    }
  }).catch(err => console.warn('[Notification #1 Error]:', err.message));

  // Sync to Supabase Realtime
  syncTokenToSupabase(token);

  return { token, isExisting: false };
}

/**
 * 2. Multi-Counter Mutual Exclusion Lock (Single Call)
 */
async function callNextToken(storeId, counterId, dateKey = null) {
  if (!dateKey) {
    const store = await Store.findById(storeId);
    dateKey = getDateKey(store?.operatingHours?.timezone || 'Asia/Kolkata');
  }

  const now = new Date();
  // Atomically claim the lowest queuePosition token in WAITING state whose hold period (if any) has expired
  const token = await Token.findOneAndUpdate(
    {
      storeId,
      dateKey,
      status: 'WAITING',
      $or: [{ holdUntil: null }, { holdUntil: { $lte: now } }]
    },
    {
      $set: {
        status: 'CALLED',
        assignedCounterId: counterId,
        calledAt: now
      }
    },
    {
      sort: { queuePosition: 1 },
      new: true
    }
  );

  if (!token) return null;

  await Counter.findByIdAndUpdate(counterId, { currentServingToken: token._id });
  syncTokenToSupabase(token);

  return token;
}

/**
 * 3. Layer 2: Shopkeeper "Call Next Batch" (1-Click Action, NO Pop-up)
 * Atomically claims up to `batchSize` tokens
 */
async function callNextBatch(storeId, counterId, batchSize = 3, dateKey = null) {
  if (!dateKey) {
    const store = await Store.findById(storeId);
    dateKey = getDateKey(store?.operatingHours?.timezone || 'Asia/Kolkata');
  }

  const claimedTokens = [];
  const now = new Date();

  for (let i = 0; i < batchSize; i++) {
    const token = await Token.findOneAndUpdate(
      {
        storeId,
        dateKey,
        status: 'WAITING',
        $or: [{ holdUntil: null }, { holdUntil: { $lte: now } }]
      },
      {
        $set: {
          status: 'CALLED',
          assignedCounterId: counterId,
          calledAt: now
        }
      },
      {
        sort: { queuePosition: 1 },
        new: true
      }
    );

    if (!token) break; // No more waiting tokens
    claimedTokens.push(token);
    syncTokenToSupabase(token);
  }

  if (claimedTokens.length > 0) {
    // Set the first of the batch as active on counter
    await Counter.findByIdAndUpdate(counterId, { currentServingToken: claimedTokens[0]._id });
  }

  return claimedTokens;
}

/**
 * 4. Snooze Token (Staff Action)
 */
async function snoozeToken(tokenId, storeId, dateKey = null) {
  const targetToken = await Token.findById(tokenId);
  if (!targetToken || targetToken.status !== 'CALLED') {
    throw new Error('Token must be in CALLED state to snooze');
  }

  const effectiveDateKey = dateKey || targetToken.dateKey;

  const nextWaitingTokens = await Token.find({
    storeId,
    dateKey: effectiveDateKey,
    status: 'WAITING'
  })
    .sort({ queuePosition: 1 })
    .limit(2);

  let newQueuePosition;
  if (nextWaitingTokens.length === 0) {
    newQueuePosition = targetToken.queuePosition;
  } else if (nextWaitingTokens.length === 1) {
    newQueuePosition = nextWaitingTokens[0].queuePosition + 50;
  } else {
    const secondToken = nextWaitingTokens[1];
    const thirdToken = await Token.findOne({
      storeId,
      dateKey: effectiveDateKey,
      status: 'WAITING',
      queuePosition: { $gt: secondToken.queuePosition }
    }).sort({ queuePosition: 1 });

    if (thirdToken) {
      newQueuePosition = (secondToken.queuePosition + thirdToken.queuePosition) / 2;
    } else {
      newQueuePosition = secondToken.queuePosition + 50;
    }
  }

  targetToken.status = 'WAITING';
  targetToken.queuePosition = newQueuePosition;
  targetToken.snoozeCount += 1;
  targetToken.assignedCounterId = null;
  targetToken.holdUntil = null;
  await targetToken.save();

  await Counter.updateOne(
    { currentServingToken: targetToken._id },
    { currentServingToken: null }
  );

  syncTokenToSupabase(targetToken);
  return targetToken;
}

/**
 * 5. Layer 1: Customer Action - 5 Min Hold
 * Customer temporarily delays their turn by 5 minutes and shifts 2 spots back
 */
async function customerHoldToken(tokenUuid, holdMinutes = 5) {
  const targetToken = await Token.findOne({ uuid: tokenUuid });
  if (!targetToken) {
    throw new Error('Token not found');
  }

  if (!['WAITING', 'CALLED'].includes(targetToken.status)) {
    throw new Error('Can only hold tokens in WAITING or CALLED status');
  }

  // Shift 2 spots back in waiting line
  const nextWaitingTokens = await Token.find({
    storeId: targetToken.storeId,
    dateKey: targetToken.dateKey,
    status: 'WAITING',
    _id: { $ne: targetToken._id }
  })
    .sort({ queuePosition: 1 })
    .limit(2);

  let newQueuePosition;
  if (nextWaitingTokens.length === 0) {
    newQueuePosition = targetToken.queuePosition + 50;
  } else if (nextWaitingTokens.length === 1) {
    newQueuePosition = nextWaitingTokens[0].queuePosition + 50;
  } else {
    const secondToken = nextWaitingTokens[1];
    newQueuePosition = secondToken.queuePosition + 50;
  }

  targetToken.status = 'WAITING';
  targetToken.queuePosition = newQueuePosition;
  targetToken.snoozeCount += 1;
  targetToken.assignedCounterId = null;
  targetToken.holdUntil = new Date(Date.now() + holdMinutes * 60000);
  await targetToken.save();

  await Counter.updateOne(
    { currentServingToken: targetToken._id },
    { currentServingToken: null }
  );

  syncTokenToSupabase(targetToken);
  return targetToken;
}

/**
 * 6. Complete Token (Staff or Customer "Done" Action)
 */
async function completeToken(tokenId) {
  const token = await Token.findById(tokenId);
  if (!token) {
    throw new Error('Token not found');
  }

  token.status = 'COMPLETED';
  token.completedAt = new Date();
  await token.save();

  await Counter.updateOne(
    { currentServingToken: token._id },
    { currentServingToken: null }
  );

  syncTokenToSupabase(token);
  return token;
}

/**
 * Customer Self-Complete ("Done" button)
 */
async function customerCompleteToken(tokenUuid) {
  const token = await Token.findOne({ uuid: tokenUuid });
  if (!token) {
    throw new Error('Token not found');
  }
  return completeToken(token._id);
}

/**
 * Skip Token
 */
async function skipToken(tokenId) {
  const token = await Token.findById(tokenId);
  if (!token) {
    throw new Error('Token not found');
  }

  token.status = 'SKIPPED';
  token.completedAt = new Date();
  await token.save();

  await Counter.updateOne(
    { currentServingToken: token._id },
    { currentServingToken: null }
  );

  syncTokenToSupabase(token);
  return token;
}

/**
 * Cancel Token
 */
async function cancelToken(tokenUuid) {
  const token = await Token.findOne({ uuid: tokenUuid });
  if (!token) {
    throw new Error('Token not found');
  }

  if (['COMPLETED', 'SKIPPED', 'CANCELLED', 'EXPIRED'].includes(token.status)) {
    return token;
  }

  token.status = 'CANCELLED';
  await token.save();

  if (token.assignedCounterId) {
    await Counter.updateOne(
      { _id: token.assignedCounterId, currentServingToken: token._id },
      { currentServingToken: null }
    );
  }

  syncTokenToSupabase(token);
  return token;
}

/**
 * 7. Layer 3: Auto-Timer Backup
 * Timeout automatically marks inactive tokens in CALLED status as EXPIRED
 */
async function expireInactiveTokens(storeId = null, timeoutMinutes = 10) {
  const cutoffTime = new Date(Date.now() - timeoutMinutes * 60000);
  const query = {
    status: 'CALLED',
    calledAt: { $lt: cutoffTime }
  };

  if (storeId) {
    query.storeId = storeId;
  }

  const inactiveTokens = await Token.find(query);
  const expiredTokens = [];

  for (const token of inactiveTokens) {
    token.status = 'EXPIRED';
    token.completedAt = new Date();
    await token.save();

    // Release counter
    await Counter.updateOne(
      { currentServingToken: token._id },
      { currentServingToken: null }
    );

    syncTokenToSupabase(token);
    expiredTokens.push(token);
    console.log(`⏱️ [Auto-Timer] Token ${token.tokenCode} expired after ${timeoutMinutes} min inactivity.`);
  }

  return expiredTokens;
}

/**
 * 8. Queue Progress: SMS #2 (Final Call Alert when 3–5 customers left)
 */
async function checkAndDispatchNearTurnAlerts(storeId, frontendBaseUrl = 'http://localhost:3000') {
  try {
    const store = await Store.findById(storeId);
    if (!store) return;
    const dateKey = getDateKey(store?.operatingHours?.timezone || 'Asia/Kolkata');

    // Get all WAITING tokens ordered by queuePosition
    const waitingTokens = await Token.find({
      storeId,
      dateKey,
      status: 'WAITING'
    }).sort({ queuePosition: 1 });

    for (let i = 0; i < waitingTokens.length; i++) {
      const token = waitingTokens[i];
      const peopleAhead = i; // 0 means next in line, 1 means 1 person ahead, etc.

      // Target customers with 3 to 5 people ahead (or <= 3)
      if (peopleAhead >= 1 && peopleAhead <= 5) {
        const alreadyNotified = (token.notificationsSent || []).some(n => n.event === 'NEAR_TURN');

        if (!alreadyNotified) {
          const webLink = `${frontendBaseUrl}/ticket/${token.uuid}`;
          const contact = token.contactType === 'EMAIL' ? token.customerEmail : token.customerPhone;

          if (contact) {
            await dispatchNearTurnAlert(contact, {
              customerName: token.customerName,
              tokenCode: token.tokenCode || `#${token.tokenNumber}`,
              peopleAhead,
              webLink
            });

            token.notificationsSent.push({
              channel: token.contactType === 'EMAIL' ? 'EMAIL' : 'SMS',
              event: 'NEAR_TURN',
              status: 'SENT',
              timestamp: new Date()
            });
            await token.save();
            syncTokenToSupabase(token);
            console.log(`📢 [${token.contactType === 'EMAIL' ? 'Email' : 'SMS'} #2 Final Call Alert] Dispatched to ${contact} (${peopleAhead} ahead)`);
          }
        }
      }
    }
  } catch (err) {
    console.error('[NearTurnAlerts] Error checking queue progress:', err.message);
  }
}

/**
 * Aggregated Queue State
 */
async function getQueueState(storeId, dateKey = null) {
  if (!dateKey) {
    const store = await Store.findById(storeId);
    dateKey = getDateKey(store?.operatingHours?.timezone || 'Asia/Kolkata');
  }

  const counters = await Counter.find({ storeId, isActive: { $ne: false } })
    .populate('currentServingToken')
    .sort({ counterNumber: 1 });

  const activeServing = counters
    .filter(c => c.currentServingToken && ['CALLED', 'SERVING'].includes(c.currentServingToken.status))
    .map(c => ({
      counterId: c._id,
      counterNumber: c.counterNumber,
      counterName: c.counterName,
      tokenNumber: c.currentServingToken.tokenNumber,
      tokenCode: c.currentServingToken.tokenCode || `A-${String(c.currentServingToken.tokenNumber).padStart(2, '0')}`,
      serviceType: c.currentServingToken.serviceType || 'GENERAL',
      priority: c.currentServingToken.priority || false,
      customerName: c.currentServingToken.customerName,
      tokenUuid: c.currentServingToken.uuid,
      calledAt: c.currentServingToken.calledAt
    }));

  const upcomingRaw = await Token.find({
    storeId,
    dateKey,
    status: 'WAITING'
  })
    .sort({ queuePosition: 1 })
    .limit(5);

  const upcomingQueue = upcomingRaw.map((t, idx) => ({
    tokenNumber: t.tokenNumber,
    tokenCode: t.tokenCode || `A-${String(t.tokenNumber).padStart(2, '0')}`,
    serviceType: t.serviceType || 'GENERAL',
    priority: t.priority || false,
    customerName: t.customerName,
    queuePosition: idx + 1,
    uuid: t.uuid,
    snoozeCount: t.snoozeCount,
    holdUntil: t.holdUntil
  }));

  const totalWaiting = await Token.countDocuments({
    storeId,
    dateKey,
    status: 'WAITING'
  });

  return {
    activeServing,
    upcomingQueue,
    totalWaiting
  };
}

/**
 * Individual Token Status
 */
async function getTokenStatus(tokenUuid) {
  const token = await Token.findOne({ uuid: tokenUuid }).populate('assignedCounterId');
  if (!token) return null;

  let peopleAhead = 0;
  if (token.status === 'WAITING') {
    peopleAhead = await Token.countDocuments({
      storeId: token.storeId,
      dateKey: token.dateKey,
      status: 'WAITING',
      queuePosition: { $lt: token.queuePosition }
    });
  }

  const avgServingMinutesPerPerson = 3;
  const estimatedWaitMinutes = Math.max(1, (peopleAhead + 1) * avgServingMinutesPerPerson);

  return {
    uuid: token.uuid,
    tokenNumber: token.tokenNumber,
    tokenCode: token.tokenCode || `A-${String(token.tokenNumber).padStart(2, '0')}`,
    serviceType: token.serviceType || 'GENERAL',
    priority: token.priority || false,
    customerName: token.customerName,
    status: token.status,
    peopleAhead,
    assignedCounter: token.assignedCounterId ? token.assignedCounterId.counterName : null,
    assignedCounterNumber: token.assignedCounterId ? token.assignedCounterId.counterNumber : null,
    estimatedWaitMinutes,
    calledAt: token.calledAt,
    snoozeCount: token.snoozeCount,
    holdUntil: token.holdUntil,
    storeId: token.storeId
  };
}

async function issueToken(storeId, customerName, customerPhone, timezone = 'Asia/Kolkata', serviceType = 'GENERAL', frontendBaseUrl = 'http://localhost:3000') {
  const result = await issueOrRetrieveToken(storeId, customerName, customerPhone, timezone, serviceType, frontendBaseUrl);
  return result.token;
}

module.exports = {
  getDateKey,
  findActiveCustomerToken,
  issueToken,
  issueOrRetrieveToken,
  callNextToken,
  callNextBatch,
  snoozeToken,
  customerHoldToken,
  completeToken,
  customerCompleteToken,
  skipToken,
  cancelToken,
  expireInactiveTokens,
  checkAndDispatchNearTurnAlerts,
  getQueueState,
  getTokenStatus,
  syncTokenToSupabase
};
