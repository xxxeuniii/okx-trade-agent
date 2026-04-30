"""
简单测试服务器
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import time

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
        # 延迟加载 agent
        from services.langchain_agent import get_crypto_agent
        agent = get_crypto_agent()
        history = None
        
        if cq.chat_history:
            history = [{"role": msg["role"], "content": msg["content"]} for msg in cq.chat_history]
        
        result = agent.run(cq.query, history)
        return {"success": True, "response": result}
    except Exception as e:
        import traceback
        print(f"Error: {e}")
        print(traceback.format_exc())
        return {"success": False, "error": str(e)}

@app.get("/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8080)
