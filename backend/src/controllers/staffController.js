const Counter = require('../models/Counter');
const Token = require('../models/Token');
const Store = require('../models/Store');
const config = require('../config/environment');
const {
  callNextToken,
  callNextBatch,
  snoozeToken,
  completeToken,
  skipToken,
  getQueueState,
  checkAndDispatchNearTurnAlerts
} = require('../services/queueEngine');
const {
  broadcastStoreState,
  broadcastCallEvent,
  dispatchCustomerTurnAlert
} = require('../services/socketService');

/**
 * POST /api/v1/staff/call-next
 * Single call: { counterId }
 */
async function callNext(req, res) {
  try {
    const { counterId } = req.body;
    if (!counterId) {
      return res.status(400).json({ error: 'counterId is required' });
    }

    const counter = await Counter.findById(counterId);
    if (!counter) {
      return res.status(404).json({ error: 'Counter not found' });
    }

    const token = await callNextToken(counter.storeId, counterId);
    if (!token) {
      await Counter.findByIdAndUpdate(counterId, { currentServingToken: null });
      return res.status(200).json({
        success: true,
        token: null,
        message: 'No waiting tokens in queue'
      });
    }

    // 1. Broadcast call event to lounge TV & counter dashboards
    await broadcastCallEvent(counter.storeId, token, counter.counterName, counter.counterNumber);

    // 2. Dispatch omnichannel turn alert (WhatsApp / SMS)
    dispatchCustomerTurnAlert(counter.storeId, token, counter.counterName).catch((err) => {
      console.error('[Notification Dispatch] Async alert error:', err.message);
    });

    // 3. Queue progress check: Send SMS #2 to upcoming waiting customers
    const frontendBaseUrl = config.frontendUrl || 'http://localhost:3000';
    checkAndDispatchNearTurnAlerts(counter.storeId, frontendBaseUrl).catch(() => {});

    return res.status(200).json({
      success: true,
      token,
      message: `Token #${token.tokenNumber} claimed for ${counter.counterName}`
    });
  } catch (error) {
    console.error('[staffController.callNext] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to call next token' });
  }
}

/**
 * POST /api/v1/staff/call-batch
 * Layer 2: Shopkeeper Action (Clicks: "Call Next Batch" ➔ 1-Click Action, NO Pop-up)
 */
async function callBatch(req, res) {
  try {
    const { counterId, batchSize = 3 } = req.body;
    if (!counterId) {
      return res.status(400).json({ error: 'counterId is required' });
    }

    const counter = await Counter.findById(counterId);
    if (!counter) {
      return res.status(404).json({ error: 'Counter not found' });
    }

    const validBatchSize = Math.min(Math.max(1, parseInt(batchSize, 10) || 3), 10);
    const tokens = await callNextBatch(counter.storeId, counterId, validBatchSize);

    if (!tokens || tokens.length === 0) {
      return res.status(200).json({
        success: true,
        tokens: [],
        message: 'No waiting tokens available for batch call'
      });
    }

    // Broadcast each called token and dispatch alerts
    for (const token of tokens) {
      await broadcastCallEvent(counter.storeId, token, counter.counterName, counter.counterNumber);
      dispatchCustomerTurnAlert(counter.storeId, token, counter.counterName).catch(() => {});
    }

    // Broadcast store state
    await broadcastStoreState(counter.storeId);

    // Check near-turn alerts
    const frontendBaseUrl = config.frontendUrl || 'http://localhost:3000';
    checkAndDispatchNearTurnAlerts(counter.storeId, frontendBaseUrl).catch(() => {});

    return res.status(200).json({
      success: true,
      tokens,
      count: tokens.length,
      message: `Batch of ${tokens.length} customer(s) called for ${counter.counterName}`
    });
  } catch (error) {
    console.error('[staffController.callBatch] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to call next batch' });
  }
}

/**
 * POST /api/v1/staff/snooze
 */
async function snooze(req, res) {
  try {
    const { tokenId } = req.body;
    if (!tokenId) {
      return res.status(400).json({ error: 'tokenId is required' });
    }

    const tokenDoc = await Token.findById(tokenId);
    if (!tokenDoc) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const updatedToken = await snoozeToken(tokenId, tokenDoc.storeId, tokenDoc.dateKey);

    await broadcastStoreState(tokenDoc.storeId);

    const frontendBaseUrl = config.frontendUrl || 'http://localhost:3000';
    checkAndDispatchNearTurnAlerts(tokenDoc.storeId, frontendBaseUrl).catch(() => {});

    return res.status(200).json({
      success: true,
      token: updatedToken,
      message: `Token #${updatedToken.tokenNumber} shifted 2 spots back in line`
    });
  } catch (error) {
    console.error('[staffController.snooze] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to snooze token' });
  }
}

/**
 * POST /api/v1/staff/complete
 */
async function complete(req, res) {
  try {
    const { tokenId } = req.body;
    if (!tokenId) {
      return res.status(400).json({ error: 'tokenId is required' });
    }

    const tokenDoc = await Token.findById(tokenId);
    if (!tokenDoc) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const completedToken = await completeToken(tokenId);

    await broadcastStoreState(tokenDoc.storeId);

    const frontendBaseUrl = config.frontendUrl || 'http://localhost:3000';
    checkAndDispatchNearTurnAlerts(tokenDoc.storeId, frontendBaseUrl).catch(() => {});

    return res.status(200).json({
      success: true,
      token: completedToken,
      message: `Token #${completedToken.tokenNumber} marked as completed`
    });
  } catch (error) {
    console.error('[staffController.complete] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to complete token' });
  }
}

/**
 * POST /api/v1/staff/skip
 */
async function skip(req, res) {
  try {
    const { tokenId } = req.body;
    if (!tokenId) {
      return res.status(400).json({ error: 'tokenId is required' });
    }

    const tokenDoc = await Token.findById(tokenId);
    if (!tokenDoc) {
      return res.status(404).json({ error: 'Token not found' });
    }

    const skippedToken = await skipToken(tokenId);

    await broadcastStoreState(tokenDoc.storeId);

    const frontendBaseUrl = config.frontendUrl || 'http://localhost:3000';
    checkAndDispatchNearTurnAlerts(tokenDoc.storeId, frontendBaseUrl).catch(() => {});

    return res.status(200).json({
      success: true,
      token: skippedToken,
      message: `Token #${skippedToken.tokenNumber} marked as skipped`
    });
  } catch (error) {
    console.error('[staffController.skip] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to skip token' });
  }
}

/**
 * GET /api/v1/staff/counter/:counterId
 */
async function getCounterDetails(req, res) {
  try {
    const { counterId } = req.params;
    const counter = await Counter.findById(counterId).populate('currentServingToken');
    if (!counter) {
      return res.status(404).json({ error: 'Counter not found' });
    }

    const store = await Store.findById(counter.storeId);
    const queueState = await getQueueState(counter.storeId);
    const allCounters = await Counter.find({ storeId: counter.storeId, isActive: true }).sort({ counterNumber: 1 });

    return res.status(200).json({
      counter,
      store,
      queueState,
      allCounters
    });
  } catch (error) {
    console.error('[staffController.getCounterDetails] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch counter details' });
  }
}

module.exports = {
  callNext,
  callBatch,
  snooze,
  complete,
  skip,
  getCounterDetails
};
