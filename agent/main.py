# 导入FastAPI相关模块
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Iterator
# 导入代理逻辑和提供者工厂
from agent import run_agent, get_market_rankings
from services.provider_factory import provider_factory
from services.langchain_agent import get_crypto_agent
from services.sentiment_service import sentiment_service
from backtest import run_strategy_backtest
import os

# 创建FastAPI应用实例
app = FastAPI(
    title="OKX交易分析API",
    description="基于AI的加密货币交易信号分析服务",
    version="1.0.0"
)

# 配置CORS中间件，允许跨域请求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # 允许所有来源
    allow_credentials=True,     # 允许携带凭证
    allow_methods=["*"],        # 允许所有HTTP方法
    allow_headers=["*"],        # 允许所有请求头
)


class Query(BaseModel):
    """
    查询请求模型
    用于接收用户的分析请求
    """
    input: str  # 用户输入的查询文本，如 "BTC"、"ETH分析" 等
    timeframe: str = "1H"  # K线时间周期，默认1小时


class ProviderConfig(BaseModel):
    """
    提供者配置模型
    用于配置数据提供者类型
    """
    provider_type: str  # 提供者类型："http" 或 "mcp"


@app.post("/api/v1/analysis", summary="获取加密货币分析")
def analyze(q: Query):
    """
    分析加密货币并返回AI交易信号
    
    请求体:
        input: 用户查询文本，包含加密货币代码
        timeframe: K线时间周期，可选值: 1m, 3m, 5m, 15m, 30m, 1H, 2H, 4H, 6H, 12H, 1D, 1W
        
    返回:
        包含交易对、价格、涨跌幅、信号和分析原因的JSON对象
    """
    return run_agent(q.input, q.timeframe)


@app.post("/api/v1/config/provider", summary="配置数据提供者")
def set_provider(config: ProviderConfig):
    """
    设置数据提供者类型
    
    请求体:
        provider_type: 提供者类型，可选值: "http" 或 "mcp"
        
    返回:
        配置状态和当前提供者类型
    """
    if config.provider_type in ["http", "mcp"]:
        provider_factory.set_provider_type(config.provider_type)
        return {"status": "success", "provider_type": config.provider_type}
    return {"status": "error", "message": "无效的提供者类型，必须是 'http' 或 'mcp'"}


@app.get("/api/v1/config/provider", summary="获取当前提供者配置")
def get_provider():
    """
    获取当前的数据提供者类型
    
    返回:
        当前配置的提供者类型
    """
    return {"provider_type": provider_factory._provider_type}


@app.get("/api/v1/rankings", summary="获取市场排行榜")
def rankings():
    """
    获取加密货币市场排行榜
    
    返回:
        包含多个加密货币分析结果的列表，按置信度排序
    """
    return get_market_rankings()


@app.get("/api/v1/multi-timeframe", summary="获取多周期趋势分析")
def get_multi_timeframe(symbol: str = "BTC"):
    """
    获取多周期趋势分析数据
    
    参数:
        symbol: 加密货币代码，默认 BTC
        
    返回:
        包含多个时间周期趋势数据的对象
    """
    from agent import analyze_symbol
    
    timeframes = ["1H", "4H", "1D"]
    results = []
    
    for tf in timeframes:
        try:
            analysis = analyze_symbol(symbol, tf)
            signal = analysis.get("signal", "NEUTRAL")
            confidence = analysis.get("confidence", 0.5)
            
            trend = "sideways"
            if signal == "BUY":
                trend = "bullish"
            elif signal == "SELL":
                trend = "bearish"
            
            # 根据置信度和周期计算强度
            timeframe_weights = {"1H": 1.0, "4H": 0.85, "1D": 0.7}
            strength = min(100, max(30, round(confidence * 100 * timeframe_weights.get(tf, 1.0))))
            
            results.append({
                "timeframe": tf,
                "trend": trend,
                "strength": strength,
                "signal": signal,
                "confidence": confidence
            })
        except Exception as e:
            # 如果某个周期失败，使用默认值
            results.append({
                "timeframe": tf,
                "trend": "sideways",
                "strength": 50,
                "signal": "NEUTRAL",
                "confidence": 0.5
            })
    
    # 检查是否所有周期趋势一致
    trends = [r["trend"] for r in results]
    is_aligned = len(set(trends)) == 1
    
    # 计算置信度影响
    avg_confidence = sum(r["confidence"] for r in results) / len(results)
    confidence_impact = round(avg_confidence * 20)
    
    return {
        "symbol": symbol,
        "timeframes": results,
        "is_aligned": is_aligned,
        "confidence_impact": confidence_impact
    }


