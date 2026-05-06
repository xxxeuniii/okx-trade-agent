# 导入价格工具和市场数据工具
from tools.okx_price_tool import get_price_tool, get_market_data_tool, get_kline_tool
# 导入大模型服务
from services.llm_service import get_llm_service

def calculate_technical_indicators(kline_data: list) -> dict:
    """
    计算技术指标
    
    参数:
        kline_data: K线数据列表，每个元素包含 [时间, 开盘价, 最高价, 最低价, 收盘价, 成交量]
        
    返回:
        包含各项技术指标的字典
    """
    if len(kline_data) < 20:
        return {}
    
    # 提取收盘价和成交量
    closes = [float(kline[4]) for kline in kline_data]
    volumes = [float(kline[5]) for kline in kline_data]
    
    indicators = {}
    
    # 1. 简单移动平均线 (SMA)
    indicators['sma_7'] = sum(closes[-7:]) / 7
    indicators['sma_20'] = sum(closes[-20:]) / 20
    indicators['sma_50'] = sum(closes[-50:]) / 50 if len(closes) >= 50 else None
    
    # 2. 指数移动平均线 (EMA)
    def calculate_ema(data, period):
        if len(data) < period:
            return None
        multiplier = 2 / (period + 1)
        ema = sum(data[-period:]) / period
        for price in data[-period+1:]:
            ema = (price - ema) * multiplier + ema
        return ema
    
    indicators['ema_12'] = calculate_ema(closes, 12)
    indicators['ema_26'] = calculate_ema(closes, 26)
    
    # 3. MACD
    if indicators['ema_12'] and indicators['ema_26']:
        indicators['macd'] = indicators['ema_12'] - indicators['ema_26']
        # MACD信号线 (9周期EMA)
        recent_macd = []
        for i in range(-8, 1):
            if i == 0:
                recent_macd.append(indicators['macd'])
            else:
                prev_ema12 = calculate_ema(closes[:i], 12)
                prev_ema26 = calculate_ema(closes[:i], 26)
                if prev_ema12 and prev_ema26:
                    recent_macd.append(prev_ema12 - prev_ema26)
        if len(recent_macd) >= 9:
            indicators['macd_signal'] = calculate_ema(recent_macd, 9)
    
    # 4. 相对强弱指标 (RSI)
    def calculate_rsi(data, period=14):
        if len(data) < period + 1:
            return None
        gains = []
        losses = []
        for i in range(1, len(data)):
            change = data[i] - data[i-1]
            if change > 0:
                gains.append(change)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(change))
        
        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period
        
        if avg_loss == 0:
            return 100
        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))
    
    indicators['rsi'] = calculate_rsi(closes)
    
    # 5. 布林带
    if len(closes) >= 20:
        sma_20 = sum(closes[-20:]) / 20
        std_dev = (sum((c - sma_20) ** 2 for c in closes[-20:]) / 20) ** 0.5
        indicators['bollinger_upper'] = sma_20 + 2 * std_dev
        indicators['bollinger_middle'] = sma_20
        indicators['bollinger_lower'] = sma_20 - 2 * std_dev
    
    # 6. 成交量变化率
    if len(volumes) >= 7:
        recent_volume = sum(volumes[-7:]) / 7
        prev_volume = sum(volumes[-14:-7]) / 7
        indicators['volume_change'] = ((recent_volume - prev_volume) / prev_volume) * 100 if prev_volume != 0 else 0
    
    # 7. 价格波动率
    if len(closes) >= 14:
        daily_returns = [(closes[i] - closes[i-1]) / closes[i-1] for i in range(1, len(closes))]
        avg_return = sum(daily_returns[-14:]) / 14
        volatility = (sum((r - avg_return) ** 2 for r in daily_returns[-14:]) / 14) ** 0.5 * 100
        indicators['volatility'] = volatility
    
    return indicators


def generate_signal(price_data: dict) -> dict:
    """
    根据价格数据和技术指标生成AI交易信号
    使用智谱GLM-4.5-Flash大模型进行分析
    
    参数:
        price_data: 包含价格信息和技术指标的字典
        
    返回:
        包含信号类型、置信度、分析原因和技术指标的字典
    """
    indicators = price_data.get("indicators", {})
    
    try:
        # 获取LLM服务实例
        llm = get_llm_service()
        
        # 调用大模型生成交易信号
        result = llm.generate_trading_signal(price_data, indicators)
        
        return {
            "signal": result["signal"],
            "confidence": result["confidence"],
            "reason": result["reason"],
            "indicators": indicators
        }
    except Exception as e:
        print(f"大模型调用失败，使用本地规则: {e}")
        # 降级到本地规则
        return _generate_signal_fallback(price_data)


