# Stock Portfolio Backtester

A comprehensive React + TypeScript application for backtesting stock and ETF portfolio strategies using historical market data.

## Features

- **Portfolio Builder**: Create custom portfolios with multiple stocks and ETFs
- **Historical Data**: Fetch real weekly historical data from Alpha Vantage API
- **Backtest Engine**: Simulate portfolio performance over time with:
  - Customizable starting amounts
  - Periodic contributions (monthly, quarterly, annually)
  - Automatic rebalancing options
  - Dividend reinvestment (via adjusted close prices)
- **Portfolio Comparison**: Compare multiple portfolio strategies side-by-side
- **Performance Metrics**:
  - Total return
  - Annualized return
  - Maximum drawdown
  - Sharpe ratio
  - Final value vs contributions
- **Interactive Charts**: Visualize portfolio performance over time using Recharts

## Getting Started

### Installation

```bash
npm install
```

### Fetching Historical Data

#### Option 1: Using Alpha Vantage API (Recommended for Real Data)

1. Get a free API key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key)

2. Fetch ticker list and historical data:

```bash
# Fetch available tickers
npm run fetch:tickers

# Set your API key and fetch real historical data (weekly)
ALPHA_VANTAGE_API_KEY=your_api_key_here npm run fetch:data:alphavantage
```

**Note**: Alpha Vantage free tier allows:
- 25 API calls per day
- 5 API calls per minute
- The script automatically handles rate limiting

#### Option 2: Using Sample Data (For Quick Testing)

```bash
npm run fetch:all
```

This will generate synthetic historical data for demonstration purposes.

### Running the Application

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

### Creating a Portfolio

1. Click "Create New Portfolio"
2. Enter a portfolio name
3. Add holdings by selecting tickers and setting allocations (must total 100%)
4. Configure:
   - Starting amount
   - Annual contribution amount
   - Contribution frequency
   - Rebalancing frequency
   - Start and end dates
5. Click "Create Portfolio"

### Running Backtests

1. Create one or more portfolios
2. Click "Run Backtests"
3. View comparative results including:
   - Performance charts
   - Final values
   - Return metrics
   - Risk metrics

### Example Portfolio Strategies

**Conservative Portfolio**
- 60% SPY (S&P 500)
- 30% AGG (Bonds)
- 10% GLD (Gold)

**Growth Portfolio**
- 70% QQQ (NASDAQ)
- 20% VTI (Total Market)
- 10% EEM (Emerging Markets)

**Tech-Heavy Portfolio**
- 30% AAPL
- 30% MSFT
- 20% GOOGL
- 20% NVDA

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run fetch:tickers` - Fetch available ticker symbols
- `npm run fetch:data:alphavantage` - Fetch real historical data (requires API key)
- `npm run fetch:all` - Fetch tickers and generate sample data

## Project Structure

```
├── scripts/
│   ├── fetchTickers.ts          # Fetch NYSE/NASDAQ ticker list
│   └── fetchHistoricalData.ts   # Fetch historical price data
├── src/
│   ├── components/
│   │   ├── PortfolioBuilder.tsx # Portfolio creation UI
│   │   └── BacktestResults.tsx  # Results visualization
│   ├── hooks/
│   │   └── useAvailableTickers.ts # Load available tickers
│   ├── lib/
│   │   └── backtestEngine.ts    # Core backtesting logic
│   ├── types/
│   │   └── index.ts             # TypeScript definitions
│   └── App.tsx                  # Main application
├── data/                        # Historical data storage
│   ├── stocks/                  # Individual stock data
│   ├── etfs/                    # ETF data
│   └── tickers.json             # Available tickers list
└── public/
    └── data/                    # Served data files
```

## Technical Details

### Backtesting Engine

The backtesting engine simulates realistic portfolio management:

1. **Initial Investment**: Allocates starting amount according to specified percentages
2. **Periodic Contributions**: Adds regular contributions based on frequency
3. **Rebalancing**: Resets portfolio to target allocations at specified intervals
4. **Price Data**: Uses adjusted close prices (accounts for splits and dividends)
5. **Performance Calculation**: Calculates returns, drawdowns, and risk metrics

### Data Format

Historical data is stored as JSON files with weekly price points:

```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "data": [
    {
      "date": "2000-01-07",
      "open": 25.50,
      "high": 26.00,
      "low": 25.25,
      "close": 25.75,
      "volume": 50000000,
      "adjustedClose": 0.89
    }
  ],
  "lastUpdated": "2026-01-21T..."
}
```

## Limitations

- Weekly data only (not daily)
- Alpha Vantage free tier has rate limits
- No transaction costs or taxes included
- No slippage modeling
- Assumes instant execution at close prices

## Future Enhancements

- Daily data support
- Transaction cost modeling
- Tax-loss harvesting simulation
- More data sources (Yahoo Finance, IEX Cloud)
- Export results to CSV/PDF
- Save/load portfolio configurations
- Monte Carlo simulations
- Risk-adjusted return analysis

## Technologies

- React 19
- TypeScript
- Vite
- Recharts (charting)
- Axios (API calls)
- date-fns (date handling)
- Alpha Vantage API

## License

MIT
