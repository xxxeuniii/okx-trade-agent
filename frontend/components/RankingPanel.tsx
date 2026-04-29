interface RankItem {
  rank: number;
  symbol: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  price?: number;
  change24h?: number;
}

interface RankingPanelProps {
  rankings: RankItem[];
  onSymbolClick?: (symbol: string) => void;
}

const getSignalBadge = (signal: string, confidence: number) => {
  let text = signal;
  let color = 'bg-accent-yellow/10 text-accent-yellow/80 border-accent-yellow/20';

  if (signal === 'BUY') {
    text = confidence >= 0.7 ? '强力买入' : '弱势买入';
    color = confidence >= 0.7 
      ? 'bg-accent-green/15 text-accent-green border-accent-green/30' 
      : 'bg-accent-green/10 text-accent-green/70 border-accent-green/20';
  } else if (signal === 'SELL') {
    text = confidence >= 0.7 ? '强力卖出' : '弱势卖出';
    color = confidence >= 0.7 
      ? 'bg-accent-red/15 text-accent-red border-accent-red/30' 
      : 'bg-accent-red/10 text-accent-red/70 border-accent-red/20';
  } else {
    text = '中性';
  }

  return { text, color };
};

const getRankStyles = (rank: number) => {
  switch (rank) {
    case 1:
      return {
        bg: 'bg-gradient-to-br from-yellow-50 to-yellow-100/50',
        border: 'border-yellow-200/50',
        text: 'text-yellow-600',
        glow: 'shadow-sm shadow-yellow-100',
      };
    case 2:
      return {
        bg: 'bg-gradient-to-br from-gray-50 to-gray-100/50',
        border: 'border-gray-200/50',
        text: 'text-gray-500',
        glow: '',
      };
    case 3:
      return {
        bg: 'bg-gradient-to-br from-orange-50 to-orange-100/50',
        border: 'border-orange-200/50',
        text: 'text-orange-600',
        glow: '',
      };
    default:
      return {
        bg: 'bg-light-50/50',
        border: 'border-light-200/50',
        text: 'text-light-400',
        glow: '',
      };
  }
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return `${rank}`;
  }
};

export default function RankingPanel({ rankings, onSymbolClick }: RankingPanelProps) {
  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-accent-blue/10 to-accent-green/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-light-800">市场排名</h3>
        </div>
        <span className="text-xs text-light-400 px-2 py-1 bg-light-100/50 rounded-full">实时</span>
      </div>

      <div className="space-y-3">
        {rankings.map((item) => {
          const badge = getSignalBadge(item.signal, item.confidence);
          const rankStyles = getRankStyles(item.rank);
          
          return (
            <div
              key={item.symbol}
              onClick={() => onSymbolClick?.(item.symbol)}
              className={`relative p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] cursor-pointer ${rankStyles.bg} ${rankStyles.border} ${rankStyles.glow}`}
            >
              <div className="absolute inset-0 bg-white/30 opacity-0 hover:opacity-100 rounded-xl transition-opacity" />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className={`text-xl font-bold w-8 text-center ${rankStyles.text}`}>
                    {getRankIcon(item.rank)}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-light-800">{item.symbol}</span>
                    {item.price && (
                      <span className="text-xs text-light-400">${item.price.toLocaleString()}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className={`text-sm font-semibold ${
                      item.confidence >= 0.7 ? 'text-accent-green' :
                      item.confidence >= 0.4 ? 'text-accent-yellow' : 'text-accent-red'
                    }`}>
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                    {item.change24h !== undefined && (
                      <span className={`text-xs ml-2 ${item.change24h >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
                    {badge.text}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-light-200/50">
        <button className="w-full text-center text-sm text-light-400 hover:text-accent-blue transition-colors">
          查看完整排名 →
        </button>
      </div>
    </div>
  );
}