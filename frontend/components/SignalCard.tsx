interface Indicators {
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

interface SignalResponse {
  symbol: string;
  price: number;
  change24h: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  reason: string[];
  indicators?: Indicators;
}

interface SignalCardProps {
  data: SignalResponse;
}

interface PriceLevel {
  level: string;
  price: number;
  type: 'support' | 'resistance';
}

const calculatePriceLevels = (data: SignalResponse): PriceLevel[] => {
  const levels: PriceLevel[] = [];
  const { price, indicators } = data;
  
  if (!indicators) return levels;
  
  // 基于布林带计算支撑和阻力
  if (indicators.bollinger_lower) {
    levels.push({
      level: '布林带下轨',
      price: indicators.bollinger_lower,
      type: 'support'
    });
  }
  
  if (indicators.bollinger_upper) {
    levels.push({
      level: '布林带上轨',
      price: indicators.bollinger_upper,
      type: 'resistance'
    });
  }
  
  // 基于均线计算支撑和阻力
  if (indicators.sma_7) {
    if (price < indicators.sma_7) {
      levels.push({
        level: '7日均线',
        price: indicators.sma_7,
        type: 'resistance'
      });
    } else {
      levels.push({
        level: '7日均线',
        price: indicators.sma_7,
        type: 'support'
      });
    }
  }
  
  if (indicators.sma_20) {
    if (price < indicators.sma_20) {
      levels.push({
        level: '20日均线',
        price: indicators.sma_20,
        type: 'resistance'
      });
    } else {
      levels.push({
        level: '20日均线',
        price: indicators.sma_20,
        type: 'support'
      });
    }
  }
  
  return levels.sort((a, b) => a.price - b.price);
};

const getSignalStyles = (signal: string, confidence: number) => {
  switch (signal) {
    case 'BUY':
      return {
        badge: 'bg-accent-green/15 text-accent-green border-accent-green/30',
        glow: confidence >= 0.7 ? 'shadow-lg shadow-accent-green/20' : '',
        gradient: 'from-accent-green/5 to-transparent',
        text: '买入',
        trend: '上涨',
      };
    case 'SELL':
      return {
        badge: 'bg-accent-red/15 text-accent-red border-accent-red/30',
        glow: confidence >= 0.7 ? 'shadow-lg shadow-accent-red/20' : '',
        gradient: 'from-accent-red/5 to-transparent',
        text: '卖出',
        trend: '下跌',
      };
    default:
      return {
        badge: 'bg-accent-yellow/15 text-accent-yellow border-accent-yellow/30',
        glow: confidence >= 0.7 ? 'shadow-lg shadow-accent-yellow/20' : '',
        gradient: 'from-accent-yellow/5 to-transparent',
        text: '中性',
        trend: '平稳',
      };
  }
};

const getConfidenceLevel = (confidence: number) => {
  if (confidence >= 0.8) return { text: '极高', color: 'text-accent-green' };
  if (confidence >= 0.6) return { text: '高', color: 'text-accent-green' };
  if (confidence >= 0.4) return { text: '中', color: 'text-accent-yellow' };
  return { text: '低', color: 'text-accent-red' };
};

const getRsiStatus = (rsi?: number) => {
  if (!rsi) return { text: '--', color: 'text-light-400', status: '' };
  if (rsi < 30) return { text: rsi.toFixed(1), color: 'text-accent-green', status: '超卖' };
  if (rsi > 70) return { text: rsi.toFixed(1), color: 'text-accent-red', status: '超买' };
  return { text: rsi.toFixed(1), color: 'text-accent-blue', status: '中性' };
};

const getMacdStatus = (macd?: number, signal?: number) => {
  if (!macd || !signal) return { text: '--', status: '' };
  const diff = macd - signal;
  if (diff > 0) return { text: macd.toFixed(4), status: '金叉' };
  return { text: macd.toFixed(4), status: '死叉' };
};

const IndicatorCard = ({ 
  label, 
  value, 
  status, 
  color 
}: { 
  label: string; 
  value: string; 
  status?: string;
  color?: string;
}) => (
  <div className="bg-light-50/50 rounded-xl p-3">
    <p className="text-xs text-light-400 mb-1">{label}</p>
    <div className="flex items-center gap-2">
      <span className={`text-sm font-semibold ${color || 'text-light-800'}`}>{value}</span>
      {status && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          status === '超买' ? 'bg-accent-red/10 text-accent-red' :
          status === '超卖' ? 'bg-accent-green/10 text-accent-green' :
          status === '金叉' ? 'bg-accent-green/10 text-accent-green' :
          status === '死叉' ? 'bg-accent-red/10 text-accent-red' :
          'bg-accent-yellow/10 text-accent-yellow'
        }`}>
          {status}
        </span>
      )}
    </div>
  </div>
);

export default function SignalCard({ data }: SignalCardProps) {
  const signalStyles = getSignalStyles(data.signal, data.confidence);
  const confidenceLevel = getConfidenceLevel(data.confidence);
  const rsiStatus = getRsiStatus(data.indicators?.rsi);
  const macdStatus = getMacdStatus(data.indicators?.macd, data.indicators?.macd_signal);
  const priceLevels = calculatePriceLevels(data);

  return (
    <div className={`glass-card rounded-2xl overflow-hidden ${signalStyles.glow}`}>
      <div className={`bg-gradient-to-br ${signalStyles.gradient} p-8`}>
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-light-100 rounded-xl flex items-center justify-center border border-light-200">
                <span className="text-2xl font-bold text-light-700">{data.symbol}</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-light-800">{data.symbol}/USDT</h3>
                <p className="text-light-400 text-sm">实时价格数据</p>
              </div>
            </div>
            
            <div className="flex items-end gap-4 mb-6">
              <div className="w-64">
                <p className="text-sm text-light-400 mb-1">当前价格</p>
                <p className="text-5xl font-bold text-light-900">${data.price.toLocaleString()}</p>
              </div>
              <div className={`w-32 px-4 py-2 rounded-lg ${data.change24h >= 0 ? 'bg-accent-green/10' : 'bg-accent-red/10'}`}>
                <span className={`text-xl font-semibold ${data.change24h >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
                </span>
                <span className="text-xs text-light-400 ml-1">24h</span>
              </div>
            </div>
          </div>

          <div className="lg:w-48">
            <div className={`text-center p-6 rounded-2xl border ${signalStyles.badge}`}>
              <p className="text-sm text-light-400 mb-2">AI交易信号</p>
              <p className="text-3xl font-bold">{signalStyles.text}</p>
              <div className="mt-4 pt-4 border-t border-current/20">
                <p className="text-xs text-light-400 mb-1">置信度</p>
                <p className={`text-2xl font-bold ${confidenceLevel.color}`}>
                  {(data.confidence * 100).toFixed(0)}%
                </p>
                <span className={`text-xs ${confidenceLevel.color}`}>({confidenceLevel.text})</span>
              </div>
            </div>
          </div>
        </div>

        {/* 技术指标区域 */}
        <div className="mt-8 pt-6 border-t border-light-200/50">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h4 className="font-semibold text-light-800">技术指标</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <IndicatorCard 
              label="RSI (14)" 
              value={rsiStatus.text} 
              status={rsiStatus.status}
              color={rsiStatus.color}
            />
            <IndicatorCard 
              label="MACD" 
              value={macdStatus.text} 
              status={macdStatus.status}
            />
            <IndicatorCard 
              label="波动率" 
              value={data.indicators?.volatility ? `${data.indicators.volatility.toFixed(2)}%` : '--'}
            />
            <IndicatorCard 
              label="成交量变化" 
              value={data.indicators?.volume_change ? `${data.indicators.volume_change > 0 ? '+' : ''}${data.indicators.volume_change.toFixed(1)}%` : '--'}
            />
          </div>

          {/* 均线信息 */}
          <div className="flex flex-wrap gap-4">
            {data.indicators?.sma_7 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-light-400">7日均线:</span>
                <span className="font-semibold text-light-800">${data.indicators.sma_7.toFixed(2)}</span>
              </div>
            )}
            {data.indicators?.sma_20 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-light-400">20日均线:</span>
                <span className="font-semibold text-light-800">${data.indicators.sma_20.toFixed(2)}</span>
              </div>
            )}
            {data.indicators?.bollinger_upper && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-light-400">布林带上轨:</span>
                <span className="font-semibold text-accent-red">${data.indicators.bollinger_upper.toFixed(2)}</span>
              </div>
            )}
            {data.indicators?.bollinger_lower && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-light-400">布林带下轨:</span>
                <span className="font-semibold text-accent-green">${data.indicators.bollinger_lower.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* 买点/卖点区域 */}
        <div className="mt-8 pt-6 border-t border-light-200/50">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="font-semibold text-light-800">支撑位与阻力位</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 买点（支撑位） */}
            <div className="bg-accent-green/5 rounded-xl p-4 border border-accent-green/20">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span className="font-semibold text-accent-green">买点（支撑位）</span>
              </div>
              <div className="space-y-2">
                {priceLevels
                  .filter(level => level.type === 'support')
                  .map((level, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-light-500">{level.level}</span>
                      <span className="font-semibold text-accent-green">${level.price.toFixed(2)}</span>
                    </div>
                  ))}
                {priceLevels.filter(l => l.type === 'support').length === 0 && (
                  <span className="text-sm text-light-400">暂无支撑位数据</span>
                )}
              </div>
            </div>

            {/* 卖点（阻力位） */}
            <div className="bg-accent-red/5 rounded-xl p-4 border border-accent-red/20">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-accent-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span className="font-semibold text-accent-red">卖点（阻力位）</span>
              </div>
              <div className="space-y-2">
                {priceLevels
                  .filter(level => level.type === 'resistance')
                  .map((level, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-sm text-light-500">{level.level}</span>
                      <span className="font-semibold text-accent-red">${level.price.toFixed(2)}</span>
                    </div>
                  ))}
                {priceLevels.filter(l => l.type === 'resistance').length === 0 && (
                  <span className="text-sm text-light-400">暂无阻力位数据</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI分析原因 */}
        <div className="mt-8 pt-6 border-t border-light-200/50">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h4 className="font-semibold text-light-800">AI分析依据</h4>
          </div>
          <div className="space-y-3">
            {data.reason.map((reason, index) => (
              <div key={index} className="flex items-start gap-3 p-4 bg-light-50/50 rounded-xl">
                <span className="w-7 h-7 bg-accent-blue/10 text-accent-blue rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-light-600 text-sm leading-relaxed">{reason}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}