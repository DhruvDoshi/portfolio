// For client-side storage 
export interface Transaction {
  id: string;
  stockSymbol: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  amount: number;
  date: Date;
  market: 'US' | 'CA' | 'IN';
}

export interface Portfolio {
  _id?: string;
  name: string;
  currency: 'USD' | 'CAD' | 'INR';
  stocks: {
    symbol: string;
    shares: number;
    avgPrice: number;
    market: 'US' | 'CA' | 'IN';
  }[];
  transactions: Transaction[];
  createdAt: Date;
  updatedAt: Date;
}

export class LocalStorageDB {
  private static PORTFOLIOS_KEY = 'portfolio_tracker_portfolios';

  static getPortfolios(): Portfolio[] {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(this.PORTFOLIOS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static savePortfolios(portfolios: Portfolio[]): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.PORTFOLIOS_KEY, JSON.stringify(portfolios));
  }

  static addPortfolio(portfolio: Omit<Portfolio, '_id'>): Portfolio {
    const portfolios = this.getPortfolios();
    const newPortfolio: Portfolio = {
      ...portfolio,
      _id: Date.now().toString(),
      transactions: portfolio.transactions || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    portfolios.push(newPortfolio);
    this.savePortfolios(portfolios);
    return newPortfolio;
  }

  static updatePortfolio(id: string, updates: Partial<Portfolio>): boolean {
    const portfolios = this.getPortfolios();
    const index = portfolios.findIndex(p => p._id === id);
    if (index === -1) return false;
    
    portfolios[index] = { ...portfolios[index], ...updates, updatedAt: new Date() };
    this.savePortfolios(portfolios);
    return true;
  }

  static addStockToPortfolio(portfolioId: string, stock: Portfolio['stocks'][0]): boolean {
    const portfolios = this.getPortfolios();
    const portfolio = portfolios.find(p => p._id === portfolioId);
    if (!portfolio) return false;
    
    // Check if stock already exists
    const existingStockIndex = portfolio.stocks.findIndex(s => s.symbol === stock.symbol && s.market === stock.market);
    
    if (existingStockIndex >= 0) {
      // Update existing stock with weighted average price
      const existingStock = portfolio.stocks[existingStockIndex];
      const totalShares = existingStock.shares + stock.shares;
      const totalValue = (existingStock.shares * existingStock.avgPrice) + (stock.shares * stock.avgPrice);
      
      portfolio.stocks[existingStockIndex] = {
        ...existingStock,
        shares: totalShares,
        avgPrice: totalValue / totalShares
      };
    } else {
      // Add new stock
      portfolio.stocks.push(stock);
    }
    
    // Add transaction record
    const transaction: Transaction = {
      id: Date.now().toString(),
      stockSymbol: stock.symbol,
      type: 'buy',
      shares: stock.shares,
      price: stock.avgPrice,
      amount: stock.shares * stock.avgPrice,
      date: new Date(),
      market: stock.market
    };
    
    if (!portfolio.transactions) {
      portfolio.transactions = [];
    }
    portfolio.transactions.push(transaction);
    
    portfolio.updatedAt = new Date();
    this.savePortfolios(portfolios);
    return true;
  }

  static addTransaction(portfolioId: string, transaction: Omit<Transaction, 'id'>): boolean {
    const portfolios = this.getPortfolios();
    const portfolio = portfolios.find(p => p._id === portfolioId);
    if (!portfolio) return false;

    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
    };

    if (!portfolio.transactions) {
      portfolio.transactions = [];
    }
    portfolio.transactions.push(newTransaction);

    // Update stock holdings based on transaction
    this.updateStockHoldings(portfolio, newTransaction);

    portfolio.updatedAt = new Date();
    this.savePortfolios(portfolios);
    return true;
  }

  private static updateStockHoldings(portfolio: Portfolio, transaction: Transaction): void {
    const stockIndex = portfolio.stocks.findIndex(
      s => s.symbol === transaction.stockSymbol && s.market === transaction.market
    );

    if (transaction.type === 'buy') {
      if (stockIndex >= 0) {
        // Update existing stock
        const existingStock = portfolio.stocks[stockIndex];
        const totalShares = existingStock.shares + transaction.shares;
        const totalValue = (existingStock.shares * existingStock.avgPrice) + transaction.amount;
        
        portfolio.stocks[stockIndex] = {
          ...existingStock,
          shares: totalShares,
          avgPrice: totalValue / totalShares
        };
      } else {
        // Add new stock
        portfolio.stocks.push({
          symbol: transaction.stockSymbol,
          shares: transaction.shares,
          avgPrice: transaction.price,
          market: transaction.market
        });
      }
    } else if (transaction.type === 'sell' && stockIndex >= 0) {
      // Reduce shares for sell transaction
      const existingStock = portfolio.stocks[stockIndex];
      const newShares = existingStock.shares - transaction.shares;
      
      if (newShares <= 0) {
        // Remove stock if all shares sold
        portfolio.stocks.splice(stockIndex, 1);
      } else {
        portfolio.stocks[stockIndex] = {
          ...existingStock,
          shares: newShares
        };
      }
    }
  }
}
