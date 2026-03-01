import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const ALPHA_VANTAGE_API_KEY = '4B3P9TZAMZA7976R';

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

const TICKERS_TO_FETCH = [
  { symbol: 'META', name: 'Meta Platforms Inc' },
  { symbol: 'AMZN', name: 'Amazon.com Inc' },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc' },
  { symbol: 'TXRH', name: 'Texas Roadhouse Inc' },
  { symbol: 'DUOL', name: 'Duolingo Inc' },
  { symbol: 'AMD', name: 'Advanced Micro Devices Inc' },
  { symbol: 'ASML', name: 'ASML Holding NV' },
  { symbol: 'MELI', name: 'MercadoLibre Inc' },
  { symbol: 'NKE', name: 'Nike Inc' },
  { symbol: 'ADBE', name: 'Adobe Inc' },
  { symbol: 'NFLX', name: 'Netflix Inc' },
  { symbol: 'MA', name: 'Mastercard Inc' },
  { symbol: 'CELH', name: 'Celsius Holdings Inc' }
];

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchHistoricalDataAlphaVantage(symbol: string): Promise<HistoricalDataPoint[]> {
  const url = 'https://www.alphavantage.co/query';
  const params = {
    function: 'TIME_SERIES_WEEKLY_ADJUSTED',
    symbol,
    apikey: ALPHA_VANTAGE_API_KEY,
    outputsize: 'full',
    datatype: 'json'
  };

  try {
    const response = await axios.get(url, { params, timeout: 30000 });

    if (response.data['Error Message']) {
      console.error(`  Error: ${response.data['Error Message']}`);
      return [];
    }

    if (response.data['Note']) {
      console.error(`  Rate limit: ${response.data['Note']}`);
      return [];
    }

    const timeSeries = response.data['Weekly Adjusted Time Series'];
    if (!timeSeries) {
      console.error('  No time series data in response');
      return [];
    }

    const dataPoints: HistoricalDataPoint[] = [];
    for (const [date, values] of Object.entries(timeSeries)) {
      const point: any = values;
      dataPoints.push({
        date,
        open: parseFloat(point['1. open']),
        high: parseFloat(point['2. high']),
        low: parseFloat(point['3. low']),
        close: parseFloat(point['4. close']),
        volume: parseInt(point['6. volume']),
        adjustedClose: parseFloat(point['5. adjusted close'])
      });
    }

    dataPoints.sort((a, b) => a.date.localeCompare(b.date));
    return dataPoints;
  } catch (error: any) {
    console.error(`  Error fetching data: ${error.message}`);
    return [];
  }
}

async function saveHistoricalData(symbol: string, name: string, data: HistoricalDataPoint[]) {
  const dataDir = path.join(process.cwd(), 'data', 'stocks');
  const publicDataDir = path.join(process.cwd(), 'public', 'data', 'stocks');

  for (const dir of [dataDir, publicDataDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const historicalData: TickerHistoricalData = {
      symbol,
      name,
      data,
      lastUpdated: new Date().toISOString()
    };

    const filePath = path.join(dir, `${symbol}.json`);
    fs.writeFileSync(filePath, JSON.stringify(historicalData, null, 2));
  }
}

async function main() {
  console.log(`Fetching data for ${TICKERS_TO_FETCH.length} tickers...\n`);
  console.log('Note: Free tier allows 25 requests per day, 5 per minute\n');

  let successful = 0;
  let failed = 0;

  for (let i = 0; i < TICKERS_TO_FETCH.length; i++) {
    const ticker = TICKERS_TO_FETCH[i];
    const progress = `[${i + 1}/${TICKERS_TO_FETCH.length}]`;

    console.log(`${progress} Fetching ${ticker.symbol} (${ticker.name})...`);

    const data = await fetchHistoricalDataAlphaVantage(ticker.symbol);

    if (data.length > 0) {
      await saveHistoricalData(ticker.symbol, ticker.name, data);
      console.log(`  ✓ Saved ${data.length} data points (${data[0].date} to ${data[data.length - 1].date})`);
      successful++;
    } else {
      console.log(`  ✗ No data available`);
      failed++;
    }

    // Rate limit: 5 per minute
    if ((i + 1) % 5 === 0 && (i + 1) < TICKERS_TO_FETCH.length) {
      console.log(`\n--- Waiting 60s for rate limit... Progress: ${successful} successful, ${failed} failed ---\n`);
      await delay(60000);
    } else {
      await delay(12000); // 12s between requests = 5 per minute
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
}

main();
