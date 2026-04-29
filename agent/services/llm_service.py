import os
from anthropic import Anthropic, APIError
from typing import Optional

class LLMService:
    """
    大语言模型服务类
    用于接入智谱(GLM)大模型，生成交易信号分析
    """
    
    def __init__(self):
        """
        初始化LLM服务
        从环境变量读取API配置
        """
        # 从环境变量获取配置，支持多种环境变量名
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN")
        self.base_url = os.getenv("ANTHROPIC_BASE_URL", "https://open.bigmodel.cn/api/anthropic")
        self.model = os.getenv("ANTHROPIC_MODEL", "glm-4.5-flash")
        
        # 验证配置
        if not self.api_key:
            raise ValueError("环境变量 ANTHROPIC_API_KEY 或 ANTHROPIC_AUTH_TOKEN 未设置")
        
        # 初始化客户端
        self.client = Anthropic(
            api_key=self.api_key,
            base_url=self.base_url
        )
    
    def generate_trading_signal(self, price_data: dict, indicators: dict) -> dict:
        """
        调用大模型生成交易信号
        
        参数:
            price_data: 包含价格信息的字典
            indicators: 包含技术指标的字典
            
        返回:
            包含信号类型、置信度和分析原因的字典
        """
        try:
            # 构建提示词
            prompt = self._build_prompt(price_data, indicators)
            
            # 调用大模型
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                temperature=0.7,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            # 解析响应
            return self._parse_response(response)
            
        except APIError as e:
            print(f"大模型调用失败: {e}")
            return self._get_fallback_signal(indicators)
        except Exception as e:
            print(f"LLM服务异常: {e}")
            return self._get_fallback_signal(indicators)
    
    def _build_prompt(self, price_data: dict, indicators: dict) -> str:
        """
        构建大模型提示词
        
        参数:
            price_data: 价格数据
            indicators: 技术指标
            
        返回:
            格式化的提示词字符串
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
        
        prompt = f"""
你是一位专业的加密货币量化交易分析师。请基于以下市场数据和技术指标，进行深度分析并给出精准的交易建议。

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

## 分析框架
作为专业交易分析师，请按照以下框架进行分析：

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
4. **详细原因**：提供3条详细的分析原因，每条原因必须引用具体指标数据，并说明对买点/卖点的影响

## 输出格式
请使用JSON格式输出，包含以下字段：
- "signal": "BUY" | "SELL" | "NEUTRAL"
- "confidence": 0.0-1.0 的浮点数
- "reason": 包含3条分析原因的列表

## 示例输出
{{
    "signal": "BUY",
    "confidence": 0.85,
    "reason": [
        "RSI(28.5)进入超卖区域，表明下跌动能衰竭，反弹概率增加",
        "MACD(0.5234)上穿信号线(0.4891)形成金叉，看涨信号确认",
        "价格($42,500)站上7日均线($42,100)，短期趋势由跌转升"
    ]
}}

请直接输出JSON，不要包含其他内容。
"""
        
        return prompt.strip()
    
    def _parse_response(self, response) -> dict:
        """
        解析大模型响应
        
        参数:
            response: 大模型返回的响应对象
            
        返回:
            解析后的交易信号字典
        """
        try:
            content = response.content[0].text
            
            # 尝试提取JSON部分
            import json
            # 移除可能存在的markdown代码块标记
            content = content.replace("```json", "").replace("```", "").strip()
            result = json.loads(content)
            
            # 验证必要字段
            if "signal" not in result or "confidence" not in result or "reason" not in result:
                raise ValueError("响应格式不完整")
            
            # 验证信号类型
            if result["signal"] not in ["BUY", "SELL", "NEUTRAL"]:
                result["signal"] = "NEUTRAL"
            
            # 限制置信度范围
            result["confidence"] = max(0.3, min(0.95, float(result["confidence"])))
            
            return result
            
        except json.JSONDecodeError as e:
            print(f"JSON解析失败: {e}")
            return self._get_fallback_signal({})
        except Exception as e:
            print(f"响应解析异常: {e}")
            return self._get_fallback_signal({})
    
    def _get_fallback_signal(self, indicators: dict) -> dict:
        """
        获取降级信号（当大模型调用失败时使用）
        
        参数:
            indicators: 技术指标
            
        返回:
            默认的交易信号
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
llm_service = None

def get_llm_service() -> LLMService:
    """
    获取LLM服务单例
    
    返回:
        LLMService实例
    """
    global llm_service
    if llm_service is None:
        llm_service = LLMService()
    return llm_service
