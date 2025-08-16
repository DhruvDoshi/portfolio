import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="container">
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px', color: '#333' }}>
          Portfolio Tracker
        </h1>
        <p style={{ fontSize: '20px', color: '#666', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
          Track your investments, monitor performance, and calculate returns with ease. 
          Manage multiple portfolios and get real-time stock data.
        </p>
        
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {isAuthenticated ? (
            <Link to="/portfolios" className="btn btn-primary" style={{ fontSize: '18px', padding: '12px 24px' }}>
              View My Portfolios
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary" style={{ fontSize: '18px', padding: '12px 24px' }}>
                Get Started
              </Link>
              <Link to="/login" className="btn btn-secondary" style={{ fontSize: '18px', padding: '12px 24px' }}>
                Login
              </Link>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-3" style={{ marginTop: '80px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#007bff', marginBottom: '16px' }}>Multiple Portfolios</h3>
          <p>Create and manage multiple investment portfolios to organize your investments by strategy, risk level, or asset class.</p>
        </div>
        
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#007bff', marginBottom: '16px' }}>Real-time Data</h3>
          <p>Get up-to-date stock prices and market data powered by Yahoo Finance to track your portfolio performance accurately.</p>
        </div>
        
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#007bff', marginBottom: '16px' }}>XIRR Calculation</h3>
          <p>Calculate Extended Internal Rate of Return (XIRR) to measure the annualized return of your investments with irregular cash flows.</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
