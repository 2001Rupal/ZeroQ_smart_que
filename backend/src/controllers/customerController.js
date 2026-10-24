const Store = require('../models/Store');
const Token = require('../models/Token');
const config = require('../config/environment');
const {
  issueOrRetrieveToken,
  getTokenStatus,
  cancelToken,
  customerHoldToken,
  customerCompleteToken,
  checkAndDispatchNearTurnAlerts
} = require('../services/queueEngine');
const { broadcastStoreState } = require('../services/socketService');
const {
  isEmail,
  sendContactOTP,
  verifyContactOTP
} = require('../services/notificationService');

// In-memory cache of contacts that successfully passed OTP verification: contactKey -> expiryTimestamp (15 mins)
const verifiedContacts = new Map();

/**
 * POST /api/v1/queue/register
 * Request body: { storeSlug, name, phone, serviceType }
 * Response: 201 Created / 200 OK with Token object and isExisting flag
 */
async function registerCustomer(req, res) {
  try {
    const { storeSlug, name, phone, email, contact, phoneOrEmail, serviceType, otpCode } = req.body;

    if (!storeSlug) {
      return res.status(400).json({ error: 'storeSlug is required' });
    }

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const rawContact = contact || phoneOrEmail || phone || email || '';
    const trimmedContact = typeof rawContact === 'string' ? rawContact.trim() : '';

    if (!trimmedName || trimmedName.length < 2) {
      return res.status(400).json({ error: 'Please enter a valid full name (at least 2 characters).' });
    }

    if (!/^[a-zA-Z\s.'-]+$/.test(trimmedName)) {
      return res.status(400).json({ error: 'Name should only contain letters and spaces.' });
    }

    if (!trimmedContact) {
      return res.status(400).json({ error: 'Please enter a valid mobile number or email address.' });
    }

    const emailMode = isEmail(trimmedContact);
    if (!emailMode) {
      const digitsOnly = trimmedContact.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number or valid email address.' });
      }
    }

    const contactKey = emailMode ? trimmedContact.toLowerCase() : trimmedContact.replace(/[^\d+]/g, '');
    const isAlreadyVerified = verifiedContacts.has(contactKey) && verifiedContacts.get(contactKey) > Date.now();

    // If an OTP code was provided with the registration, verify it (unless already verified via /otp/verify)
    if (otpCode && !isAlreadyVerified) {
      const verifyResult = await verifyContactOTP(trimmedContact, String(otpCode).trim());
      if (!verifyResult.success) {
        return res.status(400).json({ error: verifyResult.error || 'Invalid or expired verification code.' });
      }
    }

    // Clear verification cache entry after token processing
    verifiedContacts.delete(contactKey);

    const store = await Store.findOne({ slug: storeSlug });
    if (!store) {
      return res.status(404).json({ error: `Store with slug '${storeSlug}' not found` });
    }

    const validatedServiceType = ['GENERAL', 'BILLING', 'PHARMACY', 'PRIORITY'].includes(serviceType)
      ? serviceType
      : 'GENERAL';

    const frontendBaseUrl = config.frontendUrl || 'http://localhost:3000';

    // Atomic issuance with De-duplication check & SMS #1 or Email #1
    const { token, isExisting } = await issueOrRetrieveToken(
      store._id,
      trimmedName,
      trimmedContact,
      store.operatingHours?.timezone || 'Asia/Kolkata',
      validatedServiceType,
      frontendBaseUrl
    );

    // Broadcast state update to store room & sync clients
    await broadcastStoreState(store._id);

    // Check near-turn alerts for other waiting customers
    checkAndDispatchNearTurnAlerts(store._id, frontendBaseUrl).catch(err => {
      console.warn('[NearTurnAlert] Async check notice:', err.message);
    });

    const channelName = token.contactType === 'EMAIL' ? 'Email' : 'SMS';

    return res.status(isExisting ? 200 : 201).json({
      uuid: token.uuid,
      tokenNumber: token.tokenNumber,
      tokenCode: token.tokenCode,
      serviceType: token.serviceType,
      priority: token.priority,
      customerName: token.customerName,
      customerPhone: token.customerPhone,
      customerEmail: token.customerEmail,
      contactType: token.contactType,
      status: token.status,
      queuePosition: token.queuePosition,
      storeSlug: store.slug,
      storeName: store.name,
      isExisting: Boolean(isExisting),
      message: isExisting
        ? `Active token detected for today. Reopened existing pass and sent ${channelName} link.`
        : `Token issued successfully and ${channelName} #1 dispatched.`,
      createdAt: token.createdAt
    });
  } catch (error) {
    console.error('[customerController.registerCustomer] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to issue token' });
  }
}

/**
 * GET /api/v1/queue/status/:tokenUuid
 */
async function getCustomerStatus(req, res) {
  try {
    const { tokenUuid } = req.params;
    if (!tokenUuid) {
      return res.status(400).json({ error: 'tokenUuid is required' });
    }

    const status = await getTokenStatus(tokenUuid);
    if (!status) {
      return res.status(404).json({ error: 'Token not found' });
    }

    return res.status(200).json(status);
  } catch (error) {
    console.error('[customerController.getCustomerStatus] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to get token status' });
  }
}

