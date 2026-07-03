"use client";

import { useState, useTransition } from "react";
import { updateSalesStage } from "@/lib/actions/processes";
import { SalesStage, ContractStatus } from "@prisma/client";

const NEXT_STAGE: Partial<Record<SalesStage, { next: SalesStage; label: string }>> = {
  PROSPECCAO: { next: "SERVICO_FECHADO", label: "Marcar como Serviço Fechado" },
  SERVICO_FECHADO: { next: "DOCUMENTACAO_COLETADA", label: "Iniciar Coleta de Documentos" },
  DOCUMENTACAO_COLETADA: { next: "ENVIADO_OPERACAO", label: "Enviar para Operação" },
  DEVOLVIDO_PENDENCIAS: { next: "ENVIADO_OPERACAO", label: "Reenviar para Operação" },
};

const PREV_STAGE: Partial<Record<SalesStage, { prev: SalesStage; label: string }>> = {
  SERVICO_FECHADO: { prev: "PROSPECCAO", label: "Voltar para Prospecção" },
  DOCUMENTACAO_COLETADA: { prev: "SERVICO_FECHADO", label: "Voltar para Serviço Fechado" },
};

interface SalesStageActionsProps {
  processId: string;
  currentStage: SalesStage;
  contractStatus: ContractStatus;
  pendingRemindersCount: number;
}

export function SalesStageActions({
  processId,
  currentStage,
  contractStatus,
  pendingRemindersCount,
}: SalesStageActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  const nextAction = NEXT_STAGE[currentStage];
  const prevAction = PREV_STAGE[currentStage];

  const contractPending =
    nextAction?.next === "ENVIADO_OPERACAO" &&
    contractStatus !== "ASSINADO";

  const hasPending = pendingRemindersCount > 0;

  function handleAdvance() {
    if (!nextAction) return;
    if (hasPending && !motivo.trim()) {
      setError("Informe o motivo para prosseguir com lembretes pendentes.");
      return;
    }
    setError("");
    const finalComment = hasPending
      ? `[Prosseguiu com ${pendingRemindersCount} lembrete(s) pendente(s)] ${motivo}${comment ? " — " + comment : ""}`
      : comment || undefined;
    startTransition(() => updateSalesStage(processId, nextAction.next, finalComment));
  }

  function handleRevert() {
    if (!prevAction) return;
    setError("");
    startTransition(() =>
      updateSalesStage(processId, prevAction.prev, "Etapa revertida")
    );
  }

  if (!nextAction && !prevAction) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-3">

      {hasPending && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-red-700">
            ⚠ {pendingRemindersCount} lembrete{pendingRemindersCount > 1 ? "s" : ""} pendente{pendingRemindersCount > 1 ? "s" : ""} não atendido{pendingRemindersCount > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-red-600">
            Para avançar de etapa, informe o motivo abaixo.
          </p>
          <input
            type="text"
            value={motivo}
            onChange={(e) => { setMotivo(e.target.value); setError(""); }}
            placeholder="Motivo para prosseguir com pendências em aberto..."
            className="border border-red-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-400 bg-white"
          />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">Comentário {hasPending ? "(opcional)" : "(opcional)"}</label>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Anotação sobre a mudança de etapa..."
          className="border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--signal-500)]"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {contractPending && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          ⚠ Contrato ainda pendente. Lembre-se de registrar a assinatura após o envio.
        </p>
      )}

      <div className="flex gap-2 flex-wrap">
        {nextAction && (
          <button
            type="button"
            onClick={handleAdvance}
            disabled={isPending}
            className="px-4 py-2 bg-[var(--signal-500)] text-white text-sm rounded font-medium hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Aguarde..." : nextAction.label}
          </button>
        )}
        {prevAction && (
          <button
            type="button"
            onClick={handleRevert}
            disabled={isPending}
            className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {prevAction.label}
          </button>
        )}
      </div>
    </div>
  );
}
