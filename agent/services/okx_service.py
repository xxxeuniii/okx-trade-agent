import requests
from typing import Dict, List, Optional

OKX_BASE_URL = "https://www.okx.com/api/v5"

class OKXService:
    def __init__(self, base_url: str = OKX_BASE_URL):
        self.base_url = base_url

    def _get(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        url = f"{self.base_url}/{endpoint}"
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()

    def get_price(self, symbol: str) -> Dict:
        inst_id = f"{symbol}-USDT"
        data = self._get("market/ticker", {"instId": inst_id})
        ticker = data["data"][0]
        last_price = float(ticker["last"])
        open_price = float(ticker.get("open24h", last_price))
        change24h = last_price - open_price
        changePercent24h = (change24h / open_price) * 100 if open_price else 0
        
        return {
            "symbol": symbol,
            "price": last_price,
            "open": open_price,
            "high": float(ticker["high24h"]),
            "low": float(ticker["low24h"]),
            "change24h": change24h,
            "changePercent24h": changePercent24h,
            "volume24h": float(ticker["vol24h"])
        }

    def get_kline(self, symbol: str, timeframe: str = "1H") -> List[List[str]]:
        inst_id = f"{symbol}-USDT"
        data = self._get("market/candles", {
            "instId": inst_id,
            "bar": timeframe,
            "limit": 100
        })
        return data["data"]

    def get_market_data(self, symbol: str) -> Dict:
        inst_id = f"{symbol}-USDT"
        
        ticker_data = self._get("market/ticker", {"instId": inst_id})
        ticker = ticker_data["data"][0]
        last_price = float(ticker["last"])
        open_price = float(ticker.get("open24h", last_price))
        change24h = last_price - open_price
        changePercent24h = (change24h / open_price) * 100 if open_price else 0
        
        book_data = self._get("market/books", {"instId": inst_id, "sz": "5"})
        book = book_data["data"][0]
        
        return {
            "symbol": symbol,
            "price": last_price,
            "open": open_price,
            "high": float(ticker["high24h"]),
            "low": float(ticker["low24h"]),
            "change24h": change24h,
            "changePercent24h": changePercent24h,
            "volume24h": float(ticker["vol24h"]),
            "bidPrice": float(book["bids"][0][0]),
            "bidSize": float(book["bids"][0][1]),
            "askPrice": float(book["asks"][0][0]),
            "askSize": float(book["asks"][0][1]),
            "timestamp": ticker["ts"]
        }

okx_service = OKXService()
