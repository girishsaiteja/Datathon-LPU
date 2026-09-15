import { AppShell } from "@/components/layout/AppShell";
import { PageLoader } from "@/components/ui/PageLoader";

export default function Loading() {
  return (
    <AppShell>
      <PageLoader
        title="Executive Dashboard"
        subtitle="Unified intelligence for UPI transactions, chargebacks, KYC, and fraud risk"
      />
    </AppShell>
  );
}
