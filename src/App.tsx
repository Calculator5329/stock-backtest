import { useState } from 'react';
import { Portfolio, BacktestResult } from './types';
import { PortfolioBuilder } from './components/PortfolioBuilder';
import { BacktestResults } from './components/BacktestResults';
import { CurrentPortfolio } from './components/CurrentPortfolio';
import { useAvailableTickers } from './hooks/useAvailableTickers';
import { BacktestEngine } from './lib/backtestEngine';
import './App.css';

function App() {
  const { tickers, loading, error } = useAvailableTickers();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [activeView, setActiveView] = useState<'backtest' | 'current'>('current');

  const handleSavePortfolio = (portfolio: Portfolio) => {
    const existingIndex = portfolios.findIndex(p => p.id === portfolio.id);
    if (existingIndex >= 0) {
      const newPortfolios = [...portfolios];
      newPortfolios[existingIndex] = portfolio;
      setPortfolios(newPortfolios);
    } else {
      setPortfolios([...portfolios, portfolio]);
    }
    setShowBuilder(false);
  };

  const handleRemovePortfolio = (id: string) => {
    setPortfolios(portfolios.filter(p => p.id !== id));
    setResults(results.filter(r => r.portfolio.id !== id));
  };

  const handleRunBacktests = async () => {
    if (portfolios.length === 0) {
      alert('Please create at least one portfolio');
      return;
    }

    setIsRunning(true);
    setResults([]);

    const engine = new BacktestEngine();
    const newResults: BacktestResult[] = [];

    try {
      for (const portfolio of portfolios) {
        const result = await engine.runBacktest(portfolio);
        newResults.push(result);
      }
      setResults(newResults);
    } catch (error) {
      alert(`Error running backtest: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="spinner"></div>
          <h2>Loading available tickers...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <div className="error-content">
          <h2>Error: {error}</h2>
          <p>Please make sure you have fetched historical data by running:</p>
          <code>npm run fetch:all</code>
        </div>
      </div>
    );
  }

  if (tickers.length === 0) {
    return (
      <div className="error-screen">
        <div className="error-content">
          <h2>No tickers available</h2>
          <p>Please fetch historical data by running:</p>
          <code>npm run fetch:all</code>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="container">
          <div className="header-content">
            <div>
              <h1>Portfolio Backtester</h1>
              <p className="subtitle">Compare portfolio strategies with historical data</p>
            </div>
            <div className="header-nav">
              <button
                className={`nav-btn ${activeView === 'current' ? 'active' : ''}`}
                onClick={() => setActiveView('current')}
              >
                My Portfolio
              </button>
              <button
                className={`nav-btn ${activeView === 'backtest' ? 'active' : ''}`}
                onClick={() => setActiveView('backtest')}
              >
                Backtest
              </button>
            </div>
            <div className="header-actions">
              <button
                onClick={() => setShowBuilder(!showBuilder)}
                className="btn btn-create"
              >
                {showBuilder ? '✕ Close' : '+ New Portfolio'}
              </button>
              {portfolios.length > 0 && (
                <button
                  onClick={handleRunBacktests}
                  disabled={isRunning}
                  className="btn btn-run"
                >
                  {isRunning ? (
                    <>
                      <span className="spinner-sm"></span>
                      Running...
                    </>
                  ) : (
                    '▶ Run Backtest'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          {activeView === 'current' && <CurrentPortfolio />}

          {activeView === 'backtest' && (
            <>
              {showBuilder && (
                <PortfolioBuilder
                  availableTickers={tickers}
                  onSave={handleSavePortfolio}
                  onCancel={() => setShowBuilder(false)}
                />
              )}

              {portfolios.length > 0 && !showBuilder && (
            <div className="portfolios-section">
              <div className="section-header">
                <h2>Your Portfolios</h2>
                <div className="badge">{portfolios.length}</div>
              </div>
              <div className="portfolios-grid">
                {portfolios.map(portfolio => (
                  <div key={portfolio.id} className="portfolio-card">
                    <div className="portfolio-card-header">
                      <h3>{portfolio.name}</h3>
                      <button
                        onClick={() => handleRemovePortfolio(portfolio.id)}
                        className="btn-icon btn-danger"
                        title="Delete portfolio"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                    <div className="portfolio-holdings">
                      {portfolio.holdings.map(h => (
                        <div key={h.symbol} className="holding-badge">
                          <span className="holding-symbol">{h.symbol}</span>
                          <span className="holding-percent">{h.allocation}%</span>
                        </div>
                      ))}
                    </div>
                    <div className="portfolio-meta">
                      <div className="meta-item">
                        <span className="meta-label">Starting:</span>
                        <span className="meta-value">${portfolio.startingAmount.toLocaleString()}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Annual:</span>
                        <span className="meta-value">${portfolio.annualContribution.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

              {portfolios.length === 0 && !showBuilder && (
                <div className="empty-state">
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                    <path d="M32 8v48M8 32h48" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  <h2>No portfolios yet</h2>
                  <p>Create your first portfolio to start backtesting different investment strategies</p>
                  <button onClick={() => setShowBuilder(true)} className="btn btn-primary-large">
                    Create Your First Portfolio
                  </button>
                </div>
              )}

              {results.length > 0 && <BacktestResults results={results} />}
            </>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <div className="container">
          <p>Portfolio Backtester • {tickers.length} tickers available • Weekly data from 1999-2026</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
