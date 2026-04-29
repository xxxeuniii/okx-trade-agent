# 导入类型提示和请求库
from typing import Dict, List, Optional
import requests

# OKX API基础URL
OKX_BASE_URL = "https://www.okx.com/api/v5"


class MarketProvider:
    """
    市场数据提供者抽象基类
    
    定义了获取市场数据的标准接口，所有具体实现必须实现这些方法
    """
    
    def get_price(self, symbol: str) -> Dict:
        """
        获取指定加密货币的实时价格
        
        参数:
            symbol: 加密货币符号，如 "BTC", "ETH"
            
        返回:
            包含价格信息的字典
        """
        raise NotImplementedError("子类必须实现 get_price 方法")
    
    def get_kline(self, symbol: str, timeframe: str = "1H") -> List:
        """
        获取指定加密货币的K线数据
        
        参数:
            symbol: 加密货币符号
            timeframe: K线时间周期，默认1小时
            
        返回:
            K线数据列表
        """
        raise NotImplementedError("子类必须实现 get_kline 方法")
    
    def get_market_data(self, symbol: str) -> Dict:
        """
        获取指定加密货币的完整市场数据
        
        参数:
            symbol: 加密货币符号
            
        返回:
            包含完整市场信息的字典
        """
        raise NotImplementedError("子类必须实现 get_market_data 方法")
    
    def get_account_info(self) -> Dict:
        """
        获取账户信息
        
        返回:
            账户信息字典
        """
        raise NotImplementedError("子类必须实现 get_account_info 方法")


class OKXHTTPProvider(MarketProvider):
    """
    OKX HTTP API 数据提供者实现
    
    直接调用OKX公开API获取市场数据，无需认证
    """
    
    def __init__(self, base_url: str = OKX_BASE_URL):
        """
        初始化HTTP提供者
        
        参数:
            base_url: OKX API基础URL，默认使用官方地址
        """
        self.base_url = base_url

    def _get(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """
        内部方法：发送GET请求到OKX API
        
        参数:
            endpoint: API端点路径
            params: 请求参数
            
        返回:
            API响应的JSON数据
        """
        url = f"{self.base_url}/{endpoint}"
        response = requests.get(url, params=params)
        response.raise_for_status()  # 如果请求失败，抛出异常
        return response.json()

    def get_price(self, symbol: str) -> Dict:
        """
        获取指定加密货币的实时价格数据
        
        参数:
            symbol: 加密货币符号（如 BTC, ETH）
            
        返回:
            包含价格、开盘价、最高价、最低价、涨跌幅等信息的字典
        """
        inst_id = f"{symbol}-USDT"  # 构建交易对ID
        data = self._get("market/ticker", {"instId": inst_id})
        ticker = data["data"][0]
        
        # 计算涨跌幅
        last_price = float(ticker["last"])
        open_price = float(ticker["open24h"])
        change24h = last_price - open_price
        changePercent24h = (change24h / open_price) * 100 if open_price != 0 else 0
        
        return {
            "symbol": symbol,             # 货币符号
            "price": last_price,          # 当前价格
            "open": open_price,           # 24小时开盘价
            "high": float(ticker["high24h"]),  # 24小时最高价
            "low": float(ticker["low24h"]),    # 24小时最低价
            "change24h": change24h,       # 24小时涨跌额
            "changePercent24h": changePercent24h,  # 24小时涨跌幅
            "volume24h": float(ticker["vol24h"])   # 24小时成交量
        }

    def get_kline(self, symbol: str, timeframe: str = "1H") -> List[List[str]]:
        """
        获取指定加密货币的K线数据
        
        参数:
            symbol: 加密货币符号
            timeframe: K线周期，可选值: 1m, 3m, 5m, 15m, 30m, 1H, 2H, 4H, 6H, 12H, 1D, 1W
            
        返回:
            K线数据列表，每条K线包含: [时间戳, 开盘价, 最高价, 最低价, 收盘价, 成交量]
        """
        inst_id = f"{symbol}-USDT"
        data = self._get("market/candles", {
            "instId": inst_id,
            "bar": timeframe,
            "limit": 100  # 获取最近100条K线
        })
        return data["data"]

    def get_market_data(self, symbol: str) -> Dict:
        """
        获取指定加密货币的完整市场数据（包含盘口数据）
        
        参数:
            symbol: 加密货币符号
            
        返回:
            包含价格、涨跌幅、成交量、盘口买卖单等完整信息的字典
        """
        inst_id = f"{symbol}-USDT"
        
        # 获取行情数据
        ticker_data = self._get("market/ticker", {"instId": inst_id})
        ticker = ticker_data["data"][0]
        
        # 获取盘口数据（深度5档）
        book_data = self._get("market/books", {"instId": inst_id, "sz": "5"})
        book = book_data["data"][0]
        
        # 计算涨跌幅
        last_price = float(ticker["last"])
        open_price = float(ticker["open24h"])
        change24h = last_price - open_price
        changePercent24h = (change24h / open_price) * 100 if open_price != 0 else 0
        
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

    def get_account_info(self) -> Dict:
        """
        获取账户信息（HTTP模式不支持）
        
        返回:
            错误信息字典
        """
        return {"error": "HTTP模式下无法获取账户信息，请使用MCP模式"}