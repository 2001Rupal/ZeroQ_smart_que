const http = require('http');
const app = require('./app');
const config = require('./config/environment');
const { connectDatabase } = require('./config/database');
const { initSocket } = require('./services/socketService');
const { initKeepAlive } = require('./services/keepAliveService');
const { initSupabase } = require('./config/supabase');
const { expireInactiveTokens } = require('./services/queueEngine');
const { broadcastStoreState } = require('./services/socketService');
const Store = require('./models/Store');
const { seedDemoStore } = require('./controllers/storeController');

const server = http.createServer(app);

// Initialize Socket.io with HTTP server
initSocket(server, '*');

// Initialize Supabase Admin Client
initSupabase();

/**
 * Layer 3: Auto-Timer Backup Background Worker
 * Scans every 30s and automatically marks inactive called tokens as EXPIRED
 */
function startAutoTimerWorker() {
  setInterval(async () => {
    try {
      const expiredTokens = await expireInactiveTokens(null, 10);
      if (expiredTokens.length > 0) {
        const storeIds = [...new Set(expiredTokens.map(t => t.storeId.toString()))];
        for (const sId of storeIds) {
          await broadcastStoreState(sId);
        }
      }
    } catch (err) {
      console.warn('[AutoTimer Worker] Error checking expired tokens:', err.message);
    }
  }, 30000);
}

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase(config.mongoUri);

    // Auto-seed default store if database is empty on fresh deployment
    const storeCount = await Store.countDocuments({ slug: 'express-store' });
    if (storeCount === 0) {
      console.log('[Bootstrap] No default store found. Auto-seeding express-store for instant deployment...');
      try {
        await seedDemoStore({ query: {} }, { status: () => ({ json: () => {} }) });
        console.log('[Bootstrap] Successfully auto-seeded demo store.');
      } catch (seedErr) {
        console.warn('[Bootstrap Warning] Auto-seed failed (ignored):', seedErr.message);
      }
    }

    server.listen(config.port, () => {
      console.log(`====================================================`);
      console.log(` 🚀 Virtual QR Queue Backend Running on Port ${config.port}`);
      console.log(` 🌐 Environment: ${config.nodeEnv}`);
      console.log(` ⚡ WebSocket: Enabled (Socket.io)`);
      console.log(` 📡 Supabase Realtime: Ready`);
      console.log(` ⏱️ Auto-Timer Backup Worker: Active (30s interval)`);
      console.log(` 💾 Database: Connected to ${config.mongoUri}`);
      console.log(`====================================================`);

      // Initialize Keep-Alive self-ping to prevent cloud idle spin-down
      initKeepAlive();

      // Start Layer 3 Auto-Timer Backup
      startAutoTimerWorker();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { server, startServer };
