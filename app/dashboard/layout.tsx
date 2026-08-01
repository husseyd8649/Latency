// app/dashboard/layout.tsx
import { Sidebar } from "@/components/Sidebar";
import { auth } from "@/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar userEmail={session?.user?.email} />
      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}