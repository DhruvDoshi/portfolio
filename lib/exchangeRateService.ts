// Exchange Rate Service - Fetches real-time and historical exchange rates
import {NextResponse} from "next/server";

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  date: string;
  timestamp: number;
}

export class ExchangeRateService {
  private static cache = new Map<string, ExchangeRate>();
  private static cacheExpiry = 5 * 60 * 1000; // 5 minutes cache

  // TODO: Replace with your actual API key from freecurrencyapi.com
  private static apiKey = process.env.FREECURRENCYAPI_KEY || 'YOUR_API_KEY';

  /**
   * Get current exchange rate between two currencies
   */
  static async getCurrentRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) return 1;

    const cacheKey = `${fromCurrency}_${toCurrency}_current`;
    const cached = this.cache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.rate;
    }

    try {
      let rate = await this.fetchFromFreeCurrencyApi(fromCurrency, toCurrency);

      if (!rate) {
        console.warn(`Failed to fetch exchange rate for ${fromCurrency} to ${toCurrency}, using fallback`);
        return this.getFallbackRate(fromCurrency, toCurrency);
      }

      // Cache the result
      this.cache.set(cacheKey, {
        from: fromCurrency,
        to: toCurrency,
        rate,
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now()
      });

      return rate;
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      return this.getFallbackRate(fromCurrency, toCurrency);
    }
  }

  /**
   * Get historical exchange rate for a specific date
   */
  static async getHistoricalRate(fromCurrency: string, toCurrency: string, date: Date): Promise<number> {
    if (fromCurrency === toCurrency) return 1;

    const today = new Date();
    if (date > today) {
      console.warn(`Requested historical rate for a future date (${date.toISOString()}). Falling back to current rate.`);
      return this.getCurrentRate(fromCurrency, toCurrency);
    }

    const dateStr = date.toISOString().split('T')[0];
    const cacheKey = `${fromCurrency}_${toCurrency}_${dateStr}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      return cached.rate;
    }

    try {
      let rate = await this.fetchHistoricalFromFreeCurrencyApi(fromCurrency, toCurrency, dateStr);

      if (!rate) {
        console.warn(`Failed to fetch historical rate for ${fromCurrency} to ${toCurrency} on ${dateStr}, using current rate`);
        return await this.getCurrentRate(fromCurrency, toCurrency);
      }

      // Cache the result (historical rates don't expire)
      this.cache.set(cacheKey, {
        from: fromCurrency,
        to: toCurrency,
        rate,
        date: dateStr,
        timestamp: Date.now()
      });

      return rate;
    } catch (error) {
      console.error('Error fetching historical exchange rate:', error);
      return await this.getCurrentRate(fromCurrency, toCurrency);
    }
  }

  /**
   * Convert amount from one currency to another using current rates
   */
  static async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    const rate = await this.getCurrentRate(fromCurrency, toCurrency);
    return amount * rate;
  }

  /**
   * Convert amount using historical exchange rate for specific date
   */
  static async convertCurrencyHistorical(amount: number, fromCurrency: string, toCurrency: string, date: Date): Promise<number> {
    const rate = await this.getHistoricalRate(fromCurrency, toCurrency, date);
    return amount * rate;
  }

  // API Implementations

  private static async fetchFromFreeCurrencyApi(from: string, to: string): Promise<number | null> {
    if (this.apiKey === 'YOUR_API_KEY') {
        console.error('FreeCurrencyAPI key is not set. Please add your API key to .env.local as FREECURRENCYAPI_KEY.');
        return null;
    }
    try {
      const response = await fetch(`https://api.freecurrencyapi.com/v1/latest?apikey=${this.apiKey}&base_currency=${from}&currencies=${to}`);
      if (!response.ok) {
        throw new Error(`FreeCurrencyAPI request failed with status ${response.status}`);
      }
      const data = await response.json();
      return data.data[to] || null;
    } catch (error) {
      console.error('FreeCurrencyAPI error:', error);
      return null;
    }
  }

  private static async fetchHistoricalFromFreeCurrencyApi(from: string, to: string, date: string): Promise<number | null> {
      if (this.apiKey === 'YOUR_API_KEY') {
          console.error('FreeCurrencyAPI key is not set. Please add your API key to .env.local as FREECURRENCYAPI_KEY.');
          return null;
      }
    try {
      const response = await fetch(`https://api.freecurrencyapi.com/v1/historical?apikey=${this.apiKey}&date=${date}&base_currency=${from}&currencies=${to}`);
        if (!response.ok) {
            throw new Error(`FreeCurrencyAPI historical request failed with status ${response.status}`);
        }
      const data = await response.json();
        // The historical API returns data nested under the date key
        if (data.data && data.data[date]) {
            return data.data[date][to] || null;
        }
      return null;
    } catch (error) {
      console.error('FreeCurrencyAPI historical error:', error);
      return null;
    }
  }

  /**
   * Fallback rates (approximate current rates, updated periodically)
   */
  private static getFallbackRate(from: string, to: string): number {
    const rates: Record<string, Record<string, number>> = {
      'USD': {
        'CAD': 1.35,
        'INR': 83.0,
        'EUR': 0.92,
        'GBP': 0.79,
        'JPY': 157.0
      },
      'CAD': {
        'USD': 0.74,
        'INR': 61.5,
        'EUR': 0.68,
        'GBP': 0.58,
        'JPY': 116.0
      },
      'INR': {
        'USD': 0.012,
        'CAD': 0.016,
        'EUR': 0.011,
        'GBP': 0.0095,
        'JPY': 1.89
      },
      'EUR': {
        'USD': 1.08,
        'CAD': 1.47,
        'INR': 90.0,
        'GBP': 0.85,
        'JPY': 170.0
      }
    };

    return rates[from]?.[to] || 1;
  }

  /**
   * Get supported currencies from freecurrencyapi.com
   */
  static getSupportedCurrencies(): string[] {
    // A subset of commonly used currencies supported by freecurrencyapi.com
    return ['USD', 'CAD', 'INR', 'EUR', 'GBP', 'JPY', 'AUD', 'CHF', 'CNY', 'HKD', 'NZD'];
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}
