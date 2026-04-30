"""
LangChain Agent 服务模块
封装加密货币交易分析的智能代理功能
"""

import os
from typing import Any, Dict, List, Optional

# 导入现有的工具函数
from tools.okx_price_tool import get_price_tool, get_kline_tool
from agent import calculate_technical_indicators


def _generate_analysis_summary(symbol: str, data: Dict[str, Any]) -> str:
    """
    生成分析摘要
    """
    price = data.get("price", 0)
    change = data.get("changePercent24h", 0)
    indicators = data.get("indicators", {})
    
    rsi = indicators.get("rsi")
    macd = indicators.get("macd")
    macd_signal = indicators.get("macd_signal")
    
    summary = f"## {symbol} 分析报告\n\n"
    summary += f"- 当前价格: ${price:,.2f}\n"
    summary += f"- 24小时涨跌幅: {change:+.2f}%\n\n"
    summary += "### 技术指标:\n"
    
    if rsi:
        rsi_status = "超卖" if rsi < 30 else "超买" if rsi > 70 else "中性"
        summary += f"- RSI({rsi:.1f}): {rsi_status}\n"
    
    if macd and macd_signal:
        macd_status = "金叉（看涨）" if macd > macd_signal else "死叉（看跌）"
        summary += f"- MACD({macd:.4f} vs {macd_signal:.4f}): {macd_status}\n"
    
    if "sma_7" in indicators and "sma_20" in indicators:
        summary += f"- 7日均线: ${indicators['sma_7']:.2f}\n"
        summary += f"- 20日均线: ${indicators['sma_20']:.2f}\n"
    
    if "bollinger_upper" in indicators and "bollinger_lower" in indicators:
        summary += f"- 布林带区间: ${indicators['bollinger_lower']:.2f} - ${indicators['bollinger_upper']:.2f}\n"
    
    return summary


class CryptoAnalysisAgent:
    """
    加密货币分析智能代理
    使用规则引擎实现，支持上下文记忆功能
    """
    
    def __init__(self):
        """
        初始化 Agent
        """
        self.chat_history = []
        self.current_symbol = None  # 当前关注的币种（用于上下文理解）
    
    def run(self, query: str, chat_history: Optional[List] = None) -> str:
        """
        运行 Agent，处理用户查询
        
        参数:
            query: 用户查询文本
            chat_history: 可选的历史对话记录
        
        返回:
            分析结果字符串
        """
        # 合并传入的历史和已存储的历史
        combined_history = []
        if chat_history:
            combined_history.extend(chat_history)
        combined_history.extend(self.chat_history)
        
        # 将当前查询加入临时历史用于分析
        temp_history = combined_history.copy()
        temp_history.append({"role": "user", "content": query})
        
        query_lower = query.lower().strip()
        
        # 提取币种名称（先从当前查询提取，若未找到则从历史记录中查找）
        symbols = ["BTC", "ETH", "SOL", "DOGE", "AVAX", "MATIC", "BNB", "XRP", "ADA"]
        detected_symbol = None
        
        # 1. 优先从当前查询中提取币种
        for symbol in symbols:
            if symbol.lower() in query_lower or symbol in query:
                detected_symbol = symbol
                self.current_symbol = symbol  # 更新当前关注币种
                break
        
        # 2. 如果当前查询没有明确币种，检查是否有指代性词汇（如"它"、"这个"、"继续"等）
        if detected_symbol is None:
            referential_words = ["它", "这个", "这个币", "继续", "刚才", "之前", "走势"]
            if any(word in query for word in referential_words):
                # 先检查传入的chat_history
                if chat_history:
                    for msg in reversed(chat_history):
                        for symbol in symbols:
                            if symbol.lower() in msg.get("content", "").lower() or symbol in msg.get("content", ""):
                                detected_symbol = symbol
                                self.current_symbol = symbol
                                break
                        if detected_symbol:
                            break
                # 如果传入的历史中没找到，检查已存储的历史
                if not detected_symbol and self.current_symbol:
                    detected_symbol = self.current_symbol
        
        # 3. 如果还是没有找到，尝试从所有历史对话中提取
        if detected_symbol is None:
            for msg in reversed(temp_history[:-1]):  # 排除当前查询
                for symbol in symbols:
                    if symbol.lower() in msg.get("content", "").lower() or symbol in msg.get("content", ""):
                        detected_symbol = symbol
                        self.current_symbol = symbol
                        break
                if detected_symbol:
                    break
        
        if detected_symbol:
            result = self._analyze_symbol(detected_symbol, query)
        else:
            result = self._handle_general_query(query)
        
        # 更新已存储的历史
        self.chat_history.append({"role": "user", "content": query})
        self.chat_history.append({"role": "assistant", "content": result})
        
        return result
    
    def _analyze_symbol(self, symbol: str, query: str) -> str:
        """
        分析指定币种
        """
        query_lower = query.lower()
        
        # 获取价格数据
        price_result = get_price_tool(symbol)
        if not price_result["success"]:
            return f"无法获取 {symbol} 的价格数据"
        
        price_data = price_result["data"]
        price = price_data.get("price", 0)
        change = price_data.get("changePercent24h", 0)
        
        result = f"## {symbol} 实时分析\n\n"
        result += f"- 当前价格: **${price:,.2f}**\n"
        result += f"- 24小时涨跌幅: {change:+.2f}%\n"
        
        # 是否需要技术指标
        if "指标" in query or "分析" in query or "走势" in query:
            kline_result = get_kline_tool(symbol, "1H")
            if kline_result["success"]:
                indicators = calculate_technical_indicators(kline_result["data"])
                result += "\n### 技术指标:\n"
                
                rsi = indicators.get("rsi")
                if rsi:
                    rsi_status = "超卖" if rsi < 30 else "超买" if rsi > 70 else "中性"
                    result += f"- RSI({rsi:.1f}): {rsi_status}\n"
                
                macd = indicators.get("macd")
                macd_signal = indicators.get("macd_signal")
                if macd and macd_signal:
                    macd_status = "金叉（看涨）" if macd > macd_signal else "死叉（看跌）"
                    result += f"- MACD: {macd_status}\n"
                
                if "sma_7" in indicators:
                    result += f"- 7日均线: ${indicators['sma_7']:.2f}\n"
                if "sma_20" in indicators:
                    result += f"- 20日均线: ${indicators['sma_20']:.2f}\n"
        
        return result
    
    def _handle_general_query(self, query: str) -> str:
        """
        处理通用查询
        """
        return f"""
您的问题: {query}

我可以帮助您查询加密货币的实时价格和技术指标分析。

**支持查询的币种:**
- BTC (比特币)
- ETH (以太坊)
- SOL (Solana)
- DOGE (狗狗币)
- AVAX (Avalanche)
- MATIC (Polygon)

**示例问题:**
- "BTC现在多少钱？"
- "分析ETH的走势"
- "SOL的RSI指标是多少？"
- "AVAX技术分析"
"""
    
    def clear_memory(self):
        """
        清除对话记忆
        """
        self.chat_history = []
        self.current_symbol = None


# 创建全局单例
_agent_instance = None

def get_crypto_agent() -> CryptoAnalysisAgent:
    """
    获取全局单例 Agent 实例
    
    返回:
        CryptoAnalysisAgent 实例
    """
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = CryptoAnalysisAgent()
    return _agent_instance
