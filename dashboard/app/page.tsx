import { CurrentExecutionCard } from '@/components/dashboard/current-execution-card';
import { MonthlyUsageCard } from '@/components/dashboard/monthly-usage-card';
import { ProviderStatusCard } from '@/components/dashboard/provider-status-card';
import { QuickRunPanel } from '@/components/dashboard/quick-run-panel';
import { RecentExecutionsTable } from '@/components/dashboard/recent-executions-table';

export default function HomePage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
      <div className="space-y-6">
        <CurrentExecutionCard />
        <RecentExecutionsTable />
      </div>
      <div className="space-y-6">
        <QuickRunPanel />
        <ProviderStatusCard />
        <MonthlyUsageCard />
      </div>
    </div>
  );
}
