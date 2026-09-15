import { AppShell } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";

export default function Loading() {
  return (
    <AppShell>
      <PageLoader
        title="Fraud Network Analysis"
        subtitle="Suspicious clusters, repeat disputers, and the rings with the hottest chargeback intensity"
      />
    </AppShell>
  );
}
