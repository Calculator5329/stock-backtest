import { useState, useEffect } from 'react';
import { TickerInfo } from '../types';

export function useAvailableTickers() {
  const [tickers, setTickers] = useState<TickerInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTickers() {
      try {
        const response = await fetch('/data/tickers.json');
        if (!response.ok) {
          throw new Error('Failed to load tickers');
        }
        const data = await response.json();

        const availableTickers: TickerInfo[] = [];

        // Check each ticker to see if it has data
        for (const ticker of data) {
          try {
            // Try stocks first
            const stockResponse = await fetch(`/data/stocks/${ticker.symbol}.json`);
            if (stockResponse.ok) {
              const stockData = await stockResponse.json();
              if (stockData.data && stockData.data.length > 0) {
                availableTickers.push(ticker);
                continue;
              }
            }

            // Try ETFs
            const etfResponse = await fetch(`/data/etfs/${ticker.symbol}.json`);
            if (etfResponse.ok) {
              const etfData = await etfResponse.json();
              if (etfData.data && etfData.data.length > 0) {
                availableTickers.push(ticker);
              }
            }
          } catch (err) {
            // Skip tickers that fail to load
            console.warn(`Skipping ${ticker.symbol}:`, err);
          }
        }

        console.log(`Loaded ${availableTickers.length} tickers with data:`, availableTickers.map(t => t.symbol).join(', '));
        setTickers(availableTickers);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadTickers();
  }, []);

  return { tickers, loading, error };
}
