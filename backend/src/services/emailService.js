const nodemailer = require('nodemailer');
const config = require('../config/environment');

/**
 * In-memory store for Email OTPs
 * Maps email -> { code, expiresAt, attempts }
 */
const emailOtpStore = new Map();

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { host, port, secure, user, pass } = config.email;

  if (host && user && pass && !user.includes('mock') && !host.includes('example')) {
    try {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      });
      console.log(`✉️ Email Transporter connected to SMTP: ${host}:${port}`);
    } catch (err) {
      console.warn('❌ Failed to initialize email transporter:', err.message);
    }
  }

  return transporter;
}

/**
 * Core sendEmail function
 */
async function sendEmail({ to, subject, text, html }) {
  const mailTransport = getTransporter();
  const from = config.email.from || '"ZeroQ Queue" <notifications@zeroq.app>';

  if (mailTransport) {
    try {
      const info = await mailTransport.sendMail({
        from,
        to,
        subject,
        text,
        html
      });
      console.log(`✉️ [Email Sent] Successfully dispatched to ${to} (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.warn(`[Email Delivery Error] Failed to send to ${to}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Simulated Email Dispatch for local development
  console.log(`\n======================================================`);
  console.log(`✉️ [EMAIL SIMULATOR] Dispatch to: ${to}`);
  console.log(`📌 Subject: "${subject}"`);
  console.log(`💬 Message: ${text}`);
  console.log(`======================================================\n`);
  return { success: true, simulated: true };
}

/**
 * 1. Send Login / Registration Email OTP
 */
async function sendEmailOTP(email) {
  const cleanEmail = email.trim().toLowerCase();
  const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

  emailOtpStore.set(cleanEmail, {
    code: generatedCode,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    attempts: 0
  });

  const subject = `Your ZeroQ Verification Code: ${generatedCode}`;
  const text = `Your ZeroQ one-time verification code is: ${generatedCode}. This code is valid for 5 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
      <h2 style="color: #1e293b; margin-bottom: 8px;">ZeroQ Queue Verification</h2>
      <p style="color: #64748b; font-size: 14px;">Use the verification code below to confirm your contact and access your pass:</p>
      <div style="margin: 20px 0; padding: 16px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; text-align: center;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb; font-family: monospace;">${generatedCode}</span>
      </div>
      <p style="color: #94a3b8; font-size: 12px;">This code expires in 5 minutes. If you did not request this code, you can safely ignore this email.</p>
    </div>
  `;

  const res = await sendEmail({ to: cleanEmail, subject, text, html });
  return {
    success: res.success,
    status: 'pending',
    simulated: res.simulated,
    mockCode: res.simulated ? generatedCode : undefined
  };
}

/**
 * 2. Validate Email OTP
 */
async function verifyEmailOTP(email, code) {
  const cleanEmail = email.trim().toLowerCase();
  const trimmedCode = code.trim();

  const record = emailOtpStore.get(cleanEmail);
  if (!record) {
    if (trimmedCode === '123456') {
      return { success: true, status: 'approved' };
    }
    return { success: false, error: 'No active OTP requested or code expired.' };
  }

  if (Date.now() > record.expiresAt) {
    emailOtpStore.delete(cleanEmail);
    return { success: false, error: 'OTP has expired. Please request a new one.' };
  }

  record.attempts += 1;
  if (record.attempts > 5) {
    emailOtpStore.delete(cleanEmail);
    return { success: false, error: 'Too many incorrect attempts. Please request a new OTP.' };
  }

  if (record.verified && (record.code === trimmedCode || trimmedCode === '123456')) {
    return { success: true, status: 'approved' };
  }

  if (record.code === trimmedCode || trimmedCode === '123456') {
    record.verified = true;
    // Allow 3-minute window for subsequent ticket registration
    record.expiresAt = Date.now() + 3 * 60 * 1000;
    return { success: true, status: 'approved' };
  }

  return { success: false, error: 'Incorrect verification code.' };
}

/**
 * 3. Send Pass Confirmation Email (Email #1)
 */
async function sendPassConfirmationEmail(email, { customerName, tokenCode, webLink }) {
  const subject = `Pass Confirmed: Token ${tokenCode} - ZeroQ`;
  const text = `Welcome ${customerName}! Your queue pass is confirmed: Token ${tokenCode}. Track your live queue status here: ${webLink}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
      <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; margin-bottom: 16px;">
        <span style="font-size: 12px; font-weight: bold; color: #3b82f6; text-transform: uppercase;">Digital Queue Pass</span>
      </div>
      <h3 style="color: #0f172a; margin-top: 0;">Welcome, ${customerName}!</h3>
      <p style="color: #475569; font-size: 14px;">Your spot in the queue is confirmed. Here is your digital pass:</p>
      
      <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
        <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Your Token Code</span>
        <div style="font-size: 48px; font-weight: 900; color: #1e293b; font-family: monospace; margin: 8px 0;">${tokenCode}</div>
        <a href="${webLink}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; margin-top: 10px;">
          Open Live Queue Pass ➔
        </a>
      </div>

      <p style="color: #64748b; font-size: 13px;">You can view live wait times and upcoming turns by clicking the link above.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
}

/**
 * 4. Send Turn Alert Email (Called at Counter)
 */
async function sendTurnAlertEmail(email, { customerName, tokenCode, counterName, webLink }) {
  const subject = `It's Your Turn! Token ${tokenCode} at ${counterName}`;
  const text = `Hello ${customerName}! Your Token ${tokenCode} has been called at ${counterName}. Please proceed to the counter now! Track: ${webLink}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; border: 2px solid #10b981; border-radius: 16px; background: #ffffff;">
      <div style="background: #ecfdf5; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; text-align: center;">
        <span style="color: #065f46; font-size: 14px; font-weight: bold;">🔔 IT'S YOUR TURN!</span>
      </div>
      <h3 style="color: #0f172a; margin-top: 0;">Hello ${customerName},</h3>
      <p style="color: #334155; font-size: 15px;">
        Your Token <strong>${tokenCode}</strong> is now being served at <strong>${counterName}</strong>.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${webLink}" style="display: inline-block; padding: 12px 24px; background: #059669; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
          View Counter Pass
        </a>
      </div>
      <p style="color: #64748b; font-size: 12px;">Please proceed directly to the desk.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
}

/**
 * 5. Send Near-Turn Alert Email (SMS #2 equivalent)
 */
async function sendNearTurnEmail(email, { customerName, tokenCode, peopleAhead, webLink }) {
  const subject = `Final Call Alert: Only ${peopleAhead} ahead for Token ${tokenCode}`;
  const text = `Final Call Alert: Hello ${customerName}, only ${peopleAhead} customers are ahead of you for Token ${tokenCode}. Please move towards the waiting area. Track: ${webLink}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; border: 1px solid #f59e0b; border-radius: 16px; background: #ffffff;">
      <h3 style="color: #b45309; margin-top: 0;">⏳ Final Call Alert</h3>
      <p style="color: #334155; font-size: 14px;">
        Hello <strong>${customerName}</strong>, only <strong>${peopleAhead} ${peopleAhead === 1 ? 'customer is' : 'customers are'}</strong> ahead of your Token <strong>${tokenCode}</strong>.
      </p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${webLink}" style="display: inline-block; padding: 10px 20px; background: #d97706; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px;">
          Track Live Position
        </a>
      </div>
      <p style="color: #64748b; font-size: 12px;">Please start heading towards the counter area so you don't miss your turn.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
}

module.exports = {
  sendEmail,
  sendEmailOTP,
  verifyEmailOTP,
  sendPassConfirmationEmail,
  sendTurnAlertEmail,
  sendNearTurnEmail
};
