# 🧠Backend Design (FastAPI + OKX Price API)

## 📌 目标

构建基础后端能力：

- 获取 BTC 实时价格
- 提供 HTTP API
- 提供 WebSocket 实时行情推送
- 为后续 Agent 层提供数据基础

---

## 🏗️ 技术栈

- FastAPI
- Python
- Requests
- WebSocket
- OKX API

---

## 📁 项目结构

backend/
├── main.py
├── api/
│   ├── price.py
├── services/
│   ├── okx_client.py

---

## 🔌 OKX 行情接口

import requests

OKX_BASE = "https://www.okx.com/api/v5"

def get_btc_price():
    url = f"{OKX_BASE}/market/ticker?instId=BTC-USDT"
    res = requests.get(url).json()

    price = res["data"][0]["last"]

    return {
        "symbol": "BTC-USDT",
        "price": float(price)
    }

---

## 🌐 HTTP API

from fastapi import APIRouter
from services.okx_client import get_btc_price

router = APIRouter()

@router.get("/price/btc")
def btc_price():
    return get_btc_price()

---

## ⚡ FastAPI 主入口

from fastapi import FastAPI
from api.price import router as price_router

app = FastAPI()
app.include_router(price_router)

---

## 📡 WebSocket 实时价格

from fastapi import WebSocket
import asyncio
from services.okx_client import get_btc_price

@app.websocket("/ws/price")
async def price_ws(ws: WebSocket):
    await ws.accept()

    while True:
        data = get_btc_price()
        await ws.send_json(data)
        await asyncio.sleep(2)
