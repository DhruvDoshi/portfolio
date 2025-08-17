import { Portfolio } from './mongodb';
import { XIRRCalculator, CashFlow } from './xirrCalculator';
import { ExchangeRateService } from './exchangeRateService';

export interface StockData {
  symbol: string;
  name: string; // Company full name
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  timestamp: number;
}

// Currency mapping for different markets
const MARKET_CURRENCIES: Record<string, string> = {
  'US': 'USD',
  'CA': 'CAD',
  'IN': 'INR',
};

// Stock symbol suffixes for different markets
const MARKET_SUFFIXES = {
  US: '',
  CA: '.TO',
  IN: '.NS',
};

export class StockService {
  static async getStockData(symbol: string, market: 'US' | 'CA' | 'IN'): Promise<StockData> {
    const fullSymbol = symbol + MARKET_SUFFIXES[market];
    
    try {
      // Use our API route to fetch data
      const response = await fetch(`/api/stock?symbol=${encodeURIComponent(fullSymbol)}`);
      
      if (!response.ok) {
        throw new Error('API response was not ok');
      }
      
      const data = await response.json();
      
      // Ensure all required numeric fields are valid
      return {
        ...data,
        price: data.price || 0,
        change: data.change || 0,
        changePercent: data.changePercent || 0,
        currency: data.currency || 'USD',
        name: data.name || `${symbol} Corporation`
      };
      
    } catch (error) {
      console.error(`Error fetching data for ${symbol}:`, error);
      
      // Fallback with deterministic mock data
      return this.getMockStockData(symbol, market);
    }
  }

  private static getMockStockData(symbol: string, market: 'US' | 'CA' | 'IN'): StockData {
    // Create deterministic but varied mock data based on symbol
    const symbolHash = symbol.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    // Use hash to create consistent but varied data for different symbols
    const basePrice = Math.abs(symbolHash % 1000) + 50;
    const changePercent = ((symbolHash % 200) - 100) / 10; // -10% to +10%
    const change = basePrice * (changePercent / 100);
    
    // Determine currency based on market
    const currency = MARKET_CURRENCIES[market];
    
    // Get company name from symbol
    const companyName = this.getCompanyName(symbol, market);
    
    return {
      symbol: symbol,
      name: companyName,
      price: Math.round(basePrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      currency: currency,
      timestamp: Date.now(),
    };
  }

  private static getCompanyName(symbol: string, market: 'US' | 'CA' | 'IN'): string {
    // Common company names mapping
    const companyNames: Record<string, string> = {
      // US Companies
      'AAPL': 'Apple Inc.',
      'GOOGL': 'Alphabet Inc.',
      'GOOG': 'Alphabet Inc.',
      'MSFT': 'Microsoft Corporation',
      'AMZN': 'Amazon.com Inc.',
      'TSLA': 'Tesla Inc.',
      'META': 'Meta Platforms Inc.',
      'NVDA': 'NVIDIA Corporation',
      'NFLX': 'Netflix Inc.',
      'AMD': 'Advanced Micro Devices Inc.',
      'PYPL': 'PayPal Holdings Inc.',
      'ADBE': 'Adobe Inc.',
      'CRM': 'Salesforce Inc.',
      'ORCL': 'Oracle Corporation',
      'IBM': 'International Business Machines',
      'INTC': 'Intel Corporation',
      'UBER': 'Uber Technologies Inc.',
      'LYFT': 'Lyft Inc.',
      'SNAP': 'Snap Inc.',
      'TWTR': 'Twitter Inc.',
      'SQ': 'Block Inc.',
      'ROKU': 'Roku Inc.',
      
      // Canadian Companies
      'SHOP': 'Shopify Inc.',
      'RY': 'Royal Bank of Canada',
      'TD': 'Toronto-Dominion Bank',
      'BNS': 'Bank of Nova Scotia',
      'BMO': 'Bank of Montreal',
      'CNR': 'Canadian National Railway',
      'CP': 'Canadian Pacific Railway',
      'SU': 'Suncor Energy Inc.',
      'CNQ': 'Canadian Natural Resources',
      'ENB': 'Enbridge Inc.',
      'TRP': 'TC Energy Corporation',
      'WCN': 'Waste Connections Inc.',
      'CSU': 'Constellation Software Inc.',
      'ATD': 'Alimentation Couche-Tard Inc.',
      'WEED': 'Canopy Growth Corporation',
      'ACB': 'Aurora Cannabis Inc.',
      
      // Indian Companies
      'RELIANCE': 'Reliance Industries Limited',
      'TCS': 'Tata Consultancy Services',
      'INFY': 'Infosys Limited',
      'HINDUNILVR': 'Hindustan Unilever Limited',
      'HDFC': 'HDFC Bank Limited',
      'ICICIBANK': 'ICICI Bank Limited',
      'SBIN': 'State Bank of India',
      'BHARTIARTL': 'Bharti Airtel Limited',
      'ITC': 'ITC Limited',
      'KOTAKBANK': 'Kotak Mahindra Bank',
      'LT': 'Larsen & Toubro Limited',
      'ASIANPAINT': 'Asian Paints Limited',
      'MARUTI': 'Maruti Suzuki India Limited',
      'HCLTECH': 'HCL Technologies Limited',
      'WIPRO': 'Wipro Limited',
      'TECHM': 'Tech Mahindra Limited',
      'TITAN': 'Titan Company Limited',
      'NESTLEIND': 'Nestle India Limited',
      'BAJFINANCE': 'Bajaj Finance Limited',
      'ULTRACEMCO': 'UltraTech Cement Limited',
    };
    
    const upperSymbol = symbol.toUpperCase();
    return companyNames[upperSymbol] || `${symbol} Corporation`;
  }

  static async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    return await ExchangeRateService.convertCurrency(amount, fromCurrency, toCurrency);
  }

