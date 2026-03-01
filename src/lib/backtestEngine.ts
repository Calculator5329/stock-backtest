import { Portfolio, BacktestResult, PortfolioValue, TickerHistoricalData, HistoricalDataPoint } from '../types';

export class BacktestEngine {
  private historicalData: Map<string, TickerHistoricalData> = new Map();

  async loadHistoricalData(symbols: string[]): Promise<void> {
    for (const symbol of symbols) {
      try {
        const response = await fetch(`/data/stocks/${symbol}.json`);
        if (!response.ok) {
          const etfResponse = await fetch(`/data/etfs/${symbol}.json`);
          if (etfResponse.ok) {
            const data = await etfResponse.json();
            this.historicalData.set(symbol, data);
          }
        } else {
          const data = await response.json();
          this.historicalData.set(symbol, data);
        }
      } catch (error) {
        console.error(`Failed to load data for ${symbol}:`, error);
      }
    }
  }

  private getCommonDates(symbols: string[], startDate: string, endDate: string): string[] {
    if (symbols.length === 0) return [];

    const allDates = symbols
      .map(symbol => {
        const data = this.historicalData.get(symbol);
        if (!data) return [];
        return data.data
          .filter(d => d.date >= startDate && d.date <= endDate)
          .map(d => d.date);
      })
      .filter(dates => dates.length > 0);

    if (allDates.length === 0) return [];

    const dateSet = new Set(allDates[0]);
    for (let i = 1; i < allDates.length; i++) {
      const currentSet = new Set(allDates[i]);
      for (const date of dateSet) {
        if (!currentSet.has(date)) {
          dateSet.delete(date);
        }
      }
    }

    return Array.from(dateSet).sort();
  }

  private getPrice(symbol: string, date: string): number | null {
    const data = this.historicalData.get(symbol);
    if (!data) return null;

    const point = data.data.find(d => d.date === date);
    return point ? point.adjustedClose : null;
  }

  private calculateContributionAmount(portfolio: Portfolio): number {
    switch (portfolio.contributionFrequency) {
      case 'monthly':
        return portfolio.annualContribution / 12;
      case 'quarterly':
        return portfolio.annualContribution / 4;
      case 'annually':
        return portfolio.annualContribution;
      default:
        return 0;
    }
  }

  private shouldContribute(date: string, lastContributionDate: string | null, frequency: string): boolean {
    if (!lastContributionDate) return false;

    const currentDate = new Date(date);
    const lastDate = new Date(lastContributionDate);

    switch (frequency) {
      case 'monthly':
        return currentDate.getMonth() !== lastDate.getMonth() ||
          currentDate.getFullYear() !== lastDate.getFullYear();
      case 'quarterly':
        return Math.floor(currentDate.getMonth() / 3) !== Math.floor(lastDate.getMonth() / 3) ||
          currentDate.getFullYear() !== lastDate.getFullYear();
      case 'annually':
        return currentDate.getFullYear() !== lastDate.getFullYear();
      default:
        return false;
    }
  }

  private shouldRebalance(date: string, lastRebalanceDate: string, frequency: string): boolean {
    if (frequency === 'never') return false;

    const currentDate = new Date(date);
    const lastDate = new Date(lastRebalanceDate);

    switch (frequency) {
      case 'monthly':
        return currentDate.getMonth() !== lastDate.getMonth() ||
          currentDate.getFullYear() !== lastDate.getFullYear();
      case 'quarterly':
        return Math.floor(currentDate.getMonth() / 3) !== Math.floor(lastDate.getMonth() / 3) ||
          currentDate.getFullYear() !== lastDate.getFullYear();
      case 'annually':
        return currentDate.getFullYear() !== lastDate.getFullYear();
      default:
        return false;
    }
  }

