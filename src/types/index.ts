export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose: number;
}

export interface TickerHistoricalData {
  symbol: string;
  name: string;
  data: HistoricalDataPoint[];
  lastUpdated: string;
}

export interface TickerInfo {
  symbol: string;
  name: string;
  exchange: string;
  assetType: 'Stock' | 'ETF';
}

export interface PortfolioHolding {
  symbol: string;
  name: string;
  allocation: number; // percentage (0-100)
}

export interface Portfolio {
  id: string;
  name: string;
  holdings: PortfolioHolding[];
  startingAmount: number;
  annualContribution: number;
  contributionFrequency: 'monthly' | 'quarterly' | 'annually';
  startDate: string;
  endDate: string;
  rebalanceFrequency: 'never' | 'monthly' | 'quarterly' | 'annually';
}

export interface PortfolioValue {
  date: string;
  value: number;
  contributions: number;
  gains: number;
}

export interface BacktestResult {
  portfolio: Portfolio;
  values: PortfolioValue[];
  finalValue: number;
  totalContributions: number;
  totalGains: number;
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
}

export interface HoldingPerformance {
  symbol: string;
  name: string;
  shares: number;
  currentValue: number;
  costBasis: number;
  gain: number;
  gainPercent: number;
}
