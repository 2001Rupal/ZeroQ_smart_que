const mongoose = require('mongoose');

const dailySequenceSchema = new mongoose.Schema({
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  dateKey: { type: String, required: true }, // Format: YYYY-MM-DD
  seq: { type: Number, default: 0 }
});

dailySequenceSchema.index({ storeId: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model('DailySequence', dailySequenceSchema);
