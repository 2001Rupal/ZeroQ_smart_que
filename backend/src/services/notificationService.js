const { sendSMS, sendOTP: sendSmsOTP, verifyOTP: verifySmsOTP } = require('./smsService');
const {
  sendEmailOTP,
  verifyEmailOTP,
  sendPassConfirmationEmail,
  sendTurnAlertEmail,
  sendNearTurnEmail
} = require('./emailService');

function isEmail(contact) {
  if (typeof contact !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim());
}

/**
 * 1. Dispatch Pass Confirmation (SMS #1 or Email #1)
 */
async function dispatchPassConfirmation(contact, { customerName, tokenCode, webLink }) {
  if (isEmail(contact)) {
    return sendPassConfirmationEmail(contact.trim().toLowerCase(), { customerName, tokenCode, webLink });
  }

  const cleanPhone = contact.replace(/[^\d+]/g, '');
  const smsMessage = `Welcome ${customerName}! Your pass is confirmed: Token ${tokenCode}. Track your live queue status here: ${webLink}`;
  return sendSMS(cleanPhone, smsMessage);
}

/**
 * 2. Dispatch Turn Alert (Called at counter)
 */
async function dispatchTurnAlert(contact, { customerName, tokenCode, counterName, webLink }) {
  if (isEmail(contact)) {
    return sendTurnAlertEmail(contact.trim().toLowerCase(), { customerName, tokenCode, counterName, webLink });
  }

  const cleanPhone = contact.replace(/[^\d+]/g, '');
  const smsMessage = `Turn Alert: Hello ${customerName}, your Token ${tokenCode} is ready at ${counterName}. Please proceed now! Track: ${webLink}`;
  return sendSMS(cleanPhone, smsMessage);
}

/**
 * 3. Dispatch Near-Turn Alert (3-5 customers ahead)
 */
async function dispatchNearTurnAlert(contact, { customerName, tokenCode, peopleAhead, webLink }) {
  if (isEmail(contact)) {
    return sendNearTurnEmail(contact.trim().toLowerCase(), { customerName, tokenCode, peopleAhead, webLink });
  }

  const cleanPhone = contact.replace(/[^\d+]/g, '');
  const smsMessage = `Final Call Alert: Only ${peopleAhead} ${peopleAhead === 1 ? 'customer is' : 'customers are'} ahead of you for Token ${tokenCode}. Please move towards the counter/waiting area: ${webLink}`;
  return sendSMS(cleanPhone, smsMessage);
}

/**
 * 4. Dispatch Existing Pass Reminder (De-duplication Check)
 */
async function dispatchExistingPassReminder(contact, { customerName, tokenCode, webLink }) {
  if (isEmail(contact)) {
    const subject = `Active Pass Reminder: Token ${tokenCode} - ZeroQ`;
    const text = `Hello ${customerName}, you already have an active pass (Token ${tokenCode}) for today. Track live queue here: ${webLink}`;
    return sendPassConfirmationEmail(contact.trim().toLowerCase(), { customerName, tokenCode, webLink });
  }

  const cleanPhone = contact.replace(/[^\d+]/g, '');
  const smsMessage = `You already have an active pass (Token ${tokenCode}) for today. Track live queue: ${webLink}`;
  return sendSMS(cleanPhone, smsMessage);
}

/**
 * 5. Send Contact Verification OTP (SMS or Email)
 */
async function sendContactOTP(contact) {
  if (isEmail(contact)) {
    return sendEmailOTP(contact.trim().toLowerCase());
  }
  return sendSmsOTP(contact);
}

/**
 * 6. Verify Contact OTP (SMS or Email)
 */
async function verifyContactOTP(contact, code) {
  if (isEmail(contact)) {
    return verifyEmailOTP(contact.trim().toLowerCase(), code);
  }
  return verifySmsOTP(contact, code);
}

module.exports = {
  isEmail,
  dispatchPassConfirmation,
  dispatchTurnAlert,
  dispatchNearTurnAlert,
  dispatchExistingPassReminder,
  sendContactOTP,
  verifyContactOTP
};
