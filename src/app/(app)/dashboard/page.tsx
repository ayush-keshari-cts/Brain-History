import { Metadata } from "next";
import DashboardContent from "@/components/dashboard/DashboardContent";

export const metadata: Metadata = { title: "Dashboard — BrainHistory" };

export default function DashboardPage() {
  return <DashboardContent />;
}
