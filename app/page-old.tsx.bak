'use client';

import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Wallet, RefreshCw, Calculator } from 'lucide-react';
import { Portfolio, LocalStorageDB } from '../lib/mongodb';
import { StockData, StockService } from '../lib/stockService';
import { XIRRCalculator } from '../lib/xirrCalculator';
import StockAutocomplete from '../components/StockAutocomplete';

export default function Home() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null);
  const [stockPrices, setStockPrices] = useState<Record<string, StockData>>({});
  const [loading, setLoading] = useState(false);
  const [showCreatePortfolio, setShowCreatePortfolio] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [portfolioXIRR, setPortfolioXIRR] = useState<number | null>(null);

  // Form states
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [newPortfolioCurrency, setNewPortfolioCurrency] = useState<'USD' | 'CAD' | 'INR'>('USD');
  const [newStockSymbol, setNewStockSymbol] = useState('');
  const [newStockShares, setNewStockShares] = useState('');
  const [newStockPrice, setNewStockPrice] = useState('');
  const [newTransactionDate, setNewTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');
  const [newStockMarket, setNewStockMarket] = useState<'US' | 'CA' | 'IN'>('US');
  const [selectedStock, setSelectedStock] = useState<{symbol: string, name: string, market: 'US' | 'CA' | 'IN'} | null>(null);

  useEffect(() => {
    loadPortfolios();
  }, []);

  useEffect(() => {
    if (selectedPortfolio) {
      loadStockPrices();
      calculateXIRR();
    }
  }, [selectedPortfolio]);

  const calculateXIRR = async () => {
    if (!selectedPortfolio) return;
    
    try {
      const xirr = await StockService.calculatePortfolioXIRR(selectedPortfolio);
      setPortfolioXIRR(xirr);
    } catch (error) {
      console.error('Error calculating XIRR:', error);
      setPortfolioXIRR(null);
    }
  };

  const loadPortfolios = async () => {
    try {
      const data = LocalStorageDB.getPortfolios();
      setPortfolios(data);
      if (data.length > 0 && !selectedPortfolio) {
        setSelectedPortfolio(data[0]);
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
    try {
      LocalStorageDB.addPortfolio({
        name: newPortfolioName,
        currency: newPortfolioCurrency,
        stocks: [],
        transactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      setNewPortfolioName('');
      setShowCreatePortfolio(false);
      loadPortfolios();
    } catch (error) {
      console.error('Error creating portfolio:', error);
    }
  };

  const addStock = async (e: any) => {
    e.preventDefault();
    if (!selectedPortfolio) return;

    try {
      // Add as a transaction instead of directly to stocks
      LocalStorageDB.addTransaction(selectedPortfolio._id!, {
        stockSymbol: newStockSymbol.toUpperCase(),
        type: transactionType,
        shares: parseFloat(newStockShares),
        price: parseFloat(newStockPrice),
        amount: parseFloat(newStockShares) * parseFloat(newStockPrice),
        date: new Date(newTransactionDate),
        market: newStockMarket,
      });
      
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

  const calculatePortfolioValue = () => {
    if (!selectedPortfolio) return 0;
    
    return selectedPortfolio.stocks.reduce((total, stock) => {
      const stockData = stockPrices[stock.symbol];
      if (stockData) {
        const value = stockData.price * stock.shares;
        return total + StockService.convertCurrency(value, stockData.currency, selectedPortfolio.currency);
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
        const convertedCurrentValue = StockService.convertCurrency(currentValue, stockData.currency, selectedPortfolio.currency);
        const costValue = stock.avgPrice * stock.shares;
        
        totalCurrentValue += convertedCurrentValue;
        totalCost += costValue;
      }
    });
    
    const gain = totalCurrentValue - totalCost;
    const percentage = totalCost > 0 ? (gain / totalCost) * 100 : 0;
    
    return { gain, percentage };
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols = { USD: '$', CAD: 'C$', INR: '₹' };
    return `${symbols[currency as keyof typeof symbols]}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const portfolioValue = calculatePortfolioValue();
  const { gain, percentage } = calculateTotalGainLoss();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Portfolio Tracker</h1>
            <button
              onClick={() => setShowCreatePortfolio(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md flex items-center gap-2 border-0"
              style={{ color: '#ffffff' }}
            >
              <Plus className="w-4 h-4" />
              New Portfolio
            </button>
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
                    <p className="text-sm font-medium text-gray-600">Total Value</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(portfolioValue, selectedPortfolio.currency)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Gain/Loss</p>
                    <p className={`text-2xl font-bold ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(gain, selectedPortfolio.currency)}
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

            {/* Stocks Table */}
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
                      onClick={() => {
                        const data = LocalStorageDB.getPortfolios();
                        console.log('Portfolio Data:', data);
                        alert(`Found ${data.length} portfolio(s). Check console for details.`);
                      }}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-medium px-3 py-2 rounded-md flex items-center gap-2 border-0"
                      style={{ color: '#ffffff' }}
                    >
                      Debug DB
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
                        ? StockService.convertCurrency(marketValue, stockData.currency, selectedPortfolio.currency)
                        : 0;
                      const costValue = stock.avgPrice * stock.shares;
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
                          <td className="p-4 text-gray-600">{stock.shares}</td>
                          <td className="p-4 text-gray-600">
                            {formatCurrency(stock.avgPrice, selectedPortfolio.currency)}
                          </td>
                          <td className="p-4 text-gray-600">
                            {stockData ? (
                              <div>
                                <div className="font-medium">{formatCurrency(stockData.price, stockData.currency)}</div>
                                <div className={`text-sm ${(stockData.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {(stockData.changePercent || 0) >= 0 ? '+' : ''}{(stockData.changePercent || 0).toFixed(2)}%
                                  ({(stockData.changePercent || 0) >= 0 ? '+' : ''}{formatCurrency(stockData.change || 0, stockData.currency)})
                                </div>
                              </div>
                            ) : loading ? (
                              <div className="text-gray-600">Loading...</div>
                            ) : (
                              <div className="text-gray-600">N/A</div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="font-medium text-gray-900">
                              {formatCurrency(convertedMarketValue, selectedPortfolio.currency)}
                            </div>
                          </td>
                          <td className={`p-4 ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            <div className="font-medium">{formatCurrency(gainLoss, selectedPortfolio.currency)}</div>
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
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPortfolio.transactions?.slice().reverse().map((transaction, index) => (
                      <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
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
                        <td className="p-4 text-gray-600">{transaction.shares}</td>
                        <td className="p-4 text-gray-600">
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
                  onChange={(e) => setNewPortfolioCurrency(e.target.value as 'USD' | 'CAD' | 'INR')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="CAD">CAD - Canadian Dollar</option>
                  <option value="INR">INR - Indian Rupee</option>
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
            <form onSubmit={addStock}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Date
                </label>
                <input
                  type="date"
                  value={newTransactionDate}
                  onChange={(e) => setNewTransactionDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">
                  This date will be used for historical price lookup and XIRR calculations
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <p className="text-xs text-gray-600 mt-2">
                  Start typing to search for stocks across US, Canadian, and Indian markets
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <p className="text-xs text-gray-600 mt-1">
                    Market automatically set based on selected stock
                  </p>
                )}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price per Share ({selectedPortfolio?.currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newStockPrice}
                  onChange={(e) => setNewStockPrice(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">
                  Enter the actual {transactionType} price on {newTransactionDate}
                </p>
              </div>
              <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <div className="text-sm font-medium text-gray-700">Transaction Summary</div>
                <div className="text-sm text-gray-600 mt-1">
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
    </div>
  );
}
