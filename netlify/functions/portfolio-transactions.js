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
    
    // GET /portfolio-transactions?id=:id - Get transactions for a portfolio
    if (event.httpMethod === 'GET') {
      const transactions = await Transaction.find({ 
        portfolioId: portfolioId 
      }).sort({ date: -1 });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(transactions),
      };
    }
    
    // POST /portfolio-transactions?id=:id - Add transaction to portfolio
    if (event.httpMethod === 'POST') {
      const { symbol, type, quantity, price, date, fees, notes } = JSON.parse(event.body);
      
      const transaction = new Transaction({
        portfolioId: portfolioId,
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

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(transaction),
      };
    }
    
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
    
  } catch (error) {
    console.error('Portfolio transactions error:', error);
    
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
