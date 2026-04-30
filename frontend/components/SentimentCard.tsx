/**
 * 市场情绪指标卡片组件
 * 
 * 展示交易所持仓数据和市场情绪指标：
 * - 多空人数比 (Long/Short Ratio)
 * - 资金费率 (Funding Rate)
 * - 恐慌与贪婪指数 (Fear & Greed Index)
 */

/**
 * 情绪数据接口定义
 */
interface SentimentData {
  longShortRatio: number;    // 多空人数比
  fundingRate: number;       // 资金费率 (年化)
  fearGreedIndex: number;    // 恐慌贪婪指数 (0-100)
  fearGreedLabel: string;    // 恐慌贪婪状态标签
}

/**
 * 组件属性接口
 */
interface SentimentCardProps {
  data: SentimentData;
}

/**
 * 根据恐慌贪婪指数获取状态颜色
 */
const getFearGreedColor = (index: number): string => {
  if (index <= 20) return '#96002c';    // 极度恐慌 - 深红
  if (index <= 40) return '#c53030';    // 恐慌 - 红色
  if (index <= 60) return '#d4a574';    // 中性 - 黄色
  if (index <= 80) return '#38a169';    // 贪婪 - 绿色
  return '#006432';                      // 极度贪婪 - 深绿
};

/**
 * 获取资金费率状态颜色
 */
const getFundingRateColor = (rate: number): string => {
  if (rate > 0.01) return '#c53030';    // 高正费率 - 红色
  if (rate > 0) return '#e53e3e';       // 正费率 - 浅红
  if (rate < -0.01) return '#38a169';   // 高负费率 - 绿色
  if (rate < 0) return '#48bb78';       // 负费率 - 浅绿
  return '#a0aec0';                      // 中性 - 灰色
};

/**
 * 获取多空比状态颜色
 */
const getLongShortColor = (ratio: number): string => {
  if (ratio >= 2.5) return '#c53030';   // 极度看多 - 红色（可能过热）
  if (ratio >= 1.5) return '#e53e3e';   // 看多 - 浅红
  if (ratio <= 0.4) return '#38a169';   // 极度看空 - 绿色（可能超卖）
  if (ratio <= 0.67) return '#48bb78';  // 看空 - 浅绿
  return '#a0aec0';                      // 中性 - 灰色
};

/**
 * 恐慌贪婪指数仪表盘组件
 */
const FearGreedGauge = ({ value, label }: { value: number; label: string }) => {
  const color = getFearGreedColor(value);
  const angle = ((value / 100) * 180) - 90;  // -90 到 +90 度
  
  return (
    <div className="relative w-28 h-20">
      <svg viewBox="0 0 120 60" className="w-full h-full">
        <defs>
          <linearGradient id="fgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#96002c" />
            <stop offset="50%" stopColor="#d4a574" />
            <stop offset="100%" stopColor="#006432" />
          </linearGradient>
        </defs>
        
        {/* 背景圆弧 */}
        <path
          d="M 5 55 A 55 55 0 0 1 115 55"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
          strokeLinecap="round"
        />
        
        {/* 渐变圆弧 */}
        <path
          d="M 5 55 A 55 55 0 0 1 115 55"
          fill="none"
          stroke="url(#fgGradient)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        
        {/* 指针 */}
        <g transform={`rotate(${angle}, 60, 55)`}>
          <line
            x1="60" y1="55" x2="60" y2="15"
            stroke={color} strokeWidth="3" strokeLinecap="round"
          />
          <circle cx="60" cy="15" r="5" fill={color} />
        </g>
        
        {/* 中心点 */}
        <circle cx="60" cy="55" r="5" fill={color} />
      </svg>
      
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <p className="text-lg font-bold" style={{ color }}>{value}</p>
        <p className="text-xs text-light-400 truncate">{label}</p>
      </div>
    </div>
  );
};

/**
 * 数值指标卡片
 */
const MetricCard = ({ 
  label, 
  value, 
  unit = '', 
  color 
}: { 
  label: string; 
  value: number; 
  unit?: string;
  color: string; 
}) => {
  return (
    <div className="bg-light-50/50 rounded-xl p-4">
      <p className="text-xs text-light-400 mb-2">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold" style={{ color }}>
          {typeof value === 'number' ? value.toFixed(4) : value}
        </span>
        <span className="text-xs text-light-400">{unit}</span>
      </div>
    </div>
  );
};

/**
 * 主组件
 */
export default function SentimentCard({ data }: SentimentCardProps) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden mb-6">
      <div className="bg-gradient-to-br from-accent-blue/5 via-white to-accent-purple/5 p-8">
        {/* 标题 */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-light-100 rounded-xl flex items-center justify-center border border-light-200">
            <svg className="w-5 h-5 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-light-800">市场情绪指标</h3>
            <p className="text-xs text-light-400">交易所持仓 & 市场情绪</p>
          </div>
        </div>
        
        {/* 指标内容 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 多空人数比 */}
          <MetricCard
            label="多空人数比"
            value={data.longShortRatio}
            color={getLongShortColor(data.longShortRatio)}
          />
          
          {/* 资金费率 */}
          <MetricCard
            label="资金费率 (年化)"
            value={data.fundingRate}
            unit="%"
            color={getFundingRateColor(data.fundingRate)}
          />
          
          {/* 恐慌贪婪指数仪表盘 */}
          <div className="lg:col-span-2 flex justify-center lg:justify-start">
            <FearGreedGauge 
              value={data.fearGreedIndex} 
              label={data.fearGreedLabel} 
            />
          </div>
        </div>
        
        {/* 提示信息 */}
        <div className="mt-6 pt-6 border-t border-light-200/50">
          <div className="flex flex-wrap gap-4 text-xs text-light-400">
            <span><span className="text-accent-red">多头占优</span> → 警惕回调风险</span>
            <span><span className="text-accent-green">空头占优</span> → 可能反弹</span>
            <span><span className="text-accent-green">负费率</span> → 持仓可获利息</span>
          </div>
        </div>
      </div>
    </div>
  );
}
