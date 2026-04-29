interface DerivativesMetric {
  id: string;
  title: string;
  value: string;
  unit?: string;
  change: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  icon: string;
}

interface DerivativesSentimentPanelProps {
  metrics: DerivativesMetric[];
}

const getSignalColor = (signal: string) => {
  switch (signal) {
    case 'bullish':
      return 'text-accent-green';
    case 'bearish':
      return 'text-accent-red';
    default:
      return 'text-accent-yellow';
  }
};

const getSignalBg = (signal: string) => {
  switch (signal) {
    case 'bullish':
      return 'bg-accent-green/10';
    case 'bearish':
      return 'bg-accent-red/10';
    default:
      return 'bg-accent-yellow/10';
  }
};

const getSignalBadge = (signal: string) => {
  switch (signal) {
    case 'bullish':
      return 'bg-accent-green/15 text-accent-green border-accent-green/30';
    case 'bearish':
      return 'bg-accent-red/15 text-accent-red border-accent-red/30';
    default:
      return 'bg-accent-yellow/15 text-accent-yellow border-accent-yellow/30';
  }
};

export default function DerivativesSentimentPanel({ metrics }: DerivativesSentimentPanelProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-light-800">衍生品情绪</h3>
        </div>
        <span className="text-xs text-light-400 px-2 py-1 bg-light-100/50 rounded-full">杠杆市场</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className={`${getSignalBg(metric.signal)} rounded-xl p-4`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{metric.icon}</span>
                <span className="text-sm text-light-500">{metric.title}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getSignalBadge(metric.signal)}`}>
                {metric.signal === 'bullish' ? '看多' : metric.signal === 'bearish' ? '看空' : '中性'}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-light-800">{metric.value}</span>
              {metric.unit && <span className="text-sm text-light-400">{metric.unit}</span>}
            </div>
            <div className={`text-sm ${getSignalColor(metric.signal)} mt-1`}>
              {metric.change >= 0 ? '+' : ''}{metric.change}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
