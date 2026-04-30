"""
LangChain Agent 服务模块 - 基于 LangChain 框架

封装加密货币交易分析的智能代理功能，使用 LangChain 框架实现。
"""

import os
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field

# LangChain 核心组件
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import StructuredTool
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser

# 导入现有的工具函数
from tools.okx_price_tool import get_price_tool, get_kline_tool
from agent import calculate_technical_indicators


class PriceToolArgs(BaseModel):
    """价格查询工具参数模型"""
    symbol: str = Field(description="加密货币代码，如 BTC、ETH、SOL")


class KlineToolArgs(BaseModel):
    """K线数据查询工具参数模型"""
    symbol: str = Field(description="加密货币代码，如 BTC、ETH、SOL")
    timeframe: str = Field(description="时间周期，如 1H、4H、1D")


class CryptoAnalysisAgent:
    """
    加密货币分析智能代理 - LangChain 实现
    
    使用 LangChain 框架，具备以下能力：
    1. 自然语言理解用户意图
    2. 自动选择和调用工具获取数据
    3. 基于工具返回结果进行分析和总结
    4. 支持对话历史记忆
    """

    def __init__(self):
        """
        初始化 Agent
        创建 LangChain LLM 和工具
        """
        self.chat_history = []
        self.current_symbol = None
        self.llm = self._init_llm()

    def _init_llm(self):
        """
        初始化 LangChain LLM
        """
        api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN")
        base_url = os.getenv("ANTHROPIC_BASE_URL", "https://open.bigmodel.cn/api/anthropic")
        model = os.getenv("ANTHROPIC_MODEL", "glm-4.5-flash")

        if not api_key:
            print("[WARN] ANTHROPIC_API_KEY not set, will use simplified mode")
            return None

        try:
            llm = ChatAnthropic(
                anthropic_api_key=api_key,
                base_url=base_url,
                model=model,
                temperature=0.3,
                max_tokens=2048
            )
            print("[INFO] LangChain ChatAnthropic initialized successfully")
            return llm
        except Exception as e:
            print(f"[ERROR] LangChain initialization failed: {e}")
            return None

    def _get_price(self, symbol: str) -> dict:
        """
        获取指定加密货币的实时价格
        """
        result = get_price_tool(symbol)
        if result["success"]:
            data = result["data"]
            return {
                "symbol": symbol,
                "price": data.get("price"),
                "changePercent24h": data.get("changePercent24h"),
                "high24h": data.get("high24h"),
                "low24h": data.get("low24h"),
                "volume24h": data.get("volume24h")
            }
        return {"error": f"无法获取 {symbol} 的价格数据"}

    def _get_analysis(self, symbol: str, timeframe: str = "1H") -> dict:
        """
        获取指定加密货币的详细技术分析
        """
        # 获取价格数据
        price_result = get_price_tool(symbol)
        if not price_result["success"]:
            return {"error": f"无法获取 {symbol} 的价格数据"}

        price_data = price_result["data"]

        # 获取K线数据并计算技术指标
        kline_result = get_kline_tool(symbol, timeframe)
        if not kline_result["success"]:
            return {"error": f"无法获取 {symbol} 的K线数据"}

        indicators = calculate_technical_indicators(kline_result["data"])

        return {
            "symbol": symbol,
            "timeframe": timeframe,
            "price": price_data.get("price"),
            "changePercent24h": price_data.get("changePercent24h"),
            "indicators": indicators
        }

    def run(self, query: str, chat_history: Optional[List] = None) -> str:
        """
        运行 Agent，处理用户查询
        
        参数:
            query: 用户查询文本
            chat_history: 可选的历史对话记录
            
        返回:
            分析结果字符串
        """
        # 如果没有初始化 LLM，使用简化模式
        if not self.llm:
            return self._handle_simplified_mode(query, chat_history)

        try:
            # 准备对话历史
            messages = []
            if chat_history:
                for msg in chat_history[-10:]:
                    if msg.get("role") == "user":
                        messages.append(HumanMessage(content=msg["content"]))
                    elif msg.get("role") == "assistant":
                        messages.append(AIMessage(content=msg["content"]))

            # 构建提示词
            system_prompt = """
你是一位专业的加密货币分析师助手。你的任务是帮助用户获取加密货币的实时价格和技术分析。

支持的币种：BTC、ETH、SOL、DOGE、AVAX、MATIC、BNB、XRP、ADA

请直接回答用户的问题，不需要调用工具。如果用户询问价格或技术指标，你应该告诉用户这些信息需要通过数据分析获得。

回答要简洁明了，用中文回复。
"""

            prompt = ChatPromptTemplate.from_messages([
                ("system", system_prompt),
                ("placeholder", "{chat_history}"),
                ("human", "{input}")
            ])

            # 创建 Chain
            chain = prompt | self.llm | StrOutputParser()

            # 执行 Chain
            result = chain.invoke({
                "input": query,
                "chat_history": messages
            })

            # 更新历史
            self.chat_history.append({"role": "user", "content": query})
            self.chat_history.append({"role": "assistant", "content": result})

            return result

        except Exception as e:
            print(f"[ERROR] LangChain execution failed: {e}")
            return self._handle_simplified_mode(query, chat_history)

    def _handle_simplified_mode(self, query: str, chat_history: Optional[List] = None) -> str:
        """
        简化模式：当没有 API Key 时使用规则引擎处理查询
        """
        query_lower = query.lower().strip()
        symbols = ["BTC", "ETH", "SOL", "DOGE", "AVAX", "MATIC", "BNB", "XRP", "ADA"]

        # 检测币种
        detected_symbol = None
        for symbol in symbols:
            if symbol.lower() in query_lower or symbol in query:
                detected_symbol = symbol
                self.current_symbol = symbol
                break

        # 如果没有检测到币种，检查上下文或返回帮助信息
        if detected_symbol is None:
            referential_words = ["它", "这个", "这个币", "继续", "刚才", "之前", "走势"]
            if any(word in query for word in referential_words) and self.current_symbol:
                detected_symbol = self.current_symbol
            else:
                return self._get_help_message()

        # 获取数据并生成响应
        return self._generate_simple_response(detected_symbol, query)

    def _generate_simple_response(self, symbol: str, query: str) -> str:
        """
        生成简化模式下的响应
        """
        # 获取价格数据
        price_result = get_price_tool(symbol)
        if not price_result["success"]:
            return f"无法获取 {symbol} 的数据"

        price_data = price_result["data"]
        price = price_data.get("price", 0)
        change = price_data.get("changePercent24h", 0)

        result = f"## {symbol} 实时数据\n\n"
        result += f"- 当前价格: **${price:,.2f}**\n"
        result += f"- 24小时涨跌幅: {change:+.2f}%\n"

        # 是否需要技术指标
        if any(keyword in query for keyword in ["指标", "分析", "走势", "RSI", "MACD"]):
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

    def _get_help_message(self) -> str:
        """
        获取帮助信息
        """
        return """
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
        CryptoAnalysisAgent 实例（基于 LangChain 实现）
    """
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = CryptoAnalysisAgent()
    return _agent_instance
