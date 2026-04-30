/**
 * 市场情绪指标卡片组件
 * 
 * 展示交易所持仓数据和市场情绪指标：
 * - 多空人数比 (Long/Short Ratio)
 * - 资金费率 (Funding Rate)
 * - 恐慌与贪婪指数 (Fear & Greed Index)
 */

interface SentimentData {
  longShortRatio: number;     // 多空比
  longAccountRatio: number;   // 多头账户占比
  shortAccountRatio: number;  // 空头账户占比
  fundingRate: number;        // 资金费率 (%)
  fearGreedIndex: number;     // 恐慌贪婪指数 (0-100)
  fearGreedLabel: string;     // 恐慌贪婪状态标签
  symbol?: string;            // 币种代码
  timestamp?: number;         // 时间戳
}

interface SentimentCardProps {
  data: SentimentData;
}

const getFearGreedColor = (index: number): string => {
  if (index <= 20) return '#96002c';
  if (index <= 40) return '#c53030';
  if (index <= 60) return '#d4a574';
  if (index <= 80) return '#38a169';
  return '#006432';
};

const getFundingRateColor = (rate: number): string => {
  if (rate > 0.01) return '#c53030';
  if (rate > 0) return '#e53e3e';
  if (rate < -0.01) return '#38a169';
  if (rate < 0) return '#48bb78';
  return '#a0aec0';
};

/**
 * 双向进度条组件 - 多空比
 */
const LongShortBar = ({ longAccountRatio, shortAccountRatio }: { longAccountRatio: number; shortAccountRatio: number }) => {
  const longPercent = Math.round(longAccountRatio * 100);
  const shortPercent = Math.round(shortAccountRatio * 100);
  const isLongDominant = longPercent > shortPercent;
  
  return (
    <div className="bg-light-50/50 rounded-xl p-4">
      <p className="text-xs text-light-400 mb-3">多空账户比</p>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-6 rounded-lg overflow-hidden bg-light-200 flex">
          {/* 空头部分 - 红色 */}
          <div 
            className="h-full bg-gradient-to-r from-accent-red/80 to-accent-red/40 transition-all duration-500"
            style={{ width: `${shortPercent}%` }}
          />
          {/* 多头部分 - 绿色 */}
          <div 
            className="h-full bg-gradient-to-l from-accent-green/80 to-accent-green/40 transition-all duration-500"
            style={{ width: `${longPercent}%` }}
          />
        </div>
      </div>
      <div className="flex justify-between mt-2 text-sm">
        <span className="text-accent-red font-semibold">空头 {shortPercent}%</span>
        <span className="text-accent-green font-semibold">多头 {longPercent}%</span>
      </div>
      {/* 优势指示标签 */}
      <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${
        isLongDominant 
          ? 'bg-accent-green/10 text-accent-green' 
          : 'bg-accent-red/10 text-accent-red'
      }`}>
        {isLongDominant ? `多头优势 (+${Math.abs(longPercent - shortPercent)}%)` : `空头优势 (+${Math.abs(shortPercent - longPercent)}%)`}
      </div>
    </div>
  );
};

/**
 * 资金费率卡片
 */
const FundingRateCard = ({ rate }: { rate: number }) => {
  const color = getFundingRateColor(rate);
  const isPositive = rate > 0;
  
  return (
    <div className="bg-light-50/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs text-light-400">资金费率</p>
        <span className="text-xs px-2 py-0.5 bg-light-200 rounded-full text-light-500">年化</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold" style={{ color }}>
          {isPositive ? '+' : ''}{rate.toFixed(4)}%
        </span>
      </div>
      {/* 费率说明 */}
      <p className={`mt-2 text-xs ${isPositive ? 'text-accent-red' : 'text-accent-green'}`}>
        {isPositive ? '↗ 持仓需支付费用' : '↘ 持仓可获得收益'}
      </p>
    </div>
  );
};

/**
 * 恐慌贪婪指数仪表盘组件
 */
const FearGreedGauge = ({ value, label }: { value: number; label: string }) => {
  const color = getFearGreedColor(value);
  const angle = ((value / 100) * 180) - 90;
  
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 60" className="w-28 h-16">
        <defs>
          <linearGradient id="fgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#96002c" />
            <stop offset="50%" stopColor="#d4a574" />
            <stop offset="100%" stopColor="#006432" />
          </linearGradient>
        </defs>
        
        <path d="M 5 55 A 55 55 0 0 1 115 55" fill="none" stroke="#e5e7eb" strokeWidth="8" strokeLinecap="round" />
        <path d="M 5 55 A 55 55 0 0 1 115 55" fill="none" stroke="url(#fgGradient)" strokeWidth="6" strokeLinecap="round" />
        
        <g transform={`rotate(${angle}, 60, 55)`}>
          <line x1="60" y1="55" x2="60" y2="15" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <circle cx="60" cy="15" r="5" fill={color} />
        </g>
        
        <circle cx="60" cy="55" r="5" fill={color} />
      </svg>
      
      {/* 数值和标签放在仪表盘下方，避免被指针遮挡 */}
      <div className="text-center mt-2">
        <p className="text-xl font-bold" style={{ color }}>{value}</p>
        <p className="text-xs text-light-400">{label}</p>
      </div>
    </div>
  );
};

/**
 * 分析结论标签组件
 */
const AnalysisTag = ({ text, type }: { text: string; type: 'warning' | 'info' | 'success' }) => {
  const styles = {
    warning: 'bg-accent-red/10 text-accent-red border-accent-red/30',
    info: 'bg-accent-blue/10 text-accent-blue border-accent-blue/30',
    success: 'bg-accent-green/10 text-accent-green border-accent-green/30'
  };
  
  const icons = {
    warning: '⚠',
    info: '💡',
    success: '✅'
  };
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${styles[type]}`}>
      <span>{icons[type]}</span>
      <span>{text}</span>
    </span>
  );
};

