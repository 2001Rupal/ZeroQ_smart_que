const Store = require('../models/Store');
const Counter = require('../models/Counter');
const Token = require('../models/Token');
const { getQueueState, issueToken } = require('../services/queueEngine');
const { broadcastStoreState } = require('../services/socketService');

/**
 * GET /api/v1/stores
 */
async function getStores(req, res) {
  try {
    const stores = await Store.find().sort({ createdAt: -1 });
    return res.status(200).json(stores);
  } catch (error) {
    console.error('[storeController.getStores] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/v1/stores
 */
async function createStore(req, res) {
  try {
    const { slug, name, ownerPhone, operatingHours, settings } = req.body;
    if (!slug || !name || !ownerPhone) {
      return res.status(400).json({ error: 'slug, name, and ownerPhone are required' });
    }

    const existing = await Store.findOne({ slug });
    if (existing) {
      return res.status(409).json({ error: `Store with slug '${slug}' already exists` });
    }

    const store = await Store.create({
      slug: slug.toLowerCase().trim(),
      name: name.trim(),
      ownerPhone: ownerPhone.trim(),
      operatingHours: operatingHours || {},
      settings: settings || {}
    });

    // Automatically create default Counter 1
    await Counter.create({
      storeId: store._id,
      counterNumber: 1,
      counterName: 'Counter 1'
    });

    return res.status(201).json(store);
  } catch (error) {
    console.error('[storeController.createStore] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/v1/stores/:slug
 * Query param: includeInactive=true (for Admin management)
 */
async function getStoreBySlug(req, res) {
  try {
    const { slug } = req.params;
    const { includeInactive } = req.query;

    const store = await Store.findOne({ slug });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // Automatically ensure all counters are cleanly sequenced without gaps
    await reshuffleCounterNumbers(store._id);

    const counterFilter = { storeId: store._id };
    if (includeInactive !== 'true') {
      counterFilter.isActive = { $ne: false };
    }

    const counters = await Counter.find(counterFilter)
      .populate('currentServingToken')
      .sort({ counterNumber: 1 });

    const queueState = await getQueueState(store._id);

    return res.status(200).json({
      store,
      counters,
      queueState
    });
  } catch (error) {
    console.error('[storeController.getStoreBySlug] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Reshuffle counter numbers consecutively:
 * - Active counters are strictly numbered 1, 2, 3... without gaps.
 * - Inactive counters are sequenced after active counters.
 * - "Counter X" prefixes in counterName are synchronized to match the new number.
 */
async function reshuffleCounterNumbers(storeId) {
  try {
    const activeCounters = await Counter.find({ storeId, isActive: { $ne: false } }).sort({ counterNumber: 1, _id: 1 });
    const inactiveCounters = await Counter.find({ storeId, isActive: false }).sort({ counterNumber: 1, _id: 1 });

    const allOrdered = [...activeCounters, ...inactiveCounters];

    for (let i = 0; i < allOrdered.length; i++) {
      const c = allOrdered[i];
      const newNum = i + 1;
      let updatedName = c.counterName || `Counter ${newNum}`;

      if (/^Counter\s*\d+/i.test(updatedName)) {
        updatedName = updatedName.replace(/^Counter\s*\d+/i, `Counter ${newNum}`);
      }

      if (c.counterNumber !== newNum || c.counterName !== updatedName) {
        await Counter.findByIdAndUpdate(c._id, {
          counterNumber: newNum,
          counterName: updatedName
        });
      }
    }
  } catch (error) {
    console.error('[reshuffleCounterNumbers] Error reshuffling counters:', error);
  }
}

/**
 * POST /api/v1/stores/:slug/counters
 */
async function addCounter(req, res) {
  try {
    const { slug } = req.params;
    const { counterName, description } = req.body;

    const store = await Store.findOne({ slug });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const highestCounter = await Counter.findOne({ storeId: store._id }).sort({ counterNumber: -1 });
    const nextNumber = highestCounter ? highestCounter.counterNumber + 1 : 1;

    const counter = await Counter.create({
      storeId: store._id,
      counterNumber: nextNumber,
      counterName: counterName || `Counter ${nextNumber}`,
      description: description ? description.trim() : ''
    });

    await reshuffleCounterNumbers(store._id);
    await broadcastStoreState(store._id);

    return res.status(201).json(counter);
  } catch (error) {
    console.error('[storeController.addCounter] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * PATCH /api/v1/stores/:slug/counters/:counterId
 * Update counter name, description, and active status
 */
async function updateCounter(req, res) {
  try {
    const { slug, counterId } = req.params;
    const { counterName, description, isActive } = req.body;

    const store = await Store.findOne({ slug });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const counter = await Counter.findOne({ _id: counterId, storeId: store._id });
    if (!counter) {
      return res.status(404).json({ error: 'Counter not found' });
    }

    if (counterName !== undefined) counter.counterName = counterName.trim();
    if (description !== undefined) counter.description = description.trim();
    if (isActive !== undefined) {
      counter.isActive = Boolean(isActive);
      // If setting to inactive and currently serving a token, complete the token cleanly
      if (!counter.isActive && counter.currentServingToken) {
        await Token.findByIdAndUpdate(counter.currentServingToken, {
          status: 'COMPLETED',
          completedAt: new Date()
        });
        counter.currentServingToken = null;
      }
    }

    await counter.save();

    // Reshuffle counter numbers so active counters always remain consecutively 1, 2, 3...
    if (isActive !== undefined) {
      await reshuffleCounterNumbers(store._id);
    }

    await broadcastStoreState(store._id);

    const updated = await Counter.findById(counterId);
    return res.status(200).json({ success: true, counter: updated });
  } catch (error) {
    console.error('[storeController.updateCounter] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/v1/stores/:slug/counters/:counterId
 */
async function deleteCounter(req, res) {
  try {
    const { slug, counterId } = req.params;
    const store = await Store.findOne({ slug });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    const counter = await Counter.findOne({ _id: counterId, storeId: store._id });
    if (!counter) {
      return res.status(404).json({ error: 'Counter not found' });
    }

    if (counter.currentServingToken) {
      await Token.findByIdAndUpdate(counter.currentServingToken, {
        status: 'SKIPPED',
        completedAt: new Date()
      });
    }

    await Counter.findByIdAndDelete(counterId);

    // Reshuffle remaining counter numbers to close any gaps (e.g. 1, 2, 4 becomes 1, 2, 3)
    await reshuffleCounterNumbers(store._id);
    await broadcastStoreState(store._id);

    return res.status(200).json({ success: true, message: 'Counter deleted and numbers reshuffled successfully' });
  } catch (error) {
    console.error('[storeController.deleteCounter] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * PATCH /api/v1/stores/:slug/settings
 */
async function updateStoreSettings(req, res) {
  try {
    const { slug } = req.params;
    const { snoozeOffset, smsEnabled, whatsappEnabled, walletBalance } = req.body;

    const store = await Store.findOne({ slug });
    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    if (snoozeOffset !== undefined) store.settings.snoozeOffset = snoozeOffset;
    if (smsEnabled !== undefined) store.settings.smsEnabled = smsEnabled;
    if (whatsappEnabled !== undefined) store.settings.whatsappEnabled = whatsappEnabled;
    if (walletBalance !== undefined) store.settings.walletBalance = walletBalance;

    await store.save();
    return res.status(200).json(store);
  } catch (error) {
    console.error('[storeController.updateStoreSettings] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/v1/stores/seed
 * Seed a complete demo store with multiple counters & queue tokens
 */
async function seedDemoStore(req, res) {
  try {
    const slug = 'express-store';
    let store = await Store.findOne({ slug });

    if (!store) {
      store = await Store.create({
        slug,
        name: 'Express Health & Pharmacy',
        ownerPhone: '+1234567890',
        operatingHours: {
          openTime: '08:00',
          closeTime: '22:00',
          timezone: 'Asia/Kolkata'
        },
        settings: {
          snoozeOffset: 2,
          smsEnabled: true,
          whatsappEnabled: true,
          walletBalance: 15.00
        }
      });
    }

    // Ensure 3 counters exist
    const counterConfigs = [
      { num: 1, name: 'Billing 1' },
      { num: 2, name: 'Billing 2' },
      { num: 3, name: 'Prescription Pickup' }
    ];

    const counters = [];
    for (const c of counterConfigs) {
      const counter = await Counter.findOneAndUpdate(
        { storeId: store._id, counterNumber: c.num },
        { $setOnInsert: { storeId: store._id, counterNumber: c.num, counterName: c.name } },
        { new: true, upsert: true }
      );
      counters.push(counter);
    }

    // Add 5 sample customers if queue has fewer than 2 waiting
    const waitingCount = await Token.countDocuments({ storeId: store._id, status: 'WAITING' });
    if (waitingCount < 2) {
      const demoUsers = [
        { name: 'Rahul Sharma', phone: '+919876543210', serviceType: 'BILLING' },
        { name: 'Neha Patel', phone: '+919876543211', serviceType: 'GENERAL' },
        { name: 'Vikram Singh', phone: '+919876543212', serviceType: 'PHARMACY' },
        { name: 'Ananya Roy', phone: '+919876543213', serviceType: 'PRIORITY' },
        { name: 'Suresh Kumar', phone: '+919876543214', serviceType: 'BILLING' }
      ];

      for (const user of demoUsers) {
        await issueToken(store._id, user.name, user.phone, store.operatingHours.timezone, user.serviceType);
      }
    }

    await broadcastStoreState(store._id);

    return res.status(200).json({
      message: 'Demo store ready!',
      store,
      counters
    });
  } catch (error) {
    console.error('[storeController.seedDemoStore] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getStores,
  createStore,
  getStoreBySlug,
  addCounter,
  updateCounter,
  deleteCounter,
  updateStoreSettings,
  seedDemoStore
};
