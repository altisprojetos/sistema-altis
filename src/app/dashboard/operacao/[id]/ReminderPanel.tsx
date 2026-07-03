"use client";

import { useState, useTransition } from "react";
import { addReminder, resolveReminder } from "@/lib/actions/processes";

interface Reminder {
  id: string;
  institution: string;
  description: string;
  dueDate: Date | string;
  done: boolean;
}

export function ReminderPanel({ processId, reminders }: { processId: string; reminders: Reminder[] }) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [institution, setInstitution] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  function handleAdd() {
    if (!institution || !dueDate) return;
    startTransition(async () => {
      await addReminder({ processId, institution, description, dueDate });
      setInstitution(""); setDescription(""); setDueDate("");
      setShowForm(false);
    });
  }

  function handleResolve(id: string) {
    startTransition(() => resolveReminder(id, processId));
  }

  const pending = reminders.filter((r) => !r.done);
  const done = reminders.filter((r) => r.done);
  const today = new Date();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-[var(--ink-900)]">
          Lembretes / Cobranças
          {pending.length > 0 && (
            <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
              {pending.length}
            </span>
          )}
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-[var(--signal-500)] hover:underline"
        >
          + Novo
        </button>
      </div>

      {showForm && (
        <div className="mb-4 border border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-col gap-2">
          <input
            type="text"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="Instituição (ex: Banco do Brasil, INCRA...)"
            className="border border-gray-200 rounded px-2 py-1.5 text-sm w-full"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            className="border border-gray-200 rounded px-2 py-1.5 text-sm w-full"
          />
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border border-gray-200 rounded px-2 py-1.5 text-sm"
            />
            <button
              onClick={handleAdd}
              disabled={isPending || !institution || !dueDate}
              className="px-3 py-1.5 bg-[var(--ink-900)] text-white text-xs rounded hover:opacity-90 disabled:opacity-50"
            >
              Salvar
            </button>
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-400 hover:underline">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {pending.length === 0 && !showForm && (
        <p className="text-xs text-gray-400">Nenhum lembrete pendente.</p>
      )}

      <div className="flex flex-col gap-2">
        {pending.map((r) => {
          const overdue = new Date(r.dueDate) < today;
          return (
            <div
              key={r.id}
              className={`flex items-start gap-2 rounded p-2 text-sm ${
                overdue ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200"
              }`}
            >
              <div className="flex-1">
                <p className={`font-medium ${overdue ? "text-red-700" : "text-amber-800"}`}>
                  {r.institution}
                  {overdue && <span className="ml-1 text-xs">⚠ Vencido</span>}
                </p>
                {r.description && <p className="text-xs opacity-80">{r.description}</p>}
                <p className="text-xs opacity-60">
                  {new Date(r.dueDate).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <button
                onClick={() => handleResolve(r.id)}
                disabled={isPending}
                className="text-xs text-green-600 border border-green-200 rounded px-2 py-0.5 hover:bg-green-50 disabled:opacity-40"
              >
                ✓ Atendido
              </button>
            </div>
          );
        })}

        {done.length > 0 && (
          <details className="mt-1">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
              {done.length} atendido{done.length > 1 ? "s" : ""}
            </summary>
            <div className="flex flex-col gap-1 mt-1">
              {done.map((r) => (
                <div key={r.id} className="flex gap-2 text-xs text-gray-400 line-through p-1">
                  <span>{r.institution}</span>
                  <span>·</span>
                  <span>{new Date(r.dueDate).toLocaleDateString("pt-BR")}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
