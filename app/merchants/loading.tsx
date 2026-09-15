import { AppShell } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";

export default function Loading() {
  return (
    <AppShell>
      <PageLoader
        title="Merchant Analysis"
        subtitle="Category performance, chargeback concentration, and where GMV and disputes diverge"
      />
    </AppShell>
  );
}