/**
 * POST /api/v1/queue/hold
 * Layer 1 Customer Action: 5-minute hold (self-snooze)
 */
async function customerHold(req, res) {
  try {
    const { tokenUuid, holdMinutes } = req.body;
    if (!tokenUuid) {
      return res.status(400).json({ error: 'tokenUuid is required' });
    }

    const token = await customerHoldToken(tokenUuid, holdMinutes || 5);
    await broadcastStoreState(token.storeId);

    const frontendBaseUrl = config.frontendUrl || 'http://localhost:3000';
    checkAndDispatchNearTurnAlerts(token.storeId, frontendBaseUrl).catch(() => {});

    return res.status(200).json({
      success: true,
      message: `Token held for ${holdMinutes || 5} minutes and shifted 2 positions back.`,
      token
    });
  } catch (error) {
    console.error('[customerController.customerHold] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to hold token' });
  }
}

/**
 * POST /api/v1/queue/done
 * Layer 1 Customer Action: "Done" (self-complete)
 */
async function customerDone(req, res) {
  try {
    const { tokenUuid } = req.body;
    if (!tokenUuid) {
      return res.status(400).json({ error: 'tokenUuid is required' });
    }

    const token = await customerCompleteToken(tokenUuid);
    await broadcastStoreState(token.storeId);

    const frontendBaseUrl = config.frontendUrl || 'http://localhost:3000';
    checkAndDispatchNearTurnAlerts(token.storeId, frontendBaseUrl).catch(() => {});

    return res.status(200).json({
      success: true,
      message: 'Token marked as completed successfully.',
      token
    });
  } catch (error) {
    console.error('[customerController.customerDone] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to complete token' });
  }
}

/**
 * POST /api/v1/queue/cancel
 * Layer 1 Customer Action: "Cancel"
 */
async function cancelCustomerToken(req, res) {
  try {
    const { tokenUuid } = req.body;
    if (!tokenUuid) {
      return res.status(400).json({ error: 'tokenUuid is required' });
    }

    const token = await cancelToken(tokenUuid);
    await broadcastStoreState(token.storeId);

    const frontendBaseUrl = config.frontendUrl || 'http://localhost:3000';
    checkAndDispatchNearTurnAlerts(token.storeId, frontendBaseUrl).catch(() => {});

    return res.status(200).json({ success: true, message: 'Token cancelled successfully', token });
  } catch (error) {
    console.error('[customerController.cancelCustomerToken] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to cancel token' });
  }
}

/**
 * POST /api/v1/queue/otp/send
 * Request body: { contact } (phone or email)
 */
async function sendOtp(req, res) {
  try {
    const { contact } = req.body;
    if (!contact || typeof contact !== 'string') {
      return res.status(400).json({ error: 'Contact (phone or email) is required' });
    }

    const trimmedContact = contact.trim();
    const emailMode = isEmail(trimmedContact);

    if (!emailMode) {
      const digitsOnly = trimmedContact.replace(/\D/g, '');
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number or valid email address.' });
      }
    }

    const result = await sendContactOTP(trimmedContact);

    return res.status(200).json({
      success: result.success,
      channel: emailMode ? 'EMAIL' : 'SMS',
      simulated: Boolean(result.simulated),
      mockCode: result.mockCode,
      message: emailMode
        ? `Verification code dispatched to ${trimmedContact}`
        : `Verification code dispatched via SMS to ${trimmedContact}`
    });
  } catch (error) {
    console.error('[customerController.sendOtp] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send verification code' });
  }
}

/**
 * POST /api/v1/queue/otp/verify
 * Request body: { contact, code }
 */
async function verifyOtp(req, res) {
  try {
    const { contact, code } = req.body;
    if (!contact || !code) {
      return res.status(400).json({ error: 'Contact and verification code are required' });
    }

    const trimmedContact = String(contact).trim();
    const trimmedCode = String(code).trim();

    const result = await verifyContactOTP(trimmedContact, trimmedCode);

    if (result.success) {
      const emailMode = isEmail(trimmedContact);
      const contactKey = emailMode ? trimmedContact.toLowerCase() : trimmedContact.replace(/[^\d+]/g, '');
      verifiedContacts.set(contactKey, Date.now() + 15 * 60 * 1000);

      return res.status(200).json({
        success: true,
        verified: true,
        message: 'Contact verified successfully.'
      });
    }

    return res.status(400).json({
      success: false,
      verified: false,
      error: result.error || 'Invalid or expired verification code.'
    });
  } catch (error) {
    console.error('[customerController.verifyOtp] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to verify code' });
  }
}

module.exports = {
  registerCustomer,
  getCustomerStatus,
  customerHold,
  customerDone,
  cancelCustomerToken,
  sendOtp,
  verifyOtp
};
