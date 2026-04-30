"""
简单测试服务器 - 不依赖大模型
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatQuery(BaseModel):
    query: str
    chat_history: Optional[List[Dict[str, str]]] = None

@app.get("/test")
def test():
    return {"message": "Hello World"}

@app.post("/api/v1/chat")
def chat_with_agent(cq: ChatQuery):
    try:
        # 不依赖大模型，直接返回模拟数据
        if "BTC" in cq.query:
            return {"success": True, "response": "## BTC 实时分析\n\n- 当前价格: **$75,501.80**\n- 24小时涨跌幅: -1.08%\n\n### 技术指标:\n- RSI(45.2): 中性\n- MACD: 金叉（看涨）"}
        elif "ETH" in cq.query:
            return {"success": True, "response": "## ETH 实时分析\n\n- 当前价格: **$3,850.50**\n- 24小时涨跌幅: +2.35%\n\n### 技术指标:\n- RSI(58.7): 中性\n- MACD: 金叉（看涨）"}
        else:
            return {"success": True, "response": "您可以查询 BTC、ETH 等加密货币的实时价格和技术分析。"}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8888)
