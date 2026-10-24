const axios = require('axios');

/**
 * Keep-Alive Service for Free-Tier Cloud Deployments (Render, Railway, Glitch, etc.)
 * Prevents the backend server from going to sleep after 15 minutes of inactivity
 * by periodically sending lightweight self-healthcheck pings every 12 minutes.
 */
function initKeepAlive() {
  const serverUrl = process.env.SERVER_URL || process.env.RENDER_EXTERNAL_URL;

  if (!serverUrl) {
    console.log('[KeepAlive] No SERVER_URL / RENDER_EXTERNAL_URL configured. Self-ping idle guard disabled for local development.');
    return;
  }

  const pingUrl = `${serverUrl.replace(/\/$/, '')}/health`;
  const PING_INTERVAL_MS = 12 * 60 * 1000; // 12 minutes

  console.log(`[KeepAlive] Initialized self-ping idle guard for: ${pingUrl} (every 12 minutes)`);

  // Initial delayed ping after 1 minute
  setTimeout(() => {
    pingServer(pingUrl);
  }, 60 * 1000);

  // Periodic interval
  setInterval(() => {
    pingServer(pingUrl);
  }, PING_INTERVAL_MS);
}

async function pingServer(url) {
  try {
    const res = await axios.get(url, { timeout: 10000 });
    console.log(`[KeepAlive - ${new Date().toLocaleTimeString()}] Pinged ${url} - Status: ${res.status} (Server kept awake)`);
  } catch (err) {
    console.warn(`[KeepAlive - Warning] Self-ping failed for ${url}:`, err.message);
  }
}

module.exports = {
  initKeepAlive
};
