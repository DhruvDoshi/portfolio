// Exchange Rate Service - Fetches real-time and historical exchange rates

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
      // Try multiple APIs for better reliability
      let rate = await this.fetchFromExchangeRateAPI(fromCurrency, toCurrency);
      
      if (!rate) {
        rate = await this.fetchFromFixer(fromCurrency, toCurrency);
      }
      
      if (!rate) {
        rate = await this.fetchFromExchangeRateHost(fromCurrency, toCurrency);
      }
      
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

    const dateStr = date.toISOString().split('T')[0];
    const cacheKey = `${fromCurrency}_${toCurrency}_${dateStr}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached.rate;
    }

    try {
      // Try multiple APIs for historical data
      let rate = await this.fetchHistoricalFromExchangeRateAPI(fromCurrency, toCurrency, dateStr);
      
      if (!rate) {
        rate = await this.fetchHistoricalFromFixer(fromCurrency, toCurrency, dateStr);
      }
      
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

  private static async fetchFromExchangeRateAPI(from: string, to: string): Promise<number | null> {
    try {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
      const data = await response.json();
      return data.rates[to] || null;
    } catch (error) {
      console.error('ExchangeRate-API error:', error);
      return null;
    }
  }

  private static async fetchHistoricalFromExchangeRateAPI(from: string, to: string, date: string): Promise<number | null> {
    try {
      const response = await fetch(`https://api.exchangerate-api.com/v4/history/${from}/${date}`);
      const data = await response.json();
      return data.rates[to] || null;
    } catch (error) {
      console.error('ExchangeRate-API historical error:', error);
      return null;
    }
  }

  private static async fetchFromFixer(from: string, to: string): Promise<number | null> {
    try {
      // Note: Fixer.io requires API key for production use
      // This is a fallback that might not work without API key
      const response = await fetch(`https://api.fixer.io/latest?base=${from}&symbols=${to}`);
      const data = await response.json();
      return data.rates[to] || null;
    } catch (error) {
      console.error('Fixer.io error:', error);
      return null;
    }
  }

  private static async fetchHistoricalFromFixer(from: string, to: string, date: string): Promise<number | null> {
    try {
      const response = await fetch(`https://api.fixer.io/${date}?base=${from}&symbols=${to}`);
      const data = await response.json();
      return data.rates[to] || null;
    } catch (error) {
      console.error('Fixer.io historical error:', error);
      return null;
    }
  }

  private static async fetchFromExchangeRateHost(from: string, to: string): Promise<number | null> {
    try {
      const response = await fetch(`https://api.exchangerate.host/convert?from=${from}&to=${to}&amount=1`);
      const data = await response.json();
      return data.result || null;
    } catch (error) {
      console.error('ExchangeRate.host error:', error);
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
        'EUR': 0.85,
        'GBP': 0.73,
        'JPY': 110.0
      },
      'CAD': {
        'USD': 0.74,
        'INR': 61.5,
        'EUR': 0.63,
        'GBP': 0.54,
        'JPY': 81.5
      },
      'INR': {
        'USD': 0.012,
        'CAD': 0.016,
        'EUR': 0.010,
        'GBP': 0.009,
        'JPY': 1.33
      },
      'EUR': {
        'USD': 1.18,
        'CAD': 1.59,
        'INR': 97.6,
        'GBP': 0.86,
        'JPY': 129.4
      }
    };

    return rates[from]?.[to] || 1;
  }

  /**
   * Get supported currencies
   */
  static getSupportedCurrencies(): string[] {
    return ['USD', 'CAD', 'INR', 'EUR', 'GBP', 'JPY'];
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
