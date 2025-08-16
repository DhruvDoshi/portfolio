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
    
    const path = event.path.replace('/.netlify/functions/portfolios', '');
    const pathParts = path.split('/').filter(part => part);
    
    // GET /portfolios - Get all portfolios for user
    if (event.httpMethod === 'GET' && pathParts.length === 0) {
      const portfolios = await Portfolio.find({ userId: user._id });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(portfolios),
      };
    }
    
    // POST /portfolios - Create new portfolio
    if (event.httpMethod === 'POST' && pathParts.length === 0) {
      const { name, description } = JSON.parse(event.body);
      
      const portfolio = new Portfolio({
        name,
        description,
        userId: user._id
      });

      await portfolio.save();
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(portfolio),
      };
    }
    
    // GET /portfolios/:id - Get portfolio by ID
    if (event.httpMethod === 'GET' && pathParts.length === 1) {
      const portfolioId = pathParts[0];
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

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(portfolio),
      };
    }
    
    // PUT /portfolios/:id - Update portfolio
    if (event.httpMethod === 'PUT' && pathParts.length === 1) {
      const portfolioId = pathParts[0];
      const { name, description } = JSON.parse(event.body);
      
      const portfolio = await Portfolio.findOneAndUpdate(
        { _id: portfolioId, userId: user._id },
        { name, description, updatedAt: Date.now() },
        { new: true }
      );
      
      if (!portfolio) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Portfolio not found' }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(portfolio),
      };
    }
    
    // DELETE /portfolios/:id - Delete portfolio
    if (event.httpMethod === 'DELETE' && pathParts.length === 1) {
      const portfolioId = pathParts[0];
      
      const portfolio = await Portfolio.findOneAndDelete({ 
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

      // Also delete all transactions for this portfolio
      await Transaction.deleteMany({ portfolioId: portfolioId });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Portfolio deleted successfully' }),
      };
    }
    
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Not found' }),
    };
    
  } catch (error) {
    console.error('Portfolios error:', error);
    
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
