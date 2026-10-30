import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileDown } from 'lucide-react';
import { PageHeading } from '@/components/layout/PageHeading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DEPARTMENTS } from '@/config/schedule';
import { toast } from '@/hooks/use-toast';
import { DEFAULT_CLOSING_FILTERS, getCurrentPeriod, type ClosingFilters, type ClosingRow } from '@/features/closing/closingRules';
import { ClosingAdjustmentDialog } from '@/features/closing/components/ClosingAdjustmentDialog';
import { ClosingControlBar } from '@/features/closing/components/ClosingControlBar';
import { ClosingDetailTable } from '@/features/closing/components/ClosingDetailTable';
import { ClosingFilterBar } from '@/features/closing/components/ClosingFilterBar';
import { ClosingKpiCards } from '@/features/closing/components/ClosingKpiCards';
import { ClosingSummaryTable } from '@/features/closing/components/ClosingSummaryTable';
import { useClosing } from '@/features/closing/useClosing';

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

function readInitialPeriod(fromParam: string | null): string {
  const candidate = fromParam?.slice(0, 7) ?? '';
  return PERIOD_PATTERN.test(candidate) ? candidate : getCurrentPeriod();
}

export function ClosingPage() {
  const [searchParams] = useSearchParams();
  const [period, setPeriod] = useState(() => readInitialPeriod(searchParams.get('from')));
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [isAdjustMode, setIsAdjustMode] = useState(false);
  const [adjustingRow, setAdjustingRow] = useState<ClosingRow | null>(null);
  const [detailFilters, setDetailFilters] = useState<ClosingFilters>(DEFAULT_CLOSING_FILTERS);
  const closing = useClosing(period, detailFilters);
  const isLocked = closing.isLocked;
  const visibleSummaries =
    departmentFilter === 'all'
      ? closing.summaries
      : closing.summaries.filter((summary) => summary.department === departmentFilter);
  const [year, month] = period.split('-');

  async function handleLock() {
    const locked = await closing.lock();
    if (!locked) return;
    setIsAdjustMode(false);
    toast({ title: `Đã khóa dữ liệu chốt công tháng ${month}/${year}.` });
  }

  async function handleOvertimeDecision(recordId: string, decision: 'approved' | 'rejected') {
    const ok = await closing.decideOvertime(recordId, decision);
    if (ok) {
      toast({ title: decision === 'approved' ? 'Đã duyệt tăng ca.' : 'Đã từ chối tăng ca, công được tính theo ca chuẩn.' });
    }
  }

  async function handleAdjustmentDecision(adjustmentId: string, decision: 'approved' | 'rejected') {
    const ok = await closing.decideAdjustment(adjustmentId, decision);
    if (ok) {
      toast({
        title:
          decision === 'approved'
            ? 'Đã duyệt điều chỉnh. Giờ vào/ra đã được cập nhật.'
            : 'Đã từ chối điều chỉnh. Giữ nguyên dữ liệu gốc.',
      });
    }
  }

  async function handleSubmitAdjustment(checkInAt: string, checkOutAt: string | null, reason: string) {
    if (!adjustingRow) return false;
    const ok = await closing.requestAdjustment(adjustingRow.record.id, checkInAt, checkOutAt, reason);
    if (ok) toast({ title: 'Đã gửi đề xuất điều chỉnh, chờ duyệt.' });
    return ok;
  }

  return (
    <div className="print-area -mx-4 -my-6 flex min-h-full flex-col gap-6 bg-white px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <PageHeading groupTitle="Nhân sự" title="Chốt công" />
          <p className="text-sm text-[#5C6670]">
            Tổng hợp công quy đổi, xét duyệt tăng ca (OT), xử lý điều chỉnh và đóng băng dữ liệu kỳ tính lương.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-[#5C6670] print:hidden">
          Kỳ chốt công
          <Input
            type="month"
            aria-label="Kỳ chốt công"
            value={period}
            onChange={(event) => {
              if (event.target.value) setPeriod(event.target.value);
            }}
            className="h-10 w-[180px] border-[#E2E8F0] bg-white text-sm text-[#1F2A30]"
          />
        </label>
      </div>

      {closing.loadError && (
        <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
          {closing.loadError}
        </p>
      )}
      {closing.actionError && (
        <p role="alert" className="rounded-md border border-error/40 bg-error/5 px-4 py-3 text-sm text-error">
          {closing.actionError}
        </p>
      )}

      <Tabs defaultValue="detail" className="flex flex-col gap-4">
        <TabsList className="h-auto w-fit justify-start gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-1 print:hidden">
          <TabsTrigger value="detail" className="data-[state=active]:bg-white data-[state=active]:text-[#1F2A30]">
            Bảng chốt công chi tiết
          </TabsTrigger>
          <TabsTrigger value="monthly" className="data-[state=active]:bg-white data-[state=active]:text-[#1F2A30]">
            Tổng hợp công tháng
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detail" className="mt-0 flex flex-col gap-4">
          <ClosingKpiCards kpis={closing.kpis} isLoading={closing.isLoading} />

          <ClosingControlBar
            period={period}
            payrollPeriod={closing.period}
            canLock={closing.canLock}
            blockerCount={closing.blockerCount}
            busyKey={closing.busyKey}
            isAdjustMode={isAdjustMode}
            onToggleAdjustMode={() => setIsAdjustMode((current) => !current)}
            onDeadlineChange={closing.setDeadline}
            onLock={handleLock}
          />

          <ClosingFilterBar filters={detailFilters} onFiltersChange={setDetailFilters} />

          <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
            <ClosingDetailTable
              rows={closing.rows}
              isLoading={closing.isLoading}
              emptyMessage={
                closing.totalRowCount === 0
                  ? 'Chưa có dữ liệu chấm công trong kỳ này.'
                  : 'Không có bản ghi phù hợp với bộ lọc.'
              }
              isLocked={isLocked}
              isAdjustMode={isAdjustMode}
              busyKey={closing.busyKey}
              onDecideOvertime={handleOvertimeDecision}
              onRequestAdjust={setAdjustingRow}
              onDecideAdjustment={handleAdjustmentDecision}
            />
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="mt-0 flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 print:border-0 print:p-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-md bg-[#F8FAFC] px-3 py-2 text-sm font-medium text-[#1F2A30]">
                Tháng {month}/{year}
              </span>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger aria-label="Bộ phận" className="h-10 w-[200px] border-[#E2E8F0] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả bộ phận</SelectItem>
                  {DEPARTMENTS.map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => window.print()}
              className="bg-[#4F7284] text-white hover:bg-[#426071] print:hidden"
            >
              <FileDown className="h-4 w-4" />
              Xuất báo cáo PDF
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
            <ClosingSummaryTable summaries={visibleSummaries} isLoading={closing.isLoading} isLocked={isLocked} />
          </div>
        </TabsContent>
      </Tabs>

      {adjustingRow && (
        <ClosingAdjustmentDialog
          key={adjustingRow.record.id}
          row={adjustingRow}
          isSubmitting={closing.busyKey === `request-${adjustingRow.record.id}`}
          onOpenChange={(open) => {
            if (!open) setAdjustingRow(null);
          }}
          onSubmit={handleSubmitAdjustment}
        />
      )}
    </div>
  );
}
