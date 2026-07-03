import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen" style={{ background: "var(--paper-50)" }}>
      <Sidebar roles={session.user.roles} userName={session.user.name} />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
