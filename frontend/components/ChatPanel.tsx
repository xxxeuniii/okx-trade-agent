import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Loader2, Trash2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const ChatPanel = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingResponse]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingResponse('');

    try {
      // 获取历史对话
      const chatHistory = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

      const response = await fetch('http://localhost:8000/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: input.trim(),
          chat_history: chatHistory,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStreamingResponse(data.response);
          setTimeout(() => {
            const assistantMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: data.response,
            };
            setMessages(prev => [...prev, assistantMessage]);
            setStreamingResponse('');
          }, 500);
        } else {
          throw new Error(data.error || '请求失败');
        }
      } else {
        throw new Error('网络请求失败');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `抱歉，发生错误：${error instanceof Error ? error.message : '未知错误'}`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    fetch('http://localhost:8000/api/v1/chat/clear', {
      method: 'POST',
    }).catch(console.error);
  };

  const formatMessage = (content: string) => {
    return content
      .replace(/## (.+?)\n/g, '<h3 class="font-semibold text-accent-blue mb-2">$1</h3>')
      .replace(/### (.+?)\n/g, '<h4 class="font-semibold text-light-700 mb-1">$1</h4>')
      .replace(/- (.+?)\n/g, '<li class="ml-4 text-light-600">$1</li>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-light-800">$1</strong>');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-xl overflow-hidden border border-light-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-accent-blue/15 to-accent-green/15 border-b border-light-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-accent-blue" />
          </div>
          <h3 className="text-lg font-semibold text-light-800">AI 交易助手</h3>
        </div>
        <button
          onClick={handleClear}
          className="p-3 text-light-400 hover:text-accent-red hover:bg-accent-red/10 rounded-xl transition-colors"
          title="清除对话"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.length === 0 && !streamingResponse ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-blue/10 to-accent-green/10 flex items-center justify-center mb-6">
              <MessageCircle className="w-12 h-12 text-accent-blue/60" />
            </div>
            <h4 className="text-xl font-semibold text-light-700 mb-3">欢迎使用 AI 交易助手</h4>
            <p className="text-light-400 text-base max-w-md">
              您可以询问加密货币价格、走势分析等问题
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {['BTC现在多少钱？', '分析ETH的走势', 'SOL的RSI指标', 'AVAX技术分析'].map((example, index) => (
                <button
                  key={index}
                  onClick={() => setInput(example)}
                  className="px-4 py-2.5 bg-light-100 hover:bg-light-200 text-light-600 text-sm rounded-full transition-all duration-200 hover:scale-105"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-accent-blue to-accent-blue/70 text-white shadow-md shadow-accent-blue/30'
                    : 'bg-gradient-to-br from-accent-green to-accent-green/70 text-white shadow-md shadow-accent-green/30'
                }`}
              >
                <span className="text-sm font-semibold">{message.role === 'user' ? 'U' : 'AI'}</span>
              </div>
              <div
                className={`max-w-[85%] ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-accent-blue to-accent-blue/80 text-white rounded-2xl rounded-br-md shadow-lg shadow-accent-blue/20'
                    : 'bg-light-50 text-light-800 rounded-2xl rounded-bl-md border border-light-100'
                } px-6 py-4`}
              >
                <p
                  className="text-base leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                />
              </div>
            </div>
          ))
        )}

        {/* Streaming response */}
        {streamingResponse && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-accent-green to-accent-green/70 text-white shadow-md shadow-accent-green/30">
              <span className="text-sm font-semibold">AI</span>
            </div>
            <div className="max-w-[85%] bg-light-50 text-light-800 rounded-2xl rounded-bl-md border border-light-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <span
                  className="text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatMessage(streamingResponse) }}
                />
                <Loader2 className="w-5 h-5 animate-spin text-light-400" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-5 border-t border-light-100 bg-light-50">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入您的问题，例如：BTC现在多少钱？"
              className="w-full px-5 py-4 bg-white border border-light-200 rounded-2xl text-base resize-none focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all shadow-sm"
              rows={2}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-5 py-4 bg-gradient-to-r from-accent-blue to-accent-blue/80 hover:from-accent-blue/90 hover:to-accent-blue/70 disabled:bg-light-300 disabled:cursor-not-allowed text-white rounded-2xl transition-all duration-200 flex items-center gap-2 shadow-lg shadow-accent-blue/30 hover:shadow-xl"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
