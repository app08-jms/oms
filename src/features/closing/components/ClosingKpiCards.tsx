import { Badge } from '@/components/ui/badge';
import { formatHours, formatWorkDays, type ClosingKpis } from '@/features/closing/closingRules';

interface ClosingKpiCardsProps {
  kpis: ClosingKpis | null;
  isLoading: boolean;
}

export function ClosingKpiCards({ kpis, isLoading }: ClosingKpiCardsProps) {
  const display = (format: (values: ClosingKpis) => string) => (kpis && !isLoading ? format(kpis) : '--');

  const cards = [
    { label: 'Tổng công đã ghi nhận', value: display((k) => formatWorkDays(k.workDays)) },
    { label: 'Đi trễ / Về sớm', value: display((k) => `${k.timingIssueCount} lượt`) },
    {
      label: 'Tăng ca (OT) đã duyệt',
      value: display((k) => formatHours(k.approvedOtHours)),
      badge: kpis && kpis.pendingOtCount > 0 ? `Chờ duyệt (${kpis.pendingOtCount})` : null,
    },
    { label: 'Nghỉ tuần (OFF)', value: display((k) => `${k.offDays} ngày`) },
    { label: 'Nghỉ có lương (P)', value: display((k) => `${k.pDays} ngày`) },
    { label: 'Nghỉ không lương (UP)', value: display((k) => `${k.upDays} ngày`) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className="flex flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <span className="text-xs font-medium text-[#5C6670]">{card.label}</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl font-semibold tabular-nums text-[#1F2A30]">{card.value}</span>
            {card.badge && (
              <Badge className="border-transparent bg-pending/10 text-pending hover:bg-pending/10">{card.badge}</Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
