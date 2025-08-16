const express = require('express');
const { PythonShell } = require('python-shell');
const path = require('path');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Portfolio = require('../models/Portfolio');

const router = express.Router();

// Helper function to run Python scripts
const runPythonScript = (command, args = []) => {
  return new Promise((resolve, reject) => {
    const options = {
      mode: 'text',
      pythonPath: 'python3',
      pythonOptions: ['-u'],
      scriptPath: path.join(__dirname, '../python'),
      args: [command, ...args]
    };

    PythonShell.run('stock_utils.py', options, (err, results) => {
      if (err) {
        reject(err);
      } else {
        try {
          const result = JSON.parse(results[results.length - 1]);
          resolve(result);
        } catch (parseErr) {
          reject(parseErr);
        }
      }
    });
  });
};

// Get stock data
router.get('/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1y' } = req.query;
    
    const stockData = await runPythonScript('get_stock', [symbol.toUpperCase(), period]);
    
    if (stockData.error) {
      return res.status(400).json({ message: stockData.error });
    }
    
    res.json(stockData);
  } catch (error) {
    console.error('Error fetching stock data:', error);
    res.status(500).json({ message: 'Error fetching stock data' });
  }
});

// Search stocks
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ message: 'Query parameter required' });
    }
    
    const results = await runPythonScript('search_stocks', [q]);
    res.json(results);
  } catch (error) {
    console.error('Error searching stocks:', error);
    res.status(500).json({ message: 'Error searching stocks' });
  }
});

// Get multiple stock quotes
router.post('/quotes', async (req, res) => {
  try {
    const { symbols } = req.body;
    
    if (!symbols || !Array.isArray(symbols)) {
      return res.status(400).json({ message: 'Symbols array required' });
    }
    
    const promises = symbols.map(symbol => 
      runPythonScript('get_stock', [symbol.toUpperCase(), '1d'])
        .catch(err => ({ symbol, error: err.message }))
    );
    
    const results = await Promise.all(promises);
    res.json(results);
  } catch (error) {
    console.error('Error fetching multiple quotes:', error);
    res.status(500).json({ message: 'Error fetching quotes' });
  }
});

// Calculate portfolio XIRR
router.get('/portfolio/:id/xirr', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify portfolio ownership
    const portfolio = await Portfolio.findOne({ 
      _id: id, 
      userId: req.user._id 
    });
    
    if (!portfolio) {
      return res.status(404).json({ message: 'Portfolio not found' });
    }
    
    // Get all transactions
    const transactions = await Transaction.find({ portfolioId: id });
    
    if (transactions.length === 0) {
      return res.json({ xirr: null, message: 'No transactions found' });
    }
    
    // Get current holdings
    const holdings = {};
    transactions.forEach(transaction => {
      const { symbol, type, quantity, price } = transaction;
      
      if (!holdings[symbol]) {
        holdings[symbol] = 0;
      }
      
      if (type === 'BUY') {
        holdings[symbol] += quantity;
      } else {
        holdings[symbol] -= quantity;
      }
    });
    
    // Remove holdings with zero or negative quantity
    Object.keys(holdings).forEach(symbol => {
      if (holdings[symbol] <= 0) {
        delete holdings[symbol];
      }
    });
    
    // Get current prices for holdings
    const symbols = Object.keys(holdings);
    const currentValues = {};
    
    if (symbols.length > 0) {
      const pricePromises = symbols.map(symbol => 
        runPythonScript('get_stock', [symbol, '1d'])
          .then(data => ({ symbol, price: data.currentPrice }))
          .catch(() => ({ symbol, price: 0 }))
      );
      
      const prices = await Promise.all(pricePromises);
      
      prices.forEach(({ symbol, price }) => {
        currentValues[symbol] = holdings[symbol] * (price || 0);
      });
    }
    
    // Calculate XIRR
    const transactionData = transactions.map(t => ({
      date: t.date.toISOString(),
      type: t.type,
      quantity: t.quantity,
      price: t.price,
      fees: t.fees || 0
    }));
    
    const xirrResult = await runPythonScript('calculate_xirr', [
      JSON.stringify(transactionData),
      JSON.stringify(currentValues)
    ]);
    
    res.json({
      xirr: xirrResult.xirr,
      holdings,
      currentValues,
      totalCurrentValue: Object.values(currentValues).reduce((sum, val) => sum + val, 0)
    });
  } catch (error) {
    console.error('Error calculating XIRR:', error);
    res.status(500).json({ message: 'Error calculating XIRR' });
  }
});

module.exports = router;
