/**
 * 前端API服务模块
 * 
 * 封装与后端API的交互，提供交易信号获取、AI对话和市场排行榜等功能。
 */

/**
 * 技术指标接口定义
 * 包含常用的技术分析指标
 */
export interface Indicators {
  sma_7?: number;           // 7日简单移动平均线
  sma_20?: number;          // 20日简单移动平均线
  sma_50?: number;          // 50日简单移动平均线
  ema_12?: number;          // 12日指数移动平均线
  ema_26?: number;          // 26日指数移动平均线
  macd?: number;            // MACD线
  macd_signal?: number;     // MACD信号线
  rsi?: number;             // 相对强弱指标(14周期)
  bollinger_upper?: number; // 布林带上轨
  bollinger_middle?: number;// 布林带中轨
  bollinger_lower?: number; // 布林带下轨
  volume_change?: number;   // 成交量变化率(%)
  volatility?: number;      // 价格波动率(%)
}

/**
 * 交易信号响应接口
 * 包含AI分析后的交易信号和相关数据
 */
export interface SignalResponse {
  symbol: string;           // 加密货币代码（如 BTC、ETH）
  price: number;            // 当前价格
  change24h: number;        // 24小时涨跌幅(%)
  signal: 'BUY' | 'SELL' | 'NEUTRAL';  // 交易信号
  confidence: number;       // 信号置信度(0.0-1.0)
  reason: string[];         // 分析原因列表
  indicators?: Indicators;  // 技术指标数据
  risk?: RiskManagement;    // 风险控制方案
  timeframe?: string;       // 分析时间周期
}

/**
 * 风险控制方案接口
 * 包含AI生成的风险管理建议
 */
export interface RiskManagement {
  entryPrice: number;       // 建议入场价格
  stopLoss: number;         // 建议止损价格
  takeProfit: number;       // 建议止盈价格
  riskRewardRatio: number;  // 风险收益比
  positionSize: '观望' | '轻仓' | '中仓';  // 建议仓位大小
  maxLossPercent: number;   // 最大亏损百分比
  volatilityLevel: '低' | '中' | '高' | '未知';  // 当前波动率水平
  riskScore: number;        // 风险评分(0-100)
  notes: string[];          // 执行提示列表
}

/**
 * 市场排行榜项接口
 * 用于展示多币种的信号排名
 */
export interface RankingItem {
  rank: number;             // 排名
  symbol: string;           // 币种代码
  signal: 'BUY' | 'SELL' | 'NEUTRAL';  // 交易信号
  confidence: number;       // 置信度
  price: number;            // 当前价格
  change24h: number;        // 24小时涨跌幅
}

/**
 * AI对话响应接口
 */
export interface ChatResponse {
  success?: boolean;        // 请求是否成功
  response: string;         // AI回复内容
  error?: string;           // 错误信息（失败时）
}

/**
 * 获取交易信号
 * 
 * @param symbol - 加密货币代码（如 "BTC", "ETH"）
 * @param timeframe - K线时间周期，默认 "1H"
 * @returns Promise<SignalResponse> - 包含信号和分析数据的响应
 */
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

/**
 * 与AI助手对话
 * 
 * @param input - 用户输入的查询文本
 * @returns Promise<ChatResponse> - AI回复结果
 */
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

/**
 * 获取市场排行榜
 * 
 * @returns Promise<RankingItem[]> - 多币种信号排名列表
 */
export async function getMarketRankings(): Promise<RankingItem[]> {
  const res = await fetch("http://localhost:8000/api/v1/rankings", {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  return res.json();
}
