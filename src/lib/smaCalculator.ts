import { HistoricalDataPoint } from '../types';

export function calculate200DaySMA(data: HistoricalDataPoint[]): number | null {
  // Since we have weekly data, 200 trading days = ~40 weeks (200/5 trading days per week)
  // We'll use 40 weeks to approximate the 200-day SMA
  const weeksNeeded = 40;

  if (data.length < weeksNeeded) return null;

  // Get the last 40 weeks of data
  const lastWeeks = data.slice(-weeksNeeded);

  // Calculate average of adjusted close prices
  const sum = lastWeeks.reduce((acc, point) => acc + point.adjustedClose, 0);
  return sum / weeksNeeded;
}

export function calculatePercentAboveSMA(currentPrice: number, sma: number): number {
  return ((currentPrice - sma) / sma) * 100;
}
