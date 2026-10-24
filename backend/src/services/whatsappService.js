const axios = require('axios');
const config = require('../config/environment');

/**
 * Send WhatsApp Turn Alert using Meta Graph API (v19.0)
 * Falls back to simulation/logger if credentials are not configured.
 */
async function sendWhatsAppAlert(phone, { customerName, tokenNumber, counterName }) {
  const { phoneNumberId, accessToken } = config.whatsapp;

  const isLive = Boolean(phoneNumberId && accessToken && !accessToken.includes('mock') && phoneNumberId !== '123456789012345');

  // If live credentials are provided, call Meta Cloud API
  if (isLive) {
    try {
      const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
      const payload = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'template',
        template: {
          name: 'queue_turn_alert',
          language: { code: 'en_US' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: customerName },
                { type: 'text', text: String(tokenNumber) },
                { type: 'text', text: counterName }
              ]
            }
          ]
        }
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      console.log(`[WhatsApp API] Successfully sent WhatsApp alert to ${phone}:`, response.data);
      return { success: true, messageId: response.data?.messages?.[0]?.id };
    } catch (error) {
      console.warn(`[WhatsApp API] Meta Graph API error for ${phone}:`, error.response?.data || error.message);
      return { success: false, error: error.message };
    }
  }

  // Simulated delivery for local development & demonstration
  console.log(`[WhatsApp Service - Dev/Simulator] Sending WhatsApp to ${phone}: "Hi ${customerName}, Token #${tokenNumber} is ready at ${counterName}!"`);
  return { success: true, simulated: true };
}

module.exports = {
  sendWhatsAppAlert
};
