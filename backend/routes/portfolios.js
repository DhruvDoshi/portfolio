const express = require('express');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all portfolios for user
router.get('/', auth, async (req, res) => {
  try {
    const portfolios = await Portfolio.find({ userId: req.user._id });
    res.json(portfolios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new portfolio
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const portfolio = new Portfolio({
      name,
      description,
      userId: req.user._id
    });

    await portfolio.save();
    res.status(201).json(portfolio);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get portfolio by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    res.json(portfolio);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update portfolio
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const portfolio = await Portfolio.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { name, description, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    res.json(portfolio);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete portfolio
router.delete('/:id', auth, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    // Also delete all transactions for this portfolio
    await Transaction.deleteMany({ portfolioId: req.params.id });

    res.json({ message: 'Portfolio deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get transactions for a portfolio
router.get('/:id/transactions', auth, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const transactions = await Transaction.find({ 
      portfolioId: req.params.id 
    }).sort({ date: -1 });

    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add transaction to portfolio
router.post('/:id/transactions', auth, async (req, res) => {
  try {
    const { symbol, type, quantity, price, date, fees, notes } = req.body;
    
    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const transaction = new Transaction({
      portfolioId: req.params.id,
      symbol: symbol.toUpperCase(),
      type,
      quantity,
      price,
      date: date || Date.now(),
      fees: fees || 0,
      notes
    });

    await transaction.save();
    
    // Update portfolio timestamp
    portfolio.updatedAt = Date.now();
    await portfolio.save();

    res.status(201).json(transaction);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get portfolio summary with holdings
router.get('/:id/summary', auth, async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }

    const transactions = await Transaction.find({ 
      portfolioId: req.params.id 
    }).sort({ date: 1 });

    // Calculate holdings
    const holdings = {};
    let totalInvested = 0;

    transactions.forEach(transaction => {
      const { symbol, type, quantity, price, fees } = transaction;
      
      if (!holdings[symbol]) {
        holdings[symbol] = { quantity: 0, totalCost: 0, avgPrice: 0 };
      }

      if (type === 'BUY') {
        holdings[symbol].quantity += quantity;
        holdings[symbol].totalCost += (quantity * price) + fees;
        totalInvested += (quantity * price) + fees;
      } else if (type === 'SELL') {
        const sellValue = quantity * price;
        const avgCostPerShare = holdings[symbol].totalCost / holdings[symbol].quantity;
        holdings[symbol].quantity -= quantity;
        holdings[symbol].totalCost -= (quantity * avgCostPerShare);
        totalInvested -= (quantity * avgCostPerShare);
      }

      if (holdings[symbol].quantity > 0) {
        holdings[symbol].avgPrice = holdings[symbol].totalCost / holdings[symbol].quantity;
      }
    });

    // Remove holdings with zero quantity
    Object.keys(holdings).forEach(symbol => {
      if (holdings[symbol].quantity <= 0) {
        delete holdings[symbol];
      }
    });

    res.json({
      portfolio,
      holdings,
      totalInvested,
      transactionCount: transactions.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
