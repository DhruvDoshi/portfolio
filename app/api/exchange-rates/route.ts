import { NextRequest, NextResponse } from 'next/server';
import { ExchangeRateService } from '../../../lib/exchangeRateService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const date = searchParams.get('date');

    if (!from || !to) {
      return NextResponse.json(
        { error: 'Missing required parameters: from, to' },
        { status: 400 }
      );
    }

    let rate: number;

    if (date) {
      // Historical rate request
      const targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        );
      }
      rate = await ExchangeRateService.getHistoricalRate(from, to, targetDate);
    } else {
      // Current rate request
      rate = await ExchangeRateService.getCurrentRate(from, to);
    }

    return NextResponse.json({
      from,
      to,
      rate,
      date: date || new Date().toISOString().split('T')[0],
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Exchange rate API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rate' },
      { status: 500 }
    );
  }
}

// POST endpoint for batch rate requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requests } = body;

    if (!requests || !Array.isArray(requests)) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected: { requests: Array }' },
        { status: 400 }
      );
    }

    const results = await Promise.all(
      requests.map(async (req: any) => {
        try {
          const { from, to, date } = req;
          
          if (!from || !to) {
            return { error: 'Missing from or to currency', request: req };
          }

          let rate: number;
          
          if (date) {
            const targetDate = new Date(date);
            if (isNaN(targetDate.getTime())) {
              return { error: 'Invalid date format', request: req };
            }
            rate = await ExchangeRateService.getHistoricalRate(from, to, targetDate);
          } else {
            rate = await ExchangeRateService.getCurrentRate(from, to);
          }

          return {
            from,
            to,
            rate,
            date: date || new Date().toISOString().split('T')[0],
            success: true
          };
        } catch (error) {
          return { error: 'Failed to fetch rate', request: req };
        }
      })
    );

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Batch exchange rate API error:', error);
    return NextResponse.json(
      { error: 'Failed to process batch request' },
      { status: 500 }
    );
  }
}
