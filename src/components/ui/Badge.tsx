const styles: Record<string, { bg: string; color: string }> = {
  RURAL:                { bg: "#E6F4EA", color: "#1B6B2E" },
  URBANO:               { bg: "#E8F0FE", color: "#1A56CC" },
  PROSPECCAO:           { bg: "#FFF3E0", color: "#E65100" },
  SERVICO_FECHADO:      { bg: "#E3F2FD", color: "#1565C0" },
  DOCUMENTACAO_COLETADA:{ bg: "#F3E5F5", color: "#6A1B9A" },
  ENVIADO_OPERACAO:     { bg: "#E8F5E9", color: "#2E7D32" },
  DEVOLVIDO_PENDENCIAS: { bg: "#FFEBEE", color: "#C62828" },
  A_INICIAR:            { bg: "#ECEFF1", color: "#37474F" },
  ELABORAR:             { bg: "#E3F2FD", color: "#1565C0" },
  ANALISE:              { bg: "#FFF8E1", color: "#F57F17" },
  DEVOLVIDO:            { bg: "#FFEBEE", color: "#C62828" },
  PARALISADO:           { bg: "#F3E5F5", color: "#6A1B9A" },
  FINALIZADO:           { bg: "#E8F5E9", color: "#2E7D32" },
  PENDENTE:             { bg: "#FFF8E1", color: "#F57F17" },
  ASSINADO:             { bg: "#E8F5E9", color: "#2E7D32" },
  ZAPSIGN:              { bg: "#E8F0FE", color: "#1A56CC" },
  FISICO:               { bg: "#ECEFF1", color: "#37474F" },
  PAGA:                 { bg: "#E8F5E9", color: "#2E7D32" },
};

const labels: Record<string, string> = {
  RURAL: "Rural",
  URBANO: "Urbano",
  PROSPECCAO: "Prospecção",
  SERVICO_FECHADO: "Serviço Fechado",
  DOCUMENTACAO_COLETADA: "Doc. Coletada",
  ENVIADO_OPERACAO: "Em Operação",
  DEVOLVIDO_PENDENCIAS: "Devolvido",
  A_INICIAR: "A Iniciar",
  ELABORAR: "Elaborar",
  ANALISE: "Análise",
  DEVOLVIDO: "Devolvido",
  PARALISADO: "Paralisado",
  FINALIZADO: "Finalizado",
  PENDENTE: "Pendente",
  ASSINADO: "Assinado",
  ZAPSIGN: "ZapSign",
  FISICO: "Físico",
  PAGA: "Paga",
};

export default function Badge({ value }: { value: string }) {
  const style = styles[value] ?? { bg: "var(--paper-100)", color: "var(--steel-400)" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold"
      style={{ background: style.bg, color: style.color }}
    >
      {labels[value] ?? value}
    </span>
  );
}
