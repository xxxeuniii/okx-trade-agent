"""
大语言模型服务模块 - 基于 LangChain

使用 LangChain 框架封装大语言模型调用，提供交易信号分析和风险控制功能。
"""

import os
from typing import Optional, Dict, Any
from langchain_anthropic import ChatAnthropic
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field


class TradingSignal(BaseModel):
    """
    交易信号输出模型
    用于指导 LangChain 解析大模型响应
    """
    signal: str = Field(description="交易信号，可选值: BUY、SELL、NEUTRAL")
    confidence: float = Field(description="信号置信度，范围 0.0-1.0")
    reason: list = Field(description="分析原因列表，包含3条详细原因")


class RiskManagement(BaseModel):
    """
    风险控制输出模型
    用于指导 LangChain 解析大模型响应
    """
    entryPrice: float = Field(description="建议入场价格")
    stopLoss: float = Field(description="建议止损价格")
    takeProfit: float = Field(description="建议止盈价格")
    riskRewardRatio: float = Field(description="风险收益比")
    positionSize: str = Field(description="建议仓位大小，可选值: 观望、轻仓、中仓")
    maxLossPercent: float = Field(description="最大亏损百分比")
    volatilityLevel: str = Field(description="波动率水平，可选值: 低、中、高、未知")
    riskScore: int = Field(description="风险评分，范围 0-100")
    notes: list = Field(description="执行提示列表")


