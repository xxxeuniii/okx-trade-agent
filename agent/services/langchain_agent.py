"""
LangChain Agent 服务模块
封装加密货币交易分析的智能代理功能
"""

import os
from typing import Any, Dict, List, Optional
from langchain_core.tools import tool
from langchain_anthropic import ChatAnthropic
from langchain.agents import create_structured_chat_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferMemory
from langchain_core.messages import AIMessage, HumanMessage

# 导入现有的工具函数
from tools.okx_price_tool import get_price_tool, get_kline_tool
from agent import calculate_technical_indicators


@tool
def get_crypto_price(symbol: str) -> Dict[str, Any]:
    """
    获取指定加密货币的实时价格
    
    参数:
        symbol: 加密货币代码，如 BTC、ETH、SOL 等
    
    返回:
        包含价格和涨跌幅信息的字典
    """
    result = get_price_tool(symbol)
    if result["success"]:
        return {
            "symbol": symbol,
            "price": result["data"].get("price", 0),
            "change24h": result["data"].get("changePercent24h", 0),
            "high24h": result["data"].get("high24h", 0),
            "low24h": result["data"].get("low24h", 0),
            "volume24h": result["data"].get("volume24h", 0)
        }
    return {"error": f"无法获取 {symbol} 的价格数据"}


@tool
def get_crypto_kline(symbol: str, timeframe: str = "1H") -> Dict[str, Any]:
    """
    获取指定加密货币的K线数据
    
    参数:
        symbol: 加密货币代码，如 BTC、ETH、SOL 等
        timeframe: K线时间周期，支持 1m、5m、15m、1H、4H、1D、1W 等
    
    返回:
        包含K线数据和技术指标的字典
    """
    result = get_kline_tool(symbol, timeframe)
    if result["success"]:
        kline_data = result["data"]
        indicators = calculate_technical_indicators(kline_data)
        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "kline_count": len(kline_data),
            "indicators": indicators
        }
    return {"error": f"无法获取 {symbol} 的K线数据"}


@tool
def analyze_crypto(symbol: str, timeframe: str = "1H") -> Dict[str, Any]:
    """
    综合分析指定加密货币，包括价格、技术指标和交易信号
    
    参数:
        symbol: 加密货币代码，如 BTC、ETH、SOL 等
        timeframe: K线时间周期，支持 1m、5m、15m、1H、4H、1D、1W 等
    
    返回:
        包含完整分析结果的字典
    """
    # 获取价格数据
    price_result = get_price_tool(symbol)
    if not price_result["success"]:
        return {"error": f"无法获取 {symbol} 的价格数据"}
    
    price_data = price_result["data"]
    
    # 获取K线数据和技术指标
    kline_result = get_kline_tool(symbol, timeframe)
    if kline_result["success"]:
        indicators = calculate_technical_indicators(kline_result["data"])
        price_data["indicators"] = indicators
    
    return {
        "symbol": symbol,
        "timeframe": timeframe,
        "price": price_data.get("price", 0),
        "change24h": price_data.get("changePercent24h", 0),
        "indicators": price_data.get("indicators", {}),
        "analysis": _generate_analysis_summary(symbol, price_data)
    }


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
    使用 LangChain 构建，支持自然语言查询和工具调用
    """
    
    def __init__(self):
        """
        初始化 Agent
        """
        # 配置大模型
        self.llm = self._init_llm()
        
        # 定义工具列表
        self.tools = [
            get_crypto_price,
            get_crypto_kline,
            analyze_crypto
        ]
        
        # 创建 Agent
        self.agent = self._create_agent()
        
        # 创建记忆系统
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        
        # 创建 Agent 执行器
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            memory=self.memory,
            verbose=True,
            handle_parsing_errors=True
        )
    
    def _init_llm(self):
        """
        初始化大语言模型
        """
        api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN")
        base_url = os.getenv("ANTHROPIC_BASE_URL", "https://open.bigmodel.cn/api/anthropic")
        model = os.getenv("ANTHROPIC_MODEL", "glm-4.5-flash")
        
        if not api_key:
            raise ValueError("环境变量 ANTHROPIC_API_KEY 或 ANTHROPIC_AUTH_TOKEN 未设置")
        
        return ChatAnthropic(
            anthropic_api_key=api_key,
            base_url=base_url,
            model_name=model,
            temperature=0.7
        )
    
    def _create_agent(self):
        """
        创建结构化聊天 Agent
        """
        # 系统提示词
        system_prompt = """
        你是一位专业的加密货币量化交易分析师，精通技术分析和市场趋势判断。
        
        ## 你的任务
        基于用户的查询，使用提供的工具获取实时数据，并给出专业的分析建议。
        
        ## 可用工具
        1. get_crypto_price - 获取加密货币实时价格
        2. get_crypto_kline - 获取K线数据和技术指标
        3. analyze_crypto - 综合分析加密货币
        
        ## 分析框架
        - RSI < 30: 超卖，可能反弹
        - RSI > 70: 超买，可能回调
        - MACD金叉: 看涨信号
        - MACD死叉: 看跌信号
        - 价格站上均线: 看涨
        - 价格跌破均线: 看跌
        
        ## 输出要求
        - 使用中文回复
        - 提供清晰的分析和建议
        - 引用具体的数据支持你的观点
        - 如果无法回答，诚实说明
        """
        
        # 创建提示模板
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        # 创建 Agent
        return create_structured_chat_agent(self.llm, self.tools, prompt)
    
    def run(self, query: str, chat_history: Optional[List] = None) -> str:
        """
        运行 Agent，处理用户查询
        
        参数:
            query: 用户查询文本
            chat_history: 可选的历史对话记录
        
        返回:
            分析结果字符串
        """
        # 如果提供了历史记录，更新 memory
        if chat_history:
            for message in chat_history:
                if message.get("role") == "user":
                    self.memory.chat_memory.add_user_message(message["content"])
                elif message.get("role") == "assistant":
                    self.memory.chat_memory.add_ai_message(message["content"])
        
        try:
            result = self.agent_executor.invoke({"input": query})
            return result.get("output", "无法生成分析结果")
        except Exception as e:
            print(f"Agent执行失败: {e}")
            return f"分析失败: {str(e)}"
    
    def clear_memory(self):
        """
        清除对话记忆
        """
        self.memory.clear()


# 创建全局单例
_agent_instance = None

def get_crypto_agent() -> CryptoAnalysisAgent:
    """
    获取加密货币分析 Agent 单例
    
    返回:
        CryptoAnalysisAgent 实例
    """
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = CryptoAnalysisAgent()
    return _agent_instance
