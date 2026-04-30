# 导入类型提示和相关类
from typing import Optional
from .market_provider import MarketProvider, OKXHTTPProvider
from .mcp_provider import MCPMarketProvider
from .websocket_provider import WebSocketMarketProvider
import os


class ProviderFactory:
    """
    市场数据提供者工厂类（单例模式）
    
    负责创建和管理市场数据提供者实例，支持三种模式：
    - HTTP模式：直接调用OKX公开API（默认）
    - MCP模式：通过MCP进程获取数据
    - WebSocket模式：实时行情推送
    
    优先从环境变量读取配置，默认为HTTP模式
    """
    
    # 单例实例
    _instance: Optional[MarketProvider] = None
    # 当前提供者类型，从环境变量获取，默认HTTP模式
    _provider_type: str = os.environ.get("OKX_PROVIDER_TYPE", "http")
    
    @classmethod
    def set_provider_type(cls, provider_type: str):
        """
        设置数据提供者类型
        
        参数:
            provider_type: 提供者类型，可选值: "http", "mcp" 或 "ws"
            
        注意:
            设置后会重置当前实例，下次获取时会创建新的提供者
        """
        cls._provider_type = provider_type
        cls._instance = None  # 重置实例，下次获取时重新创建
    
    @classmethod
    def get_provider(cls) -> MarketProvider:
        """
        获取市场数据提供者实例（单例）
        
        返回:
            MarketProvider实例，根据配置返回HTTP、MCP或WebSocket提供者
            
        说明:
            如果配置为MCP或WebSocket模式但初始化失败，会自动降级到HTTP模式
        """
        # 如果实例尚未创建
        if cls._instance is None:
            if cls._provider_type == "mcp":
                # 尝试创建MCP提供者
                try:
                    cls._instance = MCPMarketProvider()
                except Exception as e:
                    # MCP初始化失败，降级到HTTP模式
                    print(f"MCP提供者初始化失败: {e}")
                    cls._instance = OKXHTTPProvider()
            elif cls._provider_type == "ws":
                # 尝试创建WebSocket提供者
                try:
                    from .websocket_provider import get_ws_provider
                    cls._instance = get_ws_provider()
                except Exception as e:
                    # WebSocket初始化失败，降级到HTTP模式
                    print(f"WebSocket提供者初始化失败: {e}")
                    cls._instance = OKXHTTPProvider()
            else:
                # 创建HTTP提供者
                cls._instance = OKXHTTPProvider()
        return cls._instance
    
    @classmethod
    def reset(cls):
        """
        重置提供者实例
        
        清除当前实例，下次调用get_provider时会重新创建
        """
        cls._instance = None


# 创建工厂实例供外部使用
provider_factory = ProviderFactory()