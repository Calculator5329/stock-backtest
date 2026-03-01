import { useState, useEffect } from 'react';
import { Portfolio, PortfolioHolding, TickerInfo } from '../types';
import { useTickerDateRange } from '../hooks/useTickerDateRange';
import './PortfolioBuilder.css';

interface PortfolioBuilderProps {
  availableTickers: TickerInfo[];
  onSave: (portfolio: Portfolio) => void;
  onCancel: () => void;
  initialPortfolio?: Portfolio;
}

export function PortfolioBuilder({ availableTickers, onSave, onCancel, initialPortfolio }: PortfolioBuilderProps) {
  const [name, setName] = useState(initialPortfolio?.name || '');
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(
    initialPortfolio?.holdings || [{ symbol: '', name: '', allocation: 0 }]
  );
  const [startingAmount, setStartingAmount] = useState(initialPortfolio?.startingAmount || 10000);
  const [annualContribution, setAnnualContribution] = useState(initialPortfolio?.annualContribution || 6000);
  const [contributionFrequency, setContributionFrequency] = useState<'monthly' | 'quarterly' | 'annually'>(
    initialPortfolio?.contributionFrequency || 'monthly'
  );
  const [startDate, setStartDate] = useState(initialPortfolio?.startDate || '2010-01-01');
  const [endDate, setEndDate] = useState(initialPortfolio?.endDate || '2024-12-31');
  const [rebalanceFrequency, setRebalanceFrequency] = useState<'never' | 'monthly' | 'quarterly' | 'annually'>(
    initialPortfolio?.rebalanceFrequency || 'quarterly'
  );

  const addHolding = () => {
    setHoldings([...holdings, { symbol: '', name: '', allocation: 0 }]);
  };

  const removeHolding = (index: number) => {
    if (holdings.length > 1) {
      setHoldings(holdings.filter((_, i) => i !== index));
    }
  };

  const updateHolding = (index: number, field: keyof PortfolioHolding, value: string | number) => {
    const newHoldings = [...holdings];
    if (field === 'symbol') {
      const ticker = availableTickers.find(t => t.symbol === value);
      newHoldings[index] = {
        ...newHoldings[index],
        symbol: value as string,
        name: ticker?.name || ''
      };
    } else {
      newHoldings[index] = { ...newHoldings[index], [field]: value };
    }
    setHoldings(newHoldings);
  };

  const totalAllocation = holdings.reduce((sum, h) => sum + (parseFloat(String(h.allocation)) || 0), 0);
  const isAllocationValid = Math.abs(totalAllocation - 100) < 0.01;

  // Get valid date range for selected holdings
  const selectedSymbols = holdings.filter(h => h.symbol).map(h => h.symbol);
  const dateRange = useTickerDateRange(selectedSymbols);

  // Auto-adjust dates when date range is loaded
  useEffect(() => {
    if (dateRange && !initialPortfolio) {
      setStartDate(dateRange.minDate);
      setEndDate(dateRange.maxDate);
    }
  }, [dateRange?.minDate, dateRange?.maxDate]);

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a portfolio name');
      return;
    }

    const validHoldings = holdings.filter(h => h.symbol && h.allocation > 0);
    if (validHoldings.length === 0) {
      alert('Please add at least one holding with a valid ticker and allocation');
      return;
    }

    if (!isAllocationValid) {
      alert(`Total allocation must equal 100% (current: ${totalAllocation.toFixed(2)}%)`);
      return;
    }

    const portfolio: Portfolio = {
      id: initialPortfolio?.id || `portfolio-${Date.now()}`,
      name,
      holdings: validHoldings,
      startingAmount,
      annualContribution,
      contributionFrequency,
      startDate,
      endDate,
      rebalanceFrequency
    };

    onSave(portfolio);
  };

  return (
    <div className="portfolio-builder">
      <div className="builder-header">
        <h2>{initialPortfolio ? 'Edit Portfolio' : 'Create New Portfolio'}</h2>
        <button className="btn-close" onClick={onCancel}>×</button>
      </div>

      <div className="builder-content">
        <div className="form-section">
          <label className="form-label">Portfolio Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
            placeholder="e.g., Conservative Growth, Aggressive Tech, etc."
          />
        </div>

        <div className="form-section">
          <div className="section-header">
            <h3>Holdings</h3>
            <div className={`allocation-badge ${isAllocationValid ? 'valid' : 'invalid'}`}>
              Total: {totalAllocation.toFixed(1)}%
            </div>
          </div>

          <div className="holdings-list">
            {holdings.map((holding, index) => (
              <div key={index} className="holding-row">
                <div className="holding-number">{index + 1}</div>
                <select
                  value={holding.symbol}
                  onChange={(e) => updateHolding(index, 'symbol', e.target.value)}
                  className="form-select holding-select"
                >
                  <option value="">Select ticker...</option>
                  {availableTickers.map(ticker => (
                    <option key={ticker.symbol} value={ticker.symbol}>
                      {ticker.symbol} - {ticker.name}
                    </option>
                  ))}
                </select>
                <div className="allocation-input-wrapper">
                  <input
                    type="number"
                    value={holding.allocation || ''}
                    onChange={(e) => updateHolding(index, 'allocation', parseFloat(e.target.value) || 0)}
                    className="form-input allocation-input"
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <span className="percent-symbol">%</span>
                </div>
                <button
                  onClick={() => removeHolding(index)}
                  className="btn-remove"
                  disabled={holdings.length === 1}
                  title="Remove holding"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4 4l8 8m0-8l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button onClick={addHolding} className="btn-add">
            + Add Holding
          </button>
        </div>

        <div className="form-grid">
          <div className="form-section">
            <label className="form-label">Starting Amount</label>
            <div className="input-with-prefix">
              <span className="input-prefix">$</span>
              <input
                type="number"
                value={startingAmount}
                onChange={(e) => setStartingAmount(parseFloat(e.target.value) || 0)}
                className="form-input"
                min="0"
                step="1000"
              />
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Annual Contribution</label>
            <div className="input-with-prefix">
              <span className="input-prefix">$</span>
              <input
                type="number"
                value={annualContribution}
                onChange={(e) => setAnnualContribution(parseFloat(e.target.value) || 0)}
                className="form-input"
                min="0"
                step="1000"
              />
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Contribution Frequency</label>
            <select
              value={contributionFrequency}
              onChange={(e) => setContributionFrequency(e.target.value as any)}
              className="form-select"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>

          <div className="form-section">
            <label className="form-label">Rebalance Frequency</label>
            <select
              value={rebalanceFrequency}
              onChange={(e) => setRebalanceFrequency(e.target.value as any)}
              className="form-select"
            >
              <option value="never">Never</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>

          <div className="form-section">
            <label className="form-label">
              Start Date
              {dateRange && <span className="date-hint"> (Available from {dateRange.minDate})</span>}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-input"
              min={dateRange?.minDate}
              max={dateRange?.maxDate}
            />
          </div>

          <div className="form-section">
            <label className="form-label">
              End Date
              {dateRange && <span className="date-hint"> (Available until {dateRange.maxDate})</span>}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-input"
              min={dateRange?.minDate}
              max={dateRange?.maxDate}
            />
          </div>
        </div>
      </div>

      <div className="builder-footer">
        <button onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
        <button onClick={handleSave} className="btn btn-primary">
          {initialPortfolio ? 'Update Portfolio' : 'Create Portfolio'}
        </button>
      </div>
    </div>
  );
}
