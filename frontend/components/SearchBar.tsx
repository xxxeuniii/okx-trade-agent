import { useState } from 'react';

interface SearchBarProps {
  onSearch: (symbol: string) => void;
  loading: boolean;
}

const quickSymbols = ['BTC', 'ETH', 'SOL', 'AVAX', 'MATIC'];

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
    <div className="max-w-2xl mx-auto">
      <div className="relative glass-card rounded-2xl p-2 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-3">
          <svg className="w-5 h-5 text-light-400 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入加密货币代码 (BTC, ETH, SOL...)"
            className="flex-1 bg-transparent py-4 text-lg text-light-800 placeholder-light-400 focus:outline-none"
            disabled={loading}
          />
        </div>
        <button
          onClick={() => input.trim() && onSearch(input.trim().toUpperCase())}
          disabled={loading || !input.trim()}
          className="px-8 py-3 bg-gradient-to-r from-accent-blue to-accent-green hover:from-accent-blue/90 hover:to-accent-green/90 disabled:from-light-300 disabled:to-light-300 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-accent-blue/25 disabled:cursor-not-allowed"
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
      
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        <span className="text-xs text-light-400 mr-2">快速选择:</span>
        {quickSymbols.map((symbol) => (
          <button
            key={symbol}
            onClick={() => handleQuickSearch(symbol)}
            className="px-3 py-1 bg-white hover:bg-light-50 border border-light-200 hover:border-accent-blue/30 rounded-full text-xs text-light-600 transition-all duration-200"
          >
            {symbol}
          </button>
        ))}
      </div>
    </div>
  );
}
