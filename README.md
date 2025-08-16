# Portfolio Tracker

A simple portfolio tracking application built with Node.js, React, and MongoDB. Track your investments, monitor performance, and calculate returns with real-time stock data.

## Features

- **User Authentication**: Simple login and signup functionality
- **Multiple Portfolios**: Create and manage multiple investment portfolios
- **Real-time Stock Data**: Get current stock prices using Yahoo Finance
- **Transaction Tracking**: Record buy/sell transactions with detailed information
- **Portfolio Analytics**: 
  - Current portfolio value
  - Gain/loss calculations
  - Portfolio allocation charts
  - XIRR (Extended Internal Rate of Return) calculation
- **Interactive Charts**: Visual representation of portfolio performance and allocation

## Tech Stack

### Backend
- Node.js with Express (Serverless Functions for Netlify)
- MongoDB with Mongoose
- Python integration for stock data (yfinance)
- JWT authentication
- bcryptjs for password hashing

### Frontend
- React 18
- React Router for navigation
- Recharts for data visualization
- Axios for API calls
- React Hot Toast for notifications

## Deployment Options

### Option 1: Netlify Deployment (Recommended)

The application is configured for easy deployment to Netlify as a single unified app with serverless functions.

**Quick Deploy:**
1. Push code to GitHub/GitLab/Bitbucket
2. Connect to Netlify
3. Set environment variables (see [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md))
4. Deploy!

For detailed instructions, see [NETLIFY_DEPLOYMENT.md](./NETLIFY_DEPLOYMENT.md)

### Option 2: Local/Traditional Deployment

See the local development section below.

## Prerequisites

- Node.js (v14 or higher)
- Python 3.x
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

## Installation

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd portfolio
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Install Python dependencies:
```bash
cd python
pip install -r requirements.txt
cd ..
```

Create a `.env` file in the backend directory:
```env
MONGODB_URI=mongodb://localhost:27017/portfolio_tracker
JWT_SECRET=your_jwt_secret_key_here
PORT=5000
NODE_ENV=development
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

### 4. MongoDB Setup

Make sure MongoDB is running on your system. If using MongoDB Atlas, update the `MONGODB_URI` in the `.env` file with your connection string.

## Running the Application

### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

The backend server will start on `http://localhost:5000`

### 2. Start the Frontend Development Server

```bash
cd frontend
npm start
```

The frontend will start on `http://localhost:3000`

## Usage

1. **Sign Up/Login**: Create a new account or login with existing credentials
2. **Create Portfolio**: Add a new portfolio with a name and description
3. **Add Transactions**: 
   - Search for stocks by symbol
   - Add buy/sell transactions with quantity, price, and date
   - Include optional fees and notes
4. **View Analytics**:
   - Monitor current portfolio value
   - View gain/loss calculations
   - Analyze portfolio allocation with pie charts
   - Calculate XIRR for annualized returns

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Portfolios
- `GET /api/portfolios` - Get user's portfolios
- `POST /api/portfolios` - Create new portfolio
- `GET /api/portfolios/:id` - Get portfolio details
- `PUT /api/portfolios/:id` - Update portfolio
- `DELETE /api/portfolios/:id` - Delete portfolio
- `GET /api/portfolios/:id/summary` - Get portfolio summary with holdings
- `GET /api/portfolios/:id/transactions` - Get portfolio transactions
- `POST /api/portfolios/:id/transactions` - Add new transaction

### Stocks
- `GET /api/stocks/quote/:symbol` - Get stock quote
- `GET /api/stocks/search` - Search stocks
- `POST /api/stocks/quotes` - Get multiple stock quotes
- `GET /api/stocks/portfolio/:id/xirr` - Calculate portfolio XIRR

## MongoDB Collections

### Users
```javascript
{
  username: String,
  email: String,
  password: String (hashed),
  createdAt: Date
}
```

### Portfolios
```javascript
{
  name: String,
  description: String,
  userId: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### Transactions
```javascript
{
  portfolioId: ObjectId,
  symbol: String,
  type: String, // 'BUY' or 'SELL'
  quantity: Number,
  price: Number,
  date: Date,
  fees: Number,
  notes: String,
  createdAt: Date
}
```

## XIRR Calculation

The application calculates XIRR (Extended Internal Rate of Return) using Python's scipy library. XIRR is useful for calculating annualized returns for investments with irregular cash flows.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Troubleshooting

### Common Issues

1. **Python script errors**: Make sure Python dependencies are installed and Python 3 is available in your PATH
2. **MongoDB connection errors**: Ensure MongoDB is running and the connection string is correct
3. **CORS errors**: The frontend proxy is configured to work with the default backend port (5000)

### Getting Help

If you encounter any issues, please check:
1. All dependencies are installed correctly
2. Environment variables are set properly
3. MongoDB is running and accessible
4. Python and required packages are installed

For additional help, please open an issue in the repository.
