"use client";

import { useState, useTransition } from "react";
import { updateOpsStage, addDevolution, finalizeProcess, assignAnalyst } from "@/lib/actions/processes";
import { OpsStage } from "@prisma/client";

const STAGE_FLOW: Partial<Record<OpsStage, OpsStage>> = {
  A_INICIAR: "ELABORAR",
  ELABORAR:  "ANALISE",
  ANALISE:   "FINALIZADO",
};

const STAGE_LABELS: Record<string, string> = {
  A_INICIAR: "A Iniciar", ELABORAR: "Elaborar",
  ANALISE: "Análise",     DEVOLVIDO: "Devolvido",
  PARALISADO: "Paralisado", FINALIZADO: "Finalizado",
};

interface Analyst { id: string; name: string }

interface Props {
  processId: string;
  currentStage: OpsStage;
  analysts: Analyst[];
  currentAnalystId: string | null;
  totalValue: number;
  pendingRemindersCount: number;
}

export function OpsActions({ processId, currentStage, analysts, currentAnalystId, totalValue, pendingRemindersCount }: Props) {
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [motivo, setMotivo] = useState("");
  const [motivoError, setMotivoError] = useState("");
  const [view, setView] = useState<"main" | "devolver" | "paralisar" | "finalizar">("main");

  // Devolução
  const [pendencies, setPendencies] = useState("");

  // Paralisado
  const [pauseReason, setPauseReason] = useState("");

  // Finalizar
  const [hasBankPayment, setHasBankPayment] = useState(false);
  const [bankStart, setBankStart] = useState("");
  const [bankCount, setBankCount] = useState(1);
  const [bankInterval, setBankInterval] = useState("mensal");

  // Atribuir analista
  const [analystId, setAnalystId] = useState(currentAnalystId ?? "");

  const nextStage = STAGE_FLOW[currentStage];
  const isDone = currentStage === "FINALIZADO";

  const hasPending = pendingRemindersCount > 0;

  function advance() {
    if (!nextStage) return;
    if (hasPending && !motivo.trim()) {
      setMotivoError("Informe o motivo para prosseguir com lembretes pendentes.");
      return;
    }
    setMotivoError("");
    const base = comment || `Avançado para ${STAGE_LABELS[nextStage]}`;
    const finalComment = hasPending
      ? `[Prosseguiu com ${pendingRemindersCount} lembrete(s) pendente(s)] ${motivo} — ${base}`
      : base;
    startTransition(() => updateOpsStage(processId, nextStage, finalComment));
  }

  function handleDevolver() {
    if (!pendencies.trim()) return;
    startTransition(() => addDevolution(processId, pendencies));
  }

  function handleParalisar() {
    startTransition(() =>
      updateOpsStage(processId, "PARALISADO", pauseReason || "Processo paralisado")
    );
  }

  function handleFinalizar() {
    startTransition(() =>
      finalizeProcess({
        processId,
        comment: comment || "Processo finalizado",
        bankPaymentStartDate: hasBankPayment ? bankStart : undefined,
        bankPaymentCount:     hasBankPayment ? bankCount : undefined,
        bankPaymentInterval:  hasBankPayment ? bankInterval : undefined,
      })
    );
  }

  function handleAssignAnalyst() {
    if (!analystId) return;
    startTransition(() => assignAnalyst(processId, analystId));
  }

  if (isDone) {
    return (
      <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700 font-medium">
        ✓ Processo finalizado
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-gray-100">
      {/* Atribuir analista */}
      {analysts.length > 0 && (
        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-gray-500">Analista responsável</label>
            <select
              value={analystId}
              onChange={(e) => setAnalystId(e.target.value)}
              className="border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none"
            >
              <option value="">— selecione —</option>
              {analysts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAssignAnalyst}
            disabled={isPending || !analystId || analystId === currentAnalystId}
            className="px-4 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            {analystId === currentAnalystId ? "Atribuído" : "Atribuir"}
          </button>
        </div>
      )}

      {/* Aviso de lembretes pendentes */}
      {hasPending && view === "main" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex flex-col gap-2">
          <p className="text-xs font-semibold text-red-700">
            ⚠ {pendingRemindersCount} lembrete{pendingRemindersCount > 1 ? "s" : ""} pendente{pendingRemindersCount > 1 ? "s" : ""} não atendido{pendingRemindersCount > 1 ? "s" : ""}
          </p>
          <p className="text-xs text-red-600">Para avançar de etapa, informe o motivo abaixo.</p>
          <input
            type="text"
            value={motivo}
            onChange={(e) => { setMotivo(e.target.value); setMotivoError(""); }}
            placeholder="Motivo para prosseguir com pendências em aberto..."
            className="border border-red-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-400 bg-white"
          />
          {motivoError && (
            <p className="text-xs text-red-600">{motivoError}</p>
          )}
        </div>
      )}

      {/* Comentário */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500">Comentário (opcional)</label>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Anotação sobre esta mudança..."
          className="border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--signal-500)]"
        />
      </div>

      {/* Ações principais */}
      {view === "main" && (
        <div className="flex gap-2 flex-wrap">
          {nextStage && nextStage !== "FINALIZADO" && (
            <button
              onClick={advance}
              disabled={isPending}
              className="px-4 py-2 bg-[var(--signal-500)] text-white text-sm rounded font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "Aguarde..." : `Avançar → ${STAGE_LABELS[nextStage]}`}
            </button>
          )}
          {nextStage === "FINALIZADO" && (
            <button
              onClick={() => setView("finalizar")}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded font-medium hover:opacity-90"
            >
              Finalizar Processo
            </button>
          )}
          <button
            onClick={() => setView("devolver")}
            className="px-4 py-2 border border-red-200 text-red-600 text-sm rounded hover:bg-red-50"
          >
            Devolver ao Vendedor
          </button>
          {currentStage !== "PARALISADO" && (
            <button
              onClick={() => setView("paralisar")}
              className="px-4 py-2 border border-purple-200 text-purple-600 text-sm rounded hover:bg-purple-50"
            >
              Paralisar
            </button>
          )}
          {currentStage === "PARALISADO" && (
            <button
              onClick={() => updateOpsStage(processId, "ELABORAR", "Processo retomado")}
              disabled={isPending}
              className="px-4 py-2 border border-blue-200 text-blue-600 text-sm rounded hover:bg-blue-50"
            >
              Retomar → Elaborar
            </button>
          )}
        </div>
      )}

      {/* Form devolução */}
      {view === "devolver" && (
        <div className="border border-red-200 rounded-lg p-4 bg-red-50 flex flex-col gap-3">
          <p className="text-sm font-semibold text-red-700">Devolver ao Vendedor</p>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600">Pendências (obrigatório) *</label>
            <textarea
              value={pendencies}
              onChange={(e) => setPendencies(e.target.value)}
              rows={3}
              placeholder="Descreva o que está faltando ou precisa ser corrigido..."
              className="border border-red-200 rounded px-3 py-2 text-sm focus:outline-none resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDevolver}
              disabled={isPending || !pendencies.trim()}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "Enviando..." : "Confirmar Devolução"}
            </button>
            <button onClick={() => setView("main")} className="px-4 py-2 text-sm text-gray-500 hover:underline">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Form paralisar */}
      {view === "paralisar" && (
        <div className="border border-purple-200 rounded-lg p-4 bg-purple-50 flex flex-col gap-3">
          <p className="text-sm font-semibold text-purple-700">Paralisar Processo</p>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600">Motivo</label>
            <input
              type="text"
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="Ex: aguardando documentação do órgão, cliente solicitou suspensão..."
              className="border border-purple-200 rounded px-3 py-2 text-sm focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleParalisar}
              disabled={isPending}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "Aguarde..." : "Paralisar"}
            </button>
            <button onClick={() => setView("main")} className="px-4 py-2 text-sm text-gray-500 hover:underline">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Form finalizar */}
      {view === "finalizar" && (
        <div className="border border-green-200 rounded-lg p-4 bg-green-50 flex flex-col gap-4">
          <p className="text-sm font-semibold text-green-700">Finalizar Processo</p>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasBankPayment"
              checked={hasBankPayment}
              onChange={(e) => setHasBankPayment(e.target.checked)}
              className="accent-[var(--signal-500)]"
            />
            <label htmlFor="hasBankPayment" className="text-sm text-gray-700">
              Registrar pagamento ao banco (financiamento)
            </label>
          </div>

          {hasBankPayment && (
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600">Data da 1ª parcela</label>
                <input
                  type="date"
                  value={bankStart}
                  onChange={(e) => setBankStart(e.target.value)}
                  className="border border-green-200 rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600">Nº de parcelas</label>
                <input
                  type="number"
                  min={1}
                  value={bankCount}
                  onChange={(e) => setBankCount(parseInt(e.target.value) || 1)}
                  className="border border-green-200 rounded px-2 py-1.5 text-sm w-24"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-600">Periodicidade</label>
                <select
                  value={bankInterval}
                  onChange={(e) => setBankInterval(e.target.value)}
                  className="border border-green-200 rounded px-2 py-1.5 text-sm"
                >
                  <option value="mensal">Mensal</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
            </div>
          )}

          <div className="bg-white rounded border border-green-200 p-3 text-sm text-gray-600">
            <p className="text-xs text-gray-400 mb-1">Ao finalizar:</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li>Comissões do vendedor e analista serão calculadas sobre <strong>{totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong></li>
              <li>Uma oportunidade de prospecção será criada no painel de Vendas</li>
              {hasBankPayment && <li>Lembretes de vencimento serão criados com 45 dias de antecedência</li>}
            </ul>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleFinalizar}
              disabled={isPending || (hasBankPayment && !bankStart)}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "Finalizando..." : "Confirmar Finalização"}
            </button>
            <button onClick={() => setView("main")} className="px-4 py-2 text-sm text-gray-500 hover:underline">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
