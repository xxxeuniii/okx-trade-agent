interface SentimentMetric {
  id: string;
  title: string;
  value: number;
  unit?: string;
  icon: string;
}

interface MarketSentimentPanelProps {
  fearGreedIndex: number;
  socialTrend: 'up' | 'down' | 'neutral';
  socialValue: string;
  institutionalFlow: 'inflow' | 'outflow' | 'neutral';
  institutionalValue: string;
}

const getFearGreedColor = (index: number) => {
  if (index <= 20) return 'bg-accent-red';
  if (index <= 40) return 'bg-accent-yellow';
  if (index <= 60) return 'bg-accent-green';
  if (index <= 80) return 'bg-accent-yellow';
  return 'bg-accent-red';
};

const getFearGreedLabel = (index: number) => {
  if (index <= 20) return '极度恐慌 ← 看涨';
  if (index <= 40) return '恐慌';
  if (index <= 60) return '中性';
  if (index <= 80) return '贪婪';
  return '极度贪婪 ← 看跌';
};

const getFearGreedBg = (index: number) => {
  if (index <= 20) return 'bg-accent-red/10';
  if (index <= 40) return 'bg-accent-yellow/10';
  if (index <= 60) return 'bg-accent-green/10';
  if (index <= 80) return 'bg-accent-yellow/10';
  return 'bg-accent-red/10';
};

export default function MarketSentimentPanel({ fearGreedIndex, socialTrend, socialValue, institutionalFlow, institutionalValue }: MarketSentimentPanelProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-light-800">市场情绪</h3>
        </div>
        <span className="text-xs text-light-400 px-2 py-1 bg-light-100/50 rounded-full">反向指标</span>
      </div>

      <div className={`${getFearGreedBg(fearGreedIndex)} rounded-xl p-6 mb-4`}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-light-500">恐慌贪婪指数</span>
          <span className={`text-sm font-medium ${fearGreedIndex <= 20 || fearGreedIndex >= 80 ? 'text-accent-red' : 'text-light-600'}`}>
            {getFearGreedLabel(fearGreedIndex)}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-4 bg-white/50 rounded-full overflow-hidden">
            <div
              className={`h-full ${getFearGreedColor(fearGreedIndex)} transition-all duration-1000`}
              style={{ width: `${fearGreedIndex}%` }}
            />
          </div>
          <span className="text-2xl font-bold text-light-800">{fearGreedIndex}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-light-50/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">📱</span>
            <span className="text-sm text-light-500">社交热度</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-light-800">{socialValue}</span>
            <span className={`text-sm ${socialTrend === 'up' ? 'text-accent-green' : socialTrend === 'down' ? 'text-accent-red' : 'text-accent-yellow'}`}>
              {socialTrend === 'up' ? '↑ 升温' : socialTrend === 'down' ? '↓ 降温' : '→ 平稳'}
            </span>
          </div>
        </div>

        <div className="bg-light-50/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🏢</span>
            <span className="text-sm text-light-500">机构资金</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-light-800">{institutionalValue}</span>
            <span className={`text-sm ${institutionalFlow === 'inflow' ? 'text-accent-green' : institutionalFlow === 'outflow' ? 'text-accent-red' : 'text-accent-yellow'}`}>
              {institutionalFlow === 'inflow' ? '流入' : institutionalFlow === 'outflow' ? '流出' : '持平'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
