import ToastProvider from "@/components/toast-provider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | VCGo Education",
  description: "Quản lý học tập và theo dõi tiến độ trên VCGo Education",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <ToastProvider />
    </>
  );
}
