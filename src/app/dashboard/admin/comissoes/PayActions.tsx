"use client";

import { useTransition } from "react";
import { payCommission, payAllPendingCommissions } from "@/lib/actions/admin";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function PayButton({ commissionId }: { commissionId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await payCommission(commissionId);
        })
      }
      className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 disabled:opacity-50"
    >
      {isPending ? "..." : "Pagar"}
    </button>
  );
}

export function PayAllButton({
  userId,
  count,
  total,
  label,
}: {
  userId?: string;
  count: number;
  total: number;
  label: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`${label} (${BRL.format(total)})?`)) return;
    startTransition(async () => {
      await payAllPendingCommissions(userId);
    });
  }

  return (
    <button
      disabled={isPending}
      onClick={handleClick}
      className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
    >
      {isPending ? "Processando..." : `Pagar todas (${count})`}
    </button>
  );
}

export function PayAllGlobalButton({ count, total }: { count: number; total: number }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Confirmar pagamento de TODAS as comissões pendentes (${BRL.format(total)})?`)) return;
    startTransition(async () => {
      await payAllPendingCommissions(undefined);
    });
  }

  return (
    <button
      disabled={isPending}
      onClick={handleClick}
      className="ml-auto px-4 py-1.5 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
    >
      {isPending ? "Processando..." : `Pagar todas pendentes`}
    </button>
  );
}
