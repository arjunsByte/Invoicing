import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ownerEmail = process.env.OWNER_EMAIL || "owner@qorvalabs.com";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="no-print">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="no-print">
          <Header ownerEmail={ownerEmail} />
        </div>
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
