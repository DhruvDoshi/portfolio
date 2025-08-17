'use client';

import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Wallet, RefreshCw, Calculator, LogOut, Edit, Trash2 } from 'lucide-react';
import { StockData, StockService } from '../lib/stockService';
import { XIRRCalculator } from '../lib/xirrCalculator';
import StockAutocomplete from '../components/StockAutocomplete';
import AuthPage from '../components/AuthPage';

// Updated interfaces for MongoDB
interface Portfolio {
  _id?: string;
  userId: string;
  name: string;
  currency: 'USD' | 'CAD' | 'INR' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CHF' | 'CNY' | 'HKD' | 'NZD';
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

interface Transaction {
  _id?: string;
  id?: string; // For compatibility with stockService
  portfolioId: string;
  userId: string;
  stockSymbol: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  amount: number;
  currency: 'USD' | 'CAD' | 'INR' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CHF' | 'CNY' | 'HKD' | 'NZD';
  date: Date;
  market: 'US' | 'CA' | 'IN';
  createdAt: Date;
}

interface User {
  id: string;
  email: string;
  name: string;
}

export default function Home() {
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Portfolio state
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [stockPrices, setStockPrices] = useState<Record<string, StockData>>({});
  const [loading, setLoading] = useState(false);
  const [showCreatePortfolio, setShowCreatePortfolio] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  // Currency conversion cache for UI
  const [currencyRates, setCurrencyRates] = useState<Record<string, number>>({});
  const [portfolioXIRR, setPortfolioXIRR] = useState<number | null>(null);
  
  const loadExchangeRates = async () => {
    if (!selectedPortfolio) return;
    
    const rates: Record<string, number> = {};
    const uniqueCurrencies = new Set<string>();
    
    // Collect all currencies we need to convert
    selectedPortfolio.stocks.forEach(stock => {
      const stockData = stockPrices[stock.symbol];
      if (stockData && stockData.currency !== selectedPortfolio.currency) {
        uniqueCurrencies.add(stockData.currency);
      }
    });
    
    // Load current exchange rates via API to USD
    const requests = Array.from(uniqueCurrencies).map(currency => ({
      from: currency,
      to: 'USD'
    }));

    if (requests.length === 0) return;

    try {
      const response = await fetch('/api/exchange-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });

      if (response.ok) {
        const data = await response.json();
        data.results.forEach((result: any) => {
          if (result.success) {
            rates[`${result.from}_${result.to}`] = result.rate;
          }
        });
        setCurrencyRates(rates);
      }
    } catch (error) {
      console.error('Error loading exchange rates:', error);
    }
  };

  const convertCurrencySync = (amount: number, fromCurrency: string, toCurrency: string): number => {
    if (fromCurrency === toCurrency) return amount;
    
    const rateKey = `${fromCurrency}_${toCurrency}`;
    const rate = currencyRates[rateKey];
    
    if (rate) {
      return amount * rate;
    }
    
    // Fallback to approximate rates if not loaded yet
    const fallbackRates: Record<string, Record<string, number>> = {
      'USD': { 'CAD': 1.35, 'INR': 83.0 },
      'CAD': { 'USD': 0.74, 'INR': 61.5 },
      'INR': { 'USD': 0.012, 'CAD': 0.016 }
    };
    
    return amount * (fallbackRates[fromCurrency]?.[toCurrency] || 1);
  };

  // Transaction management states
  const [showEditTransaction, setShowEditTransaction] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form states
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioCurrency, setNewPortfolioCurrency] = useState<Portfolio['currency']>('USD');
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [newStockShares, setNewStockShares] = useState('');
  const [newStockPrice, setNewStockPrice] = useState('');
  const [newTransactionDate, setNewTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');
  const [newStockMarket, setNewStockMarket] = useState<'US' | 'CA' | 'IN'>('US');
  const [selectedStock, setSelectedStock] = useState<{symbol: string, name: string, market: 'US' | 'CA' | 'IN'} | null>(null);
  const [newTransactionCurrency, setNewTransactionCurrency] = useState<Transaction['currency']>('USD');

  useEffect(() => {
    // Check for existing auth token on page load
    const token = localStorage.getItem('auth-token');
    if (token) {
      setAuthToken(token);
      // TODO: Verify token and get user info
      loadPortfolios(token);
    }
  }, []);

  useEffect(() => {
    if (selectedPortfolio) {
      loadStockPrices();
      loadExchangeRates();
      calculateXIRR();
      setNewTransactionCurrency(selectedPortfolio.currency);
    }
  }, [selectedPortfolio]);

  useEffect(() => {
    if (selectedPortfolio && Object.keys(currencyRates).length > 0) {
      // Recalculate when exchange rates are loaded
    }
  }, [currencyRates]);

  const handleLogin = (token: string, userData: User) => {
    setAuthToken(token);
    setUser(userData);
    loadPortfolios(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth-token');
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    setAuthToken(null);
    setUser(null);
    setPortfolios([]);
    setSelectedPortfolio(null);
  };

  const calculateXIRR = async () => {
    if (!selectedPortfolio) return;
    
    try {
      // Convert MongoDB transactions to stockService format
      const compatiblePortfolio = {
        ...selectedPortfolio,
        transactions: selectedPortfolio.transactions.map(t => ({
          ...t,
          id: t._id || t.id || Date.now().toString()
        }))
      };
      
      const xirr = await StockService.calculatePortfolioXIRR(compatiblePortfolio);
      setPortfolioXIRR(xirr);
    } catch (error) {
      console.error('Error calculating XIRR:', error);
      setPortfolioXIRR(null);
    }
  };

  const loadPortfolios = async (token?: string) => {
    try {
      const currentToken = token || authToken;
      if (!currentToken) return;

      const response = await fetch('/api/portfolios', {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load portfolios');
      }

      const data = await response.json();
      setPortfolios(data.portfolios);
      
      // Update selected portfolio with fresh data if one is currently selected
      if (selectedPortfolio && data.portfolios.length > 0) {
        const updatedSelectedPortfolio = data.portfolios.find(
          (p: Portfolio) => p._id === selectedPortfolio._id
        );
        if (updatedSelectedPortfolio) {
          setSelectedPortfolio(updatedSelectedPortfolio);
        }
      } else if (data.portfolios.length > 0 && !selectedPortfolio) {
        setSelectedPortfolio(data.portfolios[0]);
      }
    } catch (error) {
      console.error('Error loading portfolios:', error);
    }
  };

  const loadStockPrices = async () => {
    if (!selectedPortfolio) return;
    
    setLoading(true);
    const prices: Record<string, StockData> = {};
    
    for (const stock of selectedPortfolio.stocks) {
      try {
        const data = await StockService.getStockData(stock.symbol, stock.market);
        prices[stock.symbol] = data;
      } catch (error) {
        console.error(`Error loading price for ${stock.symbol}:`, error);
      }
    }
    
    setStockPrices(prices);
    setLoading(false);
  };

  const createPortfolio = async (e: any) => {
    e.preventDefault();
    if (!authToken) return;

    try {
      const response = await fetch('/api/portfolios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: newPortfolioName,
          currency: newPortfolioCurrency,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create portfolio');
      }

      setNewPortfolioName('');
      setShowCreatePortfolio(false);
      loadPortfolios();
    } catch (error) {
      console.error('Error creating portfolio:', error);
    }
  };

  const addTransaction = async (e: any) => {
    e.preventDefault();
    if (!selectedPortfolio || !authToken) return;

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          portfolioId: selectedPortfolio._id,
          stockSymbol: newStockSymbol.toUpperCase(),
          type: transactionType,
          shares: parseFloat(newStockShares),
          price: parseFloat(newStockPrice),
          amount: parseFloat(newStockShares) * parseFloat(newStockPrice),
          currency: newTransactionCurrency,
          date: new Date(newTransactionDate),
          market: newStockMarket,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add transaction');
      }

      setNewStockSymbol('');
      setNewStockShares('');
      setNewStockPrice('');
      setNewTransactionDate(new Date().toISOString().split('T')[0]);
      setTransactionType('buy');
      setSelectedStock(null);
      setShowAddStock(false);
      loadPortfolios();
      loadStockPrices();
      calculateXIRR();
    } catch (error) {
      console.error('Error adding transaction:', error);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setNewStockSymbol(transaction.stockSymbol);
    setNewStockShares(transaction.shares.toString());
    setNewStockPrice(transaction.price.toString());
    setNewTransactionDate(new Date(transaction.date).toISOString().split('T')[0]);
    setTransactionType(transaction.type);
    setNewStockMarket(transaction.market);
    setNewTransactionCurrency(transaction.currency);
    setShowEditTransaction(true);
  };

  const updateTransaction = async (e: any) => {
    e.preventDefault();
    if (!editingTransaction || !authToken) return;

    try {
      const response = await fetch(`/api/transactions/${editingTransaction._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          stockSymbol: newStockSymbol.toUpperCase(),
          type: transactionType,
          shares: parseFloat(newStockShares),
          price: parseFloat(newStockPrice),
          amount: parseFloat(newStockShares) * parseFloat(newStockPrice),
          currency: newTransactionCurrency,
          date: new Date(newTransactionDate),
          market: newStockMarket,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update transaction');
      }

      setShowEditTransaction(false);
      setEditingTransaction(null);
      resetTransactionForm();
      loadPortfolios();
      loadStockPrices();
      calculateXIRR();
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    if (!authToken || !confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }

      loadPortfolios();
      loadStockPrices();
      calculateXIRR();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const resetTransactionForm = () => {
    setNewStockSymbol('');
    setNewStockShares('');
    setNewStockPrice('');
    setNewTransactionDate(new Date().toISOString().split('T')[0]);
    setTransactionType('buy');
    setSelectedStock(null);
    setNewStockMarket('US');
    if (selectedPortfolio) {
      setNewTransactionCurrency(selectedPortfolio.currency);
    }
  };

  const calculatePortfolioValue = () => {
    if (!selectedPortfolio) return 0;
    
    return selectedPortfolio.stocks.reduce((total, stock) => {
      const stockData = stockPrices[stock.symbol];
      if (stockData) {
        const value = stockData.price * stock.shares;
        return total + convertCurrencySync(value, stockData.currency, 'USD');
      }
      return total;
    }, 0);
  };

  const calculateTotalGainLoss = () => {
    if (!selectedPortfolio) return { gain: 0, percentage: 0 };
    
    let totalCurrentValue = 0;
    let totalCost = 0;
    
    selectedPortfolio.stocks.forEach(stock => {
      const stockData = stockPrices[stock.symbol];
      if (stockData) {
        const currentValue = stockData.price * stock.shares;
        const convertedCurrentValue = convertCurrencySync(currentValue, stockData.currency, 'USD');
        
        // Cost basis is already in portfolio currency, but we need to convert to USD
        const costInPortfolioCurrency = stock.avgPrice * stock.shares;
        const convertedCostValue = convertCurrencySync(costInPortfolioCurrency, selectedPortfolio.currency, 'USD');

        totalCurrentValue += convertedCurrentValue;
        totalCost += convertedCostValue;
      }
    });
    
    const gain = totalCurrentValue - totalCost;
    const percentage = totalCost > 0 ? (gain / totalCost) * 100 : 0;
    
    return { gain, percentage };
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = {
      USD: '$',
      CAD: 'C$',
      INR: '₹',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      AUD: 'A$',
      CHF: 'CHF',
      CNY: '¥',
      HKD: 'HK$',
      NZD: 'NZ$',
    };
    const symbol = symbols[currency] || currency;
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Show login page if not authenticated
  if (!authToken) {
    return <AuthPage onLogin={handleLogin} />;
  }

  const portfolioValue = calculatePortfolioValue();
  const { gain, percentage } = calculateTotalGainLoss();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Portfolio Tracker</h1>
              {user && (
                <p className="text-sm text-gray-600 mt-1">Welcome back, {user.name}!</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowCreatePortfolio(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md flex items-center gap-2 border-0"
                style={{ color: '#ffffff' }}
              >
                <Plus className="w-4 h-4" />
                New Portfolio
              </button>
              <button
                onClick={handleLogout}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-md flex items-center gap-2 border-0"
                style={{ color: '#ffffff' }}
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
          
          {/* Portfolio Selector */}
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium text-gray-700">Portfolio:</label>
            <select
              value={selectedPortfolio?._id || ''}
              onChange={(e) => {
                const portfolio = portfolios.find(p => p._id === e.target.value);
                setSelectedPortfolio(portfolio || null);
              }}
              className="border border-gray-300 rounded-md px-3 py-2 bg-white"
            >
              <option value="">Select a portfolio</option>
              {portfolios.map(portfolio => (
                <option key={portfolio._id} value={portfolio._id}>
                  {portfolio.name} ({portfolio.currency})
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedPortfolio && (
          <>
            {/* Portfolio Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Value (USD)</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(portfolioValue, 'USD')}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Gain/Loss (USD)</p>
                    <p className={`text-2xl font-bold ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(gain, 'USD')}
                    </p>
                  </div>
                  {gain >= 0 ? (
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-red-600" />
                  )}
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Return %</p>
                    <p className={`text-2xl font-bold ${percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {percentage.toFixed(2)}%
                    </p>
                  </div>
                  <Wallet className="w-8 h-8 text-purple-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      XIRR
                      <span className="text-xs text-gray-600 block">Annualized Return</span>
                    </p>
                    <p className={`text-2xl font-bold ${portfolioXIRR && portfolioXIRR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {XIRRCalculator.formatXIRR(portfolioXIRR)}
                    </p>
                  </div>
                  <Calculator className="w-8 h-8 text-indigo-600" />
                </div>
              </div>
            </div>

            {/* Holdings Table */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Holdings</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        loadStockPrices();
                        calculateXIRR();
                      }}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-3 py-2 rounded-md flex items-center gap-2 border-0"
                      style={{ color: '#ffffff' }}
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      {loading ? 'Loading...' : 'Refresh'}
                    </button>
                    <button
                      onClick={() => setShowAddStock(true)}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-md flex items-center gap-2 border-0"
                      style={{ color: '#ffffff' }}
                    >
                      <Plus className="w-4 h-4" />
                      Add Transaction
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-4 font-medium text-gray-900">Company</th>
                      <th className="text-left p-4 font-medium text-gray-900">Shares</th>
                      <th className="text-left p-4 font-medium text-gray-900">Avg Price</th>
                      <th className="text-left p-4 font-medium text-gray-900">Current Price</th>
                      <th className="text-left p-4 font-medium text-gray-900">Market Value</th>
                      <th className="text-left p-4 font-medium text-gray-900">Gain/Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPortfolio.stocks.map((stock, index) => {
                      const stockData = stockPrices[stock.symbol];
                      const marketValue = stockData ? stockData.price * stock.shares : 0;
                      const convertedMarketValue = stockData 
                        ? convertCurrencySync(marketValue, stockData.currency, 'USD')
                        : 0;
                      
                      // Cost basis is in portfolio currency, so convert to USD
                      const costInPortfolioCurrency = stock.avgPrice * stock.shares;
                      const costValue = convertCurrencySync(costInPortfolioCurrency, selectedPortfolio.currency, 'USD');
                      
                      const gainLoss = convertedMarketValue - costValue;
                      const gainLossPercent = costValue > 0 ? (gainLoss / costValue) * 100 : 0;
                      
                      return (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {stockData?.name || `${stock.symbol} Corporation`}
                                </div>
                                <div className="text-sm text-gray-600 flex items-center gap-2">
                                  <span>{stock.symbol}</span>
                                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                                    {stock.market}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-gray-900">{stock.shares}</td>
                          <td className="p-4 text-gray-900">
                            {formatCurrency(stock.avgPrice, selectedPortfolio.currency)}
                          </td>
                          <td className="p-4 text-gray-900">
                            {stockData ? (
                              <div>
                                <div className="font-medium text-gray-900">{formatCurrency(stockData.price, stockData.currency)}</div>
                                {stockData.currency !== 'USD' && (
                                  <div className="text-xs text-gray-600">
                                    ≈ {formatCurrency(convertCurrencySync(stockData.price, stockData.currency, 'USD'), 'USD')}
                                  </div>
                                )}
                                <div className={`text-sm ${(stockData.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {(stockData.changePercent || 0) >= 0 ? '+' : ''}{(stockData.changePercent || 0).toFixed(2)}%
                                  ({(stockData.changePercent || 0) >= 0 ? '+' : ''}{formatCurrency(stockData.change || 0, stockData.currency)})
                                </div>
                              </div>
                            ) : loading ? (
                              <div className="text-gray-900">Loading...</div>
                            ) : (
                              <div className="text-gray-900">N/A</div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-gray-900">
                              {formatCurrency(convertedMarketValue, 'USD')}
                            </div>
                            {stockData && stockData.currency !== 'USD' && (
                              <div className="text-xs text-gray-600">
                                {formatCurrency(marketValue, stockData.currency)} {stockData.currency}
                              </div>
                            )}
                          </td>
                          <td className={`p-4 ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            <div className="font-medium">{formatCurrency(gainLoss, 'USD')}</div>
                            <div className="text-sm">
                              {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {selectedPortfolio.stocks.length === 0 && (
                  <div className="p-8 text-center text-gray-600">
                    No stocks in this portfolio. Add some transactions to get started!
                  </div>
                )}
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-lg shadow-sm mt-6">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-4 font-medium text-gray-900">Date</th>
                      <th className="text-left p-4 font-medium text-gray-900">Type</th>
                      <th className="text-left p-4 font-medium text-gray-900">Stock</th>
                      <th className="text-left p-4 font-medium text-gray-900">Shares</th>
                      <th className="text-left p-4 font-medium text-gray-900">Price</th>
                      <th className="text-left p-4 font-medium text-gray-900">Amount</th>
                      <th className="text-left p-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPortfolio.transactions?.slice().reverse().map((transaction, index) => (
                      <tr key={transaction._id || index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 text-gray-600">
                          {new Date(transaction.date).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.type === 'buy' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{transaction.stockSymbol}</span>
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                              {transaction.market}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-900">{transaction.shares}</td>
                        <td className="p-4 text-gray-900">
                          {formatCurrency(transaction.price, selectedPortfolio.currency)}
                        </td>
                        <td className="p-4">
                          <span className={`font-medium ${
                            transaction.type === 'buy' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {transaction.type === 'buy' ? '-' : '+'}
                            {formatCurrency(transaction.amount, selectedPortfolio.currency)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditTransaction(transaction)}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                              title="Edit transaction"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteTransaction(transaction._id!)}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {(!selectedPortfolio.transactions || selectedPortfolio.transactions.length === 0) && (
                  <div className="p-8 text-center text-gray-600">
                    No transactions recorded. Add your first transaction to get started!
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {portfolios.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Wallet className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Portfolios Found</h2>
            <p className="text-gray-600 mb-6">Create your first portfolio to start tracking your investments</p>
            <button
              onClick={() => setShowCreatePortfolio(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-md border-0"
              style={{ color: '#ffffff' }}
            >
              Create Portfolio
            </button>
          </div>
        )}
      </div>

      {/* Create Portfolio Modal */}
      {showCreatePortfolio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Create New Portfolio</h2>
            <form onSubmit={createPortfolio}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Portfolio Name
                </label>
                <input
                  type="text"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Currency
                </label>
                <select
                  value={newPortfolioCurrency}
                  onChange={(e) => setNewPortfolioCurrency(e.target.value as Portfolio['currency'])}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  {ExchangeRateService.getSupportedCurrencies().map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreatePortfolio(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md border-0"
                  style={{ color: '#ffffff' }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Add Transaction</h2>
            <form onSubmit={addTransaction}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Transaction Type
                </label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value as 'buy' | 'sell')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Transaction Date
                </label>
                <input
                  type="date"
                  value={newTransactionDate}
                  onChange={(e) => setNewTransactionDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
                <p className="text-xs text-gray-800 mt-1">
                  This date will be used for historical price lookup and XIRR calculations
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Stock Symbol
                </label>
                <StockAutocomplete
                  value={newStockSymbol}
                  onChange={setNewStockSymbol}
                  onSelect={(suggestion) => {
                    setSelectedStock({
                      symbol: suggestion.symbol,
                      name: suggestion.name,
                      market: suggestion.market
                    });
                    setNewStockMarket(suggestion.market);
                  }}
                  placeholder="Search for stocks (e.g. Apple, Tesla, Shopify...)"
                  className="mb-2"
                />
                {selectedStock && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-blue-900">{selectedStock.name}</div>
                        <div className="text-sm text-blue-700 flex items-center gap-2">
                          <span>{selectedStock.symbol}</span>
                          <span className="text-xs px-2 py-1 bg-blue-100 rounded-full">
                            {selectedStock.market}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStock(null);
                          setNewStockSymbol('');
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-800 mt-2">
                  Start typing to search for stocks across US, Canadian, and Indian markets
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Market
                </label>
                <select
                  value={newStockMarket}
                  onChange={(e) => setNewStockMarket(e.target.value as 'US' | 'CA' | 'IN')}
                  className={`w-full border border-gray-300 rounded-md px-3 py-2 ${selectedStock ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  disabled={!!selectedStock}
                >
                  <option value="US">US - United States</option>
                  <option value="CA">CA - Canada</option>
                  <option value="IN">IN - India</option>
                </select>
                {selectedStock && (
                  <p className="text-xs text-gray-800 mt-1">
                    Market automatically set based on selected stock
                  </p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Number of Shares
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={newStockShares}
                  onChange={(e) => setNewStockShares(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Price per Share
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newStockPrice}
                    onChange={(e) => setNewStockPrice(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Currency
                  </label>
                  <select
                    value={newTransactionCurrency}
                    onChange={(e) => setNewTransactionCurrency(e.target.value as Transaction['currency'])}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {ExchangeRateService.getSupportedCurrencies().map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-800 mt-1 mb-4">
                Enter the actual {transactionType} price on {newTransactionDate} in its original currency.
              </p>
              <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <div className="text-sm font-medium text-gray-900">Transaction Summary</div>
                <div className="text-sm text-gray-800 mt-1">
                  {transactionType === 'buy' ? 'Buy' : 'Sell'} {newStockShares || '0'} shares 
                  {newStockSymbol && ` of ${newStockSymbol.toUpperCase()}`}
                  {newStockPrice && newStockShares && (
                    <span className="font-medium">
                      {' '}for {formatCurrency(parseFloat(newStockPrice) * parseFloat(newStockShares), selectedPortfolio?.currency || 'USD')}
                    </span>
                  )}
                  {newTransactionDate && ` on ${new Date(newTransactionDate).toLocaleDateString()}`}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStock(false);
                    setSelectedStock(null);
                    setNewStockSymbol('');
                    setNewStockShares('');
                    setNewStockPrice('');
                    setNewTransactionDate(new Date().toISOString().split('T')[0]);
                    setTransactionType('buy');
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`flex-1 font-medium px-4 py-2 rounded-md border-0 ${
                    transactionType === 'buy' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  style={{ color: '#ffffff' }}
                >
                  {transactionType === 'buy' ? 'Buy Stock' : 'Sell Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditTransaction && editingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Transaction</h2>
            <form onSubmit={updateTransaction}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Transaction Type
                </label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value as 'buy' | 'sell')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Transaction Date
                </label>
                <input
                  type="date"
                  value={newTransactionDate}
                  onChange={(e) => setNewTransactionDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Stock Symbol
                </label>
                <input
                  type="text"
                  value={newStockSymbol}
                  onChange={(e) => setNewStockSymbol(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Market
                </label>
                <select
                  value={newStockMarket}
                  onChange={(e) => setNewStockMarket(e.target.value as 'US' | 'CA' | 'IN')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="US">US - United States</option>
                  <option value="CA">CA - Canada</option>
                  <option value="IN">IN - India</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Number of Shares
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={newStockShares}
                  onChange={(e) => setNewStockShares(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Price per Share
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newStockPrice}
                    onChange={(e) => setNewStockPrice(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Currency
                  </label>
                  <select
                    value={newTransactionCurrency}
                    onChange={(e) => setNewTransactionCurrency(e.target.value as Transaction['currency'])}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {ExchangeRateService.getSupportedCurrencies().map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <div className="text-sm font-medium text-gray-900">Transaction Summary</div>
                <div className="text-sm text-gray-800 mt-1">
                  {transactionType === 'buy' ? 'Buy' : 'Sell'} {newStockShares || '0'} shares 
                  {newStockSymbol && ` of ${newStockSymbol.toUpperCase()}`}
                  {newStockPrice && newStockShares && (
                    <span className="font-medium">
                      {' '}for {formatCurrency(parseFloat(newStockPrice) * parseFloat(newStockShares), selectedPortfolio?.currency || 'USD')}
                    </span>
                  )}
                  {newTransactionDate && ` on ${new Date(newTransactionDate).toLocaleDateString()}`}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditTransaction(false);
                    setEditingTransaction(null);
                    resetTransactionForm();
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md border-0"
                  style={{ color: '#ffffff' }}
                >
                  Update Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