def calculate_risk_management(price_data: dict, signal_data: dict) -> dict:
    try:
        llm = get_llm_service()
        result = llm.generate_risk_management(price_data, signal_data)
        if result:
            return result
    except Exception as e:
        print(f"AI风控生成失败: {e}")
    
    # 降级方案：基于信号和价格生成默认风险控制
    price = price_data.get("price", 0)
    signal = signal_data.get("signal", "NEUTRAL")
    confidence = signal_data.get("confidence", 0.5)
    
    # 计算止损和止盈
    stop_loss = price * 0.98  # 默认2%止损
    take_profit = price * 1.02  # 默认2%止盈
    
    if signal == "BUY":
        stop_loss = price * (1 - 0.01 * (1 - confidence + 0.3))
        take_profit = price * (1 + 0.02 * (confidence + 0.3))
    elif signal == "SELL":
        stop_loss = price * (1 + 0.01 * (1 - confidence + 0.3))
        take_profit = price * (1 - 0.02 * (confidence + 0.3))
    
    return {
        "entryPrice": round(price, 2),
        "stopLoss": round(stop_loss, 2),
        "takeProfit": round(take_profit, 2),
        "riskRewardRatio": round(abs(take_profit - price) / abs(stop_loss - price), 2) if abs(stop_loss - price) > 0 else 1.0,
        "positionSize": "观望" if confidence < 0.5 else "轻仓" if confidence < 0.7 else "中仓",
        "maxLossPercent": round(abs(stop_loss - price) / price * 100, 2),
        "volatilityLevel": "中",
        "riskScore": int((1 - confidence) * 50 + 30),
        "notes": [
            "AI风控服务暂不可用，使用默认参数",
            "建议手动确认风险参数",
            "关注市场波动变化"
        ]
    }


def _generate_signal_fallback(price_data: dict) -> dict:
    """
    降级的信号生成函数（当大模型调用失败时使用）
    基于本地规则生成交易信号
    
    参数:
        price_data: 包含价格信息和技术指标的字典
        
    返回:
        包含信号类型、置信度、分析原因和技术指标的字典
    """
    current_price = price_data.get("price", 0)
    change_percent = price_data.get("changePercent24h", 0)
    indicators = price_data.get("indicators", {})
    
    rsi = indicators.get("rsi")
    macd = indicators.get("macd")
    macd_signal = indicators.get("macd_signal")
    sma_7 = indicators.get("sma_7")
    sma_20 = indicators.get("sma_20")
    bollinger_upper = indicators.get("bollinger_upper")
    bollinger_lower = indicators.get("bollinger_lower")
    volume_change = indicators.get("volume_change")
    
    signal_points = []
    confidence = 0.5
    
    # RSI指标分析
    if rsi is not None:
        if rsi < 30:
            signal_points.append(f"RSI({rsi:.1f})进入超卖区域，可能反弹")
            confidence += 0.15
        elif rsi > 70:
            signal_points.append(f"RSI({rsi:.1f})进入超买区域，可能回调")
            confidence -= 0.15
        else:
            signal_points.append(f"RSI({rsi:.1f})处于中性区间")
    
    # MACD指标分析
    if macd is not None and macd_signal is not None:
        if macd > macd_signal:
            signal_points.append(f"MACD({macd:.4f})上穿信号线({macd_signal:.4f})，看涨信号")
            confidence += 0.1
        else:
            signal_points.append(f"MACD({macd:.4f})下穿信号线({macd_signal:.4f})，看跌信号")
            confidence -= 0.1
    
    # 均线分析
    if sma_7 is not None and sma_20 is not None:
        if current_price > sma_7 and sma_7 > sma_20:
            signal_points.append(f"价格({current_price:.2f})站上7日均线({sma_7:.2f})，均线多头排列")
            confidence += 0.1
        elif current_price < sma_7 and sma_7 < sma_20:
            signal_points.append(f"价格({current_price:.2f})跌破7日均线({sma_7:.2f})，均线空头排列")
            confidence -= 0.1
    
    # 布林带分析
    if bollinger_upper is not None and bollinger_lower is not None:
        if current_price > bollinger_upper:
            signal_points.append(f"价格触及布林带上轨，可能承压")
            confidence -= 0.05
        elif current_price < bollinger_lower:
            signal_points.append(f"价格触及布林带下轨，可能获得支撑")
            confidence += 0.05
    
    # 成交量分析
    if volume_change is not None:
        if volume_change > 50:
            signal_points.append(f"成交量放大({volume_change:.1f}%)，趋势增强")
            confidence += 0.05
        elif volume_change < -30:
            signal_points.append(f"成交量萎缩({volume_change:.1f}%)，趋势减弱")
            confidence -= 0.05
    
    # 24小时涨跌幅分析
    if change_percent > 2:
        signal_points.append(f"24小时涨幅({change_percent:.2f}%)强劲，上涨趋势确认")
        confidence += 0.1
    elif change_percent < -2:
        signal_points.append(f"24小时跌幅({change_percent:.2f}%)明显，下跌趋势确认")
        confidence -= 0.1
    else:
        signal_points.append(f"24小时波动({change_percent:.2f}%)较小，方向不明")
    
    # 确定最终信号
    confidence = max(0.3, min(0.95, confidence))
    
    if confidence >= 0.65:
        signal = "BUY"
    elif confidence <= 0.35:
        signal = "SELL"
    else:
        signal = "NEUTRAL"
    
    # 确保至少有3个分析原因
    if len(signal_points) < 3:
        additional_reasons = [
            "市场整体情绪偏乐观",
            "市场整体情绪偏谨慎",
            "等待更多信号确认",
            "关注关键支撑阻力位",
            "量能指标需要观察"
        ]
        for reason in additional_reasons:
            if reason not in signal_points and len(signal_points) < 3:
                signal_points.append(reason)
    
    return {
        "signal": signal,
        "confidence": round(confidence, 2),
        "reason": signal_points[:3],
        "indicators": indicators
    }


