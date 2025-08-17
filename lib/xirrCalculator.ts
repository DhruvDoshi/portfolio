// XIRR (Extended Internal Rate of Return) calculation utility

export interface CashFlow {
  date: Date;
  amount: number; // Negative for investments, positive for returns
}

export class XIRRCalculator {
  private static readonly MAX_ITERATIONS = 100;
  private static readonly PRECISION = 1e-9;

  /**
   * Calculate XIRR for a series of cash flows
   * @param cashFlows Array of cash flows with dates and amounts
   * @returns XIRR as a decimal (e.g., 0.15 for 15%)
   */
  static calculateXIRR(cashFlows: CashFlow[]): number | null {
    if (cashFlows.length < 2) {
      return null;
    }

    // Sort cash flows by date
    const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Check if we have both positive and negative cash flows
    const hasPositive = sortedFlows.some(cf => cf.amount > 0);
    const hasNegative = sortedFlows.some(cf => cf.amount < 0);
    
    if (!hasPositive || !hasNegative) {
      return null; // Need both investments and returns
    }

    // Use Newton-Raphson method to find the rate
    let rate = 0.1; // Initial guess: 10%
    
    for (let i = 0; i < this.MAX_ITERATIONS; i++) {
      const npv = this.calculateNPV(sortedFlows, rate);
      const npvDerivative = this.calculateNPVDerivative(sortedFlows, rate);
      
      if (Math.abs(npvDerivative) < this.PRECISION) {
        break;
      }
      
      const newRate = rate - npv / npvDerivative;
      
      if (Math.abs(newRate - rate) < this.PRECISION) {
        return newRate;
      }
      
      rate = newRate;
      
      // Prevent extreme values
      if (rate < -0.99) rate = -0.99;
      if (rate > 10) rate = 10;
    }
    
    return rate;
  }

  /**
   * Calculate Net Present Value for given cash flows and rate
   */
  private static calculateNPV(cashFlows: CashFlow[], rate: number): number {
    const baseDate = cashFlows[0].date;
    
    return cashFlows.reduce((npv, cashFlow) => {
      const daysDiff = this.daysBetween(baseDate, cashFlow.date);
      const yearsDiff = daysDiff / 365.25;
      
      return npv + cashFlow.amount / Math.pow(1 + rate, yearsDiff);
    }, 0);
  }

  /**
   * Calculate derivative of NPV with respect to rate
   */
  private static calculateNPVDerivative(cashFlows: CashFlow[], rate: number): number {
    const baseDate = cashFlows[0].date;
    
    return cashFlows.reduce((derivative, cashFlow) => {
      const daysDiff = this.daysBetween(baseDate, cashFlow.date);
      const yearsDiff = daysDiff / 365.25;
      
      const term = -yearsDiff * cashFlow.amount / Math.pow(1 + rate, yearsDiff + 1);
      return derivative + term;
    }, 0);
  }

  /**
   * Calculate days between two dates
   */
  private static daysBetween(date1: Date, date2: Date): number {
    const diffTime = date2.getTime() - date1.getTime();
    return diffTime / (1000 * 60 * 60 * 24);
  }

  /**
   * Generate cash flows for a portfolio with transactions
   */
  static generatePortfolioCashFlows(
    transactions: Array<{
      date: Date;
      type: 'buy' | 'sell';
      amount: number;
    }>,
    currentValue: number
  ): CashFlow[] {
    const cashFlows: CashFlow[] = [];
    
    // Add all transactions (buy = negative, sell = positive)
    transactions.forEach(transaction => {
      cashFlows.push({
        date: transaction.date,
        amount: transaction.type === 'buy' ? -transaction.amount : transaction.amount
      });
    });
    
    // Add current value as final positive cash flow
    cashFlows.push({
      date: new Date(),
      amount: currentValue
    });
    
    return cashFlows;
  }

  /**
   * Format XIRR as percentage string
   */
  static formatXIRR(xirr: number | null): string {
    if (xirr === null) {
      return 'N/A';
    }
    
    return `${(xirr * 100).toFixed(2)}%`;
  }
}
