/**
 * 悬浮AI助手组件
 * 
 * 在屏幕右下角显示一个聊天图标，点击弹出AI对话窗口
 * 用户可以问："为什么刚才建议止损在 $2,200？"
 * 支持拖拽调整窗口大小
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { askAgentStream } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function FloatingAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '您好！我是您的AI交易助手。有什么可以帮您分析的吗？比如："为什么建议止损在某个价位？" 或 "当前市场情绪如何？"'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 400, height: 500 });
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startDimRef = useRef({ width: 0, height: 0 });

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 处理拖拽调整大小
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startDimRef.current = { width: dimensions.width, height: dimensions.height };
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;

      // 从左上角拖拽，向右下拖动增加尺寸
      const newWidth = Math.min(Math.max(startDimRef.current.width + deltaX, 320), 600);
      const newHeight = Math.min(Math.max(startDimRef.current.height + deltaY, 400), 700);

      setDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // 创建流式消息ID
    const assistantMessageId = (Date.now() + 1).toString();
    
    // 添加一个空的助手消息用于流式更新
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: ''
    }]);

    try {
      // 使用封装的API进行流式请求
      const response = await askAgentStream(input.trim(), messages.map(m => ({ role: m.role, content: m.content })));
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No readable stream');
      }

      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      const readChunk = () => {
        reader.read().then(({ done, value }) => {
          if (done) {
            setIsLoading(false);
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          
          // 解析SSE格式的数据
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const chunk = line.slice(6);
              
              if (chunk === '[END]') {
                setIsLoading(false);
                return;
              }

              // 更新消息内容
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              ));
            }
          }

          readChunk();
        }).catch(error => {
          console.error('Error reading stream:', error);
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: '抱歉，连接服务器时出现问题，请稍后重试。' }
              : msg
          ));
          setIsLoading(false);
        });
      };

      readChunk();
      } catch (error) {
        console.error('Error:', error);
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: '抱歉，连接服务器时出现问题，请稍后重试。' }
            : msg
        ));
        setIsLoading(false);
      }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 hover:scale-110"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {/* 聊天窗口 */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-end p-6">
          {/* 点击外部关闭 */}
          <div 
            className="absolute inset-0" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* 聊天面板 */}
          <div 
            ref={panelRef}
            className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
              isResizing ? 'cursor-se-resize' : ''
            }`}
            style={{ 
              zIndex: 1,
              width: dimensions.width,
              height: dimensions.height,
              maxWidth: '90vw',
              maxHeight: '90vh'
            }}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 bg-accent-blue">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-semibold">AI 交易助手</h3>
                  <p className="text-white/70 text-xs">实时分析 · 智能问答</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-light-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* 头像 */}
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-accent-blue text-white' 
                      : 'bg-accent-green/10 text-accent-green'
                  }`}>
                    {message.role === 'user' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    )}
                  </div>
                  
                  {/* 消息内容 */}
                  <div className={`max-w-[75%] ${message.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`px-4 py-2 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-accent-blue text-white rounded-br-md'
                        : 'bg-white text-light-800 rounded-bl-md border border-light-200'
                    }`}>
                      {!message.content && isLoading && message.role === 'assistant' ? (
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-accent-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-accent-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-accent-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入框 */}
            <div className="p-4 border-t border-light-200 bg-white">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入您的问题，例如：为什么建议止损在 $2,200？"
                  className="flex-1 px-4 py-3 bg-light-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/30 transition-all"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className={`px-5 py-3 rounded-xl font-medium text-sm transition-all ${
                    input.trim() && !isLoading
                      ? 'bg-accent-blue text-white hover:bg-accent-blue/90'
                      : 'bg-light-200 text-light-400 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 调整大小手柄 */}
            <div
              className="absolute top-0 left-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center bg-accent-blue/10 rounded-br-lg hover:bg-accent-blue/20 transition-colors"
              onMouseDown={handleResizeStart}
              title="拖拽调整大小"
            >
              <svg className="w-4 h-4 text-accent-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
