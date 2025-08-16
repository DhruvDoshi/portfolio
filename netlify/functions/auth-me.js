const { connectToDatabase } = require('../../shared/utils/db');
const jwt = require('jsonwebtoken');
const User = require('../../shared/models/User');

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
    
    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'No token, authorization denied' }),
      };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'Token is not valid' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      }),
    };
  } catch (error) {
    console.error('Auth me error:', error);
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ message: 'Token is not valid' }),
    };
  }
};
