const { connectToDatabase } = require('../../shared/utils/db');
const jwt = require('jsonwebtoken');
const User = require('../../shared/models/User');
const Portfolio = require('../../shared/models/Portfolio');
const Transaction = require('../../shared/models/Transaction');
const { spawn } = require('child_process');
const path = require('path');

// Auth middleware for serverless functions
const authenticate = async (token) => {
  if (!token) {
    throw new Error('No token provided');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  
  if (!user) {
    throw new Error('Invalid token');
  }

  return user;
};

// Helper function to run Python scripts
const runPythonScript = (command, args = []) => {
  return new Promise((resolve, reject) => {
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const scriptPath = path.join(__dirname, '../../shared/utils/stock_utils.py');
    
    const python = spawn(pythonPath, [scriptPath, command, ...args]);
    
    let dataString = '';
    let errorString = '';
    
    python.stdout.on('data', (data) => {
      dataString += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      errorString += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${errorString}`));
      } else {
        try {
          const result = JSON.parse(dataString.trim());
          resolve(result);
        } catch (parseErr) {
          reject(new Error(`Failed to parse Python output: ${dataString}`));
        }
      }
    });
  });
};

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  try {
    await connectToDatabase();
    
    const token = event.headers.authorization?.replace('Bearer ', '');
    const user = await authenticate(token);
    
    const portfolioId = event.queryStringParameters?.id;
    
    if (!portfolioId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Portfolio ID required' }),
      };
    }
    
    // Verify portfolio ownership
    const portfolio = await Portfolio.findOne({ 
      _id: portfolioId, 
      userId: user._id 
    });
    
    if (!portfolio) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'Portfolio not found' }),
      };
    }
    
    // Get all transactions
    const transactions = await Transaction.find({ portfolioId: portfolioId });
    
    if (transactions.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ xirr: null, message: 'No transactions found' }),
      };
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
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        xirr: xirrResult.xirr,
        holdings,
        currentValues,
        totalCurrentValue: Object.values(currentValues).reduce((sum, val) => sum + val, 0)
      }),
    };
    
  } catch (error) {
    console.error('XIRR calculation error:', error);
    
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'Unauthorized' }),
      };
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Server error' }),
    };
  }
};
