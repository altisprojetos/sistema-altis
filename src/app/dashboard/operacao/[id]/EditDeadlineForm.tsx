"use client";

import { useState, useTransition } from "react";
import { updateExpectedCompletionDate } from "@/lib/actions/processes";

interface Props {
  processId: string;
  currentDate: Date | null | undefined;
}

function fmt(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function toInputValue(d: Date | null | undefined) {
  if (!d) return "";
  const dt = new Date(d);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function EditDeadlineForm({ processId, currentDate }: Props) {
  const [editing, setEditing] = useState(false);
  const [newDate, setNewDate] = useState(toInputValue(currentDate));
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!newDate) return;
    startTransition(async () => {
      await updateExpectedCompletionDate(processId, newDate, comment || undefined);
      setEditing(false);
      setComment("");
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm" style={{ color: "var(--ink-900)" }}>
          {fmt(currentDate)}
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 border"
          style={{ borderColor: "var(--steel-200)", color: "var(--steel-400)" }}
        >
          Editar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-1">
      <input
        type="date"
        value={newDate}
        onChange={(e) => setNewDate(e.target.value)}
        className="border px-2 py-1 text-sm w-full focus:outline-none focus:ring-1"
        style={{
          borderColor: "var(--steel-200)",
          background: "var(--paper-50)",
          color: "var(--ink-900)",
        }}
      />
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Motivo da alteração (opcional)"
        className="border px-2 py-1 text-xs w-full focus:outline-none"
        style={{
          borderColor: "var(--steel-200)",
          background: "var(--paper-50)",
          color: "var(--ink-900)",
        }}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !newDate}
          className="px-3 py-1 text-xs font-bold uppercase tracking-wider disabled:opacity-50"
          style={{ background: "var(--ink-900)", color: "white" }}
        >
          {isPending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setNewDate(toInputValue(currentDate)); setComment(""); }}
          className="text-xs"
          style={{ color: "var(--steel-400)" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
