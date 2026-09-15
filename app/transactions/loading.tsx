import { AppShell } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";

export default function Loading() {
  return (
    <AppShell>
      <PageLoader
        title="Transaction Explorer"
        subtitle="Failures by day and hour, UTR quality, delayed disputes and high-value chargeback customers"
      />
    </AppShell>
  );
}
