export interface Indicators {
  sma_7?: number;
  sma_20?: number;
  sma_50?: number;
  ema_12?: number;
  ema_26?: number;
  macd?: number;
  macd_signal?: number;
  rsi?: number;
  bollinger_upper?: number;
  bollinger_middle?: number;
  bollinger_lower?: number;
  volume_change?: number;
  volatility?: number;
}

export interface SignalResponse {
  symbol: string;
  price: number;
  change24h: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  reason: string[];
  indicators?: Indicators;
  timeframe?: string;
}

export interface RankingItem {
  rank: number;
  symbol: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  price: number;
  change24h: number;
}

export interface ChatResponse {
  success?: boolean;
  response: string;
  error?: string;
}

export async function getSignal(symbol: string, timeframe: string = "1H"): Promise<SignalResponse> {
  const res = await fetch("http://localhost:8000/api/v1/analysis", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ input: symbol, timeframe })
  });

  return res.json();
}

export async function askAgent(input: string): Promise<ChatResponse> {
  const res = await fetch("http://localhost:8000/api/v1/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: input, chat_history: [] })
  });

  const data = await res.json();
  return {
    success: data.success,
    response: data.response || data.error || "暂无回复",
    error: data.error
  };
}

export async function getMarketRankings(): Promise<RankingItem[]> {
  const res = await fetch("http://localhost:8000/api/v1/rankings", {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  return res.json();
}
