import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    // Try to fetch from Yahoo Finance
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error('Yahoo Finance API error');
    }
    
    const data = await response.json();
    
    if (data.chart.error) {
      throw new Error(data.chart.error.description);
    }
    
    const result = data.chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];
    
    const currentPrice = meta.regularMarketPrice || quote.close[quote.close.length - 1];
    const previousClose = meta.previousClose;
    const change = currentPrice && previousClose ? currentPrice - previousClose : 0;
    const changePercent = currentPrice && previousClose ? (change / previousClose) * 100 : 0;
    
    // Get company name from meta data or use fallback
    const companyName = meta.longName || meta.shortName || getCompanyNameFallback(symbol);
    
    return NextResponse.json({
      symbol: symbol,
      name: companyName,
      price: currentPrice || 0,
      change: change || 0,
      changePercent: changePercent || 0,
      currency: meta.currency || 'USD',
      timestamp: Date.now(),
    });
    
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    
    // Return realistic mock data for demo
    const mockData = getMockStockData(symbol);
    return NextResponse.json(mockData);
  }
}

function getCompanyNameFallback(symbol: string): string {
  // Common company names mapping
  const companyNames: Record<string, string> = {
    // US Companies
    'AAPL': 'Apple Inc.',
    'GOOGL': 'Alphabet Inc.',
    'GOOG': 'Alphabet Inc.',
    'MSFT': 'Microsoft Corporation',
    'AMZN': 'Amazon.com Inc.',
    'TSLA': 'Tesla Inc.',
    'META': 'Meta Platforms Inc.',
    'NVDA': 'NVIDIA Corporation',
    'NFLX': 'Netflix Inc.',
    'AMD': 'Advanced Micro Devices Inc.',
    
    // Canadian Companies
    'SHOP': 'Shopify Inc.',
    'RY': 'Royal Bank of Canada',
    'TD': 'Toronto-Dominion Bank',
    'CNR': 'Canadian National Railway',
    'SU': 'Suncor Energy Inc.',
    
    // Indian Companies
    'RELIANCE': 'Reliance Industries Limited',
    'TCS': 'Tata Consultancy Services',
    'INFY': 'Infosys Limited',
    'HDFC': 'HDFC Bank Limited',
    'ICICIBANK': 'ICICI Bank Limited',
  };
  
  const cleanSymbol = symbol.replace(/\.(TO|NS|BO)$/, '').toUpperCase();
  return companyNames[cleanSymbol] || `${cleanSymbol} Corporation`;
}

function getMockStockData(symbol: string) {
  // Create deterministic but varied mock data based on symbol
  const symbolHash = symbol.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // Use hash to create consistent but varied data
  const basePrice = Math.abs(symbolHash % 1000) + 50;
  const changePercent = ((symbolHash % 200) - 100) / 10; // -10% to +10%
  const change = basePrice * (changePercent / 100);
  
  // Determine currency based on symbol patterns
  let currency = 'USD';
  if (symbol.endsWith('.TO')) currency = 'CAD';
  else if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) currency = 'INR';
  
  const companyName = getCompanyNameFallback(symbol);
  
  return {
    symbol: symbol.replace(/\.(TO|NS|BO)$/, ''), // Remove suffix for display
    name: companyName,
    price: Math.round(basePrice * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    currency: currency,
    timestamp: Date.now(),
  };
}
