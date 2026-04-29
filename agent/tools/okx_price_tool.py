# 导入提供者工厂
from services.provider_factory import provider_factory


def get_price_tool(symbol: str = "BTC") -> dict:
    """
    获取指定加密货币的实时价格工具函数
    
    参数:
        symbol: 加密货币符号，默认为 BTC
        
    返回:
        包含操作状态和价格数据的字典
        - success: 布尔值，表示操作是否成功
        - data: 价格数据（成功时）
        - error: 错误信息（失败时）
    """
    try:
        # 获取数据提供者
        provider = provider_factory.get_provider()
        # 获取价格数据
        data = provider.get_price(symbol.upper())
        
        # 检查是否有错误
        if "error" in data:
            return {
                "success": False,
                "error": data["error"]
            }
        
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        # 捕获异常并返回错误信息
        return {
            "success": False,
            "error": str(e)
        }


def get_market_data_tool(symbol: str = "BTC") -> dict:
    """
    获取指定加密货币的完整市场数据工具函数
    
    参数:
        symbol: 加密货币符号，默认为 BTC
        
    返回:
        包含操作状态和市场数据的字典
        - success: 布尔值，表示操作是否成功
        - data: 市场数据（成功时）
        - error: 错误信息（失败时）
    """
    try:
        # 获取数据提供者
        provider = provider_factory.get_provider()
        # 获取市场数据
        data = provider.get_market_data(symbol.upper())
        
        # 检查是否有错误
        if "error" in data:
            return {
                "success": False,
                "error": data["error"]
            }
        
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        # 捕获异常并返回错误信息
        return {
            "success": False,
            "error": str(e)
        }


def get_kline_tool(symbol: str = "BTC", timeframe: str = "1H") -> dict:
    """
    获取指定加密货币的K线数据工具函数
    
    参数:
        symbol: 加密货币符号，默认为 BTC
        timeframe: K线周期，默认为 1H
        
    返回:
        包含操作状态和K线数据的字典
        - success: 布尔值，表示操作是否成功
        - data: K线数据列表（成功时）
        - error: 错误信息（失败时）
    """
    try:
        # 获取数据提供者
        provider = provider_factory.get_provider()
        # 获取K线数据
        data = provider.get_kline(symbol.upper(), timeframe)
        
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        # 捕获异常并返回错误信息
        return {
            "success": False,
            "error": str(e)
        }


def get_account_info_tool() -> dict:
    """
    获取账户信息工具函数
    
    返回:
        包含操作状态和账户信息的字典
        - success: 布尔值，表示操作是否成功
        - data: 账户信息（成功时）
        - error: 错误信息（失败时）
        
    说明:
        HTTP模式下无法获取账户信息，需要使用MCP模式
    """
    try:
        # 获取数据提供者
        provider = provider_factory.get_provider()
        # 获取账户信息
        data = provider.get_account_info()
        
        # 检查是否有错误
        if "error" in data:
            return {
                "success": False,
                "error": data["error"]
            }
        
        return {
            "success": True,
            "data": data
        }
    except Exception as e:
        # 捕获异常并返回错误信息
        return {
            "success": False,
            "error": str(e)
        }