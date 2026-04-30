import { RiskManagement, SignalResponse } from '../services/api';

interface RiskManagementCardProps {
  risk: RiskManagement;
  signal: SignalResponse['signal'];
}

const formatPrice = (value: number) => {
  if (!value) return '--';
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: value >= 100 ? 2 : 4,
    maximumFractionDigits: value >= 100 ? 2 : 4,
  })}`;
};

const getPositionTone = (positionSize: RiskManagement['positionSize']) => {
  switch (positionSize) {
    case '中仓':
      return 'bg-accent-green/15 text-accent-green border-accent-green/30';
    case '轻仓':
      return 'bg-accent-yellow/15 text-accent-yellow border-accent-yellow/30';
    default:
      return 'bg-light-100 text-light-500 border-light-200';
  }
};

const getRiskTone = (riskScore: number) => {
  if (riskScore >= 70) return { text: '高风险', color: 'text-accent-red', bar: 'bg-accent-red' };
  if (riskScore >= 45) return { text: '中风险', color: 'text-accent-yellow', bar: 'bg-accent-yellow' };
  return { text: '低风险', color: 'text-accent-green', bar: 'bg-accent-green' };
};

const getSignalCopy = (signal: SignalResponse['signal']) => {
  if (signal === 'BUY') return '多头交易计划';
  if (signal === 'SELL') return '空头交易计划';
  return '观望交易计划';
};

const Metric = ({ label, value, accent }: { label: string; value: string; accent?: string }) => (
  <div className="rounded-2xl border border-light-200/70 bg-white/70 p-4 shadow-sm">
    <p className="text-xs font-medium text-light-400 mb-2">{label}</p>
    <p className={`text-lg font-bold ${accent || 'text-light-800'}`}>{value}</p>
  </div>
);

export default function RiskManagementCard({ risk, signal }: RiskManagementCardProps) {
  const positionTone = getPositionTone(risk.positionSize);
  const riskTone = getRiskTone(risk.riskScore);
  const rrTone = risk.riskRewardRatio >= 2
    ? 'text-accent-green'
    : risk.riskRewardRatio >= 1.5
      ? 'text-accent-yellow'
      : 'text-accent-red';

  return (
    <section className="relative overflow-hidden rounded-3xl border border-light-200/70 bg-white shadow-xl shadow-light-200/40 xl:sticky xl:top-28">
      <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent-blue/10 blur-3xl" />
      <div className="absolute -left-10 bottom-0 h-44 w-44 rounded-full bg-accent-green/10 blur-3xl" />

      <div className="relative p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-light-200 bg-light-50 px-3 py-1 text-xs font-semibold text-light-500">
              Risk Plan
              <span className="h-1 w-1 rounded-full bg-accent-blue" />
              {getSignalCopy(signal)}
            </div>
            <h3 className="text-2xl font-bold text-light-900">风险控制方案</h3>
            <p className="mt-2 text-sm leading-6 text-light-500">
              根据当前价格、支撑阻力、波动率和信号置信度生成，用于把 AI 方向判断转成可执行的止损、止盈与仓位边界。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className={`rounded-full border px-4 py-2 text-sm font-bold ${positionTone}`}>
              建议：{risk.positionSize}
            </span>
            <span className={`rounded-full border border-light-200 bg-light-50 px-4 py-2 text-sm font-bold ${riskTone.color}`}>
              {riskTone.text}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Metric label="计划入场价" value={formatPrice(risk.entryPrice)} />
          <Metric label="建议止损价" value={formatPrice(risk.stopLoss)} accent="text-accent-red" />
          <Metric label="建议止盈价" value={formatPrice(risk.takeProfit)} accent="text-accent-green" />
          <Metric label="风险收益比 R/R" value={risk.riskRewardRatio ? `1:${risk.riskRewardRatio.toFixed(2)}` : '--'} accent={rrTone} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-light-200/70 bg-light-50/80 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-light-800">风险评分</p>
                <p className="text-xs text-light-400">综合波动率、置信度与盈亏比</p>
              </div>
              <span className={`text-2xl font-black ${riskTone.color}`}>{risk.riskScore}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white">
              <div
                className={`h-full rounded-full ${riskTone.bar} transition-all duration-500`}
                style={{ width: `${Math.max(5, Math.min(100, risk.riskScore))}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs text-light-400">最大价格风险</p>
                <p className="mt-1 text-lg font-bold text-light-800">{risk.maxLossPercent.toFixed(2)}%</p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-xs text-light-400">波动率等级</p>
                <p className="mt-1 text-lg font-bold text-light-800">{risk.volatilityLevel}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-light-200/70 bg-white/70 p-5">
            <p className="mb-4 text-sm font-semibold text-light-800">执行提示</p>
            <div className="space-y-3">
              {risk.notes.map((note, index) => (
                <div key={index} className="flex gap-3">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-blue/10 text-xs font-bold text-accent-blue">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-light-600">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-5 text-xs leading-5 text-light-400">
          风控结果是辅助决策，不代表确定收益。真实交易前请结合账户资金、杠杆倍数和个人风险承受能力再次确认。
        </p>
      </div>
    </section>
  );
}