class LLMService:
    """
    大语言模型服务类 - LangChain 实现
    
    使用 LangChain 框架封装智谱(GLM)大模型，提供交易信号分析和风险控制功能。
    """

    def __init__(self):
        """
        初始化LLM服务
        从环境变量读取API配置，使用 LangChain ChatAnthropic 封装
        """
        # 从环境变量获取配置
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN")
        self.base_url = os.getenv("ANTHROPIC_BASE_URL", "https://open.bigmodel.cn/api/anthropic")
        self.model = os.getenv("ANTHROPIC_MODEL", "glm-4.5-flash")
        self.llm = None
        
        # 初始化 LangChain ChatAnthropic
        if self.api_key:
            try:
                self.llm = ChatAnthropic(
                    anthropic_api_key=self.api_key,
                    base_url=self.base_url,
                    model=self.model,
                    temperature=0.7,
                    max_tokens=2048
                )
                print(f"[INFO] LangChain ChatAnthropic initialized successfully, model: {self.model}")
            except Exception as e:
                print(f"[ERROR] LangChain initialization failed: {e}")
                self.llm = None
        else:
            print("[WARN] ANTHROPIC_API_KEY not set, fallback to local rules")

    def generate_trading_signal(self, price_data: dict, indicators: dict) -> dict:
        """
        使用 LangChain 调用大模型生成交易信号
        
        参数:
            price_data: 包含价格信息的字典
            indicators: 包含技术指标的字典
            
        返回:
            包含信号类型、置信度和分析原因的字典
        """
        # 如果 LangChain 未初始化，使用本地规则降级
        if not self.llm:
            return self._get_fallback_signal(indicators)
            
        try:
            # 1. 构建输出解析器（使用 LangChain JsonOutputParser）
            parser = JsonOutputParser(pydantic_object=TradingSignal)
            
            # 2. 构建提示词模板
            prompt = self._build_trading_signal_prompt(price_data, indicators, parser)
            
            # 3. 创建 LangChain Chain（提示词 + LLM + 解析器）
            chain = prompt | self.llm | parser
            
            # 4. 执行 Chain 获取结果
            result = chain.invoke({})
            
            # 5. 验证和处理结果
            return self._validate_trading_signal(result)
            
        except Exception as e:
            print(f"[ERROR] LangChain trading signal generation failed: {e}")
            return self._get_fallback_signal(indicators)

    def generate_risk_management(self, price_data: dict, signal_data: dict) -> Optional[dict]:
        """
        使用 LangChain 调用大模型生成风险控制方案
        
        参数:
            price_data: 包含价格信息的字典
            signal_data: 包含交易信号的字典
            
        返回:
            风险控制方案字典，模型不可用时返回 None
        """
        if not self.llm:
            print("[WARN] AI risk management unavailable: LangChain not initialized")
            return None

        try:
            # 1. 构建输出解析器
            parser = JsonOutputParser(pydantic_object=RiskManagement)
            
            # 2. 构建提示词模板
            prompt = self._build_risk_management_prompt(price_data, signal_data, parser)
            
            # 3. 创建 LangChain Chain
            chain = prompt | self.llm | parser
            
            # 4. 执行 Chain 获取结果
            result = chain.invoke({})
            
            # 5. 验证和处理结果
            return self._validate_risk_management(result)
            
        except Exception as e:
            print(f"[ERROR] LangChain risk management generation failed: {e}")
            return None

    def _build_trading_signal_prompt(self, price_data: dict, indicators: dict, parser: JsonOutputParser) -> ChatPromptTemplate:
        """
        构建交易信号分析的 LangChain 提示词模板
        """
        price = price_data.get("price", 0)
        change_percent = price_data.get("changePercent24h", 0)
        
        rsi = indicators.get("rsi")
        macd = indicators.get("macd")
        macd_signal = indicators.get("macd_signal")
        sma_7 = indicators.get("sma_7")
        sma_20 = indicators.get("sma_20")
        bollinger_upper = indicators.get("bollinger_upper")
        bollinger_lower = indicators.get("bollinger_lower")
        volume_change = indicators.get("volume_change")
        volatility = indicators.get("volatility")

        # 定义系统提示词
        system_prompt = """
你是一位专业的加密货币量化交易分析师。请基于给定的市场数据和技术指标，进行深度分析并给出精准的交易建议。

## 分析框架

### 买点判断条件（满足越多，买入信号越强）：
1. RSI < 30（超卖区域）
2. MACD线从下向上穿越信号线（金叉）
3. 价格站上短期均线（如7日均线）
4. 价格触及或突破布林带下轨后反弹
5. 成交量萎缩后突然放量上涨

### 卖点判断条件（满足越多，卖出信号越强）：
1. RSI > 70（超买区域）
2. MACD线从上向下穿越信号线（死叉）
3. 价格跌破短期均线（如7日均线）
4. 价格触及或突破布林带上轨后回落
5. 成交量放大但价格不涨（量价背离）

### 观望条件：
- 指标信号矛盾或不明确
- 市场处于震荡区间
- 等待更多确认信号

## 任务要求
1. **深度分析**：综合所有指标，判断当前市场处于什么阶段
2. **信号判断**：给出明确的交易信号：BUY（买入）、SELL（卖出）或 NEUTRAL（观望）
3. **置信度评估**：给出信号的置信度（0.0-1.0），需要考虑多指标的一致性
4. **详细原因**：提供3条详细的分析原因，每条原因必须引用具体指标数据
"""

        # 定义用户提示词模板
        user_prompt = """
## 当前市场数据
- 当前价格: ${price:,.2f}
- 24小时涨跌幅: {change_percent:+.2f}%

## 技术指标
- RSI(14): {rsi:.1f}
- MACD: {macd:.4f}
- MACD信号线: {macd_signal:.4f}
- 7日均线: ${sma_7:.2f}
- 20日均线: ${sma_20:.2f}
- 布林带上轨: ${bollinger_upper:.2f}
- 布林带下轨: ${bollinger_lower:.2f}
- 成交量变化: {volume_change:+.1f}%
- 波动率: {volatility:.2f}%

## 输出格式要求
{format_instructions}
"""

        # 创建 ChatPromptTemplate
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt.strip()),
            ("user", user_prompt)
        ])

        # 绑定格式指令和数据
        return prompt.partial(
            format_instructions=parser.get_format_instructions(),
            price=price,
            change_percent=change_percent,
            rsi=rsi if rsi else 50,
            macd=macd if macd else 0,
            macd_signal=macd_signal if macd_signal else 0,
            sma_7=sma_7 if sma_7 else 0,
            sma_20=sma_20 if sma_20 else 0,
            bollinger_upper=bollinger_upper if bollinger_upper else 0,
            bollinger_lower=bollinger_lower if bollinger_lower else 0,
            volume_change=volume_change if volume_change else 0,
            volatility=volatility if volatility else 0
        )

    def _build_risk_management_prompt(self, price_data: dict, signal_data: dict, parser: JsonOutputParser) -> ChatPromptTemplate:
        """
        构建风险控制分析的 LangChain 提示词模板
        """
        indicators = price_data.get("indicators", {}) or {}

        def fmt(value, digits=2):
            if value is None:
                return "N/A"
            try:
                return f"{float(value):.{digits}f}"
            except (TypeError, ValueError):
                return "N/A"

        system_prompt = """
你是一位专业的加密货币交易风控分析师。请只基于给定市场数据、技术指标和AI交易信号，生成风险控制方案。

重要要求：
1. 风控结论必须由你综合判断，不要套用固定模板
2. 如果当前信号不适合开仓，可以将 positionSize 设为"观望"，但仍需要给出观察用的关键价格边界
3. 止损、止盈、仓位、风险评分需要结合支撑阻力、波动率、置信度和信号方向综合判断
4. 结果仅用于风险辅助，不要承诺收益
"""

        user_prompt = """
## 市场数据
- 当前价格: {price}
- 24小时涨跌幅: {changePercent}%

## AI交易信号
- signal: {signal}
- confidence: {confidence}
- reason: {reason}

## 技术指标
- RSI(14): {rsi}
- MACD: {macd}
- MACD signal: {macd_signal}
- SMA 7: {sma_7}
- SMA 20: {sma_20}
- SMA 50: {sma_50}
- Bollinger upper: {bollinger_upper}
- Bollinger middle: {bollinger_middle}
- Bollinger lower: {bollinger_lower}
- Volume change: {volume_change}%
- Volatility: {volatility}%

## 输出格式要求
{format_instructions}
"""

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt.strip()),
            ("user", user_prompt)
        ])

        return prompt.partial(
            format_instructions=parser.get_format_instructions(),
            price=fmt(price_data.get("price"), 4),
            changePercent=fmt(price_data.get("changePercent24h"), 2),
            signal=signal_data.get("signal", "NEUTRAL"),
            confidence=fmt(signal_data.get("confidence"), 2),
            reason=str(signal_data.get("reason", [])),
            rsi=fmt(indicators.get("rsi"), 2),
            macd=fmt(indicators.get("macd"), 4),
            macd_signal=fmt(indicators.get("macd_signal"), 4),
            sma_7=fmt(indicators.get("sma_7"), 4),
            sma_20=fmt(indicators.get("sma_20"), 4),
            sma_50=fmt(indicators.get("sma_50"), 4),
            bollinger_upper=fmt(indicators.get("bollinger_upper"), 4),
            bollinger_middle=fmt(indicators.get("bollinger_middle"), 4),
            bollinger_lower=fmt(indicators.get("bollinger_lower"), 4),
            volume_change=fmt(indicators.get("volume_change"), 2),
            volatility=fmt(indicators.get("volatility"), 2)
        )

    def _validate_trading_signal(self, result: Dict[str, Any]) -> dict:
        """
        验证和处理交易信号结果
        """
        try:
            # 验证必要字段
            if "signal" not in result or "confidence" not in result or "reason" not in result:
                raise ValueError("响应格式不完整")
            
            # 验证信号类型
            if result["signal"] not in ["BUY", "SELL", "NEUTRAL"]:
                result["signal"] = "NEUTRAL"
            
            # 限制置信度范围
            result["confidence"] = max(0.3, min(0.95, float(result["confidence"])))
            
            # 确保原因列表格式正确
            if not isinstance(result["reason"], list):
                result["reason"] = [str(result["reason"])]
            
            # 确保有3条原因
            while len(result["reason"]) < 3:
                result["reason"].append("等待更多信号确认")
            
            return result
            
        except Exception as e:
            print(f"[ERROR] Trading signal validation failed: {e}")
            return self._get_fallback_signal({})

    def _validate_risk_management(self, result: Dict[str, Any]) -> Optional[dict]:
        """
        验证和处理风险控制结果
        """
        try:
            required = [
                "entryPrice", "stopLoss", "takeProfit", "riskRewardRatio",
                "positionSize", "maxLossPercent", "volatilityLevel",
                "riskScore", "notes"
            ]
            if any(field not in result for field in required):
                raise ValueError("风控响应字段不完整")

            # 验证枚举值
            if result["positionSize"] not in ["观望", "轻仓", "中仓"]:
                result["positionSize"] = "观望"
            if result["volatilityLevel"] not in ["低", "中", "高", "未知"]:
                result["volatilityLevel"] = "未知"

            # 格式化数值字段
            for field in ["entryPrice", "stopLoss", "takeProfit", "riskRewardRatio", "maxLossPercent"]:
                digits = 4 if field in ["entryPrice", "stopLoss", "takeProfit"] else 2
                result[field] = round(float(result[field]), digits)

            # 限制风险评分范围
            result["riskScore"] = int(max(0, min(100, float(result["riskScore"]))))
            
            # 确保notes是列表
            if not isinstance(result["notes"], list):
                result["notes"] = [str(result["notes"])]
            result["notes"] = [str(note) for note in result["notes"][:4]]

            return result
            
        except Exception as e:
            print(f"[ERROR] Risk management validation failed: {e}")
            return None

    def _get_fallback_signal(self, indicators: dict) -> dict:
        """
        获取降级信号（当 LangChain 调用失败时使用）
        基于本地规则生成交易信号
        """
        rsi = indicators.get("rsi")
        macd = indicators.get("macd")
        macd_signal = indicators.get("macd_signal")
        
        confidence = 0.5
        reasons = []
        
        if rsi:
            if rsi < 30:
                reasons.append(f"RSI({rsi:.1f})进入超卖区域")
                confidence += 0.15
            elif rsi > 70:
                reasons.append(f"RSI({rsi:.1f})进入超买区域")
                confidence -= 0.15
        
        if macd and macd_signal:
            if macd > macd_signal:
                reasons.append("MACD形成金叉")
                confidence += 0.1
            else:
                reasons.append("MACD形成死叉")
                confidence -= 0.1
        
        # 添加默认原因
        while len(reasons) < 3:
            reasons.append("等待更多信号确认")
        
        confidence = max(0.3, min(0.95, confidence))
        
        if confidence >= 0.65:
            signal = "BUY"
        elif confidence <= 0.35:
            signal = "SELL"
        else:
            signal = "NEUTRAL"
        
        return {
            "signal": signal,
            "confidence": round(confidence, 2),
            "reason": reasons[:3]
        }


# 创建单例实例
_llm_service = None


def get_llm_service() -> LLMService:
    """
    获取LLM服务单例
    
    返回:
        LLMService实例（基于LangChain实现）
    """
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