@app.get("/health", summary="健康检查")
def health_check():
    """
    服务健康检查端点
    
    返回:
        服务状态
    """
    return {"status": "ok", "service": "OKX交易分析API", "version": "1.0.0"}


@app.get("/api/v1/sentiment", summary="获取市场情绪数据")
def get_sentiment(symbol: str = "BTC"):
    """
    获取市场情绪指标数据
    
    参数:
        symbol: 加密货币代码，默认 BTC
    
    返回:
        包含多空比、资金费率、恐慌贪婪指数的JSON对象
    """
    try:
        data = sentiment_service.get_sentiment_data(symbol)
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}


class ChatMessage(BaseModel):
    """
    聊天消息模型
    """
    role: str  # "user" 或 "assistant"
    content: str


class ChatQuery(BaseModel):
    """
    对话查询模型
    """
    query: str
    chat_history: Optional[List[ChatMessage]] = None


class BacktestQuery(BaseModel):
    """
    回测查询模型
    """
    symbol: str
    timeframe: str
    initialCapital: float


@app.post("/api/v1/chat", summary="LangChain AI对话")
def chat_with_agent(cq: ChatQuery):
    """
    使用LangChain Agent进行自然语言对话
    
    请求体:
        query: 用户查询文本
        chat_history: 可选的历史对话记录
    
    返回:
        AI生成的分析结果
    """
    try:
        agent = get_crypto_agent()
        history = None
        
        if cq.chat_history:
            history = [{"role": msg.role, "content": msg.content} for msg in cq.chat_history]
        
        result = agent.run(cq.query, history)
        return {"success": True, "response": result}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/v1/chat/clear", summary="清除对话记忆")
def clear_chat_memory():
    """
    清除Agent的对话记忆
    
    返回:
        操作状态
    """
    try:
        agent = get_crypto_agent()
        agent.clear_memory()
        return {"success": True, "message": "对话记忆已清除"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@app.post("/api/v1/chat/stream", summary="流式AI对话")
def stream_chat(cq: ChatQuery):
    """
    使用流式方式进行AI对话
    
    请求体:
        query: 用户查询文本
        chat_history: 可选的历史对话记录
    
    返回:
        流式AI响应
    """
    def generate_stream() -> Iterator[str]:
        try:
            agent = get_crypto_agent()
            history = None
            
            if cq.chat_history:
                history = [{"role": msg.role, "content": msg.content} for msg in cq.chat_history]
            
            # 使用流式模式获取结果
            for chunk in agent.run_stream(cq.query, history):
                if chunk:
                    yield f"data: {chunk}\n\n"
            
            yield "data: [END]\n\n"
        except Exception as e:
            yield f"data: Error: {str(e)}\n\n"
    
    return StreamingResponse(generate_stream(), media_type="text/event-stream")


@app.post("/api/v1/backtest", summary="策略回测")
def backtest_strategy(bq: BacktestQuery):
    """
    运行交易策略回测
    
    请求体:
        symbol: 币种代码
        timeframe: 时间周期
        initialCapital: 初始资金
        
    返回:
        回测结果，包含收益率、胜率、最大回撤等指标
    """
    try:
        result = run_strategy_backtest(bq.symbol, bq.timeframe, bq.initialCapital)
        return result
    except Exception as e:
        return {"error": str(e), "success": False}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)