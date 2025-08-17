# Portfolio Tracker

A modern, responsive portfolio tracker that supports multiple currencies (USD, CAD, INR) and stock markets (US### Database Schema

### Portfolio Collection
```javascript
{
  _id: ObjectId,
  name: String,
  currency: "USD" | "CAD" | "INR",
  stocks: [{
    symbol: String,
    shares: Number,
    avgPrice: Number,
    market: "US" | "CA" | "IN"
  }],
  transactions: [{
    id: String,
    stockSymbol: String,
    type: "buy" | "sell",
    shares: Number,
    price: Number,
    amount: Number,
    date: Date,
    market: "US" | "CA" | "IN"
  }],
  createdAt: Date,
  updatedAt: Date
}
```Built with Next.js, MongoDB, and real-time data from Yahoo Finance.

## Features

- 📊 **Multi-Currency Support**: Track portfolios in USD, CAD, or INR
- 🌍 **Multi-Market**: Support for US, Canadian, and Indian stock markets
- 📈 **Real-time Data**: Live stock prices from Yahoo Finance
- 💼 **Multiple Portfolios**: Create and manage multiple portfolios
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔒 **Local Storage**: Secure data storage in browser localStorage
- 🧮 **XIRR Calculation**: Advanced annualized return calculations considering cash flow timing
- 📊 **Transaction History**: Track all buy/sell transactions with automatic XIRR updates

## Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB database (local or cloud like MongoDB Atlas)

### Installation

1. **Clone and navigate to the project**:
   ```bash
   cd /Users/dhruv/code/portfolio
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Update `.env.local` with your MongoDB connection string:
   ```env
   MONGODB_URI=mongodb://localhost:27017/portfolio_tracker
   # OR for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/portfolio_tracker
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Creating Your First Portfolio

1. Click "New Portfolio" button
2. Enter a portfolio name
3. Select your base currency (USD, CAD, or INR)
4. Click "Create"

### Adding Stocks

1. Select a portfolio from the dropdown
2. Click "Add Stock"
3. Enter stock details:
   - **Symbol**: Stock ticker (e.g., AAPL, SHOP, RELIANCE)
   - **Market**: Choose US, Canada, or India
   - **Shares**: Number of shares owned
   - **Average Price**: Your average purchase price

### Portfolio Metrics

The app automatically calculates several important metrics:

1. **Total Portfolio Value**: Current market value of all holdings
2. **Total Gain/Loss**: Absolute profit/loss in portfolio currency
3. **Return Percentage**: Simple percentage return based on cost vs current value
4. **XIRR (Extended Internal Rate of Return)**: Annualized return considering the timing of all cash flows

#### Understanding XIRR

XIRR is particularly useful for portfolios where you make investments at different times. Unlike simple percentage returns, XIRR accounts for:
- When you made each investment
- The amount of each investment
- Current portfolio value
- Time-weighted performance

### Supported Markets and Examples

| Market | Suffix | Example Stocks |
|--------|--------|----------------|
| US     | None   | AAPL, GOOGL, MSFT, TSLA |
| Canada | .TO    | SHOP, RY, CNR, SU |
| India  | .NS    | RELIANCE, TCS, INFY, HDFC |

| Market | Suffix | Example Stocks |
|--------|--------|----------------|
| US     | None   | AAPL, GOOGL, MSFT, TSLA |
| Canada | .TO    | SHOP, RY, CNR, SU |
| India  | .NS    | RELIANCE, TCS, INFY, HDFC |

## Technical Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Database**: MongoDB
- **Data Source**: Yahoo Finance API
- **Icons**: Lucide React
- **Deployment**: Netlify-ready

## Deployment to Netlify

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Connect to Netlify**:
   - Push your code to GitHub
   - Connect your GitHub repo to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `.next`

3. **Environment Variables**:
   Add your MongoDB URI in Netlify's environment variables section.

## API Endpoints

- `GET /api/portfolios` - Fetch all portfolios
- `POST /api/portfolios` - Create new portfolio
- `POST /api/portfolios/[id]/stocks` - Add stock to portfolio

## Database Schema

### Portfolio Collection
```javascript
{
  _id: ObjectId,
  name: String,
  currency: "USD" | "CAD" | "INR",
  stocks: [{
    symbol: String,
    shares: Number,
    avgPrice: Number,
    market: "US" | "CA" | "IN"
  }],
  createdAt: Date,
  updatedAt: Date
}
```

## Currency Conversion

The app includes basic currency conversion rates (hardcoded for demo):
- USD: Base currency (1.0)
- CAD: 1.35 USD
- INR: 83.0 USD

For production, consider integrating a real-time currency API.

## Stock Data

Stock prices are fetched from Yahoo Finance API. The app includes fallback mock data for demonstration when the API is unavailable.

## Development

### Project Structure
```
portfolio/
├── app/
│   ├── api/
│   │   └── portfolios/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── mongodb.ts
│   └── stockService.ts
├── package.json
└── README.md
```

### Key Components

- **`app/page.tsx`**: Main dashboard component
- **`lib/stockService.ts`**: Stock data fetching and portfolio calculations
- **`lib/mongodb.ts`**: Database connection utility
- **`app/api/portfolios/`**: REST API routes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

If you encounter any issues:

1. Check that MongoDB is running and accessible
2. Verify environment variables are set correctly
3. Ensure you have the latest Node.js version
4. Check the browser console for any errors

For deployment issues, refer to Netlify's documentation for Next.js projects.
