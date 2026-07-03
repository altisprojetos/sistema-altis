"use client";

import { useState, useTransition } from "react";
import { approveProcessCost, rejectProcessCost } from "@/lib/actions/processes";

export function CostApproveButton({ costId }: { costId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => startTransition(() => approveProcessCost(costId))}
      disabled={isPending}
      className="px-2.5 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
    >
      {isPending ? "..." : "Aprovar"}
    </button>
  );
}

export function CostRejectButton({ costId }: { costId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-2.5 py-1 text-xs rounded border border-red-300 text-red-600 hover:bg-red-50"
      >
        Rejeitar
      </button>
    );
  }

  return (
    <div className="flex gap-1.5 items-center">
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo da rejeição"
        className="border border-gray-200 rounded px-2 py-1 text-xs w-40"
        autoFocus
      />
      <button
        onClick={() => {
          if (!reason.trim()) return;
          startTransition(async () => {
            await rejectProcessCost(costId, reason);
            setOpen(false);
          });
        }}
        disabled={isPending || !reason.trim()}
        className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
      >
        {isPending ? "..." : "Confirmar"}
      </button>
      <button
        onClick={() => { setOpen(false); setReason(""); }}
        className="text-xs text-gray-400 hover:underline"
      >
        Cancelar
      </button>
    </div>
  );
}