  static async convertCurrencyHistorical(amount: number, fromCurrency: string, toCurrency: string, date: Date): Promise<number> {
    return await ExchangeRateService.convertCurrencyHistorical(amount, fromCurrency, toCurrency, date);
  }

  static async getPortfolioValue(portfolio: Portfolio): Promise<number> {
    let totalValue = 0;
    
    for (const stock of portfolio.stocks) {
      try {
        const stockData = await this.getStockData(stock.symbol, stock.market);
        const stockValue = stockData.price * stock.shares;
        const convertedValue = await this.convertCurrency(stockValue, stockData.currency, portfolio.currency);
        totalValue += convertedValue;
      } catch (error) {
        console.error(`Error calculating value for ${stock.symbol}:`, error);
      }
    }
    
    return totalValue;
  }

  static async calculatePortfolioXIRR(portfolio: Portfolio): Promise<number | null> {
    if (!portfolio.transactions || portfolio.transactions.length === 0) {
      return null;
    }

    try {
      // Get current portfolio value
      const currentValue = await this.getPortfolioValue(portfolio);
      
      // Generate cash flows from transactions
      const cashFlows: CashFlow[] = [];
      
      // Add all transactions as cash flows
      for (const transaction of portfolio.transactions) {
        let amount = transaction.amount;
        const transactionDate = new Date(transaction.date);
        
        // Get the actual stock data to determine the correct currency
        try {
          const stockData = await this.getStockData(transaction.stockSymbol, transaction.market);
          // Convert from stock's currency to portfolio currency using historical rates
          amount = await this.convertCurrencyHistorical(amount, stockData.currency, portfolio.currency, transactionDate);
        } catch (error) {
          console.error(`Error getting stock data for ${transaction.stockSymbol}:`, error);
          // Fallback to market-based currency conversion with historical rates
          let stockCurrency = 'USD';
          if (transaction.market === 'CA') {
            stockCurrency = 'CAD';
          } else if (transaction.market === 'IN') {
            stockCurrency = 'INR';
          }
          amount = await this.convertCurrencyHistorical(amount, stockCurrency, portfolio.currency, transactionDate);
        }
        
        cashFlows.push({
          date: transactionDate,
          amount: transaction.type === 'buy' ? -amount : amount
        });
      }
      
      // Add current value as final cash flow
      cashFlows.push({
        date: new Date(),
        amount: currentValue
      });
      
      return XIRRCalculator.calculateXIRR(cashFlows);
    } catch (error) {
      console.error('Error calculating XIRR:', error);
      return null;
    }
  }
}
