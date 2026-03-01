import { useState, useEffect } from 'react';

interface DateRange {
  minDate: string;
  maxDate: string;
}

export function useTickerDateRange(symbols: string[]): DateRange | null {
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  useEffect(() => {
    if (symbols.length === 0) {
      setDateRange(null);
      return;
    }

    async function fetchDateRanges() {
      const ranges: { start: string; end: string }[] = [];

      for (const symbol of symbols) {
        try {
          const stockResponse = await fetch(`/data/stocks/${symbol}.json`);
          if (stockResponse.ok) {
            const data = await stockResponse.json();
            if (data.data && data.data.length > 0) {
              ranges.push({
                start: data.data[0].date,
                end: data.data[data.data.length - 1].date
              });
            }
            continue;
          }

          const etfResponse = await fetch(`/data/etfs/${symbol}.json`);
          if (etfResponse.ok) {
            const data = await etfResponse.json();
            if (data.data && data.data.length > 0) {
              ranges.push({
                start: data.data[0].date,
                end: data.data[data.data.length - 1].date
              });
            }
          }
        } catch (error) {
          console.error(`Failed to fetch date range for ${symbol}`);
        }
      }

      if (ranges.length === 0) {
        setDateRange(null);
        return;
      }

      // Find latest start date and earliest end date
      const minDate = ranges.reduce((latest, range) =>
        range.start > latest ? range.start : latest,
        ranges[0].start
      );

      const maxDate = ranges.reduce((earliest, range) =>
        range.end < earliest ? range.end : earliest,
        ranges[0].end
      );

      setDateRange({ minDate, maxDate });
    }

    fetchDateRanges();
  }, [symbols.join(',')]);

  return dateRange;
}