def analyze_symbol(symbol: str, timeframe: str = "1H") -> dict:
    """
    分析单个加密货币
    
    参数:
        symbol: 加密货币符号
        timeframe: K线时间周期，默认1小时
        
    返回:
        包含分析结果的字典
    """
    price_result = get_price_tool(symbol)
    
    if price_result["success"]:
        price_data = price_result["data"]
        
        # 获取K线数据用于计算技术指标
        kline_result = get_kline_tool(symbol, timeframe)
        if kline_result["success"]:
            indicators = calculate_technical_indicators(kline_result["data"])
            price_data["indicators"] = indicators
        
        signal_data = generate_signal(price_data)
        risk_data = calculate_risk_management(price_data, signal_data)
        
        return {
            "symbol": symbol,
            "price": price_data["price"],
            "change24h": price_data.get("changePercent24h", 0),
            "signal": signal_data["signal"],
            "confidence": signal_data["confidence"],
            "reason": signal_data["reason"],
            "indicators": signal_data["indicators"],
            "risk": risk_data,
            "timeframe": timeframe
        }
    else:
        return {
            "symbol": symbol,
            "price": 0,
            "change24h": 0,
            "signal": "NEUTRAL",
            "confidence": 0.5,
            "reason": ["无法获取市场数据"],
            "indicators": {},
            "risk": calculate_risk_management({"price": 0, "indicators": {}}, {"signal": "NEUTRAL", "confidence": 0.5}),
            "timeframe": timeframe
        }


def run_agent(input_text: str, timeframe: str = "1H") -> dict:
    """
    执行AI交易分析代理主流程
    
    参数:
        input_text: 用户输入的查询文本，包含加密货币代码
        timeframe: K线时间周期，默认1小时
        
    返回:
        包含分析结果的字典，包含交易对、价格、涨跌幅、信号等信息
    """
    # 支持的加密货币列表
    supported_symbols = ["BTC", "ETH", "SOL", "AVAX", "MATIC", "BNB", "DOGE", "XRP", "ADA"]
    # 默认分析BTC
    target_symbol = "BTC"
    
    # 从用户输入中识别加密货币代码
    for sym in supported_symbols:
        if sym.lower() in input_text.lower():
            target_symbol = sym
            break
    
    # 获取目标货币的价格数据
    price_result = get_price_tool(target_symbol)
    
    # 如果成功获取价格数据
    if price_result["success"]:
        price_data = price_result["data"]
        
        # 获取K线数据用于计算技术指标
        kline_result = get_kline_tool(target_symbol, timeframe)
        if kline_result["success"]:
            indicators = calculate_technical_indicators(kline_result["data"])
            price_data["indicators"] = indicators
        
        # 生成交易信号
        signal_data = generate_signal(price_data)
        risk_data = calculate_risk_management(price_data, signal_data)
        
        return {
            "symbol": target_symbol,
            "price": price_data["price"],
            "change24h": price_data.get("changePercent24h", 0),
            "signal": signal_data["signal"],
            "confidence": signal_data["confidence"],
            "reason": signal_data["reason"],
            "indicators": signal_data["indicators"],
            "risk": risk_data,
            "timeframe": timeframe
        }
    else:
        # 获取数据失败，返回默认中性结果
        return {
            "symbol": target_symbol,
            "price": 0,
            "change24h": 0,
            "signal": "NEUTRAL",
            "confidence": 0.5,
            "reason": ["无法获取市场数据"],
            "indicators": {},
            "risk": calculate_risk_management({"price": 0, "indicators": {}}, {"signal": "NEUTRAL", "confidence": 0.5}),
            "timeframe": timeframe
        }


def get_market_rankings() -> list:
    """
    获取市场排行榜数据
    
    返回:
        包含多个加密货币分析结果的列表，按置信度排序
    """
    symbols = ["BTC", "ETH", "SOL", "AVAX", "MATIC", "BNB"]
    results = []
    
    for symbol in symbols:
        try:
            analysis = analyze_symbol(symbol)
            results.append({
                "symbol": analysis["symbol"],
                "price": analysis["price"],
                "change24h": analysis["change24h"],
                "signal": analysis["signal"],
                "confidence": analysis["confidence"]
            })
        except Exception as e:
            print(f"分析 {symbol} 失败: {e}")
    
    # 按置信度降序排序
    results.sort(key=lambda x: x["confidence"], reverse=True)
    
    # 添加排名
    for i, item in enumerate(results, 1):
        item["rank"] = i
    
    return results
