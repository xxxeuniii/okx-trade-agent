interface TimeframeData {
  timeframe: string;
  trend: 'bullish' | 'bearish' | 'sideways';
  strength: number;
}

interface MultiTimeframeTrendPanelProps {
  data: TimeframeData[];
  confidenceImpact: number;
  isAligned: boolean;
}

const getTrendColor = (trend: string) => {
  switch (trend) {
    case 'bullish':
      return 'bg-accent-green';
    case 'bearish':
      return 'bg-accent-red';
    default:
      return 'bg-accent-yellow';
  }
};

const getTrendText = (trend: string) => {
  switch (trend) {
    case 'bullish':
      return '多头';
    case 'bearish':
      return '空头';
    default:
      return '震荡';
  }
};

const getTrendGradient = (trend: string) => {
  switch (trend) {
    case 'bullish':
      return 'from-accent-green/20 to-accent-green/5';
    case 'bearish':
      return 'from-accent-red/20 to-accent-red/5';
    default:
      return 'from-accent-yellow/20 to-accent-yellow/5';
  }
};

export default function MultiTimeframeTrendPanel({ data, confidenceImpact, isAligned }: MultiTimeframeTrendPanelProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-accent-green/20 to-accent-blue/20 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-light-800">多周期趋势</h3>
        </div>
        <span className="text-xs text-light-400 px-2 py-1 bg-light-100/50 rounded-full">周期分析</span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {data.map((item) => (
          <div
            key={item.timeframe}
            className={`bg-gradient-to-br ${getTrendGradient(item.trend)} rounded-xl p-4 text-center`}
          >
            <p className="text-sm text-light-500 mb-2">{item.timeframe}</p>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className={`w-3 h-3 ${getTrendColor(item.trend)} rounded-full`} />
              <span className="font-semibold text-light-800">{getTrendText(item.trend)}</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getTrendColor(item.trend)} transition-all duration-500`}
                  style={{ width: `${item.strength}%` }}
                />
              </div>
              <span className="text-sm font-medium text-light-600">{item.strength}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className={`p-4 rounded-xl border ${isAligned ? 'bg-accent-green/10 border-accent-green/30' : 'bg-accent-yellow/10 border-accent-yellow/30'}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-light-600">
            {isAligned ? '✅ 周期一致' : '⚠️ 周期冲突'}
          </span>
          <span className={`font-semibold ${isAligned ? 'text-accent-green' : 'text-accent-yellow'}`}>
            置信度 {confidenceImpact >= 0 ? '+' : ''}{confidenceImpact}%
          </span>
        </div>
      </div>
    </div>
  );
}
