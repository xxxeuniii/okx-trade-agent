from fastapi import APIRouter
from services.okx_service import okx_service

router = APIRouter()

@router.get("/price/{symbol}")
def get_price(symbol: str = "BTC"):
    return okx_service.get_price(symbol.upper())

@router.get("/price/btc")
def btc_price():
    return okx_service.get_price("BTC")

@router.get("/market/{symbol}")
def get_market_data(symbol: str = "BTC"):
    return okx_service.get_market_data(symbol.upper())

@router.get("/kline/{symbol}")
def get_kline(symbol: str = "BTC", timeframe: str = "1H"):
    return okx_service.get_kline(symbol.upper(), timeframe)