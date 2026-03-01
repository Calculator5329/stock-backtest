import { useState, useEffect } from 'react';
import { calculate200DaySMA, calculatePercentAboveSMA } from '../lib/smaCalculator';
import './CurrentPortfolio.css';

interface Holding {
  symbol: string;
  description: string;
  quantity: number;
  lastPrice: number;
  currentValue: number;
  totalGainPercent: number;
  percentOfAccount: number;
}

interface HoldingWithSMA extends Holding {
  sma200: number | null;
  percentAboveSMA: number | null;
  smaStatus: 'above' | 'below' | 'unknown';
  returns: {
    '1mo': number | null;
    '3mo': number | null;
    '6mo': number | null;
    '1y': number | null;
    '2y': number | null;
    '3y': number | null;
  };
}

export function CurrentPortfolio() {
  const [holdings, setHoldings] = useState<HoldingWithSMA[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'value' | 'sma'>('value');
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>(['1mo', '3mo', '1y']);

  useEffect(() => {
    async function loadPortfolioData() {
      // Parse the CSV data
      const portfolioHoldings: Holding[] = [
        { symbol: 'META', description: 'META PLATFORMS INC', quantity: 26.4, lastPrice: 612.96, currentValue: 16182.14, totalGainPercent: 176.50, percentOfAccount: 25.56 },
        { symbol: 'GOOGL', description: 'ALPHABET INC', quantity: 39.6, lastPrice: 328.38, currentValue: 13003.84, totalGainPercent: 118.05, percentOfAccount: 20.54 },
        { symbol: 'AMZN', description: 'AMAZON.COM INC', quantity: 44.25, lastPrice: 231.31, currentValue: 10235.46, totalGainPercent: 30.72, percentOfAccount: 16.17 },
        { symbol: 'PYPL', description: 'PAYPAL HOLDINGS INC', quantity: 107.5, lastPrice: 55.89, currentValue: 6008.17, totalGainPercent: -12.76, percentOfAccount: 9.49 },
        { symbol: 'TXRH', description: 'TEXAS ROADHOUSE INC', quantity: 20, lastPrice: 191.36, currentValue: 3827.20, totalGainPercent: 101.41, percentOfAccount: 6.05 },
        { symbol: 'DUOL', description: 'DUOLINGO INC', quantity: 21.35, lastPrice: 146.81, currentValue: 3134.39, totalGainPercent: -29.10, percentOfAccount: 4.95 },
        { symbol: 'AMD', description: 'ADVANCED MICRO DEVICES', quantity: 10.6, lastPrice: 249.80, currentValue: 2647.88, totalGainPercent: 83.78, percentOfAccount: 4.18 },
        { symbol: 'ASML', description: 'ASML HOLDING NV', quantity: 1.75, lastPrice: 1360.09, currentValue: 2380.15, totalGainPercent: 73.73, percentOfAccount: 3.76 },
        { symbol: 'MELI', description: 'MERCADOLIBRE INC', quantity: 0.8, lastPrice: 2057.77, currentValue: 1646.21, totalGainPercent: -1.58, percentOfAccount: 2.60 },
        { symbol: 'NKE', description: 'NIKE INC CLASS B', quantity: 18.9, lastPrice: 65.41, currentValue: 1236.24, totalGainPercent: -8.83, percentOfAccount: 1.95 },
        { symbol: 'ADBE', description: 'ADOBE INC', quantity: 4.075, lastPrice: 294.23, currentValue: 1198.98, totalGainPercent: -16.12, percentOfAccount: 1.89 },
        { symbol: 'NFLX', description: 'NETFLIX INC', quantity: 8.75, lastPrice: 85.36, currentValue: 746.90, totalGainPercent: -5.70, percentOfAccount: 1.18 },
        { symbol: 'MA', description: 'MASTERCARD INC', quantity: 1.375, lastPrice: 527.57, currentValue: 725.40, totalGainPercent: -2.48, percentOfAccount: 1.15 },
        { symbol: 'CELH', description: 'CELSIUS HOLDINGS INC', quantity: 2, lastPrice: 56.44, currentValue: 112.88, totalGainPercent: 37.27, percentOfAccount: 0.18 },
      ];

      const holdingsWithSMA: HoldingWithSMA[] = [];

      for (const holding of portfolioHoldings) {
        let sma200: number | null = null;
        let percentAboveSMA: number | null = null;
        let smaStatus: 'above' | 'below' | 'unknown' = 'unknown';
        const returns = {
          '1mo': null as number | null,
          '3mo': null as number | null,
          '6mo': null as number | null,
          '1y': null as number | null,
          '2y': null as number | null,
          '3y': null as number | null
        };

        try {
          // Try to load historical data
          const stockResponse = await fetch(`/data/stocks/${holding.symbol}.json`);
          if (stockResponse.ok) {
            const data = await stockResponse.json();
            if (data.data && data.data.length > 0) {
              const historicalData = data.data;
              const currentPrice = holding.lastPrice;

              // Calculate SMA
              if (historicalData.length >= 40) {
                sma200 = calculate200DaySMA(historicalData);
                if (sma200 !== null) {
                  percentAboveSMA = calculatePercentAboveSMA(currentPrice, sma200);
                  smaStatus = percentAboveSMA >= 0 ? 'above' : 'below';
                }
              }

              // Calculate returns (weekly data: 1mo=4w, 3mo=13w, 6mo=26w, 1y=52w, 2y=104w, 3y=156w)
              const periods = [
                { key: '1mo', weeks: 4 },
                { key: '3mo', weeks: 13 },
                { key: '6mo', weeks: 26 },
                { key: '1y', weeks: 52 },
                { key: '2y', weeks: 104 },
                { key: '3y', weeks: 156 }
              ];

              for (const period of periods) {
                if (historicalData.length > period.weeks) {
                  const pastPrice = historicalData[historicalData.length - 1 - period.weeks].adjustedClose;
                  returns[period.key as keyof typeof returns] = ((currentPrice - pastPrice) / pastPrice) * 100;
                }
              }
            }
          }
        } catch (error) {
          console.warn(`Could not calculate metrics for ${holding.symbol}`);
        }

        holdingsWithSMA.push({
          ...holding,
          sma200,
          percentAboveSMA,
          smaStatus,
          returns
        });
      }

      setHoldings(holdingsWithSMA);
      setLoading(false);
    }

    loadPortfolioData();
  }, []);

  const sortedHoldings = [...holdings].sort((a, b) => {
    if (sortBy === 'value') {
      return b.currentValue - a.currentValue;
    } else {
      // Sort by % above/below SMA
      if (a.percentAboveSMA === null) return 1;
      if (b.percentAboveSMA === null) return -1;
      return b.percentAboveSMA - a.percentAboveSMA;
    }
  });

  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="current-portfolio">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="current-portfolio">
      <div className="portfolio-header">
        <div>
          <h2>Current Portfolio</h2>
          <p className="portfolio-value">Total Value: {formatCurrency(totalValue)}</p>
        </div>
        <div className="portfolio-controls">
          <div className="sort-controls">
            <label>Sort by:</label>
            <div className="sort-buttons">
              <button
                className={sortBy === 'value' ? 'active' : ''}
                onClick={() => setSortBy('value')}
              >
                Value
              </button>
              <button
                className={sortBy === 'sma' ? 'active' : ''}
                onClick={() => setSortBy('sma')}
              >
                % vs 200-Day SMA
              </button>
            </div>
          </div>
          <div className="period-selector">
            <label>Show Returns:</label>
            <select
              multiple
              value={selectedPeriods}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                if (selected.length > 0) setSelectedPeriods(selected);
              }}
              className="period-select"
            >
              <option value="1mo">1 Month</option>
              <option value="3mo">3 Months</option>
              <option value="6mo">6 Months</option>
              <option value="1y">1 Year</option>
              <option value="2y">2 Years</option>
              <option value="3y">3 Years</option>
            </select>
          </div>
        </div>
      </div>

      <div className="holdings-table-wrapper">
        <table className="holdings-table">
          <thead>
            <tr>
              <th className="text-left">Symbol</th>
              <th className="text-left">Description</th>
              <th className="text-right">Shares</th>
              <th className="text-right">Price</th>
              <th className="text-right">Value</th>
              <th className="text-right">% of Portfolio</th>
              <th className="text-right">Total Gain</th>
              <th className="text-right">200-Day SMA</th>
              <th className="text-right">% vs SMA</th>
              {selectedPeriods.includes('1mo') && <th className="text-right">1M</th>}
              {selectedPeriods.includes('3mo') && <th className="text-right">3M</th>}
              {selectedPeriods.includes('6mo') && <th className="text-right">6M</th>}
              {selectedPeriods.includes('1y') && <th className="text-right">1Y</th>}
              {selectedPeriods.includes('2y') && <th className="text-right">2Y</th>}
              {selectedPeriods.includes('3y') && <th className="text-right">3Y</th>}
            </tr>
          </thead>
          <tbody>
            {sortedHoldings.map((holding) => (
              <tr key={holding.symbol} className={`sma-${holding.smaStatus}`}>
                <td className="symbol-cell">
                  <strong>{holding.symbol}</strong>
                </td>
                <td className="description-cell">{holding.description}</td>
                <td className="text-right">{holding.quantity.toFixed(2)}</td>
                <td className="text-right">{formatCurrency(holding.lastPrice)}</td>
                <td className="text-right value-cell">
                  <strong>{formatCurrency(holding.currentValue)}</strong>
                </td>
                <td className="text-right">{holding.percentOfAccount.toFixed(2)}%</td>
                <td className={`text-right return-cell ${holding.totalGainPercent >= 0 ? 'positive' : 'negative'}`}>
                  {formatPercent(holding.totalGainPercent)}
                </td>
                <td className="text-right">
                  {holding.sma200 !== null ? formatCurrency(holding.sma200) : 'N/A'}
                </td>
                <td className={`text-right sma-cell ${holding.smaStatus}`}>
                  {holding.percentAboveSMA !== null ? (
                    <>
                      <span className="sma-indicator">
                        {holding.smaStatus === 'above' ? '▲' : '▼'}
                      </span>
                      {formatPercent(Math.abs(holding.percentAboveSMA))}
                    </>
                  ) : (
                    'N/A'
                  )}
                </td>
                {selectedPeriods.includes('1mo') && (
                  <td className={`text-right return-cell ${holding.returns['1mo'] !== null ? (holding.returns['1mo'] >= 0 ? 'positive' : 'negative') : ''}`}>
                    {holding.returns['1mo'] !== null ? formatPercent(holding.returns['1mo']) : 'N/A'}
                  </td>
                )}
                {selectedPeriods.includes('3mo') && (
                  <td className={`text-right return-cell ${holding.returns['3mo'] !== null ? (holding.returns['3mo'] >= 0 ? 'positive' : 'negative') : ''}`}>
                    {holding.returns['3mo'] !== null ? formatPercent(holding.returns['3mo']) : 'N/A'}
                  </td>
                )}
                {selectedPeriods.includes('6mo') && (
                  <td className={`text-right return-cell ${holding.returns['6mo'] !== null ? (holding.returns['6mo'] >= 0 ? 'positive' : 'negative') : ''}`}>
                    {holding.returns['6mo'] !== null ? formatPercent(holding.returns['6mo']) : 'N/A'}
                  </td>
                )}
                {selectedPeriods.includes('1y') && (
                  <td className={`text-right return-cell ${holding.returns['1y'] !== null ? (holding.returns['1y'] >= 0 ? 'positive' : 'negative') : ''}`}>
                    {holding.returns['1y'] !== null ? formatPercent(holding.returns['1y']) : 'N/A'}
                  </td>
                )}
                {selectedPeriods.includes('2y') && (
                  <td className={`text-right return-cell ${holding.returns['2y'] !== null ? (holding.returns['2y'] >= 0 ? 'positive' : 'negative') : ''}`}>
                    {holding.returns['2y'] !== null ? formatPercent(holding.returns['2y']) : 'N/A'}
                  </td>
                )}
                {selectedPeriods.includes('3y') && (
                  <td className={`text-right return-cell ${holding.returns['3y'] !== null ? (holding.returns['3y'] >= 0 ? 'positive' : 'negative') : ''}`}>
                    {holding.returns['3y'] !== null ? formatPercent(holding.returns['3y']) : 'N/A'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="portfolio-footer">
        <div className="legend">
          <div className="legend-item">
            <span className="legend-indicator above">▲</span>
            <span>Above 200-Day SMA</span>
          </div>
          <div className="legend-item">
            <span className="legend-indicator below">▼</span>
            <span>Below 200-Day SMA</span>
          </div>
        </div>
        <p className="data-note">Data as of Jan 21, 2026 • 200-Day SMA calculated from historical data</p>
      </div>
    </div>
  );
}
