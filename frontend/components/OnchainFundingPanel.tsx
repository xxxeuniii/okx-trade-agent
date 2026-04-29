interface OnchainMetric {
  id: string;
  title: string;
  value: string;
  unit?: string;
  change: number;
  trend: 'inflow' | 'outflow' | 'neutral';
  icon: string;
}

interface OnchainFundingPanelProps {
  metrics: OnchainMetric[];
}

const getTrendColor = (trend: string) => {
  switch (trend) {
    case 'inflow':
      return 'text-accent-green';
    case 'outflow':
      return 'text-accent-red';
    default:
      return 'text-accent-yellow';
  }
};

const getTrendBg = (trend: string) => {
  switch (trend) {
    case 'inflow':
      return 'bg-accent-green/10';
    case 'outflow':
      return 'bg-accent-red/10';
    default:
      return 'bg-accent-yellow/10';
  }
};

export default function OnchainFundingPanel({ metrics }: OnchainFundingPanelProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-light-800">链上资金</h3>
        </div>
        <span className="text-xs text-light-400 px-2 py-1 bg-light-100/50 rounded-full">真实资金流向</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className={`${getTrendBg(metric.trend)} rounded-xl p-4`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{metric.icon}</span>
              <span className="text-sm text-light-500">{metric.title}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-light-800">{metric.value}</span>
              {metric.unit && <span className="text-sm text-light-400">{metric.unit}</span>}
            </div>
            <div className={`text-sm ${getTrendColor(metric.trend)} mt-1`}>
              {metric.trend === 'inflow' ? '净流入' : metric.trend === 'outflow' ? '净流出' : '持平'}
              {' '}{metric.change >= 0 ? '+' : ''}{metric.change}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
