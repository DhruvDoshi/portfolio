const { spawn } = require('child_process');
const path = require('path');

// Helper function to run Python scripts
const runPythonScript = (command, args = []) => {
  return new Promise((resolve, reject) => {
    const pythonPath = process.env.PYTHON_PATH || 'python3';
    const scriptPath = path.join(__dirname, '../../shared/utils/stock_utils.py');
    
    const python = spawn(pythonPath, [scriptPath, command, ...args]);
    
    let dataString = '';
    let errorString = '';
    
    python.stdout.on('data', (data) => {
      dataString += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      errorString += data.toString();
    });
    
    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${errorString}`));
      } else {
        try {
          const result = JSON.parse(dataString.trim());
          resolve(result);
        } catch (parseErr) {
          reject(new Error(`Failed to parse Python output: ${dataString}`));
        }
      }
    });
  });
};

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const action = event.queryStringParameters?.action;
    
    if (!action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Action parameter required' }),
      };
    }
    
    // GET /stocks?action=quote&symbol=AAPL&period=1y
    if (action === 'quote' && event.httpMethod === 'GET') {
      const { symbol, period = '1y' } = event.queryStringParameters;
      
      if (!symbol) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Symbol parameter required' }),
        };
      }
      
      const stockData = await runPythonScript('get_stock', [symbol.toUpperCase(), period]);
      
      if (stockData.error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: stockData.error }),
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(stockData),
      };
    }
    
    // GET /stocks?action=search&q=AAPL
    if (action === 'search' && event.httpMethod === 'GET') {
      const { q } = event.queryStringParameters;
      
      if (!q) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Query parameter required' }),
        };
      }
      
      const results = await runPythonScript('search_stocks', [q]);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(results),
      };
    }
    
    // POST /stocks?action=quotes
    if (action === 'quotes' && event.httpMethod === 'POST') {
      const { symbols } = JSON.parse(event.body);
      
      if (!symbols || !Array.isArray(symbols)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Symbols array required' }),
        };
      }
      
      const promises = symbols.map(symbol => 
        runPythonScript('get_stock', [symbol.toUpperCase(), '1d'])
          .catch(err => ({ symbol, error: err.message }))
      );
      
      const results = await Promise.all(promises);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(results),
      };
    }
    
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Invalid action' }),
    };
    
  } catch (error) {
    console.error('Stocks error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Server error' }),
    };
  }
};
