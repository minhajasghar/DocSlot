const axios = require('axios');

/**
 * Format phone number for WhatsApp (CallMeBot)
 * E.g., 03001234567 -> +923001234567 -> 923001234567
 * @param {string} phone 
 * @returns {string} Formatted phone number
 */
function formatPhoneForWhatsApp(phone) {
  if (!phone) return null;
  // Remove any non-numeric characters
  let cleanPhone = phone.replace(/\D/g, '');
  
  // If it starts with 0 and is likely a Pakistani number (11 digits), replace 0 with 92
  if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
    cleanPhone = '92' + cleanPhone.substring(1);
  }
  
  return cleanPhone;
}

/**
 * Send a WhatsApp message using CallMeBot API
 * @param {string} phone Patient's phone number
 * @param {string} message The message to send
 * @param {string} apiKey CallMeBot API Key (optional, defaults from env)
 */
async function sendWhatsApp(phone, message, apiKey) {
  try {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    if (!formattedPhone) {
      console.warn('Cannot send WhatsApp: Invalid phone number');
      return false;
    }

    const key = apiKey || process.env.CALLMEBOT_API_KEY;
    if (!key) {
      console.warn('Cannot send WhatsApp: CallMeBot API Key is missing');
      return false;
    }

    const encodedMessage = encodeURIComponent(message);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${formattedPhone}&text=${encodedMessage}&apikey=${key}`;

    const response = await axios.get(url);
    if (response.status === 200) {
      console.log(`WhatsApp message sent successfully to ${formattedPhone}`);
      return true;
    } else {
      console.warn(`WhatsApp message failed with status ${response.status}: ${response.data}`);
      return false;
    }
  } catch (error) {
    // Catch errors silently so it never breaks the main flow
    console.error('Error sending WhatsApp message:', error.message);
    return false;
  }
}

module.exports = {
  formatPhoneForWhatsApp,
  sendWhatsApp
};
