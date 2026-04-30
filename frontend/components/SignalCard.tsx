/**
 * 交易信号卡片组件
 * 
 * 展示AI生成的交易信号，包含价格信息、技术指标、支撑阻力位和分析依据。
 */

/**
 * 技术指标接口定义
 */
interface Indicators {
  sma_7?: number;           // 7日简单移动平均线
  sma_20?: number;          // 20日简单移动平均线
  sma_50?: number;          // 50日简单移动平均线
  ema_12?: number;          // 12日指数移动平均线
  ema_26?: number;          // 26日指数移动平均线
  macd?: number;            // MACD线
  macd_signal?: number;     // MACD信号线
  rsi?: number;             // 相对强弱指标
  bollinger_upper?: number; // 布林带上轨
  bollinger_middle?: number;// 布林带中轨
  bollinger_lower?: number; // 布林带下轨
  volume_change?: number;   // 成交量变化率
  volatility?: number;      // 价格波动率
}

/**
 * 信号响应接口
 */
interface SignalResponse {
  symbol: string;           // 币种代码
  price: number;            // 当前价格
  change24h: number;        // 24小时涨跌幅
  signal: 'BUY' | 'SELL' | 'NEUTRAL';  // 交易信号类型
  confidence: number;       // 置信度(0-1)
  reason: string[];         // 分析原因列表
  indicators?: Indicators;  // 技术指标数据
}

/**
 * 组件属性接口
 */
interface SignalCardProps {
  data: SignalResponse;     // 信号数据
}

/**
 * 价格水平接口
 */
interface PriceLevel {
  level: string;                    // 水平名称（如布林带下轨、7日均线）
  price: number;                    // 价格值
  type: 'support' | 'resistance';   // 类型：支撑位或阻力位
}

/**
 * 计算支撑位和阻力位
 * 
 * 基于布林带和均线指标计算关键价格水平。
 * 
 * @param data - 信号响应数据
 * @returns 价格水平列表（按价格升序排列）
 */
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
  
  // 基于均线计算支撑和阻力（价格上方为阻力，下方为支撑）
  if (indicators.sma_7) {
    levels.push({
      level: '7日均线',
      price: indicators.sma_7,
      type: price < indicators.sma_7 ? 'resistance' : 'support'
    });
  }
  
  if (indicators.sma_20) {
    levels.push({
      level: '20日均线',
      price: indicators.sma_20,
      type: price < indicators.sma_20 ? 'resistance' : 'support'
    });
  }
  
  // 按价格升序排列
  return levels.sort((a, b) => a.price - b.price);
};

/**
 * 获取信号样式配置
 * 
 * 根据信号类型和置信度返回对应的样式类名。
 * 
 * @param signal - 信号类型
 * @param confidence - 置信度
 * @returns 样式配置对象
 */
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

/**
 * 获取置信度等级描述
 * 
 * @param confidence - 置信度值
 * @returns 包含等级文本和颜色的对象
 */
const getConfidenceLevel = (confidence: number) => {
  if (confidence >= 0.8) return { text: '极高', color: 'text-accent-green' };
  if (confidence >= 0.6) return { text: '高', color: 'text-accent-green' };
  if (confidence >= 0.4) return { text: '中', color: 'text-accent-yellow' };
  return { text: '低', color: 'text-accent-red' };
};

/**
 * 获取RSI状态
 * 
 * @param rsi - RSI值
 * @returns 包含显示文本、颜色和状态描述的对象
 */
const getRsiStatus = (rsi?: number) => {
  if (!rsi) return { text: '--', color: 'text-light-400', status: '' };
  if (rsi < 30) return { text: rsi.toFixed(1), color: 'text-accent-green', status: '超卖' };
  if (rsi > 70) return { text: rsi.toFixed(1), color: 'text-accent-red', status: '超买' };
  return { text: rsi.toFixed(1), color: 'text-accent-blue', status: '中性' };
};

/**
 * 获取MACD状态
 * 
 * @param macd - MACD值
 * @param signal - MACD信号线值
 * @returns 包含显示文本和状态描述的对象
 */
const getMacdStatus = (macd?: number, signal?: number) => {
  if (!macd || !signal) return { text: '--', status: '' };
  const diff = macd - signal;
  if (diff > 0) return { text: macd.toFixed(4), status: '金叉' };
  return { text: macd.toFixed(4), status: '死叉' };
};

/**
 * 计算仪表盘角度
 * 
 * 根据信号类型和置信度计算指针角度（-90度到+90度）
 * 
 * @param signal - 信号类型
 * @param confidence - 置信度
 * @returns 指针角度（度）
 */
const getGaugeAngle = (signal: string, confidence: number): number => {
  switch (signal) {
    case 'BUY':
      return 90 * confidence;  // 0 到 90度
    case 'SELL':
      return -90 * confidence; // -90 到 0度
    default:
      return 0; // 中性在中间
  }
};

/**
 * 获取仪表盘颜色
 * 
 * 根据信号类型和置信度返回颜色
 * 
 * @param signal - 信号类型
 * @param confidence - 置信度
 * @returns 颜色值
 */
