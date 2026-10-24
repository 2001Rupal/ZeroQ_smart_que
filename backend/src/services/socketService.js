const { Server } = require('socket.io');
const Store = require('../models/Store');
const Token = require('../models/Token');
const { sendWhatsAppAlert } = require('./whatsappService');
const { sendSMS } = require('./smsService');
const { dispatchTurnAlert } = require('./notificationService');
const { getQueueState, getTokenStatus } = require('./queueEngine');
const config = require('../config/environment');

let io = null;

function initSocket(server, allowedOrigins = '*') {
  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    // Join store room
    socket.on('join_store', async (storeId) => {
      if (!storeId) return;
      const room = `store:${storeId}`;
      socket.join(room);
      // Immediately push current queue state to this client
      try {
        const state = await getQueueState(storeId);
        socket.emit('QUEUE_STATE_CHANGED', state);
      } catch (err) {
        console.error('[Socket] Error sending initial store state:', err.message);
      }
    });

    // Join token room
    socket.on('join_token', async (tokenUuid) => {
      if (!tokenUuid) return;
      const room = `token:${tokenUuid}`;
      socket.join(room);
      try {
        const status = await getTokenStatus(tokenUuid);
        if (status) {
          socket.emit('TICKET_UPDATED', status);
        }
      } catch (err) {
        console.error('[Socket] Error sending initial token status:', err.message);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

function getIo() {
  return io;
}

/**
 * Broadcast store queue state change to room store:<storeId>
 * and push ticket updates to all waiting / active tokens in this store
 */
async function broadcastStoreState(storeId) {
  if (!io) return;
  try {
    const queueState = await getQueueState(storeId);
    io.to(`store:${storeId}`).emit('QUEUE_STATE_CHANGED', queueState);

    // Also dispatch TICKET_UPDATED to tokens currently active/waiting in this store
    const activeTokens = await Token.find({
      storeId,
      status: { $in: ['WAITING', 'CALLED', 'SERVING'] }
    }).select('uuid');

    for (const t of activeTokens) {
      const status = await getTokenStatus(t.uuid);
      if (status) {
        io.to(`token:${t.uuid}`).emit('TICKET_UPDATED', status);
      }
    }
  } catch (err) {
    console.error('[Socket] broadcastStoreState error:', err.message);
  }
}

/**
 * Broadcast call event to store room (audio chime & flashing banner)
 * and update the specific customer's ticket
 */
async function broadcastCallEvent(storeId, tokenDoc, counterName, counterNumber) {
  if (!io) return;
  try {
    const callPayload = {
      tokenNumber: tokenDoc.tokenNumber,
      counterName,
      counterNumber,
      customerName: tokenDoc.customerName,
      uuid: tokenDoc.uuid
    };

    // Broadcast to store TV / counter dashboards
    io.to(`store:${storeId}`).emit('TOKEN_CALLED', callPayload);

    // Broadcast updated ticket to customer room
    const ticketStatus = await getTokenStatus(tokenDoc.uuid);
    io.to(`token:${tokenDoc.uuid}`).emit('TICKET_UPDATED', ticketStatus);

    // Refresh overall store state for TV & counters
    await broadcastStoreState(storeId);
  } catch (err) {
    console.error('[Socket] broadcastCallEvent error:', err.message);
  }
}

/**
 * Section 8: Omnichannel Customer Turn Alert Dispatcher
 */
async function dispatchCustomerTurnAlert(storeId, token, counterName) {
  try {
    const store = await Store.findById(storeId);
    if (!store) return;

    const contact = token.contactType === 'EMAIL' ? token.customerEmail : token.customerPhone;
    if (!contact) return;

    const frontendBaseUrl = config.frontendUrl || 'http://localhost:3000';
    const tokenDisplay = token.tokenCode || `#${token.tokenNumber}`;
    const webLink = `${frontendBaseUrl}/ticket/${token.uuid}`;

    // 1. Dispatch Turn Alert via SMS or Email
    const result = await dispatchTurnAlert(contact, {
      customerName: token.customerName,
      tokenCode: tokenDisplay,
      counterName,
      webLink
    });

    if (result && result.success) {
      await Token.findByIdAndUpdate(token._id, {
        $push: {
          notificationsSent: {
            channel: token.contactType === 'EMAIL' ? 'EMAIL' : 'SMS',
            event: 'CALLED',
            status: 'SENT',
            timestamp: new Date()
          }
        }
      });
    }

    // 2. Dispatch WhatsApp in parallel if enabled and contact is a phone number
    if (store.settings?.whatsappEnabled && token.contactType !== 'EMAIL' && token.customerPhone) {
      const cleanPhone = token.customerPhone.replace(/[^\d+]/g, '');
      sendWhatsAppAlert(cleanPhone, {
        customerName: token.customerName,
        tokenNumber: token.tokenNumber,
        counterName
      }).catch(err => console.warn('[WhatsApp Notice]', err.message));
    }
  } catch (err) {
    console.error('[Notification Dispatch] Error:', err.message);
  }
}

module.exports = {
  initSocket,
  getIo,
  broadcastStoreState,
  broadcastCallEvent,
  dispatchCustomerTurnAlert
};
