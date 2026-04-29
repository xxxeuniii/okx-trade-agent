# -*- coding: utf-8 -*-
import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

from services.llm_service import get_llm_service

print('=== 环境变量检查 ===')
for key in os.environ:
    if 'ANTHROPIC' in key:
        value = os.environ[key]
        masked = value[:20] + '...' if len(value) > 20 else value
        print(f'{key}: {masked}')

print('\n=== 测试LLM服务 ===')
try:
    llm = get_llm_service()
    print('[OK] LLM服务初始化成功')
    print(f'  Base URL: {llm.base_url}')
    print(f'  Model: {llm.model}')
    
    price_data = {'price': 76000, 'changePercent24h': 2.5}
    indicators = {
        'rsi': 55, 
        'macd': 120.5, 
        'macd_signal': 118.3, 
        'sma_7': 75500, 
        'sma_20': 74800, 
        'bollinger_upper': 77000, 
        'bollinger_lower': 73000, 
        'volume_change': 30, 
        'volatility': 1.8
    }
    
    result = llm.generate_trading_signal(price_data, indicators)
    print('\n[OK] 大模型调用成功!')
    print(f'  信号: {result["signal"]}')
    print(f'  置信度: {result["confidence"]}')
    print(f'  分析原因:')
    for i, reason in enumerate(result['reason'], 1):
        print(f'    {i}. {reason}')
        
except Exception as e:
    print(f'[ERROR] 错误: {e}')
    import traceback
    traceback.print_exc()