/**
 * 获取分析结论
 */
const getAnalysisConclusions = (data: SentimentData): { text: string; type: 'warning' | 'info' | 'success' }[] => {
  const conclusions: { text: string; type: 'warning' | 'info' | 'success' }[] = [];
  
  // 多空比分析
  const longPercent = Math.round((data.longShortRatio / (1 + data.longShortRatio)) * 100);
  if (longPercent >= 60) {
    conclusions.push({ text: `多头占优(${longPercent}%)，警惕回调风险`, type: 'warning' });
  } else if (longPercent <= 40) {
    conclusions.push({ text: `空头占优(${100 - longPercent}%)，可能存在反弹机会`, type: 'success' });
  }
  
  // 资金费率分析
  if (data.fundingRate > 0.01) {
    conclusions.push({ text: '资金费率偏高，多头持仓成本增加', type: 'warning' });
  } else if (data.fundingRate < -0.01) {
    conclusions.push({ text: '资金费率为负，持仓可获得收益', type: 'success' });
  }
  
  // 恐慌贪婪指数分析
  if (data.fearGreedIndex <= 20) {
    conclusions.push({ text: '市场极度恐慌，或为买入机会', type: 'success' });
  } else if (data.fearGreedIndex >= 80) {
    conclusions.push({ text: '市场极度贪婪，注意风险控制', type: 'warning' });
  }
  
  if (conclusions.length === 0) {
    conclusions.push({ text: '市场情绪中性，建议观望', type: 'info' });
  }
  
  return conclusions;
};

/**
 * 主组件
 */
export default function SentimentCard({ data }: SentimentCardProps) {
  const conclusions = getAnalysisConclusions(data);
  
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-light-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-light-800">市场情绪</h3>
            <p className="text-xs text-light-400">持仓 & 情绪指数</p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-light-50/50 rounded-lg p-3">
            <p className="text-xs text-light-400 mb-2">多空比</p>
            <div className="flex h-4 rounded-lg overflow-hidden bg-light-200">
              <div className="bg-accent-red/60 transition-all" style={{ width: `${(data.shortAccountRatio || 0.5) * 100}%` }} />
              <div className="bg-accent-green/60 transition-all" style={{ width: `${(data.longAccountRatio || 0.5) * 100}%` }} />
            </div>
            <p className="text-xs mt-1">{Math.round((data.longAccountRatio || 0.5) * 100)}%</p>
          </div>
          <div className="bg-light-50/50 rounded-lg p-3">
            <p className="text-xs text-light-400 mb-2">资金费率</p>
            <p className={`text-sm font-bold ${(data.fundingRate || 0) >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
              {data.fundingRate >= 0 ? '+' : ''}{(data.fundingRate || 0).toFixed(4)}%
            </p>
            <p className="text-xs text-light-400">年化</p>
          </div>
          <div className="bg-light-50/50 rounded-lg p-3 flex flex-col items-center">
            <p className="text-xs text-light-400 mb-1">恐慌贪婪</p>
            <svg viewBox="0 0 80 40" className="w-16 h-8">
              <defs>
                <linearGradient id="fgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#96002c" />
                  <stop offset="50%" stopColor="#d4a574" />
                  <stop offset="100%" stopColor="#006432" />
                </linearGradient>
              </defs>
              <path d="M 3 35 A 37 37 0 0 1 77 35" fill="none" stroke="#e5e7eb" strokeWidth="4" />
              <path d="M 3 35 A 37 37 0 0 1 77 35" fill="none" stroke="url(#fgGrad)" strokeWidth="3" />
              <g transform={`rotate(${(data.fearGreedIndex / 100) * 180 - 90}, 40, 35)`}>
                <line x1="40" y1="35" x2="40" y2="10" stroke="#d4a574" strokeWidth="2" />
                <circle cx="40" cy="10" r="3" fill="#d4a574" />
              </g>
              <circle cx="40" cy="35" r="3" fill="#d4a574" />
            </svg>
            <p className="text-xs font-bold text-light-700">{data.fearGreedIndex}</p>
          </div>
        </div>
        
        {/* 分析结论 */}
        <div className="pt-3 border-t border-light-200/50">
          <div className="flex flex-wrap gap-1.5">
            {conclusions.map((conclusion, index) => (
              <AnalysisTag key={index} text={conclusion.text} type={conclusion.type} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