  async runBacktest(portfolio: Portfolio): Promise<BacktestResult> {
    const symbols = portfolio.holdings.map(h => h.symbol);
    await this.loadHistoricalData(symbols);

    // Find the actual available date range
    let actualStartDate = portfolio.startDate;
    let actualEndDate = portfolio.endDate;

    // Find the latest start date and earliest end date across all holdings
    for (const symbol of symbols) {
      const data = this.historicalData.get(symbol);
      if (!data || data.data.length === 0) {
        throw new Error(`No data available for ${symbol}`);
      }

      const symbolStartDate = data.data[0].date;
      const symbolEndDate = data.data[data.data.length - 1].date;

      if (symbolStartDate > actualStartDate) {
        actualStartDate = symbolStartDate;
      }
      if (symbolEndDate < actualEndDate) {
        actualEndDate = symbolEndDate;
      }
    }

    // Check if the adjusted date range is valid
    if (actualStartDate >= actualEndDate) {
      const dateRanges = symbols.map(symbol => {
        const data = this.historicalData.get(symbol);
        if (!data) return `${symbol}: No data`;
        return `${symbol}: ${data.data[0].date} to ${data.data[data.data.length - 1].date}`;
      }).join('\n');

      throw new Error(
        `No overlapping dates found for your selected holdings.\n\n` +
        `Available date ranges:\n${dateRanges}\n\n` +
        `Suggestion: Use a date range between ${actualStartDate} and ${actualEndDate}`
      );
    }

    const dates = this.getCommonDates(symbols, actualStartDate, actualEndDate);

    if (dates.length === 0) {
      throw new Error('No common dates found for the selected portfolio holdings and date range');
    }

    const shares = new Map<string, number>();
    let cash = portfolio.startingAmount;
    let totalContributions = portfolio.startingAmount;
    let lastContributionDate: string | null = dates[0];
    let lastRebalanceDate = dates[0];

    const values: PortfolioValue[] = [];

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];

      if (i === 0) {
        for (const holding of portfolio.holdings) {
          const price = this.getPrice(holding.symbol, date);
          if (price) {
            const allocation = holding.allocation / 100;
            const investAmount = portfolio.startingAmount * allocation;
            const numShares = investAmount / price;
            shares.set(holding.symbol, numShares);
          }
        }
        cash = 0;
      } else {
        if (this.shouldContribute(date, lastContributionDate, portfolio.contributionFrequency)) {
          const contributionAmount = this.calculateContributionAmount(portfolio);
          cash += contributionAmount;
          totalContributions += contributionAmount;
          lastContributionDate = date;

          for (const holding of portfolio.holdings) {
            const price = this.getPrice(holding.symbol, date);
            if (price) {
              const allocation = holding.allocation / 100;
              const investAmount = contributionAmount * allocation;
              const numShares = investAmount / price;
              shares.set(holding.symbol, (shares.get(holding.symbol) || 0) + numShares);
            }
          }
          cash = 0;
        }

        if (this.shouldRebalance(date, lastRebalanceDate, portfolio.rebalanceFrequency)) {
          let totalValue = cash;
          for (const holding of portfolio.holdings) {
            const price = this.getPrice(holding.symbol, date);
            if (price) {
              totalValue += (shares.get(holding.symbol) || 0) * price;
            }
          }

          for (const holding of portfolio.holdings) {
            const price = this.getPrice(holding.symbol, date);
            if (price) {
              const allocation = holding.allocation / 100;
              const targetValue = totalValue * allocation;
              const numShares = targetValue / price;
              shares.set(holding.symbol, numShares);
            }
          }

          lastRebalanceDate = date;
        }
      }

      let portfolioValue = cash;
      for (const holding of portfolio.holdings) {
        const price = this.getPrice(holding.symbol, date);
        if (price) {
          portfolioValue += (shares.get(holding.symbol) || 0) * price;
        }
      }

      const gains = portfolioValue - totalContributions;

      values.push({
        date,
        value: portfolioValue,
        contributions: totalContributions,
        gains
      });
    }

    const finalValue = values[values.length - 1].value;
    const totalGains = finalValue - totalContributions;
    const totalReturn = (totalGains / totalContributions) * 100;

    const years = (new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const annualizedReturn = (Math.pow(finalValue / totalContributions, 1 / years) - 1) * 100;

    let maxDrawdown = 0;
    let peak = values[0].value;
    for (const val of values) {
      if (val.value > peak) {
        peak = val.value;
      }
      const drawdown = ((peak - val.value) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    const returns = [];
    for (let i = 1; i < values.length; i++) {
      const ret = (values[i].value - values[i - 1].value) / values[i - 1].value;
      returns.push(ret);
    }
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(52);

    return {
      portfolio: {
        ...portfolio,
        // Update with actual dates used
        startDate: actualStartDate,
        endDate: actualEndDate
      },
      values,
      finalValue,
      totalContributions,
      totalGains,
      totalReturn,
      annualizedReturn,
      maxDrawdown,
      sharpeRatio
    };
  }
}