const getGaugeColor = (signal: string, confidence: number): string => {
  switch (signal) {
    case 'BUY':
      // 从黄色过渡到深绿色
      const greenIntensity = Math.floor(50 + confidence * 100);
      return `rgb(0, ${greenIntensity}, 50)`;
    case 'SELL':
      // 从黄色过渡到深红色
      const redIntensity = Math.floor(50 + confidence * 100);
      return `rgb(${redIntensity}, 0, 50)`;
    default:
      return '#d4a574'; // 中性黄色
  }
};

/**
 * 仪表盘组件
 * 
 * 展示半圆形仪表盘，包含指针和颜色渐变
 */
const GaugeIndicator = ({ signal, confidence }: { signal: string; confidence: number }) => {
  const angle = getGaugeAngle(signal, confidence);
  const color = getGaugeColor(signal, confidence);
  const confidencePercent = Math.round(confidence * 100);
  
  const signalText = signal === 'BUY' ? '买入' : signal === 'SELL' ? '卖出' : '中性';
  
  return (
    <div className="w-48 h-44 flex flex-col items-center">
      {/* 顶部标签 */}
      <div className="w-full flex justify-between px-2 mb-2">
        <span className="text-xs text-accent-red font-semibold">强卖</span>
        <span className="text-xs text-accent-green font-semibold">强买</span>
      </div>
      
      {/* 半圆形仪表盘 SVG */}
      <svg viewBox="0 0 200 110" className="w-full h-28">
        {/* 渐变定义 */}
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#96002c" />
            <stop offset="33%" stopColor="#d4a574" />
            <stop offset="100%" stopColor="#006432" />
          </linearGradient>
        </defs>
        
        {/* 仪表盘外边框 */}
        <path
          d="M 10 100 A 90 90 0 0 1 190 100"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
          strokeLinecap="round"
        />
        
        {/* 渐变填充圆弧 */}
        <path
          d="M 10 100 A 90 90 0 0 1 190 100"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="10"
          strokeLinecap="round"
        />
        
        {/* 刻度线 */}
        {[-90, -60, -30, 0, 30, 60, 90].map((deg, i) => {
          const rad = ((deg + 90) * Math.PI) / 180;
          const x1 = 100 + 75 * Math.cos(rad);
          const y1 = 100 - 75 * Math.sin(rad);
          const x2 = 100 + 82 * Math.cos(rad);
          const y2 = 100 - 82 * Math.sin(rad);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#9ca3af"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
        
        {/* 指针 */}
        <g transform={`rotate(${angle}, 100, 100)`}>
          <line
            x1="100" y1="100" x2="100" y2="30"
            stroke={color} strokeWidth="4" strokeLinecap="round"
          />
          <circle cx="100" cy="30" r="8" fill={color} />
        </g>
        
        {/* 中心点 */}
        <circle cx="100" cy="100" r="8" fill={color} />
      </svg>
      
      {/* 底部标签 */}
      <div className="text-center mt-1">
        <p className="text-xs text-light-400">AI交易信号</p>
        <p className="text-xl font-bold" style={{ color }}>{signalText}</p>
        <p className="text-lg font-semibold text-light-700">{confidencePercent}%</p>
        <p className="text-xs text-light-400">置信度</p>
      </div>
    </div>
  );
};

/**
 * 指标卡片组件
 * 
 * 展示单个技术指标的值和状态。
 */
const IndicatorCard = ({ 
  label, 
  value, 
  status, 
  color 
}: { 
  label: string;       // 指标名称
  value: string;       // 指标值
  status?: string;     // 状态标签（如超买、金叉）
  color?: string;      // 文字颜色类名
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

/**
 * 主组件 - 交易信号卡片
 */
export default function SignalCard({ data }: SignalCardProps) {
  // 获取样式配置
  const signalStyles = getSignalStyles(data.signal, data.confidence);
  const confidenceLevel = getConfidenceLevel(data.confidence);
  const rsiStatus = getRsiStatus(data.indicators?.rsi);
  const macdStatus = getMacdStatus(data.indicators?.macd, data.indicators?.macd_signal);
  const priceLevels = calculatePriceLevels(data);

  return (
    <div className={`glass-card rounded-2xl overflow-hidden ${signalStyles.glow}`}>
      <div className={`bg-gradient-to-br ${signalStyles.gradient} p-8`}>
        {/* 头部区域：币种信息和信号 */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            {/* 币种标识 */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-light-100 rounded-xl flex items-center justify-center border border-light-200">
                <span className="text-2xl font-bold text-light-700">{data.symbol}</span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-light-800">{data.symbol}/USDT</h3>
                <p className="text-light-400 text-sm">实时价格数据</p>
              </div>
            </div>
            
            {/* 价格显示 */}
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

          {/* 仪表盘指示器 */}
          <div className="lg:w-48">
            <GaugeIndicator signal={data.signal} confidence={data.confidence} />
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

        {/* 支撑位与阻力位区域 */}
        <div className="mt-8 pt-6 border-t border-light-200/50">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4 className="font-semibold text-light-800">支撑位与阻力位</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 支撑位 */}
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

            {/* 阻力位 */}
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

        {/* AI分析原因区域 */}
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
