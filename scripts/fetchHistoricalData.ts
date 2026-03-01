import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface TickerInfo {
  symbol: string;
  name: string;
  exchange: string;
  assetType: 'Stock' | 'ETF';
}

interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose: number;
}

interface TickerHistoricalData {
  symbol: string;
  name: string;
  data: HistoricalDataPoint[];
  lastUpdated: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';

async function fetchHistoricalDataAlphaVantage(
  symbol: string,
  outputsize: 'compact' | 'full' = 'full'
): Promise<HistoricalDataPoint[]> {
  try {
    const url = 'https://www.alphavantage.co/query';
    const params = {
      function: 'TIME_SERIES_WEEKLY_ADJUSTED',
      symbol,
      apikey: ALPHA_VANTAGE_API_KEY,
      outputsize,
      datatype: 'json'
    };

    const response = await axios.get(url, { params });

    if (response.data['Error Message']) {
      throw new Error('Invalid symbol');
    }

    if (response.data['Note']) {
      throw new Error('API rate limit reached');
    }

    const timeSeries = response.data['Weekly Adjusted Time Series'];

    if (!timeSeries) {
      throw new Error('No data available');
    }

    const data: HistoricalDataPoint[] = [];

    for (const [date, values] of Object.entries(timeSeries)) {
      const v = values as any;
      data.push({
        date,
        open: parseFloat(v['1. open']),
        high: parseFloat(v['2. high']),
        low: parseFloat(v['3. low']),
        close: parseFloat(v['4. close']),
        volume: parseInt(v['6. volume']),
        adjustedClose: parseFloat(v['5. adjusted close'])
      });
    }

    data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.error(`  ✗ Symbol ${symbol} not found`);
    } else {
      console.error(`  ✗ Error fetching ${symbol}:`, error.message);
    }
    return [];
  }
}

async function generateSampleData(
  symbol: string,
  startPrice: number = 100
): Promise<HistoricalDataPoint[]> {
  const data: HistoricalDataPoint[] = [];
  const startDate = new Date('2000-01-01');
  const endDate = new Date();

  let currentPrice = startPrice;
  let currentDate = new Date(startDate);

  const weeklyVolatility = symbol.includes('ETF') ? 0.02 : 0.03;
  const trend = 0.001;

  while (currentDate <= endDate) {
    const change = (Math.random() - 0.5) * 2 * weeklyVolatility + trend;
    const open = currentPrice;
    const close = currentPrice * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(1000000 + Math.random() * 10000000);

    data.push({
      date: currentDate.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
      adjustedClose: parseFloat(close.toFixed(2))
    });

    currentPrice = close;
    currentDate.setDate(currentDate.getDate() + 7);
  }

  return data;
}

async function loadTickers(): Promise<TickerInfo[]> {
  const tickersPath = path.join(process.cwd(), 'data', 'tickers.json');

  if (!fs.existsSync(tickersPath)) {
    console.error('Tickers file not found. Please run fetchTickers.ts first.');
    process.exit(1);
  }

  const data = fs.readFileSync(tickersPath, 'utf-8');
  return JSON.parse(data);
}

async function saveHistoricalData(
  ticker: TickerInfo,
  data: HistoricalDataPoint[]
) {
  const subDir = ticker.assetType === 'ETF' ? 'etfs' : 'stocks';
  const dataDir = path.join(process.cwd(), 'data', subDir);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const historicalData: TickerHistoricalData = {
    symbol: ticker.symbol,
    name: ticker.name,
    data,
    lastUpdated: new Date().toISOString()
  };

  const filePath = path.join(dataDir, `${ticker.symbol}.json`);
  fs.writeFileSync(filePath, JSON.stringify(historicalData, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  const useSampleData = args.includes('--sample');
  const useAlphaVantage = args.includes('--alphavantage') || ALPHA_VANTAGE_API_KEY !== 'demo';
  const limit = args.includes('--limit')
    ? parseInt(args[args.indexOf('--limit') + 1])
    : undefined;

  if (useSampleData) {
    console.log('Generating SAMPLE historical data for demonstration...\n');
  } else if (useAlphaVantage) {
    console.log('Fetching historical data from Alpha Vantage...');
    console.log('API Key:', ALPHA_VANTAGE_API_KEY === 'demo' ? 'DEMO (limited)' : 'Custom');
    console.log('\nNote: Free tier allows 25 requests per day, 5 per minute\n');
  } else {
    console.log('No data source specified!');
    console.log('\nUsage:');
    console.log('  --sample          Generate sample data for demonstration');
    console.log('  --alphavantage    Use Alpha Vantage API (requires ALPHA_VANTAGE_API_KEY env var)');
    console.log('  --limit N         Only process first N tickers');
    console.log('\nExample: npm run fetch:data -- --sample');
    process.exit(1);
  }

  const tickers = await loadTickers();
  const tickersToFetch = limit ? tickers.slice(0, limit) : tickers;

  console.log(`Processing ${tickersToFetch.length} tickers...\n`);

  let successful = 0;
  let failed = 0;

  const startPrices: Record<string, number> = {
    'AAPL': 25, 'MSFT': 50, 'GOOGL': 400, 'AMZN': 15, 'NVDA': 10,
    'TSLA': 5, 'META': 30, 'BRK.B': 3000, 'JPM': 30, 'JNJ': 50,
    'V': 50, 'WMT': 45, 'PG': 60, 'MA': 50, 'DIS': 25,
    'SPY': 100, 'QQQ': 25, 'VTI': 50, 'IWM': 40, 'EEM': 25,
    'VEA': 30, 'AGG': 90, 'GLD': 35
  };

  for (let i = 0; i < tickersToFetch.length; i++) {
    const ticker = tickersToFetch[i];
    const progress = `[${i + 1}/${tickersToFetch.length}]`;

    console.log(`${progress} Fetching ${ticker.symbol} (${ticker.name})...`);

    let data: HistoricalDataPoint[] = [];

    if (useSampleData) {
      const startPrice = startPrices[ticker.symbol] || 100;
      data = await generateSampleData(ticker.symbol, startPrice);
    } else if (useAlphaVantage) {
      data = await fetchHistoricalDataAlphaVantage(ticker.symbol);
      if (data.length === 0) {
        await delay(12000);
        continue;
      }
    }

    if (data.length > 0) {
      await saveHistoricalData(ticker, data);
      console.log(`  ✓ Saved ${data.length} data points (${data[0].date} to ${data[data.length - 1].date})`);
      successful++;
    } else {
      console.log(`  ✗ No data available`);
      failed++;
    }

    if (useAlphaVantage && (i + 1) % 5 === 0) {
      console.log(`\n--- Waiting 60s for rate limit... Progress: ${successful} successful, ${failed} failed ---\n`);
      await delay(60000);
    } else if (useSampleData) {
      await delay(10);
    }
  }

  console.log('\n=================================');
  console.log('Historical Data Fetch Complete!');
  console.log(`✓ Successful: ${successful}`);
  console.log(`✗ Failed: ${failed}`);
  console.log('=================================');
}

main().catch(console.error);
