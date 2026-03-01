const API_BASE_URL = "https://fapi.asterdex.com/";
import { GMX_SUPPORTED_RESOLUTIONS } from "@/constants/common/chart";
import { getAsterKLines } from "@/lib/oracle/asterdex";

interface Bar {
  time: number;
  close: string | number;
  low: number;
  high: number;
  volume: number;
}

const lastBarsCache = new Map();

class AsterDexDataFeed {
  private symbol: string;

  constructor(symbol: string) {
    this.symbol = symbol;
  }

  /**
   * onReady: Called by the charting library to get configuration
   */
  onReady(callback: any) {
    const config = {
      supported_resolutions: GMX_SUPPORTED_RESOLUTIONS,
      supports_search: false,
      supports_group_request: false,
      supports_marks: false,
      supports_timescale_marks: false,
      exchange: "Aster DEX",
      timezone: "UTC",
      pricescale: 100,
    };
    setTimeout(() => callback(config), 0);
  }

  /**
   * searchSymbols: Search for symbols (not implemented for now)
   */
  searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResultReadyCallback: any,
  ) {
    onResultReadyCallback([]);
  }

  /**
   * resolveSymbol: Resolve symbol information
   */
  resolveSymbol(
    symbolName: string,
    onSymbolResolvedCallback: any,
    onResolveErrorCallback: any,
    extension?: any,
  ) {
    try {
      const symbolInfo = {
        name: symbolName,
        full_name: `${symbolName}`,
        ticker: symbolName,
        description: `${symbolName}`,
        //exchange: 'Aster DEX',
        type: "crypto",
        session: "24x7",
        timezone: "UTC",
        minmov: 1,
        pricescale: 100000000, // 8 decimal places
        has_intraday: true,
        has_daily: true,
        has_weekly_and_monthly: true,
        data_status: "streaming",
        default_bar_type: "candle",
        visible_plots_set: "ohlc",
        has_seconds: false,
        intraday_multipliers: ["1", "5", "15", "60", "240"],
        supported_resolutions: GMX_SUPPORTED_RESOLUTIONS,
        volume_precision: 5,
      };
      setTimeout(() => onSymbolResolvedCallback(symbolInfo), 0);
    } catch (error) {
      //console.error('Error resolving symbol:', error);
      onResolveErrorCallback("Unable to resolve symbol");
    }
  }

  /**
   * getBars: Fetch candlestick data from Aster DEX API
   */
  async getBars(
    symbolInfo: any, //SymbolInfo,
    resolution: string,
    periodParams: any, //PeriodParams,
    onHistoryCallback: (bars: Bar[], meta: { noData: boolean }) => void,
    onErrorCallback: (error: Error) => void,
  ): Promise<void> {
    const { from, to, firstDataRequest } = periodParams;

    try {
      const res: any = await getAsterKLines({
        symbol: symbolInfo.name,
        resolution,
        from,
        to,
        limit: 500,
      });

      let bars = res.candles || [];

      // Validating bars are within the requested range
      let filteredBars = bars
        .filter((bar: Bar) => !isNaN(bar.time))
        .filter((bar: Bar) => {
          // Ensure bar is within the requested window (allowing a small buffer)
          return bar.time >= from * 1000 && bar.time <= to * 1000;
        });

      // Sort bars by time ascending (TradingView expects this)
      filteredBars.sort((a: Bar, b: Bar) => a.time - b.time);

      if (firstDataRequest && filteredBars.length > 0) {
        lastBarsCache.set(symbolInfo.name, {
          ...filteredBars[filteredBars.length - 1],
        });
      }

      //console.log(`[getBars]: returned ${filteredBars.length} bar(s)`);
      onHistoryCallback(filteredBars, {
        noData: filteredBars.length === 0,
      });
    } catch (error) {
      //console.log("[getBars]: Get error", error);
      onErrorCallback(error as Error);
    }
  }

  /**
   * subscribeBars: Subscribe to real-time data (optional)
   * For now, we'll just acknowledge the subscription
   */
  subscribeBars(
    symbolInfo: any,
    resolution: string,
    onRealtimeCallback: any,
    subscriptionUID: string,
    onResetCacheCallback?: any,
  ) {
    // In a real implementation, you would:
    // 1. Set up a WebSocket connection
    // 2. Listen for updates
    // 3. Call onRealtimeCallback with new bars

    // For now, just return the subscriptionUID to acknowledge
    return subscriptionUID;
  }

  /**
   * unsubscribeBars: Unsubscribe from real-time data
   */
  unsubscribeBars(subscriptionUID: string) {
    // Clean up the subscription
  }

  // /**
  //  * getServerTime: Get server time (optional)
  //  */
  // getServerTime(callback: any) {
  //   try {
  //     fetch(`${API_BASE_URL}/time`)
  //       .then((response) => response.json())
  //       .then((data) => {
  //         callback(Math.floor(data.serverTime / 1000)); // Convert to seconds
  //       })
  //       .catch(() => {
  //         callback(Math.floor(Date.now() / 1000));
  //       });
  //   } catch {
  //     callback(Math.floor(Date.now() / 1000));
  //   }
  // }

  /**
   * getMarks: Get marks for the chart (optional)
   */
  getMarks(
    symbolInfo: any,
    from: number,
    to: number,
    onDataCallback: any,
    resolution: string,
  ) {
    onDataCallback([]);
  }

  /**
   * getTimescaleMarks: Get timescale marks (optional)
   */
  getTimescaleMarks(
    symbolInfo: any,
    from: number,
    to: number,
    onDataCallback: any,
    resolution: string,
  ) {
    onDataCallback([]);
  }
}

export default AsterDexDataFeed;
