import { useState, useEffect, useCallback, useRef } from 'react';
import SearchBar from '../components/SearchBar';
import SignalCard from '../components/SignalCard';
import RiskManagementCard from '../components/RiskManagementCard';
import { getSignal, SignalResponse } from '../services/api';

// 支持的时间周期 - 完整列表
const TIMEFRAMES = [
  { label: '1秒', value: '1s' },
  { label: '1分', value: '1m' },
  { label: '3分', value: '3m' },
  { label: '5分', value: '5m' },
  { label: '15分', value: '15m' },
  { label: '30分', value: '30m' },
  { label: '1小时', value: '1H' },
  { label: '2小时', value: '2H' },
  { label: '4小时', value: '4H' },
  { label: '6小时', value: '6H' },
  { label: '12小时', value: '12H' },
  { label: '1日', value: '1D' },
  { label: '2日', value: '2D' },
  { label: '3日', value: '3D' },
  { label: '5日', value: '5D' },
  { label: '1周', value: '1W' },
  { label: '1月', value: '1M' },
  { label: '3月', value: '3M' },
];

// 快捷周期（显示在顶部）
const QUICK_TIMEFRAMES = ['1m', '5m', '15m', '1H', '4H', '1D'];

export default function Home() {
  const [signal, setSignal] = useState<SignalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRealtime, setIsRealtime] = useState(false);
  const [timeframe, setTimeframe] = useState('1H');
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTimeframeDropdown(false);
      }
    };

    if (showTimeframeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTimeframeDropdown]);

  // WebSocket实时更新
  useEffect(() => {
    if (!signal || !isRealtime) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const ws = new WebSocket(`wss://ws.okx.com:8443/ws/v5/public`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      const subscribeMsg = JSON.stringify({
        op: 'subscribe',
        args: [{ channel: 'tickers', instId: `${signal.symbol}-USDT` }]
      });
      ws.send(subscribeMsg);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.data && data.data[0]) {
          const ticker = data.data[0];
          const lastPrice = parseFloat(ticker.last);
          const openPrice = parseFloat(ticker.open24h);
          const change24h = ((lastPrice - openPrice) / openPrice * 100) || 0;
          
          setSignal(prev => ({
            ...prev!,
            price: lastPrice,
            change24h: change24h
          }));
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [signal?.symbol, isRealtime]);

  const handleSearch = async (symbol: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await getSignal(symbol, timeframe);
      
      if (!response.symbol || !response.price) {
        throw new Error('无效的响应格式');
      }
      
      setSignal(response);
      setIsRealtime(true);
    } catch (err) {
      console.log('API调用失败:', err);
      setError('获取数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
    if (signal) {
      // 直接使用新的周期参数，避免React状态异步更新问题
      handleSearchWithTimeframe(signal.symbol, newTimeframe);
    }
  };

  const handleSearchWithTimeframe = async (symbol: string, tf: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await getSignal(symbol, tf);
      
      if (!response.symbol || !response.price) {
        throw new Error('无效的响应格式');
      }
      
      setSignal(response);
      setIsRealtime(true);
    } catch (err) {
      console.log('API调用失败:', err);
      setError('获取数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const toggleRealtime = () => {
    setIsRealtime(!isRealtime);
  };

  return (
    <div className="min-h-screen">
      <header className="bg-white/80 backdrop-blur-lg border-b border-light-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-light-100 rounded-xl flex items-center justify-center border border-light-200">
                <svg className="w-5 h-5 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0 a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-accent-blue">CryptoSignal AI</h1>
                <p className="text-xs text-light-400">实时交易智能分析</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1760px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-12">
        <section className="mb-8 max-w-4xl mx-auto">
          <SearchBar onSearch={handleSearch} loading={loading} />
        </section>

        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-light-200 rounded-full" />
              <div className="absolute inset-0 w-16 h-16 border-4 border-accent-blue border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="mt-6 text-light-400">正在分析市场数据...</p>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 bg-accent-red/10 border border-accent-red/30 rounded-xl text-center">
            <p className="text-accent-red">{error}</p>
          </div>
        )}

        {!loading && (
          <section>
            {/* 交易分析标签 */}
            {activeTab === 'analysis' && (
              <>
                {signal ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        {/* 快捷周期按钮 */}
                        <div className="flex items-center gap-1.5">
                          {QUICK_TIMEFRAMES.map((tfValue) => {
                            const tf = TIMEFRAMES.find(t => t.value === tfValue);
                            return tf ? (
                              <button
                                key={tf.value}
                                onClick={() => handleTimeframeChange(tf.value)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                  timeframe === tf.value
                                    ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/30'
                                    : 'bg-light-100 text-light-600 hover:bg-light-200'
                                }`}
                              >
                                {tf.label}
                              </button>
                            ) : null;
                          })}
                        </div>
                        {/* 分隔线 */}
                        <div className="w-px h-6 bg-light-200" />
                        {/* 下拉按钮 - 单独显示 */}
                        <div className="relative">
                          <button
                            onClick={() => setShowTimeframeDropdown(!showTimeframeDropdown)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-light-100 text-light-600 hover:bg-light-200 ${
                              !QUICK_TIMEFRAMES.includes(timeframe) && 'ring-1 ring-accent-blue ring-offset-1'
                            }`}
                          >
                            <span>{TIMEFRAMES.find(t => t.value === timeframe)?.label || '周期'}</span>
                            <svg className={`w-4 h-4 transition-transform duration-200 ${showTimeframeDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {/* 下拉网格 */}
                          {showTimeframeDropdown && (
                            <div ref={dropdownRef} className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-light-200 p-4 z-10 min-w-[280px]">
                              <div className="grid grid-cols-5 gap-2">
                                {TIMEFRAMES.map((tf) => (
                                  <button
                                    key={tf.value}
                                    onClick={() => {
                                      handleTimeframeChange(tf.value);
                                      setShowTimeframeDropdown(false);
                                    }}
                                    className={`w-[52px] h-[44px] rounded-lg text-xs font-medium flex items-center justify-center transition-all duration-150 ${
                                      timeframe === tf.value
                                        ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/30'
                                        : 'text-light-600 hover:bg-light-50'
                                    }`}
                                  >
                                    {tf.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={toggleRealtime}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                          isRealtime 
                            ? 'bg-accent-green/10 text-accent-green border border-accent-green/30' 
                            : 'bg-light-100 text-light-500 border border-light-200 hover:border-accent-blue/30'
                        }`}
                      >
                        {isRealtime ? '⏸ 暂停实时更新' : '▶ 开启实时更新'}
                      </button>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-light-400">
                      <span>📊 数据来源: OKX现货市场 (BTC-USDT)</span>
                      <span>|</span>
                      <span>当前周期: {TIMEFRAMES.find(t => t.value === timeframe)?.label}</span>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_460px] gap-6 2xl:gap-8 items-start">
                      <SignalCard data={signal} />
                      {signal.risk && (
                        <RiskManagementCard risk={signal.risk} signal={signal.signal} />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="glass-card rounded-2xl p-12 text-center">
                    <div className="relative inline-block mb-6">
                      <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/10 to-accent-green/10 rounded-full blur-2xl" />
                      <div className="relative w-24 h-24 bg-light-100 rounded-full flex items-center justify-center border border-light-200">
                        <svg className="w-12 h-12 text-accent-blue/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-light-800 mb-3">开始分析您的加密货币</h3>
                    <p className="text-light-400 max-w-md mx-auto mb-8">
                      在上方输入框中输入加密货币代码，或点击下方快捷按钮，获取AI驱动的交易信号和市场分析。
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      {['BTC', 'ETH', 'SOL', 'AVAX', 'MATIC', 'DOGE', 'XRP', 'ADA'].map((symbol) => (
                        <button
                          key={symbol}
                          onClick={() => handleSearch(symbol)}
                          className="px-5 py-3 bg-light-50 hover:bg-accent-blue/5 border border-light-200 hover:border-accent-blue/30 rounded-xl text-sm font-semibold text-light-700 transition-all duration-300 hover:scale-105"
                        >
                          {symbol}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
          </section>
        )}
      </main>

      <footer className="mt-16 bg-white/50 border-t border-light-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="font-bold text-light-800">CryptoSignal AI</span>
              </div>
              <p className="text-light-400 text-sm max-w-md">
                AI驱动的加密货币交易信号。获取实时分析，做出更明智的交易决策。
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-light-700 mb-4">产品</h4>
              <ul className="space-y-2">
                {['免费版', '专业版', '企业版', 'API'].map((item) => (
                  <li key={item}>
                    <a href="#pricing" className="text-light-400 text-sm hover:text-accent-blue transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-light-700 mb-4">资源</h4>
              <ul className="space-y-2">
                {['文档', '博客', '支持', '联系我们'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-light-400 text-sm hover:text-accent-blue transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-light-200/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-light-400 text-sm">2024 CryptoSignal AI. 保留所有权利。</p>
            <div className="flex items-center gap-6">
              {['隐私政策', '服务条款', 'Cookie设置'].map((item) => (
                <a key={item} href="#" className="text-light-400 text-sm hover:text-accent-blue transition-colors">{item}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
