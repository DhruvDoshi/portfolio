import { NextRequest, NextResponse } from 'next/server';
import { getDb, Portfolio } from '../../../lib/database';
import { verifyToken, getTokenFromCookie } from '../../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Try to get user from Authorization header or cookie
    let user = verifyToken(request);
    if (!user) {
      user = getTokenFromCookie(request);
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const db = await getDb();
    const portfoliosCollection = db.collection<Portfolio>('portfolios');

    // Get all portfolios for the authenticated user
    const portfolios = await portfoliosCollection
      .find({ userId: user.userId })
      .toArray();

    // For each portfolio, fetch its associated transactions
    const portfoliosWithTransactions = await Promise.all(
      portfolios.map(async (portfolio) => {
        const transactions = await db.collection('transactions')
          .find({ 
            portfolioId: portfolio._id!.toString(),
            userId: user.userId 
          })
          .sort({ date: -1 })
          .toArray();

        return {
          ...portfolio,
          transactions
        };
      })
    );

    return NextResponse.json({ portfolios: portfoliosWithTransactions });

  } catch (error) {
    console.error('Get portfolios error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Try to get user from Authorization header or cookie
    let user = verifyToken(request);
    if (!user) {
      user = getTokenFromCookie(request);
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { name, currency } = await request.json();

    if (!name || !currency) {
      return NextResponse.json(
        { error: 'Portfolio name and currency are required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const portfoliosCollection = db.collection<Portfolio>('portfolios');

    const newPortfolio: Portfolio = {
      userId: user.userId,
      name,
      currency,
      stocks: [],
      transactions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await portfoliosCollection.insertOne(newPortfolio);

    return NextResponse.json({
      success: true,
      portfolio: {
        ...newPortfolio,
        _id: result.insertedId.toString(),
      },
    });

  } catch (error) {
    console.error('Create portfolio error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
