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

    // Group requests by fromCurrency and date
    const groupedRequests = requests.reduce((acc, req) => {
      const { from, to, date } = req;
      if (!from || !to) return acc;
      const key = `${from}_${date || 'current'}`;
      if (!acc[key]) {
        acc[key] = { from, to: new Set(), date };
      }
      acc[key].to.add(to);
      return acc;
    }, {} as Record<string, { from: string; to: Set<string>; date?: string }>);

    const results: any[] = [];

    for (const key in groupedRequests) {
      const { from, to, date } = groupedRequests[key];
      const toCurrencies = Array.from(to);
      try {
        if (date) {
          const targetDate = new Date(date);
          if (isNaN(targetDate.getTime())) {
            results.push(...toCurrencies.map(tc => ({ from, to: tc, error: 'Invalid date format' })));
            continue;
          }
          const rates = await ExchangeRateService.getHistoricalRates(from, toCurrencies, targetDate);
          for (const tc of toCurrencies) {
            results.push({ from, to: tc, rate: rates[tc], date, success: !!rates[tc] });
          }
        } else {
          const rates = await ExchangeRateService.getCurrentRates(from, toCurrencies);
          for (const tc of toCurrencies) {
            results.push({ from, to: tc, rate: rates[tc], date: new Date().toISOString().split('T')[0], success: !!rates[tc] });
          }
        }
      } catch (error) {
        results.push(...toCurrencies.map(tc => ({ from, to: tc, error: 'Failed to fetch rate' })));
      }
    }

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Batch exchange rate API error:', error);
    return NextResponse.json(
      { error: 'Failed to process batch request' },
      { status: 500 }
    );
  }
}
