const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  uuid: { type: String, required: true, unique: true, index: true },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  dateKey: { type: String, required: true, index: true }, // YYYY-MM-DD
  tokenNumber: { type: Number, required: true }, // 1, 2, 3...
  tokenCode: { type: String, default: null }, // e.g. A-01, B-02, P-03, S-01
  serviceType: {
    type: String,
    enum: ['GENERAL', 'BILLING', 'PHARMACY', 'PRIORITY'],
    default: 'GENERAL',
    index: true
  },
  priority: { type: Boolean, default: false },
  customerName: { type: String, required: true, trim: true },
  customerPhone: { type: String, default: '', trim: true },
  customerEmail: { type: String, default: null, trim: true, lowercase: true },
  contactType: { type: String, enum: ['PHONE', 'EMAIL'], default: 'PHONE' },
  // Status Lifecycle: WAITING -> CALLED -> SERVING -> COMPLETED | SKIPPED | CANCELLED | EXPIRED
  status: {
    type: String,
    enum: ['WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'SKIPPED', 'CANCELLED', 'EXPIRED'],
    default: 'WAITING',
    index: true
  },
  holdUntil: { type: Date, default: null },
  // Float value for FIFO ordering; allows dynamic insertion between integers
  queuePosition: { type: Number, required: true, index: true },
  assignedCounterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Counter', default: null },
  snoozeCount: { type: Number, default: 0 },
  notificationsSent: [
    {
      channel: { type: String, enum: ['WHATSAPP', 'SMS', 'EMAIL'] },
      event: { type: String }, // 'TOKEN_CREATED', 'NEAR_TURN', 'CALLED', 'COMPLETED'
      status: { type: String },
      timestamp: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now },
  calledAt: { type: Date, default: null },
  completedAt: { type: Date, default: null }
});

tokenSchema.index({ storeId: 1, dateKey: 1, status: 1, queuePosition: 1 });
tokenSchema.index({ storeId: 1, serviceType: 1, status: 1 });

module.exports = mongoose.model('Token', tokenSchema);
