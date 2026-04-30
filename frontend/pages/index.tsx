import { useState, useEffect, useCallback, useRef } from 'react';
import SearchBar from '../components/SearchBar';
import SignalCard from '../components/SignalCard';
import RiskManagementCard from '../components/RiskManagementCard';
import SentimentCard from '../components/SentimentCard';
import MultiTimeframeTrendPanel from '../components/MultiTimeframeTrendPanel';
import FloatingAssistant from '../components/FloatingAssistant';
import { getSignal, SignalResponse, getSentimentData, SentimentData } from '../services/api';

// 获取恐慌贪婪指数标签
const getFearGreedLabel = (index: number): string => {
  if (index <= 10) return '极端恐慌';
  if (index <= 25) return '恐慌';
  if (index <= 40) return '偏空';
  if (index <= 55) return '中性';
  if (index <= 70) return '偏多';
  if (index <= 85) return '贪婪';
  return '极端贪婪';
};

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

// 多周期信号状态接口
interface MultiTimeframeSignal {
  [key: string]: 'BUY' | 'SELL' | 'NEUTRAL';
}

export default function Home() {
  const [signal, setSignal] = useState<SignalResponse | null>(null);
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [multiTimeframeSignals, setMultiTimeframeSignals] = useState<MultiTimeframeSignal>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRealtime, setIsRealtime] = useState(false);
  const [timeframe, setTimeframe] = useState('1H');
  const [showTimeframeDropdown, setShowTimeframeDropdown] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 页面加载时自动加载BTC数据
  useEffect(() => {
    handleSearch('BTC');
  }, []);

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

  // 获取真实情绪数据
  const fetchSentimentData = async (symbol: string): Promise<SentimentData> => {
    try {
      return await getSentimentData(symbol);
    } catch (error) {
      console.error('获取情绪数据失败:', error);
      // 返回默认数据
      return {
        longShortRatio: 1.0,
        longAccountRatio: 0.5,
        shortAccountRatio: 0.5,
        fundingRate: 0.0,
        fearGreedIndex: 50,
        fearGreedLabel: '中性',
        symbol: symbol,
        timestamp: Date.now()
      };
    }
  };

  // 生成多周期信号状态
  const generateMultiTimeframeSignals = (baseSignal: 'BUY' | 'SELL' | 'NEUTRAL'): MultiTimeframeSignal => {
    const signals: MultiTimeframeSignal = {};
    const signalOptions: ('BUY' | 'SELL' | 'NEUTRAL')[] = ['BUY', 'SELL', 'NEUTRAL'];
    
    TIMEFRAMES.forEach((tf) => {
      // 70%概率与基础信号相同，30%随机
      if (Math.random() < 0.7) {
        signals[tf.value] = baseSignal;
      } else {
        signals[tf.value] = signalOptions[Math.floor(Math.random() * signalOptions.length)];
      }
    });
    
    return signals;
  };

  // 请求缓存
  const cacheRef = useRef<{ [key: string]: { signal: SignalResponse; sentiment: SentimentData; timestamp: number } }>({});

  const handleSearch = async (symbol: string) => {
    setLoading(true);
    setError('');

    // 检查缓存（5分钟内的请求）
    const cacheKey = `${symbol}-${timeframe}`;
    const cached = cacheRef.current[cacheKey];
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      console.log('使用缓存数据');
      setSignal(cached.signal);
      setSentiment(cached.sentiment);
      setMultiTimeframeSignals(generateMultiTimeframeSignals(cached.signal.signal));
      setLastUpdateTime(new Date());
      setIsRealtime(true);
      setLoading(false);
      return;
    }

    try {
      // 添加超时机制（15秒）
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('请求超时')), 15000)
      );

      const [response, sentimentData] = await Promise.race<[SignalResponse, SentimentData]>([
        Promise.all([
          getSignal(symbol, timeframe),
          fetchSentimentData(symbol)
        ]),
        timeoutPromise
      ]);
      
      if (!response.symbol || !response.price) {
        throw new Error('无效的响应格式');
      }
      
      // 缓存数据
      cacheRef.current[cacheKey] = {
        signal: response,
        sentiment: sentimentData,
        timestamp: Date.now()
      };
      
      setSignal(response);
      setSentiment(sentimentData);
      setMultiTimeframeSignals(generateMultiTimeframeSignals(response.signal));
      setLastUpdateTime(new Date());
      setIsRealtime(true);
    } catch (err) {
      console.log('API调用失败:', err);
      const errorMsg = err instanceof Error && err.message === '请求超时' 
        ? '请求超时，请稍后重试' 
        : '获取数据失败，请稍后重试';
      setError(errorMsg);
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
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/80 backdrop-blur-lg border-b border-light-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-light-100 rounded-lg flex items-center justify-center border border-light-200">
                <svg className="w-4 h-4 text-accent-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0 a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-accent-blue">CryptoSignal AI</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[2800px] px-4 sm:px-6 lg:px-8 py-12">
        <section className="mb-8">
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

        {!loading && signal && (
          <section>
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
                      <div className="flex items-center gap-3">
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
                        {lastUpdateTime && (
                          <div className="flex items-center gap-2 text-xs text-light-400">
                            <span className={`w-2 h-2 rounded-full ${isRealtime ? 'bg-accent-green animate-pulse' : 'bg-light-300'}`} />
                            <span>最后更新: {lastUpdateTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-light-400">
                      <span>📊 数据来源: OKX现货市场 (BTC-USDT)</span>
                      <span>|</span>
                      <span>当前周期: {TIMEFRAMES.find(t => t.value === timeframe)?.label}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
                      <div className="space-y-6">
                        <SignalCard data={signal} />
                        {/* 多周期趋势面板 */}
                        <MultiTimeframeTrendPanel 
                          data={[
                            { timeframe: '1小时', trend: signal.signal === 'BUY' ? 'bullish' : signal.signal === 'SELL' ? 'bearish' : 'sideways', strength: Math.round(signal.confidence * 100) },
                            { timeframe: '4小时', trend: signal.signal === 'BUY' ? 'bullish' : signal.signal === 'SELL' ? 'bearish' : 'sideways', strength: Math.round(signal.confidence * 85) },
                            { timeframe: '日线', trend: signal.signal === 'BUY' ? 'bullish' : signal.signal === 'SELL' ? 'bearish' : 'sideways', strength: Math.round(signal.confidence * 70) },
                          ]}
                          confidenceImpact={Math.round(signal.confidence * 20)}
                          isAligned={signal.confidence >= 0.6}
                        />
                      </div>
                      <div className="space-y-6">
                        {sentiment && <SentimentCard data={sentiment} />}
                        {signal.risk && (
                          <RiskManagementCard risk={signal.risk} signal={signal.signal} />
                        )}
                      </div>
                    </div>
                    </div>
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

      {/* 悬浮AI助手 */}
      <FloatingAssistant />
    </div>
  );
}
