"""
OKX交易所数据服务模块

提供与OKX交易所API交互的封装方法，获取实时价格、K线数据和市场深度等信息。
"""

import requests
from typing import Dict, List, Optional

# OKX官方API基础URL
OKX_BASE_URL = "https://www.okx.com/api/v5"


class OKXService:
    """
    OKX交易所数据服务类
    
    封装OKX REST API调用，提供加密货币行情数据获取功能。
    """

    def __init__(self, base_url: str = OKX_BASE_URL):
        """
        初始化OKX服务
        
        参数:
            base_url: OKX API基础URL，默认为官方生产环境地址
        """
        self.base_url = base_url

    def _get(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """
        内部HTTP GET请求封装
        
        参数:
            endpoint: API端点路径（如 "market/ticker"）
            params: 请求参数字典
        
        返回:
            API响应JSON数据
        
        异常:
            requests.exceptions.RequestException: 请求失败时抛出
        """
        url = f"{self.base_url}/{endpoint}"
        response = requests.get(url, params=params)
        response.raise_for_status()  # 如果HTTP状态码异常，抛出异常
        return response.json()

    def get_price(self, symbol: str) -> Dict:
        """
        获取指定加密货币的实时价格数据
        
        参数:
            symbol: 加密货币代码（如 "BTC", "ETH"）
        
        返回:
            包含价格、涨跌幅、成交量等信息的字典
        """
        inst_id = f"{symbol}-USDT"  # 构造交易对ID
        data = self._get("market/ticker", {"instId": inst_id})
        ticker = data["data"][0]
        
        # 解析价格数据
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
        """
        获取指定加密货币的K线数据
        
        参数:
            symbol: 加密货币代码（如 "BTC", "ETH"）
            timeframe: K线时间周期，可选值: 1m, 3m, 5m, 15m, 30m, 1H, 2H, 4H, 6H, 12H, 1D, 1W
        
        返回:
            K线数据列表，每个K线包含 [时间, 开盘价, 最高价, 最低价, 收盘价, 成交量]
        """
        inst_id = f"{symbol}-USDT"
        data = self._get("market/candles", {
            "instId": inst_id,
            "bar": timeframe,
            "limit": 100  # 获取最近100根K线
        })
        return data["data"]

    def get_market_data(self, symbol: str) -> Dict:
        """
        获取指定加密货币的完整市场数据（包含盘口数据）
        
        参数:
            symbol: 加密货币代码（如 "BTC", "ETH"）
        
        返回:
            包含价格、涨跌幅、成交量、买卖盘口等信息的字典
        """
        inst_id = f"{symbol}-USDT"
        
        # 获取行情数据
        ticker_data = self._get("market/ticker", {"instId": inst_id})
        ticker = ticker_data["data"][0]
        last_price = float(ticker["last"])
        open_price = float(ticker.get("open24h", last_price))
        change24h = last_price - open_price
        changePercent24h = (change24h / open_price) * 100 if open_price else 0
        
        # 获取盘口数据（深度5档）
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
            "bidPrice": float(book["bids"][0][0]),  # 买一价
            "bidSize": float(book["bids"][0][1]),   # 买一量
            "askPrice": float(book["asks"][0][0]),  # 卖一价
            "askSize": float(book["asks"][0][1]),   # 卖一量
            "timestamp": ticker["ts"]               # 时间戳
        }


# 创建全局单例实例
okx_service = OKXService()
