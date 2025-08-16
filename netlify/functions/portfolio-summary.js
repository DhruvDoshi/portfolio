const { connectToDatabase } = require('../../shared/utils/db');
const jwt = require('jsonwebtoken');
const User = require('../../shared/models/User');
const Portfolio = require('../../shared/models/Portfolio');
const Transaction = require('../../shared/models/Transaction');

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
    
    // Extract portfolio ID from query parameters
    const portfolioId = event.queryStringParameters?.id;
    
    if (!portfolioId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Portfolio ID required' }),
      };
    }
    
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

    const transactions = await Transaction.find({ 
      portfolioId: portfolioId 
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        portfolio,
        holdings,
        totalInvested,
        transactionCount: transactions.length
      }),
    };
    
  } catch (error) {
    console.error('Portfolio summary error:', error);
    
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
