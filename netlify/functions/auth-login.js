const { connectToDatabase } = require('../../shared/utils/db');
const bcrypt = require('bcryptjs');
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  try {
    await connectToDatabase();
    
    const { email, password } = JSON.parse(event.body);

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Invalid credentials' }),
      };
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Invalid credentials' }),
      };
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      }),
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Server error' }),
    };
  }
};
