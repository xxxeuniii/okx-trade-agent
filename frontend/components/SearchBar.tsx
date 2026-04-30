import { useState } from 'react';

interface SearchBarProps {
  onSearch: (symbol: string) => void;
  loading: boolean;
}

const quickSymbols = ['BTC', 'ETH', 'SOL', 'AVAX', 'MATIC', 'DOGE', 'XRP', 'ADA'];

export default function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [input, setInput] = useState('');

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      onSearch(input.trim().toUpperCase());
    }
  };

  const handleQuickSearch = (symbol: string) => {
    setInput(symbol);
    onSearch(symbol);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="relative flex items-center gap-3">
        <div className="flex-1 relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-light-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入加密货币代码 (如 BTC, ETH, SOL)"
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-light-200 rounded-xl text-light-800 placeholder-light-400 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all shadow-sm"
            disabled={loading}
          />
        </div>
        <button
          onClick={() => input.trim() && onSearch(input.trim().toUpperCase())}
          disabled={loading || !input.trim()}
          className="px-6 py-3.5 bg-accent-blue hover:bg-accent-blue/90 disabled:bg-light-300 text-white font-semibold rounded-xl transition-all duration-200 shadow-md shadow-accent-blue/30 hover:shadow-lg disabled:shadow-none disabled:cursor-not-allowed"
        >
          {loading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            '分析'
          )}
        </button>
      </div>
      
      <div className="flex flex-wrap justify-center gap-2">
        {quickSymbols.map((symbol) => (
          <button
            key={symbol}
            onClick={() => handleQuickSearch(symbol)}
            className="px-4 py-2 bg-light-50 hover:bg-light-100 border border-light-200 hover:border-accent-blue/40 rounded-lg text-sm font-medium text-light-600 hover:text-light-800 transition-all duration-200 hover:shadow-sm"
          >
            {symbol}
          </button>
        ))}
      </div>
    </div>
  );
}
