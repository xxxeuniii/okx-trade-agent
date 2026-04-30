# 策略回测模块
import random
import math
from typing import List, Dict, Optional
from dataclasses import dataclass


@dataclass
class Trade:
    """交易记录"""
    side: str  # "buy" 或 "sell"
    price: float
    pnl: Optional[float] = None


@dataclass
class BacktestResult:
    """回测结果"""
    totalReturn: float
    winRate: float
    maxDrawdown: float
    totalTrades: int
    sharpeRatio: float
    finalCapital: float
    profitFactor: float
    trades: List[Trade]


class Backtester:
    """策略回测器"""
    
    def __init__(self):
        self.initial_prices = {
            'BTC': 68000,
            'ETH': 3500,
            'SOL': 140,
            'AVAX': 35
        }
    
    def generate_historical_prices(self, symbol: str, timeframe: str, count: int = 200) -> List[float]:
        """
        生成模拟历史价格数据
        
        Args:
            symbol: 币种代码
            timeframe: 时间周期
            count: 价格点数量
            
        Returns:
            价格序列
        """
        base_price = self.initial_prices.get(symbol, 100)
        prices = [base_price]
        
        # 根据时间周期调整波动率
        volatility_multiplier = {
            '1m': 0.002,
            '5m': 0.005,
            '15m': 0.01,
            '1H': 0.02,
            '4H': 0.04,
            '1D': 0.08,
            '1W': 0.15
        }.get(timeframe, 0.02)
        
        for _ in range(count - 1):
            # 随机漫步 + 一些趋势
            change = random.normalvariate(0, volatility_multiplier)
            # 添加轻微趋势
            trend = random.choice([-0.001, 0, 0.001])
            new_price = prices[-1] * (1 + change + trend)
            prices.append(new_price)
        
        return prices
    
    def calculate_indicators(self, prices: List[float]) -> Dict[str, List[float]]:
        """
        计算技术指标
        
        Args:
            prices: 价格序列
            
        Returns:
            技术指标字典
        """
        # RSI
        rsi = []
        gains = []
        losses = []
        for i in range(1, len(prices)):
            change = prices[i] - prices[i-1]
            gains.append(max(change, 0))
            losses.append(max(-change, 0))
            
            if len(gains) >= 14:
                avg_gain = sum(gains[-14:]) / 14
                avg_loss = sum(losses[-14:]) / 14
                if avg_loss == 0:
                    rsi_val = 100
                else:
                    rs = avg_gain / avg_loss
                    rsi_val = 100 - (100 / (1 + rs))
                rsi.append(rsi_val)
        
        # 移动平均线
        sma_short = []
        sma_long = []
        for i in range(len(prices)):
            if i >= 10:
                sma_short.append(sum(prices[i-10:i+1]) / 11)
            if i >= 30:
                sma_long.append(sum(prices[i-30:i+1]) / 31)
        
        return {
            'rsi': rsi,
            'sma_short': sma_short,
            'sma_long': sma_long
        }
    
    def run_backtest(self, symbol: str, timeframe: str, initial_capital: float) -> BacktestResult:
        """
        执行策略回测
        
        Args:
            symbol: 币种代码
            timeframe: 时间周期
            initial_capital: 初始资金
            
        Returns:
            回测结果
        """
        # 生成历史价格
        prices = self.generate_historical_prices(symbol, timeframe)
        
        # 计算技术指标
        indicators = self.calculate_indicators(prices)
        
        # 交易模拟
        trades = []
        position = None  # None, "long"
        entry_price = 0
        capital = initial_capital
        peak_capital = initial_capital
        max_drawdown = 0
        capital_history = [initial_capital]
        
        # 从有足够指标数据的点开始
        start_idx = 30  # 需要30个数据点计算长期均线
        
        for i in range(start_idx, len(prices) - 1):
            current_price = prices[i]
            rsi_idx = i - 1  # RSI数组索引
            sma_short_idx = i - 10  # 短期均线索引
            sma_long_idx = i - 30  # 长期均线索引
            
            if rsi_idx >= len(indicators['rsi']) or sma_short_idx >= len(indicators['sma_short']) or sma_long_idx >= len(indicators['sma_long']):
                continue
            
            rsi = indicators['rsi'][rsi_idx]
            sma_short = indicators['sma_short'][sma_short_idx]
            sma_long = indicators['sma_long'][sma_long_idx]
            
            # 策略逻辑
            if position is None:
                # 买入信号: RSI超卖 + 短期均线上穿长期均线
                if rsi < 35 and sma_short > sma_long * 1.005:
                    position = "long"
                    entry_price = current_price
                    trades.append(Trade(side="buy", price=current_price))
            elif position == "long":
                # 卖出信号: RSI超买 + 短期均线下穿长期均线
                if rsi > 65 and sma_short < sma_long * 0.995:
                    # 平仓
                    position = None
                    pnl = (current_price - entry_price) / entry_price
                    capital = capital * (1 + pnl)
                    capital_history.append(capital)
                    
                    # 更新最大回撤
                    if capital > peak_capital:
                        peak_capital = capital
                    drawdown = (peak_capital - capital) / peak_capital
                    if drawdown > max_drawdown:
                        max_drawdown = drawdown
                    
                    trades.append(Trade(side="sell", price=current_price, pnl=pnl))
        
        # 如果最后有持仓，强制平仓
        if position == "long" and trades:
            final_price = prices[-1]
            pnl = (final_price - entry_price) / entry_price
            capital = capital * (1 + pnl)
            capital_history.append(capital)
            
            if capital > peak_capital:
                peak_capital = capital
            drawdown = (peak_capital - capital) / peak_capital
            if drawdown > max_drawdown:
                max_drawdown = drawdown
            
            trades.append(Trade(side="sell", price=final_price, pnl=pnl))
        
        # 计算回测指标
        total_return = (capital - initial_capital) / initial_capital
        
        # 胜率计算
        win_trades = 0
        total_closed_trades = 0
        gross_profit = 0
        gross_loss = 0
        
        for trade in trades:
            if trade.side == "sell" and trade.pnl is not None:
                total_closed_trades += 1
                if trade.pnl > 0:
                    win_trades += 1
                    gross_profit += trade.pnl
                else:
                    gross_loss += abs(trade.pnl)
        
        win_rate = (win_trades / total_closed_trades * 100) if total_closed_trades > 0 else 0
        
        # 夏普比率（简化版）
        if len(capital_history) > 1:
            returns = [(capital_history[i] - capital_history[i-1]) / capital_history[i-1] 
                      for i in range(1, len(capital_history))]
            if returns and len(returns) > 0:
                avg_return = sum(returns) / len(returns)
                std_return = math.sqrt(sum((r - avg_return) ** 2 for r in returns) / len(returns)) if len(returns) > 0 else 1
                sharpe_ratio = (avg_return / std_return) * math.sqrt(365) if std_return != 0 else 0
            else:
                sharpe_ratio = 0
        else:
            sharpe_ratio = 0
        
        # 盈亏比
        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else float('inf')
        
        return BacktestResult(
            totalReturn=total_return,
            winRate=win_rate,
            maxDrawdown=max_drawdown,
            totalTrades=total_closed_trades,
            sharpeRatio=sharpe_ratio,
            finalCapital=capital,
            profitFactor=profit_factor,
            trades=trades
        )


# 全局回测器实例
backtester = Backtester()


def run_strategy_backtest(symbol: str, timeframe: str, initial_capital: float) -> dict:
    """
    运行策略回测并返回结果
    
    Args:
        symbol: 币种代码
        timeframe: 时间周期
        initial_capital: 初始资金
        
    Returns:
        回测结果字典
    """
    result = backtester.run_backtest(symbol, timeframe, initial_capital)
    return {
        "totalReturn": result.totalReturn,
        "winRate": result.winRate,
        "maxDrawdown": result.maxDrawdown,
        "totalTrades": result.totalTrades,
        "sharpeRatio": result.sharpeRatio,
        "finalCapital": result.finalCapital,
        "profitFactor": result.profitFactor,
        "trades": [{"side": t.side, "price": t.price, "pnl": t.pnl} for t in result.trades]
    }
