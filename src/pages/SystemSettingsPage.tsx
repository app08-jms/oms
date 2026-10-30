import { PageHeading } from '@/components/layout/PageHeading';
import { ShiftsTab } from '@/features/settings/components/ShiftsTab';

export function SystemSettingsPage() {
  return (
    <div className="-mx-4 -my-6 flex min-h-full flex-col gap-6 bg-white px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-col gap-1">
        <PageHeading groupTitle="Nhân sự" title="Cấu hình ca làm việc" />
        <p className="text-sm text-[#5C6670]">
          Thiết lập khung giờ và hệ số công của các ca làm việc dùng chung toàn hệ thống.
        </p>
      </div>

      <ShiftsTab />
    </div>
  );
}
