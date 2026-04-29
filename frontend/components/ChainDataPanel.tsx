interface ChainMetric {
  id: string;
  title: string;
  description: string;
  value: string;
  unit?: string;
  change?: number;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
}

interface ChainDataPanelProps {
  metrics: ChainMetric[];
}

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    default:
      return '→';
  }
};

const getTrendColor = (trend: string) => {
  switch (trend) {
    case 'up':
      return 'text-accent-green';
    case 'down':
      return 'text-accent-red';
    default:
      return 'text-accent-yellow';
  }
};

export default function ChainDataPanel({ metrics }: ChainDataPanelProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-light-800">链上数据指标</h3>
        </div>
        <span className="text-xs text-light-400 px-2 py-1 bg-light-100/50 rounded-full">实时更新</span>
      </div>

      <div className="space-y-4">
        {metrics.map((metric) => (
          <div
            key={metric.id}
            className="group p-4 bg-light-50/50 rounded-xl hover:bg-light-100/50 transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 ${metric.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <span className="text-lg">{metric.icon}</span>
                </div>
                <div>
                  <h4 className="font-semibold text-light-800 mb-1">{metric.title}</h4>
                  <p className="text-xs text-light-400 max-w-xs">{metric.description}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-light-900">{metric.value}</span>
                  {metric.unit && (
                    <span className="text-sm text-light-400">{metric.unit}</span>
                  )}
                </div>
                {metric.change !== undefined && (
                  <div className={`flex items-center justify-end gap-1 text-sm ${getTrendColor(metric.trend)}`}>
                    <span>{getTrendIcon(metric.trend)}</span>
                    <span>{metric.change >= 0 ? '+' : ''}{metric.change.toFixed(2)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-light-200/50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-light-400">数据来源: Glassnode / Etherscan / Nansen</span>
          <button className="text-sm text-accent-blue hover:text-accent-blue/80 transition-colors">
            查看详细 →
          </button>
        </div>
      </div>
    </div>
  );
}
