import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { BacktestResult } from '../types';
import { format, getYear } from 'date-fns';
import './BacktestResults.css';

interface BacktestResultsProps {
  results: BacktestResult[];
}

export function BacktestResults({ results }: BacktestResultsProps) {
  const [activeTab, setActiveTab] = useState<'growth' | 'annual' | 'stats'>('growth');
  const [chartMode, setChartMode] = useState<'absolute' | 'normalized'>('normalized');

  if (results.length === 0) {
    return null;
  }

  const colors = ['#2563eb', '#16a34a', '#ea580c', '#8b5cf6', '#ec4899', '#06b6d4'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercent = (value: number, decimals: number = 2) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  // Find the latest start date across all portfolios for fair comparison
  const latestStartDate = results.reduce((latest, result) => {
    const startDate = result.portfolio.startDate;
    return startDate > latest ? startDate : latest;
  }, results[0].portfolio.startDate);

  const earliestEndDate = results.reduce((earliest, result) => {
    const endDate = result.portfolio.endDate;
    return endDate < earliest ? endDate : earliest;
  }, results[0].portfolio.endDate);

  // Growth chart data - aligned to common date range
  const growthData: any[] = [];

  // Get all unique dates in the common range
  const allDatesSet = new Set<string>();
  results.forEach(result => {
    result.values.forEach(v => {
      if (v.date >= latestStartDate && v.date <= earliestEndDate) {
        allDatesSet.add(v.date);
      }
    });
  });

  const commonDates = Array.from(allDatesSet).sort();

  // Get baseline values at the aligned start date for normalization
  const baselineValues = results.map(result => {
    const baselinePoint = result.values.find(v => v.date === latestStartDate);
    return baselinePoint ? baselinePoint.value : result.portfolio.startingAmount;
  });

  commonDates.forEach(date => {
    const dataPoint: any = { date };

    results.forEach((result, resultIndex) => {
      const valuePoint = result.values.find(v => v.date === date);
      if (valuePoint) {
        if (chartMode === 'normalized') {
          // Normalize to same starting value for fair comparison
          const baseline = baselineValues[resultIndex];
          const targetBaseline = Math.min(...baselineValues);
          dataPoint[`portfolio${resultIndex}`] = (valuePoint.value / baseline) * targetBaseline;
        } else {
          dataPoint[`portfolio${resultIndex}`] = valuePoint.value;
        }
      }
    });

    growthData.push(dataPoint);
  });

  // Calculate annual returns for each portfolio
  const calculateAnnualReturns = (result: BacktestResult) => {
    const annualReturns: { year: number; return: number }[] = [];
    const valuesByYear: { [year: number]: { start: number; end: number } } = {};

    result.values.forEach((value) => {
      const year = getYear(new Date(value.date));
      if (!valuesByYear[year]) {
        valuesByYear[year] = { start: value.value, end: value.value };
      } else {
        valuesByYear[year].end = value.value;
      }
    });

    Object.entries(valuesByYear).forEach(([year, values]) => {
      const returnPct = ((values.end - values.start) / values.start) * 100;
      annualReturns.push({ year: parseInt(year), return: returnPct });
    });

    return annualReturns.sort((a, b) => a.year - b.year);
  };

  const allYears = Array.from(
    new Set(results.flatMap(r => calculateAnnualReturns(r).map(ar => ar.year)))
  ).sort();

  const annualReturnsData = allYears.map(year => {
    const dataPoint: any = { year };
    results.forEach((result, index) => {
      const annualReturns = calculateAnnualReturns(result);
      const yearData = annualReturns.find(ar => ar.year === year);
      dataPoint[`portfolio${index}`] = yearData ? yearData.return : null;
    });
    return dataPoint;
  });

  return (
    <div className="backtest-results">
      <div className="results-header">
        <h2>Backtest Results</h2>
      </div>

      {results.some((r, i) => i > 0 && (r.portfolio.startDate !== results[0].portfolio.startDate || r.portfolio.endDate !== results[0].portfolio.endDate)) && (
        <div className="info-banner">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
          </svg>
          <div>
            <strong>Chart Aligned for Comparison</strong>
            <p>Portfolios have different date ranges. Chart shows common period ({formatDate(latestStartDate)} - {formatDate(earliestEndDate)}) for fair visual comparison. Full statistics shown in table below.</p>
          </div>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'growth' ? 'active' : ''}`}
          onClick={() => setActiveTab('growth')}
        >
          Portfolio Growth
        </button>
        <button
          className={`tab ${activeTab === 'annual' ? 'active' : ''}`}
          onClick={() => setActiveTab('annual')}
        >
          Annual Returns
        </button>
        <button
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Statistics
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'growth' && (
          <div className="chart-container">
            <div className="chart-header">
              <h3>Portfolio Growth Over Time</h3>
              {results.length > 1 && results.some((r, i) => i > 0 && r.portfolio.startDate !== results[0].portfolio.startDate) && (
                <div className="chart-mode-toggle">
                  <button
                    className={chartMode === 'normalized' ? 'active' : ''}
                    onClick={() => setChartMode('normalized')}
                  >
                    Normalized
                  </button>
                  <button
                    className={chartMode === 'absolute' ? 'active' : ''}
                    onClick={() => setChartMode('absolute')}
                  >
                    Absolute
                  </button>
                </div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={450}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value)}
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => formatDate(label)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '8px 12px'
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value, entry: any) => {
                    const index = parseInt(value.replace('portfolio', ''));
                    return results[index]?.portfolio?.name || value;
                  }}
                />
                {results.map((result, index) => (
                  <Line
                    key={result.portfolio.id}
                    type="monotone"
                    dataKey={`portfolio${index}`}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2.5}
                    dot={false}
                    name={result.portfolio.name}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'annual' && (
          <div className="chart-container">
            <h3>Annual Returns</h3>
            <ResponsiveContainer width="100%" height={450}>
              <BarChart data={annualReturnsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="year" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis
                  tickFormatter={(value) => `${value}%`}
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  formatter={(value: number) => formatPercent(value)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    padding: '8px 12px'
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value, entry: any) => {
                    const index = parseInt(value.replace('portfolio', ''));
                    return results[index]?.portfolio?.name || value;
                  }}
                />
                {results.map((result, index) => (
                  <Bar
                    key={result.portfolio.id}
                    dataKey={`portfolio${index}`}
                    fill={colors[index % colors.length]}
                    name={result.portfolio.name}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="statistics-table">
            <h3>Performance Statistics</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th className="metric-col">Metric</th>
                    {results.map((result, index) => (
                      <th key={result.portfolio.id} style={{ color: colors[index % colors.length] }}>
                        {result.portfolio.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="metric-name">Date Range</td>
                    {results.map(r => (
                      <td key={r.portfolio.id} style={{ fontSize: '12px' }}>
                        {formatDate(r.portfolio.startDate)}<br/>to {formatDate(r.portfolio.endDate)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="metric-name">Initial Balance</td>
                    {results.map(r => (
                      <td key={r.portfolio.id}>{formatCurrency(r.portfolio.startingAmount)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="metric-name">Final Balance</td>
                    {results.map(r => (
                      <td key={r.portfolio.id} className="highlight">{formatCurrency(r.finalValue)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="metric-name">Total Contributions</td>
                    {results.map(r => (
                      <td key={r.portfolio.id}>{formatCurrency(r.totalContributions)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="metric-name">Total Gains</td>
                    {results.map(r => (
                      <td key={r.portfolio.id} className={r.totalGains >= 0 ? 'positive' : 'negative'}>
                        {formatCurrency(r.totalGains)}
                      </td>
                    ))}
                  </tr>
                  <tr className="section-header">
                    <td colSpan={results.length + 1}>Returns</td>
                  </tr>
                  <tr>
                    <td className="metric-name">Total Return</td>
                    {results.map(r => (
                      <td key={r.portfolio.id} className={r.totalReturn >= 0 ? 'positive' : 'negative'}>
                        {formatPercent(r.totalReturn)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="metric-name">Annualized Return (CAGR)</td>
                    {results.map(r => (
                      <td key={r.portfolio.id} className={r.annualizedReturn >= 0 ? 'positive' : 'negative'}>
                        {formatPercent(r.annualizedReturn)}
                      </td>
                    ))}
                  </tr>
                  <tr className="section-header">
                    <td colSpan={results.length + 1}>Risk Metrics</td>
                  </tr>
                  <tr>
                    <td className="metric-name">Maximum Drawdown</td>
                    {results.map(r => (
                      <td key={r.portfolio.id} className="negative">
                        -{r.maxDrawdown.toFixed(2)}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="metric-name">Sharpe Ratio</td>
                    {results.map(r => (
                      <td key={r.portfolio.id}>{r.sharpeRatio.toFixed(2)}</td>
                    ))}
                  </tr>
                  <tr className="section-header">
                    <td colSpan={results.length + 1}>Portfolio Details</td>
                  </tr>
                  <tr>
                    <td className="metric-name">Annual Contribution</td>
                    {results.map(r => (
                      <td key={r.portfolio.id}>{formatCurrency(r.portfolio.annualContribution)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="metric-name">Contribution Frequency</td>
                    {results.map(r => (
                      <td key={r.portfolio.id} style={{ textTransform: 'capitalize' }}>
                        {r.portfolio.contributionFrequency}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="metric-name">Rebalancing</td>
                    {results.map(r => (
                      <td key={r.portfolio.id} style={{ textTransform: 'capitalize' }}>
                        {r.portfolio.rebalanceFrequency}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="portfolio-allocations">
              <h3>Portfolio Allocations</h3>
              <div className="allocations-grid">
                {results.map((result, index) => (
                  <div key={result.portfolio.id} className="allocation-card">
                    <h4 style={{ color: colors[index % colors.length] }}>
                      {result.portfolio.name}
                    </h4>
                    <ul>
                      {result.portfolio.holdings.map(h => (
                        <li key={h.symbol}>
                          <span className="symbol">{h.symbol}</span>
                          <span className="allocation">{h.allocation}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
