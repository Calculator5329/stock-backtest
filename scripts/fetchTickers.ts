import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface TickerInfo {
  symbol: string;
  name: string;
  exchange: string;
  assetType: 'Stock' | 'ETF';
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchNasdaqTickers(): Promise<TickerInfo[]> {
  try {
    console.log('Fetching NASDAQ listed companies...');

    const nasdaqUrl = 'https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=25000&exchange=NASDAQ';
    const nyseUrl = 'https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=25000&exchange=NYSE';

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };

    const [nasdaqResponse, nyseResponse] = await Promise.all([
      axios.get(nasdaqUrl, { headers }),
      axios.get(nyseUrl, { headers })
    ]);

    const nasdaqStocks = nasdaqResponse.data.data.rows.map((row: any) => ({
      symbol: row.symbol,
      name: row.name,
      exchange: 'NASDAQ',
      assetType: row.sector === 'ETF' ? 'ETF' : 'Stock'
    }));

    const nyseStocks = nyseResponse.data.data.rows.map((row: any) => ({
      symbol: row.symbol,
      name: row.name,
      exchange: 'NYSE',
      assetType: row.sector === 'ETF' ? 'ETF' : 'Stock'
    }));

    const allTickers = [...nasdaqStocks, ...nyseStocks];
    console.log(`Found ${allTickers.length} tickers total`);
    console.log(`- Stocks: ${allTickers.filter(t => t.assetType === 'Stock').length}`);
    console.log(`- ETFs: ${allTickers.filter(t => t.assetType === 'ETF').length}`);

    return allTickers;
  } catch (error) {
    console.error('Error fetching from NASDAQ API, falling back to backup method...');
    return fetchTickersBackup();
  }
}

async function fetchTickersBackup(): Promise<TickerInfo[]> {
  console.log('Using backup ticker list method...');

  const majorStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', assetType: 'Stock' as const },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', assetType: 'Stock' as const },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', assetType: 'Stock' as const },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', assetType: 'Stock' as const },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', assetType: 'Stock' as const },
    { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', assetType: 'Stock' as const },
    { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', assetType: 'Stock' as const },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc.', exchange: 'NYSE', assetType: 'Stock' as const },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', assetType: 'Stock' as const },
    { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', assetType: 'Stock' as const },
    { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', assetType: 'Stock' as const },
    { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', assetType: 'Stock' as const },
    { symbol: 'PG', name: 'Procter & Gamble Co.', exchange: 'NYSE', assetType: 'Stock' as const },
    { symbol: 'MA', name: 'Mastercard Inc.', exchange: 'NYSE', assetType: 'Stock' as const },
    { symbol: 'DIS', name: 'Walt Disney Co.', exchange: 'NYSE', assetType: 'Stock' as const },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE', assetType: 'ETF' as const },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', assetType: 'ETF' as const },
    { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', exchange: 'NYSE', assetType: 'ETF' as const },
    { symbol: 'IWM', name: 'iShares Russell 2000 ETF', exchange: 'NYSE', assetType: 'ETF' as const },
    { symbol: 'EEM', name: 'iShares MSCI Emerging Markets ETF', exchange: 'NYSE', assetType: 'ETF' as const },
    { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', exchange: 'NYSE', assetType: 'ETF' as const },
    { symbol: 'AGG', name: 'iShares Core U.S. Aggregate Bond ETF', exchange: 'NYSE', assetType: 'ETF' as const },
    { symbol: 'GLD', name: 'SPDR Gold Shares', exchange: 'NYSE', assetType: 'ETF' as const },
  ];

  console.log(`Using backup list with ${majorStocks.length} major tickers`);
  return majorStocks;
}

async function saveTickers(tickers: TickerInfo[]) {
  const dataDir = path.join(process.cwd(), 'data');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const tickersPath = path.join(dataDir, 'tickers.json');
  fs.writeFileSync(tickersPath, JSON.stringify(tickers, null, 2));
  console.log(`Saved ${tickers.length} tickers to ${tickersPath}`);

  const stocks = tickers.filter(t => t.assetType === 'Stock');
  const etfs = tickers.filter(t => t.assetType === 'ETF');

  const stocksPath = path.join(dataDir, 'stocks', 'tickers.json');
  const etfsPath = path.join(dataDir, 'etfs', 'tickers.json');

  if (!fs.existsSync(path.dirname(stocksPath))) {
    fs.mkdirSync(path.dirname(stocksPath), { recursive: true });
  }
  if (!fs.existsSync(path.dirname(etfsPath))) {
    fs.mkdirSync(path.dirname(etfsPath), { recursive: true });
  }

  fs.writeFileSync(stocksPath, JSON.stringify(stocks, null, 2));
  fs.writeFileSync(etfsPath, JSON.stringify(etfs, null, 2));

  console.log(`Saved ${stocks.length} stocks and ${etfs.length} ETFs separately`);
}

async function main() {
  console.log('Starting ticker fetch...\n');

  const tickers = await fetchNasdaqTickers();
  await saveTickers(tickers);

  console.log('\n✓ Ticker fetch complete!');
}

main().catch(console.error);
