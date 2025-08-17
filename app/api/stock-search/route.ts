import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const count = searchParams.get('count') || '10';
  
  if (!query || query.length < 1) {
    return NextResponse.json([]);
  }

  try {
    // Use Yahoo Finance search API for autocomplete
    const response = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=${count}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Yahoo Finance search API error');
    }
    
    const data = await response.json();
    const results = [];
    
    for (const quote of data.quotes || []) {
      // Include stocks and ETFs
      if (quote.quoteType === 'EQUITY' || quote.quoteType === 'ETF' || 
          quote.typeDisp === 'Equity' || quote.typeDisp === 'ETF') {
        results.push({
          symbol: quote.symbol,
          name: quote.shortname || quote.longname || quote.symbol,
          exchange: quote.exchange,
          market: getMarketFromExchange(quote.exchange),
          typeDisp: quote.typeDisp || quote.quoteType
        });
      }
    }
    
    return NextResponse.json(results);
    
  } catch (error) {
    console.error('Error in stock search:', error);
    
    // Fallback to local suggestions
    const localSuggestions = getLocalSuggestions(query.toLowerCase());
    return NextResponse.json(localSuggestions);
  }
}

function getMarketFromExchange(exchange: string): 'US' | 'CA' | 'IN' {
  if (!exchange) return 'US';
  
  const exchangeMap: Record<string, 'US' | 'CA' | 'IN'> = {
    'NMS': 'US',     // NASDAQ
    'NYQ': 'US',     // NYSE
    'PCX': 'US',     // NYSE Arca
    'TOR': 'CA',     // Toronto Stock Exchange
    'TSE': 'CA',     // Toronto Stock Exchange
    'NSE': 'IN',     // National Stock Exchange of India
    'BSE': 'IN',     // Bombay Stock Exchange
    'NSI': 'IN',     // NSE India
  };
  
  return exchangeMap[exchange] || 'US';
}

function getLocalSuggestions(query: string) {
  const stocks = [
    // US Stocks
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NMS', market: 'US' as const, typeDisp: 'Equity' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NMS', market: 'US' as const, typeDisp: 'Equity' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NMS', market: 'US' as const, typeDisp: 'Equity' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NMS', market: 'US' as const, typeDisp: 'Equity' },
    { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NMS', market: 'US' as const, typeDisp: 'Equity' },
    { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NMS', market: 'US' as const, typeDisp: 'Equity' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NMS', market: 'US' as const, typeDisp: 'Equity' },
    { symbol: 'NFLX', name: 'Netflix Inc.', exchange: 'NMS', market: 'US' as const, typeDisp: 'Equity' },
    { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', exchange: 'NMS', market: 'US' as const, typeDisp: 'Equity' },
    { symbol: 'PYPL', name: 'PayPal Holdings Inc.', exchange: 'NMS', market: 'US' as const, typeDisp: 'Equity' },
    
    // US ETFs
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'PCX', market: 'US' as const, typeDisp: 'ETF' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NMS', market: 'US' as const, typeDisp: 'ETF' },
    { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', exchange: 'PCX', market: 'US' as const, typeDisp: 'ETF' },
    { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', exchange: 'PCX', market: 'US' as const, typeDisp: 'ETF' },
    { symbol: 'IWM', name: 'iShares Russell 2000 ETF', exchange: 'PCX', market: 'US' as const, typeDisp: 'ETF' },
    { symbol: 'EFA', name: 'iShares MSCI EAFE ETF', exchange: 'PCX', market: 'US' as const, typeDisp: 'ETF' },
    { symbol: 'EEM', name: 'iShares MSCI Emerging Markets ETF', exchange: 'PCX', market: 'US' as const, typeDisp: 'ETF' },
    { symbol: 'GLD', name: 'SPDR Gold Shares', exchange: 'PCX', market: 'US' as const, typeDisp: 'ETF' },
    { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF', exchange: 'NMS', market: 'US' as const, typeDisp: 'ETF' },
    { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', exchange: 'PCX', market: 'US' as const, typeDisp: 'ETF' },
    
    // Canadian Stocks
    { symbol: 'SHOP', name: 'Shopify Inc.', exchange: 'TOR', market: 'CA' as const, typeDisp: 'Equity' },
    { symbol: 'RY', name: 'Royal Bank of Canada', exchange: 'TOR', market: 'CA' as const, typeDisp: 'Equity' },
    { symbol: 'TD', name: 'Toronto-Dominion Bank', exchange: 'TOR', market: 'CA' as const, typeDisp: 'Equity' },
    { symbol: 'CNR', name: 'Canadian National Railway', exchange: 'TOR', market: 'CA' as const, typeDisp: 'Equity' },
    { symbol: 'SU', name: 'Suncor Energy Inc.', exchange: 'TOR', market: 'CA' as const, typeDisp: 'Equity' },
    
    // Canadian ETFs
    { symbol: 'VTI.TO', name: 'Vanguard Total Stock Market Index ETF', exchange: 'TOR', market: 'CA' as const, typeDisp: 'ETF' },
    { symbol: 'VFV.TO', name: 'Vanguard S&P 500 Index ETF', exchange: 'TOR', market: 'CA' as const, typeDisp: 'ETF' },
    { symbol: 'TDB902', name: 'TD Canadian Index Fund', exchange: 'TOR', market: 'CA' as const, typeDisp: 'ETF' },
    { symbol: 'XIU.TO', name: 'iShares Core S&P Total Canadian Stock Market ETF', exchange: 'TOR', market: 'CA' as const, typeDisp: 'ETF' },
    { symbol: 'XIC.TO', name: 'iShares Core S&P Total Canadian Stock Market ETF', exchange: 'TOR', market: 'CA' as const, typeDisp: 'ETF' },
    
    // Indian Stocks
    { symbol: 'RELIANCE', name: 'Reliance Industries Limited', exchange: 'NSE', market: 'IN' as const, typeDisp: 'Equity' },
    { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', market: 'IN' as const, typeDisp: 'Equity' },
    { symbol: 'INFY', name: 'Infosys Limited', exchange: 'NSE', market: 'IN' as const, typeDisp: 'Equity' },
    { symbol: 'HDFC', name: 'HDFC Bank Limited', exchange: 'NSE', market: 'IN' as const, typeDisp: 'Equity' },
    { symbol: 'ICICIBANK', name: 'ICICI Bank Limited', exchange: 'NSE', market: 'IN' as const, typeDisp: 'Equity' },
    
    // Indian ETFs
    { symbol: 'NIFTYBEES', name: 'Nippon India ETF Nifty BeES', exchange: 'NSE', market: 'IN' as const, typeDisp: 'ETF' },
    { symbol: 'JUNIORBEES', name: 'Nippon India ETF Junior BeES', exchange: 'NSE', market: 'IN' as const, typeDisp: 'ETF' },
    { symbol: 'GOLDBEES', name: 'Nippon India ETF Gold BeES', exchange: 'NSE', market: 'IN' as const, typeDisp: 'ETF' },
    { symbol: 'LIQUIDBEES', name: 'Nippon India ETF Liquid BeES', exchange: 'NSE', market: 'IN' as const, typeDisp: 'ETF' },
  ];
  
  return stocks.filter(stock => 
    stock.symbol.toLowerCase().includes(query) || 
    stock.name.toLowerCase().includes(query)
  ).slice(0, 10);
}
