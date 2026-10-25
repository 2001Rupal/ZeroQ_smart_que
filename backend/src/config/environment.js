const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/virtual_queue',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'virtual_queue_super_secret_jwt_key_2026',
  
  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  },

  // WhatsApp Cloud API
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'virtual_queue_wa_webhook'
  },

  // Twilio SMS & OTP Verify
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID || ''
  },

  // Email / SMTP Notifications & OTP
  email: {
    brevoApiKey: process.env.BREVO_API_KEY || '',
    resendApiKey: process.env.RESEND_API_KEY || '',
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || '"ZeroQ Queue Platform" <notifications@zeroq.app>'
  }
};

module.exports = config;
