# 导入必要的模块
import websocket
import json
import threading
import time
from typing import Dict, List, Optional, Callable
from .market_provider import MarketProvider

# OKX WebSocket 端点
OKX_WS_URL = "wss://ws.okx.com:8443/ws/v5/public"


class WebSocketMarketProvider(MarketProvider):
    """
    OKX WebSocket 实时行情提供者
    
    使用 WebSocket 连接 OKX 实时推送服务，实现毫秒级数据更新
    """
    
    def __init__(self):
        self.ws = None
        self.connected = False
        self.subscribed_symbols = set()
        self.price_cache: Dict[str, Dict] = {}
        self.callbacks: List[Callable[[Dict], None]] = []
        self._lock = threading.Lock()
        self._connect()
    
    def _connect(self):
        """建立 WebSocket 连接"""
        try:
            self.ws = websocket.WebSocketApp(
                OKX_WS_URL,
                on_open=self._on_open,
                on_message=self._on_message,
                on_error=self._on_error,
                on_close=self._on_close
            )
            # 在后台线程中运行 WebSocket
            self._thread = threading.Thread(target=self.ws.run_forever, daemon=True)
            self._thread.start()
            # 等待连接建立
            time.sleep(1)
        except Exception as e:
            print(f"WebSocket 连接失败: {e}")
    
    def _on_open(self, ws):
        """连接建立回调"""
        self.connected = True
        print("WebSocket 连接已建立")
        # 重新订阅之前的交易对
        for symbol in self.subscribed_symbols:
            self._subscribe(symbol)
    
    def _on_message(self, ws, message):
        """消息接收回调"""
        try:
            data = json.loads(message)
            if "data" in data and len(data["data"]) > 0:
                ticker = data["data"][0]
                # 提取交易对符号
                inst_id = ticker.get("instId", "")
                if inst_id and "-USDT" in inst_id:
                    symbol = inst_id.replace("-USDT", "")
                    
                    # 解析价格数据
                    last_price = float(ticker.get("last", "0"))
                    open_price = float(ticker.get("open24h", "0"))
                    change24h = last_price - open_price
                    changePercent24h = (change24h / open_price) * 100 if open_price != 0 else 0
                    
                    # 更新缓存
                    price_data = {
                        "symbol": symbol,
                        "price": last_price,
                        "open": open_price,
                        "high": float(ticker.get("high24h", "0")),
                        "low": float(ticker.get("low24h", "0")),
                        "change24h": change24h,
                        "changePercent24h": changePercent24h,
                        "volume24h": float(ticker.get("vol24h", "0")),
                        "timestamp": ticker.get("ts", "")
                    }
                    
                    with self._lock:
                        self.price_cache[symbol] = price_data
                    
                    # 触发回调通知所有监听者
                    for callback in self.callbacks:
                        try:
                            callback(price_data)
                        except Exception as e:
                            print(f"回调执行失败: {e}")
        except Exception as e:
            print(f"消息解析失败: {e}")
    
    def _on_error(self, ws, error):
        """错误处理回调"""
        print(f"WebSocket 错误: {error}")
        self.connected = False
    
    def _on_close(self, ws, close_status_code, close_msg):
        """连接关闭回调"""
        print("WebSocket 连接已关闭")
        self.connected = False
        # 尝试重新连接
        time.sleep(5)
        self._connect()
    
    def _subscribe(self, symbol: str):
        """订阅指定交易对的实时行情"""
        if not self.connected or not self.ws:
            return
        
        inst_id = f"{symbol}-USDT"
        subscribe_msg = json.dumps({
            "op": "subscribe",
            "args": [{
                "channel": "tickers",
                "instId": inst_id
            }]
        })
        
        try:
            self.ws.send(subscribe_msg)
            self.subscribed_symbols.add(symbol)
        except Exception as e:
            print(f"订阅失败 {symbol}: {e}")
    
    def _unsubscribe(self, symbol: str):
        """取消订阅指定交易对"""
        if not self.connected or not self.ws:
            return
        
        inst_id = f"{symbol}-USDT"
        unsubscribe_msg = json.dumps({
            "op": "unsubscribe",
            "args": [{
                "channel": "tickers",
                "instId": inst_id
            }]
        })
        
        try:
            self.ws.send(unsubscribe_msg)
            self.subscribed_symbols.discard(symbol)
        except Exception as e:
            print(f"取消订阅失败 {symbol}: {e}")
    
    def get_price(self, symbol: str) -> Dict:
        """
        获取指定加密货币的实时价格
        
        参数:
            symbol: 加密货币符号
            
        返回:
            包含实时价格信息的字典
        """
        symbol = symbol.upper()
        
        # 如果未订阅，先订阅
        if symbol not in self.subscribed_symbols:
            self._subscribe(symbol)
        
        # 等待数据
        timeout = 5
        start_time = time.time()
        while symbol not in self.price_cache:
            if time.time() - start_time > timeout:
                return {"error": "获取价格超时"}
            time.sleep(0.1)
        
        with self._lock:
            return self.price_cache.get(symbol, {"error": "未找到价格数据"})
    
    def get_kline(self, symbol: str, timeframe: str = "1H") -> List:
        """WebSocket 模式下不支持K线查询，请使用 HTTP 模式"""
        return []
    
    def get_market_data(self, symbol: str) -> Dict:
        """
        获取指定加密货币的完整市场数据
        
        参数:
            symbol: 加密货币符号
            
        返回:
            包含完整市场信息的字典
        """
        return self.get_price(symbol)
    
    def get_account_info(self) -> Dict:
        """WebSocket 模式下不支持账户信息查询"""
        return {"error": "WebSocket 模式下无法获取账户信息"}
    
    def add_callback(self, callback: Callable[[Dict], None]):
        """
        添加价格更新回调函数
        
        参数:
            callback: 当价格更新时调用的函数，接收价格数据字典
        """
        self.callbacks.append(callback)
    
    def remove_callback(self, callback: Callable[[Dict], None]):
        """
        移除价格更新回调函数
        
        参数:
            callback: 要移除的回调函数
        """
        self.callbacks.remove(callback)
    
    def close(self):
        """关闭 WebSocket 连接"""
        if self.ws:
            self.ws.close()
            self.connected = False


# 创建全局实例
ws_provider = WebSocketMarketProvider()