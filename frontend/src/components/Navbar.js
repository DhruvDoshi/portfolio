import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          <Link to="/" className="navbar-brand">
            Portfolio Tracker
          </Link>
          
          <div className="navbar-nav">
            {isAuthenticated ? (
              <>
                <Link to="/portfolios" className="nav-link">
                  Portfolios
                </Link>
                <span className="nav-link">
                  Welcome, {user?.username}
                </span>
                <button 
                  onClick={logout} 
                  className="btn btn-secondary"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">
                  Login
                </Link>
                <Link to="/register" className="nav-link">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
