import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, TrendingUp, DollarSign, Percent } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { portfoliosAPI, stocksAPI } from '../utils/api';
import toast from 'react-hot-toast';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const PortfolioDetail = () => {
  const { id } = useParams();
  const [portfolio, setPortfolio] = useState(null);
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [xirr, setXirr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [stockSearch, setStockSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentPrices, setCurrentPrices] = useState({});
  const [newTransaction, setNewTransaction] = useState({
    symbol: '',
    type: 'BUY',
    quantity: '',
    price: '',
    date: new Date().toISOString().split('T')[0],
    fees: '',
    notes: ''
  });

  useEffect(() => {
    fetchPortfolioData();
  }, [id]);

  useEffect(() => {
    if (summary && Object.keys(summary.holdings).length > 0) {
      fetchCurrentPrices();
      fetchXIRR();
    }
  }, [summary]);

  const fetchPortfolioData = async () => {
    try {
      const [portfolioRes, summaryRes, transactionsRes] = await Promise.all([
        portfoliosAPI.getById(id),
        portfoliosAPI.getSummary(id),
        portfoliosAPI.getTransactions(id)
      ]);
      
      setPortfolio(portfolioRes.data);
      setSummary(summaryRes.data);
      setTransactions(transactionsRes.data);
    } catch (error) {
      toast.error('Failed to fetch portfolio data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentPrices = async () => {
    try {
      const symbols = Object.keys(summary.holdings);
      const response = await stocksAPI.getMultipleQuotes(symbols);
      const prices = {};
      response.data.forEach(stock => {
        if (!stock.error) {
          prices[stock.symbol] = stock.currentPrice;
        }
      });
      setCurrentPrices(prices);
    } catch (error) {
      console.error('Failed to fetch current prices:', error);
    }
  };

  const fetchXIRR = async () => {
    try {
      const response = await stocksAPI.getXIRR(id);
      setXirr(response.data.xirr);
    } catch (error) {
      console.error('Failed to fetch XIRR:', error);
    }
  };

  const searchStocks = async (query) => {
    if (query.length > 1) {
      try {
        const response = await stocksAPI.search(query);
        setSearchResults(response.data);
      } catch (error) {
        console.error('Search failed:', error);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    try {
      await portfoliosAPI.addTransaction(id, {
        ...newTransaction,
        quantity: parseFloat(newTransaction.quantity),
        price: parseFloat(newTransaction.price),
        fees: parseFloat(newTransaction.fees) || 0
      });
      
      setNewTransaction({
        symbol: '',
        type: 'BUY',
        quantity: '',
        price: '',
        date: new Date().toISOString().split('T')[0],
        fees: '',
        notes: ''
      });
      setShowAddTransaction(false);
      fetchPortfolioData();
      toast.success('Transaction added successfully!');
    } catch (error) {
      toast.error('Failed to add transaction');
    }
  };

  const calculateCurrentValue = () => {
    let totalValue = 0;
    Object.entries(summary.holdings).forEach(([symbol, holding]) => {
      const currentPrice = currentPrices[symbol] || 0;
      totalValue += holding.quantity * currentPrice;
    });
    return totalValue;
  };

  const calculateGainLoss = () => {
    const currentValue = calculateCurrentValue();
    const totalInvested = summary.totalInvested;
    return {
      absolute: currentValue - totalInvested,
      percentage: totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0
    };
  };

  const getPieChartData = () => {
    const currentValue = calculateCurrentValue();
    if (currentValue === 0) return [];
    
    return Object.entries(summary.holdings).map(([symbol, holding]) => {
      const currentPrice = currentPrices[symbol] || 0;
      const value = holding.quantity * currentPrice;
      return {
        name: symbol,
        value: value,
        percentage: (value / currentValue) * 100
      };
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="container">
        <div className="card">
          <h2>Portfolio not found</h2>
          <Link to="/portfolios" className="btn btn-primary">Back to Portfolios</Link>
        </div>
      </div>
    );
  }

  const gainLoss = calculateGainLoss();
  const currentValue = calculateCurrentValue();
  const pieChartData = getPieChartData();

  return (
    <div className="container">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Link to="/portfolios" className="btn btn-secondary">
          <ArrowLeft size={16} />
        </Link>
        <h1>{portfolio.name}</h1>
      </div>

      {/* Portfolio Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">${currentValue.toFixed(2)}</div>
          <div className="stat-label">Current Value</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">${summary.totalInvested.toFixed(2)}</div>
          <div className="stat-label">Total Invested</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value ${gainLoss.absolute >= 0 ? 'positive' : 'negative'}`}>
            ${gainLoss.absolute.toFixed(2)}
          </div>
          <div className="stat-label">Gain/Loss</div>
        </div>
        <div className="stat-card">
          <div className={`stat-value ${gainLoss.percentage >= 0 ? 'positive' : 'negative'}`}>
            {gainLoss.percentage.toFixed(2)}%
          </div>
          <div className="stat-label">Return %</div>
        </div>
        {xirr !== null && (
          <div className="stat-card">
            <div className={`stat-value ${xirr >= 0 ? 'positive' : 'negative'}`}>
              {xirr.toFixed(2)}%
            </div>
            <div className="stat-label">XIRR (Annualized)</div>
          </div>
        )}
      </div>

      <div className="grid grid-2">
        {/* Holdings Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Holdings</h3>
            <button 
              onClick={() => setShowAddTransaction(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} />
              Add Transaction
            </button>
          </div>
          
          {Object.keys(summary.holdings).length === 0 ? (
            <p>No holdings yet. Add your first transaction to get started.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Quantity</th>
                  <th>Avg Price</th>
                  <th>Current Price</th>
                  <th>Value</th>
                  <th>Gain/Loss</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.holdings).map(([symbol, holding]) => {
                  const currentPrice = currentPrices[symbol] || 0;
                  const currentValue = holding.quantity * currentPrice;
                  const gainLoss = currentValue - holding.totalCost;
                  const gainLossPercentage = holding.totalCost > 0 ? (gainLoss / holding.totalCost) * 100 : 0;
                  
                  return (
                    <tr key={symbol}>
                      <td><strong>{symbol}</strong></td>
                      <td>{holding.quantity}</td>
                      <td>${holding.avgPrice.toFixed(2)}</td>
                      <td>${currentPrice.toFixed(2)}</td>
                      <td>${currentValue.toFixed(2)}</td>
                      <td className={gainLoss >= 0 ? 'positive' : 'negative'}>
                        ${gainLoss.toFixed(2)} ({gainLossPercentage.toFixed(2)}%)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Portfolio Allocation Chart */}
        <div className="card">
          <h3>Portfolio Allocation</h3>
          {pieChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p>No data to display</p>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="card">
        <h3>Recent Transactions</h3>
        {transactions.length === 0 ? (
          <p>No transactions yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Symbol</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(transaction => (
                <tr key={transaction._id}>
                  <td>{new Date(transaction.date).toLocaleDateString()}</td>
                  <td><strong>{transaction.symbol}</strong></td>
                  <td>
                    <span className={transaction.type === 'BUY' ? 'positive' : 'negative'}>
                      {transaction.type}
                    </span>
                  </td>
                  <td>{transaction.quantity}</td>
                  <td>${transaction.price.toFixed(2)}</td>
                  <td>${((transaction.quantity * transaction.price) + transaction.fees).toFixed(2)}</td>
                  <td>{transaction.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Add Transaction</h3>
              <button 
                onClick={() => setShowAddTransaction(false)}
                className="close-button"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleAddTransaction}>
              <div className="form-group">
                <label className="form-label">Stock Symbol</label>
                <input
                  type="text"
                  value={stockSearch}
                  onChange={(e) => {
                    setStockSearch(e.target.value);
                    searchStocks(e.target.value);
                  }}
                  className="form-input"
                  placeholder="Search for stocks (e.g., AAPL, MSFT)"
                />
                {searchResults.length > 0 && (
                  <div style={{ border: '1px solid #ddd', borderTop: 'none', maxHeight: '150px', overflowY: 'auto' }}>
                    {searchResults.map(stock => (
                      <div 
                        key={stock.symbol}
                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                        onClick={() => {
                          setNewTransaction({ ...newTransaction, symbol: stock.symbol });
                          setStockSearch(stock.symbol);
                          setSearchResults([]);
                        }}
                      >
                        <strong>{stock.symbol}</strong> - {stock.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select
                    value={newTransaction.type}
                    onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value })}
                    className="form-select"
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newTransaction.quantity}
                    onChange={(e) => setNewTransaction({ ...newTransaction, quantity: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Price per Share</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newTransaction.price}
                    onChange={(e) => setNewTransaction({ ...newTransaction, price: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    value={newTransaction.date}
                    onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Fees (Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newTransaction.fees}
                  onChange={(e) => setNewTransaction({ ...newTransaction, fees: e.target.value })}
                  className="form-input"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <input
                  type="text"
                  value={newTransaction.notes}
                  onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
                  className="form-input"
                  placeholder="Any additional notes"
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddTransaction(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioDetail;
