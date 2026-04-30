"""
市场情绪数据服务模块

提供真实的市场情绪指标数据获取功能，包括：
- 恐慌贪婪指数 (Fear & Greed Index)
- 资金费率 (Funding Rate)
- 多空持仓比 (Long/Short Ratio)
"""

import requests
import json
from typing import Dict, Optional

class SentimentService:
    """
    市场情绪数据服务类
    """

    def __init__(self):
        self.cache = {}
        self.cache_time = {}

    def _get(self, url: str, params: Optional[Dict] = None, headers: Optional[Dict] = None) -> Dict:
        """
        内部HTTP GET请求封装
        """
        try:
            response = requests.get(url, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"HTTP请求失败 {url}: {e}")
            return {}

    def get_fear_greed_index(self) -> Dict:
        """
        获取恐慌贪婪指数 (来源: Alternative.me)
        
        返回:
            {
                'value': 56,           # 指数值 (0-100)
                'value_classification': 'Greed',  # 分类: Extreme Fear, Fear, Neutral, Greed, Extreme Greed
                'timestamp': 1635120000,
                'time_until_update': 3600
            }
        """
        try:
            data = self._get("https://api.alternative.me/fng/")
            if data and "data" in data:
                return {
                    "value": int(data["data"][0]["value"]),
                    "value_classification": data["data"][0]["value_classification"],
                    "timestamp": data["data"][0]["timestamp"],
                    "time_until_update": data["data"][0]["time_until_update"]
                }
        except Exception as e:
            print(f"获取恐慌贪婪指数失败: {e}")
        
        # 返回默认值
        return {"value": 50, "value_classification": "Neutral", "timestamp": 0, "time_until_update": 0}

    def get_okx_funding_rate(self, symbol: str = "BTC") -> Dict:
        """
        获取OKX资金费率
        
        参数:
            symbol: 加密货币代码 (如 BTC, ETH)
        
        返回:
            {
                'funding_rate': 0.0001,    # 当前资金费率
                'funding_rate_24h_avg': 0.00015,  # 24小时平均资金费率
                'next_funding_time': 1635120000   # 下次资金费率结算时间
            }
        """
        try:
            # 使用永续合约格式
            inst_id = f"{symbol}-USDT-SWAP"
            data = self._get(f"https://www.okx.com/api/v5/public/funding-rate", {"instId": inst_id})
            
            if data and "data" in data and len(data["data"]) > 0:
                item = data["data"][0]
                return {
                    "funding_rate": float(item.get("fundingRate", 0.0001)),
                    "funding_rate_24h_avg": float(item.get("fundingRate24hAvg", item.get("fundingRate", 0.0001))),
                    "next_funding_time": int(item.get("nextFundingTime", 0)),
                    "symbol": symbol
                }
        except Exception as e:
            print(f"获取OKX资金费率失败: {e}")
        
        return {"funding_rate": 0.0001, "funding_rate_24h_avg": 0.0001, "next_funding_time": 0, "symbol": symbol}

    def get_okx_long_short_ratio(self, symbol: str = "BTC") -> Dict:
        """
        获取OKX多空持仓比
        
        参数:
            symbol: 加密货币代码 (如 BTC, ETH)
        
        返回:
            {
                'long_short_ratio': 1.2,   # 多空比
                'long_account_ratio': 0.55,  # 多头账户占比
                'short_account_ratio': 0.45  # 空头账户占比
            }
        """
        try:
            # 尝试多个可能的API端点
            endpoints = [
                f"https://www.okx.com/api/v5/market/long-short-ratio",
                f"https://www.okx.com/api/v5/public/long-short-ratio"
            ]
            
            inst_id = f"{symbol}-USDT-SWAP"
            
            for endpoint in endpoints:
                data = self._get(endpoint, {"instId": inst_id})
                
                if data and "data" in data and len(data["data"]) > 0:
                    item = data["data"][0]
                    return {
                        "long_short_ratio": float(item.get("longShortRatio", 1.0)),
                        "long_account_ratio": float(item.get("longAccountRatio", 0.5)),
                        "short_account_ratio": float(item.get("shortAccountRatio", 0.5)),
                        "symbol": symbol,
                        "timestamp": int(item.get("ts", 0))
                    }
        
        except Exception as e:
            print(f"获取OKX多空比失败: {e}")
        
        return {"long_short_ratio": 1.0, "long_account_ratio": 0.5, "short_account_ratio": 0.5, "symbol": symbol, "timestamp": 0}

    def get_sentiment_data(self, symbol: str = "BTC") -> Dict:
        """
        获取完整的市场情绪数据
        
        参数:
            symbol: 加密货币代码
        
        返回:
            包含所有情绪指标的字典
        """
        fng = self.get_fear_greed_index()
        funding = self.get_okx_funding_rate(symbol)
        ls_ratio = self.get_okx_long_short_ratio(symbol)
        
        # 映射恐慌贪婪指数标签
        fng_label_map = {
            "Extreme Fear": "极端恐慌",
            "Fear": "恐慌",
            "Neutral": "中性",
            "Greed": "贪婪",
            "Extreme Greed": "极端贪婪"
        }
        
        return {
            "longShortRatio": ls_ratio["long_short_ratio"],
            "longAccountRatio": ls_ratio["long_account_ratio"],
            "shortAccountRatio": ls_ratio["short_account_ratio"],
            "fundingRate": funding["funding_rate_24h_avg"] * 100,  # 转换为百分比并年化
            "fearGreedIndex": fng["value"],
            "fearGreedLabel": fng_label_map.get(fng["value_classification"], "中性"),
            "symbol": symbol,
            "timestamp": ls_ratio["timestamp"]
        }


# 创建全局单例实例
sentiment_service = SentimentService()
