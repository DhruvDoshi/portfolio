import { NextRequest, NextResponse } from 'next/server';
import { getDb, Transaction } from '../../../../lib/database';
import { verifyAuth } from '../../../../lib/auth';
import { ObjectId } from 'mongodb';

// PUT /api/transactions/[id] - Update a transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactionId = params.id;
    if (!ObjectId.isValid(transactionId)) {
      return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 });
    }

    const body = await request.json();
    const { stockSymbol, type, shares, price, amount, date, market } = body;

    // Validate required fields
    if (!stockSymbol || !type || !shares || !price || !amount || !date || !market) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();
    
    // Check if transaction exists and belongs to user
    const existingTransaction = await db.collection('transactions').findOne({
      _id: new ObjectId(transactionId),
      userId: user.id
    });

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Update transaction
    const updatedTransaction = {
      stockSymbol: stockSymbol.toUpperCase(),
      type,
      shares: parseFloat(shares),
      price: parseFloat(price),
      amount: parseFloat(amount),
      date: new Date(date),
      market,
      updatedAt: new Date()
    };

    await db.collection('transactions').updateOne(
      { _id: new ObjectId(transactionId) },
      { $set: updatedTransaction }
    );

    // Recalculate portfolio holdings
    await recalculatePortfolioHoldings(db, existingTransaction.portfolioId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/transactions/[id] - Delete a transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactionId = params.id;
    if (!ObjectId.isValid(transactionId)) {
      return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 });
    }

    const db = await getDb();
    
    // Check if transaction exists and belongs to user
    const transaction = await db.collection('transactions').findOne({
      _id: new ObjectId(transactionId),
      userId: user.id
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Delete transaction
    await db.collection('transactions').deleteOne({
      _id: new ObjectId(transactionId)
    });

    // Recalculate portfolio holdings
    await recalculatePortfolioHoldings(db, transaction.portfolioId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function recalculatePortfolioHoldings(db: any, portfolioId: string) {
  // Get all transactions for this portfolio
  const transactions = await db.collection('transactions')
    .find({ portfolioId })
    .sort({ date: 1 })
    .toArray();

  // Recalculate holdings from scratch
  const holdings: Record<string, any> = {};

  transactions.forEach((transaction: any) => {
    const key = `${transaction.stockSymbol}-${transaction.market}`;
    
    if (!holdings[key]) {
      holdings[key] = {
        symbol: transaction.stockSymbol,
        shares: 0,
        totalCost: 0,
        avgPrice: 0,
        market: transaction.market
      };
    }

    if (transaction.type === 'buy') {
      holdings[key].totalCost += transaction.amount;
      holdings[key].shares += transaction.shares;
      holdings[key].avgPrice = holdings[key].totalCost / holdings[key].shares;
    } else if (transaction.type === 'sell') {
      const sellRatio = transaction.shares / holdings[key].shares;
      holdings[key].totalCost -= holdings[key].totalCost * sellRatio;
      holdings[key].shares -= transaction.shares;
      
      if (holdings[key].shares <= 0) {
        delete holdings[key];
      } else {
        holdings[key].avgPrice = holdings[key].totalCost / holdings[key].shares;
      }
    }
  });

  // Convert to array format
  const stocks = Object.values(holdings).map((holding: any) => ({
    symbol: holding.symbol,
    shares: holding.shares,
    avgPrice: holding.avgPrice,
    market: holding.market
  }));

  // Update portfolio
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
