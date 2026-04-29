# 导入类型提示和相关模块
from typing import Dict, List, Optional
import subprocess
import json
import os


class MCPMarketProvider:
    """
    MCP（Model Context Protocol）市场数据提供者
    
    通过启动独立的MCP进程获取市场数据，支持更多高级功能如账户操作
    """
    
    def __init__(self, mcp_path: str = "okx-trade-mcp"):
        """
        初始化MCP提供者
        
        参数:
            mcp_path: MCP可执行文件路径，默认为 "okx-trade-mcp"
        """
        self.mcp_path = mcp_path  # MCP进程路径
        self.process = None        # 存储MCP进程实例
    
    def _start_mcp(self):
        """
        启动MCP进程（如果尚未运行）
        
        检查当前是否有运行中的MCP进程，如果没有则启动新进程
        """
        # 如果进程未启动或已结束，启动新进程
        if self.process is None or self.process.poll() is not None:
            # 复制当前环境变量
            env = os.environ.copy()
            # 启动MCP进程
            self.process = subprocess.Popen(
                [self.mcp_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=env
            )
    
    def _send_request(self, method: str, params: Optional[Dict] = None) -> Dict:
        """
        向MCP进程发送请求并获取响应
        
        参数:
            method: 请求方法名
            params: 请求参数字典
            
        返回:
            MCP进程返回的响应数据
        """
        # 确保MCP进程已启动
        self._start_mcp()
        
        # 构建请求数据
        request_id = "1"
        request_data = {
            "id": request_id,
            "method": method,
            "params": params or {}
        }
        
        # 如果进程存在且标准输入可用
        if self.process and self.process.stdin:
            # 发送请求
            self.process.stdin.write(json.dumps(request_data) + "\n")
            self.process.stdin.flush()
            
            # 读取响应
            response = ""
            while True:
                line = self.process.stdout.readline()
                if line:
                    response += line
                    if "\n" in response:
                        break
            
            # 解析JSON响应
            try:
                return json.loads(response.strip())
            except json.JSONDecodeError:
                return {"error": f"无效的响应格式: {response}"}
        
        return {"error": "MCP进程未运行"}
    
    def get_price(self, symbol: str) -> Dict:
        """
        通过MCP获取指定加密货币的实时价格
        
        参数:
            symbol: 加密货币符号
            
        返回:
            包含价格信息的字典
        """
        try:
            result = self._send_request("getPrice", {"symbol": f"{symbol}-USDT"})
            if "result" in result:
                return {
                    "symbol": symbol,
                    "price": float(result["result"]["price"]),
                    "open": float(result["result"].get("open", 0)),
                    "high": float(result["result"].get("high", 0)),
                    "low": float(result["result"].get("low", 0)),
                    "change24h": float(result["result"].get("change", 0)),
                    "changePercent24h": float(result["result"].get("changePercent", 0)),
                    "volume24h": float(result["result"].get("volume", 0))
                }
            return {"error": result.get("error", "未知错误")}
        except Exception as e:
            return {"error": str(e)}
    
    def get_kline(self, symbol: str, timeframe: str = "1H") -> List[List[str]]:
        """
        通过MCP获取指定加密货币的K线数据
        
        参数:
            symbol: 加密货币符号
            timeframe: K线周期，默认1小时
            
        返回:
            K线数据列表
        """
        try:
            result = self._send_request("getKline", {
                "symbol": f"{symbol}-USDT",
                "timeframe": timeframe
            })
            if "result" in result:
                return result["result"]
            return []
        except Exception as e:
            return []
    
    def get_market_data(self, symbol: str) -> Dict:
        """
        通过MCP获取指定加密货币的完整市场数据
        
        参数:
            symbol: 加密货币符号
            
        返回:
            包含完整市场信息的字典
        """
        try:
            result = self._send_request("getMarketData", {"symbol": f"{symbol}-USDT"})
            if "result" in result:
                return result["result"]
            return {"error": result.get("error", "未知错误")}
        except Exception as e:
            return {"error": str(e)}
    
    def get_account_info(self) -> Dict:
        """
        通过MCP获取账户信息
        
        返回:
            账户信息字典
        """
        try:
            result = self._send_request("getAccountInfo")
            if "result" in result:
                return result["result"]
            return {"error": result.get("error", "未知错误")}
        except Exception as e:
            return {"error": str(e)}
    
    def close(self):
        """
        关闭MCP进程
        
        终止正在运行的MCP进程并释放资源
        """
        if self.process:
            self.process.terminate()  # 终止进程
            self.process.wait()        # 等待进程结束
            self.process = None        # 清空进程引用