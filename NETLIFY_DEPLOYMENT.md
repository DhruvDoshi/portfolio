# Netlify Deployment Guide

This guide will help you deploy your Portfolio Tracker application to Netlify as a single unified application.

## Prerequisites

1. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **MongoDB Atlas**: Set up a MongoDB cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
3. **Git Repository**: Push your code to GitHub, GitLab, or Bitbucket

## Deployment Steps

### 1. Prepare Your Repository

Make sure your code is pushed to a Git repository with all the changes we've made for Netlify compatibility.

### 2. Connect to Netlify

1. Log in to Netlify
2. Click "New site from Git"
3. Choose your Git provider and repository
4. Configure build settings:
   - **Build command**: `npm run build:netlify`
   - **Publish directory**: `frontend/build`
   - **Base directory**: Leave empty

### 3. Environment Variables

In your Netlify site dashboard, go to **Site settings > Environment variables** and add:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/portfolio_tracker
JWT_SECRET=your_super_secure_jwt_secret_at_least_32_characters_long
PYTHON_PATH=python3
NODE_ENV=production
```

**Important**: Replace the MongoDB URI with your actual Atlas connection string.

### 4. Build Configuration

The `netlify.toml` file is already configured with:
- Serverless functions in the `netlify/functions` directory
- Proper redirects for API routes and SPA routing
- Python environment setup

### 5. Python Dependencies

Netlify will automatically install Python dependencies from `shared/utils/requirements.txt` during build.

## API Endpoint Mapping

The following routes are automatically mapped:

| Frontend Call | Netlify Function |
|---------------|------------------|
| `/api/auth/login` | `/.netlify/functions/auth-login` |
| `/api/auth/register` | `/.netlify/functions/auth-register` |
| `/api/auth/me` | `/.netlify/functions/auth-me` |
| `/api/portfolios` | `/.netlify/functions/portfolios` |
| `/api/portfolios/:id/transactions` | `/.netlify/functions/portfolio-transactions` |
| `/api/portfolios/:id/summary` | `/.netlify/functions/portfolio-summary` |
| `/api/stocks/*` | `/.netlify/functions/stocks` |
| `/api/stocks/portfolio/:id/xirr` | `/.netlify/functions/portfolio-xirr` |

## Local Development with Netlify Functions

To test Netlify functions locally:

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Run the development server:
   ```bash
   netlify dev
   ```

This will start both the React app and serverless functions locally.

## Troubleshooting

### Common Issues

1. **MongoDB Connection Errors**
   - Ensure your MongoDB Atlas IP whitelist includes `0.0.0.0/0` for Netlify
   - Verify your connection string is correct
   - Check that your MongoDB user has proper permissions

2. **Python Dependencies**
   - If yfinance fails, check the build logs
   - Ensure all Python packages are listed in `shared/utils/requirements.txt`

3. **Environment Variables**
   - Double-check all environment variables are set in Netlify
   - Ensure JWT_SECRET is at least 32 characters long

4. **Function Timeouts**
   - Stock data fetching might timeout on cold starts
   - Consider implementing caching for frequently accessed data

### Build Logs

Check Netlify's build logs for detailed error information:
1. Go to your site dashboard
2. Click on "Deploys"
3. Click on a specific deploy to see logs

## Performance Optimization

1. **Function Cold Starts**: First request might be slow due to serverless cold starts
2. **Database Connections**: MongoDB connections are cached per function instance
3. **Stock Data**: Consider implementing caching for stock prices

## Security Notes

1. **CORS**: Already configured to allow your domain
2. **JWT**: Secure token-based authentication
3. **Environment Variables**: Sensitive data is properly stored in Netlify environment variables
4. **Input Validation**: Consider adding additional validation for production use

## Post-Deployment

After successful deployment:

1. Test all functionality (login, portfolios, transactions, stock data)
2. Verify XIRR calculations are working
3. Check that charts are rendering properly
4. Test mobile responsiveness

Your Portfolio Tracker will be available at your Netlify URL (e.g., `https://your-app-name.netlify.app`).
