import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { portfoliosAPI } from '../utils/api';
import toast from 'react-hot-toast';

const Portfolios = () => {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPortfolio, setNewPortfolio] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const fetchPortfolios = async () => {
    try {
      const response = await portfoliosAPI.getAll();
      setPortfolios(response.data);
    } catch (error) {
      toast.error('Failed to fetch portfolios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePortfolio = async (e) => {
    e.preventDefault();
    try {
      const response = await portfoliosAPI.create(newPortfolio);
      setPortfolios([...portfolios, response.data]);
      setNewPortfolio({ name: '', description: '' });
      setShowCreateModal(false);
      toast.success('Portfolio created successfully!');
    } catch (error) {
      toast.error('Failed to create portfolio');
    }
  };

  const handleDeletePortfolio = async (portfolioId) => {
    if (window.confirm('Are you sure you want to delete this portfolio? This will also delete all transactions.')) {
      try {
        await portfoliosAPI.delete(portfolioId);
        setPortfolios(portfolios.filter(p => p._id !== portfolioId));
        toast.success('Portfolio deleted successfully!');
      } catch (error) {
        toast.error('Failed to delete portfolio');
      }
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>My Portfolios</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          Create Portfolio
        </button>
      </div>

      {portfolios.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <h3>No portfolios yet</h3>
          <p>Create your first portfolio to start tracking your investments.</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            Create Your First Portfolio
          </button>
        </div>
      ) : (
        <div className="grid grid-2">
          {portfolios.map(portfolio => (
            <div key={portfolio._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: '0 0 8px 0' }}>{portfolio.name}</h3>
                  {portfolio.description && (
                    <p style={{ margin: 0, color: '#666' }}>{portfolio.description}</p>
                  )}
                </div>
                <button 
                  onClick={() => handleDeletePortfolio(portfolio._id)}
                  className="btn btn-danger"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  Delete
                </button>
              </div>
              
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                Created: {new Date(portfolio.createdAt).toLocaleDateString()}
              </div>
              
              <Link 
                to={`/portfolio/${portfolio._id}`}
                className="btn btn-primary"
                style={{ width: '100%', textAlign: 'center' }}
              >
                View Portfolio
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Create Portfolio Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">Create New Portfolio</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="close-button"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreatePortfolio}>
              <div className="form-group">
                <label className="form-label">Portfolio Name</label>
                <input
                  type="text"
                  value={newPortfolio.name}
                  onChange={(e) => setNewPortfolio({ ...newPortfolio, name: e.target.value })}
                  className="form-input"
                  required
                  placeholder="e.g., Growth Stocks, Dividend Portfolio"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  value={newPortfolio.description}
                  onChange={(e) => setNewPortfolio({ ...newPortfolio, description: e.target.value })}
                  className="form-input"
                  placeholder="Brief description of your investment strategy"
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Portfolio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolios;
