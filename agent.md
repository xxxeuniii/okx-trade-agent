# Agent Design (LLM + Tool)

## 📌 目标

构建 AI Agent 智能层：

- 自然语言输入
- Tool 调用
- LLM 推理分析
- 返回结果

---

## 🧠 技术栈

- LangChain
- LLM
- FastAPI

---

## 🧩 流程

用户输入 → LLM Agent → Tool → OKX API → 返回结果

---

## 🔧 Tool

from services.okx_client import get_btc_price

def btc_price_tool():
    return get_btc_price()

---

## 🤖 Agent

from langchain.agents import initialize_agent, Tool
from langchain.llms import OpenAI

tools = [
    Tool(
        name="BTC Price Tool",
        func=btc_price_tool,
        description="Get BTC price"
    )
]

llm = OpenAI()

agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent="zero-shot-react-description",
    verbose=True
)

---

## 💬 API

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Query(BaseModel):
    input: str

@app.post("/agent/chat")
def chat(q: Query):
    return {
        "response": agent.run(q.input)
    }
