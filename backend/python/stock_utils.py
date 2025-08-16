import yfinance as yf
import sys
import json
from datetime import datetime, timedelta
import numpy as np
from scipy.optimize import newton

def get_stock_data(symbol, period="1y"):
    """Get stock data from yfinance"""
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period)
        info = ticker.info
        
        # Convert to JSON serializable format
        data = {
            'symbol': symbol,
            'currentPrice': info.get('currentPrice', hist['Close'].iloc[-1] if not hist.empty else None),
            'previousClose': info.get('previousClose', hist['Close'].iloc[-2] if len(hist) > 1 else None),
            'change': 0,
            'changePercent': 0,
            'volume': info.get('volume', hist['Volume'].iloc[-1] if not hist.empty else None),
            'marketCap': info.get('marketCap', None),
            'name': info.get('longName', info.get('shortName', symbol)),
            'sector': info.get('sector', 'N/A'),
            'industry': info.get('industry', 'N/A'),
            'history': []
        }
        
        if data['currentPrice'] and data['previousClose']:
            data['change'] = data['currentPrice'] - data['previousClose']
            data['changePercent'] = (data['change'] / data['previousClose']) * 100
        
        # Add historical data
        for date, row in hist.iterrows():
            data['history'].append({
                'date': date.strftime('%Y-%m-%d'),
                'open': float(row['Open']),
                'high': float(row['High']),
                'low': float(row['Low']),
                'close': float(row['Close']),
                'volume': int(row['Volume'])
            })
        
        return data
    except Exception as e:
        return {'error': str(e)}

def search_stocks(query):
    """Search for stocks (simple implementation)"""
    try:
        # For a simple search, we'll try to get info for the query as a symbol
        ticker = yf.Ticker(query.upper())
        info = ticker.info
        
        if 'symbol' in info or 'shortName' in info:
            return [{
                'symbol': query.upper(),
                'name': info.get('longName', info.get('shortName', query.upper())),
                'sector': info.get('sector', 'N/A'),
                'industry': info.get('industry', 'N/A')
            }]
        else:
            return []
    except:
        return []

def calculate_xirr(cash_flows, dates):
    """Calculate XIRR (Extended Internal Rate of Return)"""
    try:
        # Convert dates to days from the first date
        start_date = min(dates)
        days = [(date - start_date).days for date in dates]
        
        def npv(rate):
            return sum(cf / (1 + rate) ** (day / 365.0) for cf, day in zip(cash_flows, days))
        
        def npv_derivative(rate):
            return sum(-cf * (day / 365.0) / (1 + rate) ** (day / 365.0 + 1) for cf, day in zip(cash_flows, days))
        
        # Use Newton's method to find the root
        try:
            rate = newton(npv, 0.1, fprime=npv_derivative, maxiter=100)
            return rate
        except:
            # If Newton's method fails, try different starting points
            for guess in [0.01, 0.1, 0.2, -0.1]:
                try:
                    rate = newton(npv, guess, maxiter=50)
                    return rate
                except:
                    continue
            return None
    except Exception as e:
        return None

def calculate_portfolio_xirr(transactions, current_values):
    """Calculate XIRR for a portfolio"""
    try:
        cash_flows = []
        dates = []
        
        # Add all transactions as cash flows
        for transaction in transactions:
            date = datetime.strptime(transaction['date'][:10], '%Y-%m-%d')
            amount = transaction['quantity'] * transaction['price'] + transaction.get('fees', 0)
            
            if transaction['type'] == 'BUY':
                cash_flows.append(-amount)  # Negative for outflow
            else:  # SELL
                cash_flows.append(amount)   # Positive for inflow
            
            dates.append(date)
        
        # Add current portfolio value as a positive cash flow on today's date
        total_current_value = sum(current_values.values())
        if total_current_value > 0:
            cash_flows.append(total_current_value)
            dates.append(datetime.now())
        
        if len(cash_flows) < 2:
            return None
        
        xirr = calculate_xirr(cash_flows, dates)
        return xirr * 100 if xirr else None  # Convert to percentage
    except Exception as e:
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No command provided'}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "get_stock":
        if len(sys.argv) < 3:
            print(json.dumps({'error': 'Symbol required'}))
            sys.exit(1)
        
        symbol = sys.argv[2]
        period = sys.argv[3] if len(sys.argv) > 3 else "1y"
        result = get_stock_data(symbol, period)
        print(json.dumps(result))
    
    elif command == "search_stocks":
        if len(sys.argv) < 3:
            print(json.dumps({'error': 'Query required'}))
            sys.exit(1)
        
        query = sys.argv[2]
        result = search_stocks(query)
        print(json.dumps(result))
    
    elif command == "calculate_xirr":
        if len(sys.argv) < 4:
            print(json.dumps({'error': 'Transactions and current values required'}))
            sys.exit(1)
        
        transactions = json.loads(sys.argv[2])
        current_values = json.loads(sys.argv[3])
        result = calculate_portfolio_xirr(transactions, current_values)
        print(json.dumps({'xirr': result}))
    
    else:
        print(json.dumps({'error': 'Unknown command'}))
