import { NextRequest, NextResponse } from 'next/server';
import { getDb, Transaction } from '../../../lib/database';
import { verifyAuth } from '../../../lib/auth';
import { ObjectId } from 'mongodb';

// GET /api/transactions - Get transactions for a portfolio
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get('portfolioId');

    if (!portfolioId) {
      return NextResponse.json({ error: 'Portfolio ID required' }, { status: 400 });
    }

    const db = await getDb();
    const transactions = await db.collection<Transaction>('transactions')
      .find({ 
        portfolioId,
        userId: user.userId || user.id || '' 
      })
      .sort({ date: -1 })
      .toArray();

    return NextResponse.json({ transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/transactions - Add a transaction
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { portfolioId, stockSymbol, type, shares, price, amount, date, market } = body;

    // Validate required fields
    if (!portfolioId || !stockSymbol || !type || !shares || !price || !amount || !date || !market) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify portfolio belongs to user
    const db = await getDb();
    const portfolio = await db.collection('portfolios').findOne({ 
      _id: new ObjectId(portfolioId),
      userId: user.userId || user.id || '' 
    });

    if (!portfolio) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    // Create transaction
    const transaction: Omit<Transaction, '_id'> = {
      portfolioId,
      userId: user.userId || user.id || '',
      stockSymbol: stockSymbol.toUpperCase(),
      type,
      shares: parseFloat(shares),
      price: parseFloat(price),
      amount: parseFloat(amount),
      date: new Date(date),
      market,
      createdAt: new Date()
    };

    const result = await db.collection<Transaction>('transactions').insertOne(transaction);

    // Update portfolio stocks based on transaction
    await updatePortfolioStocks(db, portfolioId, transaction);

    return NextResponse.json({ 
      success: true, 
      transactionId: result.insertedId 
    });
  } catch (error) {
    console.error('Error adding transaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function updatePortfolioStocks(db: any, portfolioId: string, transaction: Omit<Transaction, '_id'>) {
  const portfolio = await db.collection('portfolios').findOne({ _id: new ObjectId(portfolioId) });
  if (!portfolio) return;

  const stocks = portfolio.stocks || [];
  const stockIndex = stocks.findIndex(
    (s: any) => s.symbol === transaction.stockSymbol && s.market === transaction.market
  );

  if (transaction.type === 'buy') {
    if (stockIndex >= 0) {
      // Update existing stock with weighted average
      const existingStock = stocks[stockIndex];
      const totalShares = existingStock.shares + transaction.shares;
      const totalValue = (existingStock.shares * existingStock.avgPrice) + transaction.amount;
      
      stocks[stockIndex] = {
        ...existingStock,
        shares: totalShares,
        avgPrice: totalValue / totalShares
      };
    } else {
      // Add new stock
      stocks.push({
        symbol: transaction.stockSymbol,
        shares: transaction.shares,
        avgPrice: transaction.price,
        market: transaction.market
      });
    }
  } else if (transaction.type === 'sell' && stockIndex >= 0) {
    // Reduce shares for sell transaction
    const existingStock = stocks[stockIndex];
    const newShares = existingStock.shares - transaction.shares;
    
    if (newShares <= 0) {
      // Remove stock if all shares sold
      stocks.splice(stockIndex, 1);
    } else {
      stocks[stockIndex] = {
        ...existingStock,
        shares: newShares
      };
    }
  }

  // Update portfolio with new stocks array
  await db.collection('portfolios').updateOne(
    { _id: new ObjectId(portfolioId) },
    { 
      $set: { 
        stocks,
        updatedAt: new Date()
      }
    }
  );
}
