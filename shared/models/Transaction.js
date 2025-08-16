const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  portfolioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
    required: true
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true
  },
  type: {
    type: String,
    required: true,
    enum: ['BUY', 'SELL']
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  fees: {
    type: Number,
    default: 0,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate total amount for the transaction
transactionSchema.virtual('totalAmount').get(function() {
  return (this.quantity * this.price) + this.fees;
});

module.exports = mongoose.model('Transaction', transactionSchema);
