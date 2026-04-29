from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from api.price import router as price_router
from services.okx_service import okx_service
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(price_router)

@app.websocket("/ws/price")
async def price_ws(ws: WebSocket):
    await ws.accept()

    while True:
        data = okx_service.get_price("BTC")
        await ws.send_json(data)
        await asyncio.sleep(2)