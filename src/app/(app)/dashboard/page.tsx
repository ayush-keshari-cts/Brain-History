import { Metadata } from "next";
import { Suspense } from "react";
import DashboardContent from "@/components/dashboard/DashboardContent";

export const metadata: Metadata = { title: "Dashboard — BrainHistory" };

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
