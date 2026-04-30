# 导入FastAPI相关模块
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
# 导入代理逻辑和提供者工厂
from agent import run_agent, get_market_rankings
from services.provider_factory import provider_factory
from services.langchain_agent import get_crypto_agent
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


@app.get("/health", summary="健康检查")
def health_check():
    """
    服务健康检查端点
    
    返回:
        服务状态
    """
    return {"status": "ok", "service": "OKX交易分析API", "version": "1.0.0"}


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