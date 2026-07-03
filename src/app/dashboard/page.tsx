import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getHomeReminders, getHomeSummary } from "@/lib/actions/home";
import { format, isToday, isPast, differenceInDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

function SummaryCard({
  label,
  value,
  accent,
  href,
  icon,
}: {
  label: string;
  value: number;
  accent?: "red" | "amber" | "default";
  href?: string;
  icon?: React.ReactNode;
}) {
  const accentColor =
    accent === "red"
      ? "var(--signal-500)"
      : accent === "amber"
      ? "#D97706"
      : "var(--ink-900)";

  const borderAccent = accent === "red" ? "var(--signal-500)" : accent === "amber" ? "#D97706" : "transparent";

  const card = (
    <div
      className="p-5 rounded-lg"
      style={{
        background: "white",
        borderLeft: `3px solid ${borderAccent}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--steel-400)" }}>
          {label}
        </div>
        {icon && (
          <span style={{ color: accent === "red" ? "var(--signal-500)" : accent === "amber" ? "#D97706" : "var(--steel-200)" }}>
            {icon}
          </span>
        )}
      </div>
      <div className="text-3xl font-black font-display" style={{ color: accentColor }}>
        {value}
      </div>
    </div>
  );

  if (href) return <Link href={href}>{card}</Link>;
  return card;
}

function ReminderCard({
  reminder,
  urgency,
  processLink,
}: {
  reminder: {
    id: string;
    institution: string;
    description: string;
    dueDate: Date;
    process: { id: string; opsStage: string | null; client: { name: string } };
  };
  urgency: "overdue" | "today" | "soon" | "upcoming";
  processLink: string;
}) {
  const borderColor =
    urgency === "overdue"
      ? "var(--signal-500)"
      : urgency === "today"
      ? "#D97706"
      : urgency === "soon"
      ? "#2563EB"
      : "var(--steel-200)";

  const dateBg =
    urgency === "overdue"
      ? { background: "#FEF2F2", color: "var(--signal-500)" }
      : urgency === "today"
      ? { background: "#FFFBEB", color: "#D97706" }
      : urgency === "soon"
      ? { background: "#EFF6FF", color: "#2563EB" }
      : { background: "var(--paper-50)", color: "var(--steel-400)" };

  const daysOverdue =
    urgency === "overdue"
      ? differenceInDays(startOfDay(new Date()), startOfDay(reminder.dueDate))
      : null;

  return (
    <Link href={processLink}>
      <div
        className="p-4 border-l-4 flex items-start justify-between gap-4 hover:opacity-80 transition-opacity"
        style={{
          borderLeftColor: borderColor,
          borderTop: "1px solid var(--steel-200)",
          borderRight: "1px solid var(--steel-200)",
          borderBottom: "1px solid var(--steel-200)",
          background: "white",
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ background: "var(--ink-900)", color: "white" }}
            >
              {reminder.institution}
            </span>
            <span className="text-xs" style={{ color: "var(--steel-400)" }}>
              {reminder.process.client.name}
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--ink-900)" }}>
            {reminder.description}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <div
            className="text-xs font-semibold px-2 py-1 rounded"
            style={dateBg}
          >
            {format(reminder.dueDate, "dd/MM/yyyy", { locale: ptBR })}
          </div>
          {daysOverdue && daysOverdue > 0 && (
            <div className="text-[10px] mt-0.5" style={{ color: "var(--signal-500)" }}>
              {daysOverdue}d atrasado
            </div>
          )}
          {urgency === "today" && (
            <div className="text-[10px] mt-0.5" style={{ color: "#D97706" }}>
              vence hoje
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function ReminderGroup({
  title,
  reminders,
  role,
  emptyText,
}: {
  title: string;
  reminders: Awaited<ReturnType<typeof getHomeReminders>>;
  role: string;
  emptyText?: string;
}) {
  if (reminders.length === 0 && !emptyText) return null;

  return (
    <div>
      <h3
        className="text-xs font-bold uppercase tracking-widest mb-3"
        style={{ color: "var(--steel-400)" }}
      >
        {title}
        {reminders.length > 0 && (
          <span
            className="ml-2 px-1.5 py-0.5 rounded text-[10px]"
            style={{ background: "var(--steel-200)", color: "var(--ink-900)" }}
          >
            {reminders.length}
          </span>
        )}
      </h3>
      {reminders.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--steel-400)" }}>
          {emptyText}
        </p>
      ) : (
        <div className="space-y-2">
          {reminders.map((r) => {
            const processLink =
              r.process.opsStage
                ? `/dashboard/operacao/${r.process.id}`
                : `/dashboard/vendas/${r.process.id}`;
            const today = startOfDay(new Date());
            const due = startOfDay(r.dueDate);
            const diff = differenceInDays(due, today);
            const urgency =
              diff < 0
                ? "overdue"
                : diff === 0
                ? "today"
                : diff <= 7
                ? "soon"
                : "upcoming";
            return (
              <ReminderCard
                key={r.id}
                reminder={r}
                urgency={urgency}
                processLink={processLink}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const roles = session.user.roles;

  const [reminders, summary] = await Promise.all([
    getHomeReminders(),
    getHomeSummary(),
  ]);

  const today = startOfDay(new Date());

  const overdueReminders = reminders.filter(
    (r) => differenceInDays(startOfDay(r.dueDate), today) < 0
  );
  const todayReminders = reminders.filter((r) => isToday(r.dueDate));
  const soonReminders = reminders.filter((r) => {
    const diff = differenceInDays(startOfDay(r.dueDate), today);
    return diff > 0 && diff <= 7;
  });
  const upcomingReminders = reminders.filter(
    (r) => differenceInDays(startOfDay(r.dueDate), today) > 7
  );

  const totalActive = reminders.length;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="font-display text-4xl font-black"
          style={{ color: "var(--ink-900)" }}
        >
          Bom dia, {session.user.name.split(" ")[0]}.
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--steel-400)" }}>
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Summary cards — role-specific */}
      {roles.includes("VENDEDOR") && !roles.includes("ADMIN") && !roles.includes("FINANCEIRO") && !roles.includes("OPERADOR") && "emAndamento" in summary && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <SummaryCard
            label="Processos ativos"
            value={summary.emAndamento ?? 0}
            href="/dashboard/vendas"
          />
          <SummaryCard
            label="Devolvidos com pendências"
            value={summary.devolvidos ?? 0}
            accent={(summary.devolvidos ?? 0) > 0 ? "red" : "default"}
            href="/dashboard/vendas?stage=DEVOLVIDO_PENDENCIAS"
          />
          <SummaryCard
            label="Lembretes vencidos"
            value={summary.overdueReminders ?? 0}
            accent={(summary.overdueReminders ?? 0) > 0 ? "red" : "default"}
          />
        </div>
      )}

      {roles.includes("OPERADOR") && !roles.includes("ADMIN") && !roles.includes("FINANCEIRO") && "aIniciar" in summary && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <SummaryCard
            label="Aguardando início"
            value={summary.aIniciar ?? 0}
            accent={(summary.aIniciar ?? 0) > 0 ? "amber" : "default"}
            href="/dashboard/operacao?stage=A_INICIAR"
          />
          <SummaryCard
            label="Em andamento"
            value={summary.emAndamento ?? 0}
            href="/dashboard/operacao"
          />
          <SummaryCard
            label="Lembretes vencidos"
            value={summary.overdueReminders ?? 0}
            accent={(summary.overdueReminders ?? 0) > 0 ? "red" : "default"}
          />
        </div>
      )}

      {(roles.includes("ADMIN") || roles.includes("FINANCEIRO")) && "totalActive" in summary && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <SummaryCard
            label="Processos em operação"
            value={summary.totalActive ?? 0}
            href="/dashboard/operacao"
          />
          <SummaryCard
            label="Aguardando início"
            value={summary.aIniciar ?? 0}
            accent={(summary.aIniciar ?? 0) > 0 ? "amber" : "default"}
            href="/dashboard/operacao?stage=A_INICIAR"
          />
          <SummaryCard
            label="Lembretes vencidos"
            value={summary.overdueReminders ?? 0}
            accent={(summary.overdueReminders ?? 0) > 0 ? "red" : "default"}
          />
        </div>
      )}

      {/* Reminders section */}
      <div
        className="p-6 border"
        style={{ borderColor: "var(--steel-200)", background: "white" }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-sm font-bold uppercase tracking-wider"
            style={{ color: "var(--ink-900)" }}
          >
            Lembretes
          </h2>
          {totalActive > 0 && (
            <span className="text-xs" style={{ color: "var(--steel-400)" }}>
              {totalActive} pendente{totalActive !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {reminders.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--steel-400)" }}>
            Nenhum lembrete pendente. Tudo em dia!
          </p>
        ) : (
          <div className="space-y-8">
            {overdueReminders.length > 0 && (
              <ReminderGroup
                title="Atrasados"
                reminders={overdueReminders}
                role={roles[0]}
              />
            )}
            {todayReminders.length > 0 && (
              <ReminderGroup
                title="Vence hoje"
                reminders={todayReminders}
                role={roles[0]}
              />
            )}
            {soonReminders.length > 0 && (
              <ReminderGroup
                title="Próximos 7 dias"
                reminders={soonReminders}
                role={roles[0]}
              />
            )}
            {upcomingReminders.length > 0 && (
              <ReminderGroup
                title="Futuros"
                reminders={upcomingReminders}
                role={roles[0]}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
