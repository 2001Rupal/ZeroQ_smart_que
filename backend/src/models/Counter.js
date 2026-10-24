const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
  counterNumber: { type: Number, required: true },
  counterName: { type: String, default: 'Counter 1' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  currentServingToken: { type: mongoose.Schema.Types.ObjectId, ref: 'Token', default: null }
});

counterSchema.index({ storeId: 1, counterNumber: 1 });
counterSchema.index({ storeId: 1, isActive: 1 });

module.exports = mongoose.model('Counter', counterSchema);
