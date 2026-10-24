const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  ownerPhone: { type: String, required: true },
  operatingHours: {
    openTime: { type: String, default: "09:00" },
    closeTime: { type: String, default: "21:00" },
    timezone: { type: String, default: "Asia/Kolkata" }
  },
  settings: {
    snoozeOffset: { type: Number, default: 2 },
    smsEnabled: { type: Boolean, default: false },
    whatsappEnabled: { type: Boolean, default: true },
    walletBalance: { type: Number, default: 0.0 } // Wallet for SMS carrier fees
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Store', storeSchema);
