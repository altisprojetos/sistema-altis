export type PriceType =
  | "fixed"           // valor fixo
  | "percent"         // % sobre valor informado (financiamentos)
  | "per_hectare"     // fixo + por hectare, com variação por confrontantes
  | "per_sqm"         // fixo + por m²
  | "per_sqm_lot"     // fixo + por m² por lote (acima de limite)
  | "per_ha_lot"      // fixo + por ha por lote (acima de limite)
  | "per_ha_env"      // por hectare (ambiental) com mínimo
  | "per_ha_map"      // mapeamento: fixo até 20ha, depois por ha
  | "enquadramento"   // precisa enquadramento manual
  | "suspenso"        // serviço suspenso
  | "consultar";      // necessita consulta (valor manual)

export interface ServiceQuestion {
  field: string;
  label: string;
  type: "number" | "select";
  options?: { value: string; label: string }[];
  unit?: string;
}

export interface Service {
  key: string;
  group: string;
  groupLabel: string;
  name: string;
  subtype?: string;
  priceType: PriceType;
  baseValue?: number;       // valor fixo ou mínimo
  percentRate?: number;     // taxa percentual (ex: 0.03 = 3%)
  perUnitValue?: number;    // valor por unidade (ha, m²)
  minValue?: number;
  limit?: number;           // limite (ha ou m²) para mudança de regra
  extraPerUnit?: number;    // valor extra após o limite
  confrontanteRanges?: { max: number; perHa: number }[];
  questions?: ServiceQuestion[];
  docNumbers?: number[];    // documentos obrigatórios (tabela mestre)
  suspended?: boolean;
  needsEnquadramento?: boolean;
  needsConsulta?: boolean;
}

export const SERVICES: Service[] = [
  // ─── CRÉDITO RURAL ──────────────────────────────────────────────
  {
    key: "cr_investimento_pecuaria",
    group: "CreditoRural",
    groupLabel: "Crédito Rural / Agronegócio",
    name: "Projeto de Investimento Rural",
    subtype: "Pecuária",
    priceType: "percent",
    percentRate: 0.03,
    minValue: 2500,
    questions: [{ field: "financedValue", label: "Valor do financiamento (R$)", type: "number", unit: "R$" }],
    docNumbers: [2,3,4,5,6,7,9,10,11,12,13,14,15,16,17,18,19,26],
  },
  {
    key: "cr_investimento_agricultura",
    group: "CreditoRural",
    groupLabel: "Crédito Rural / Agronegócio",
    name: "Projeto de Investimento Rural",
    subtype: "Agricultura",
    priceType: "percent",
    percentRate: 0.03,
    minValue: 2500,
    questions: [{ field: "financedValue", label: "Valor do financiamento (R$)", type: "number", unit: "R$" }],
    docNumbers: [2,3,4,5,6,7,9,10,11,12,13,14,16,17,18,19,26],
  },
  {
    key: "cr_investimento_maquinas",
    group: "CreditoRural",
    groupLabel: "Crédito Rural / Agronegócio",
    name: "Projeto de Investimento Rural",
    subtype: "Máquinas e Implementos",
    priceType: "percent",
    percentRate: 0.03,
    minValue: 2500,
    questions: [{ field: "financedValue", label: "Valor do financiamento (R$)", type: "number", unit: "R$" }],
    docNumbers: [2,3,4,5,6,7,9,10,11,12,13,14,16,17,18,19,26],
  },
  {
    key: "cr_custeio_pecuaria",
    group: "CreditoRural",
    groupLabel: "Crédito Rural / Agronegócio",
    name: "Projeto de Custeio Agrícola e Pecuário",
    subtype: "Pecuária",
    priceType: "percent",
    percentRate: 0.03,
    minValue: 2500,
    questions: [{ field: "financedValue", label: "Valor do financiamento (R$)", type: "number", unit: "R$" }],
    docNumbers: [2,3,4,5,6,7,9,10,11,12,13,14,15,16,17,18,19,26],
  },
  {
    key: "cr_custeio_agricultura",
    group: "CreditoRural",
    groupLabel: "Crédito Rural / Agronegócio",
    name: "Projeto de Custeio Agrícola e Pecuário",
    subtype: "Agricultura",
    priceType: "percent",
    percentRate: 0.03,
    minValue: 2500,
    questions: [{ field: "financedValue", label: "Valor do financiamento (R$)", type: "number", unit: "R$" }],
    docNumbers: [2,3,4,5,6,7,9,10,11,12,13,14,16,17,18,19,26],
  },
  {
    key: "cr_irrigacao",
    group: "CreditoRural",
    groupLabel: "Crédito Rural / Agronegócio",
    name: "Projeto para Irrigação",
    priceType: "percent",
    percentRate: 0.03,
    minValue: 2500,
    questions: [{ field: "financedValue", label: "Valor do financiamento (R$)", type: "number", unit: "R$" }],
    docNumbers: [2,3,4,5,6,7,9,10,11,12,13,14,16,17,18,19,26],
  },
  {
    key: "cr_energia_solar",
    group: "CreditoRural",
    groupLabel: "Crédito Rural / Agronegócio",
    name: "Projeto para Energia Solar",
    priceType: "percent",
    percentRate: 0.03,
    minValue: 2500,
    questions: [{ field: "financedValue", label: "Valor do financiamento (R$)", type: "number", unit: "R$" }],
    docNumbers: [2,3,4,5,6,7,9,10,11,12,13,14,15,16,17,18,19,26],
  },
  {
    key: "cr_renegociacao_pecuaria",
    group: "CreditoRural",
    groupLabel: "Crédito Rural / Agronegócio",
    name: "Renegociação de Operações de Crédito Rural",
    subtype: "Pecuária",
    priceType: "percent",
    percentRate: 0.03,
    minValue: 2500,
    questions: [{ field: "financedValue", label: "Valor do financiamento (R$)", type: "number", unit: "R$" }],
    docNumbers: [2,3,4,5,6,7,9,10,11,12,13,14,15,16,17,18,19,26],
  },
  {
    key: "cr_renegociacao_agricultura",
    group: "CreditoRural",
    groupLabel: "Crédito Rural / Agronegócio",
    name: "Renegociação de Operações de Crédito Rural",
    subtype: "Agricultura",
    priceType: "percent",
    percentRate: 0.03,
    minValue: 2500,
    questions: [{ field: "financedValue", label: "Valor do financiamento (R$)", type: "number", unit: "R$" }],
    docNumbers: [2,3,4,5,6,7,9,10,11,12,13,14,16,17,18,19,26],
  },
  {
    key: "cr_inscricao_produtor",
    group: "CreditoRural",
    groupLabel: "Crédito Rural / Agronegócio",
    name: "Inscrição de Produtor Rural",
    priceType: "fixed",
    baseValue: 1500,
    docNumbers: [2,3,6,7,9,10,11,12],
  },
  {
    key: "cr_caf",
    group: "CreditoRural",
    groupLabel: "Crédito Rural / Agronegócio",
    name: "CAF – Cadastro de Agricultor Familiar",
    priceType: "fixed",
    baseValue: 200,
    docNumbers: [2,3,6,7,9,10,11,12,27],
  },
  {
    key: "cr_ccir",
    group: "CreditoRural",
    groupLabel: "Crédito Rural / Agronegócio",
    name: "CCIR – INCRA",
    priceType: "per_hectare",
    baseValue: 500,
    perUnitValue: 0,
    limit: 30,
    extraPerUnit: 12,
    questions: [{ field: "hectares", label: "Área (hectares)", type: "number", unit: "ha" }],
    docNumbers: [2,3,6,7,12],
  },
  {
    key: "cr_itr_criacao",
    group: "CreditoRural",
    groupLabel: "Crédito Rural / Agronegócio",
    name: "ITR – Certidão Negativa do NIRF (CIB)",
    subtype: "Criação",
    priceType: "fixed",
    baseValue: 1500,
    docNumbers: [2,3,6,7,10,12],
  },
  {
    key: "cr_itr_regularizacao",
    group: "CreditoRural",
    groupLabel: "Crédito Rural / Agronegócio",
    name: "ITR – Certidão Negativa do NIRF (CIB)",
    subtype: "Regularização",
    priceType: "fixed",
    baseValue: 1000,
    docNumbers: [2,3,6,7,10,12],
  },

  // ─── AMBIENTAL ───────────────────────────────────────────────────
  {
    key: "amb_ape",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "APE – Autorização de Procedimento Especial",
    priceType: "fixed",
    baseValue: 2500,
    docNumbers: [6,9,10,11,12,20,26],
  },
  {
    key: "amb_lic_mg",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "Licenciamento de Atividade do Empreendimento – MG",
    priceType: "fixed",
    baseValue: 1500,
    docNumbers: [6,9,10,11,12,20,26],
  },
  {
    key: "amb_dispensa_mg",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "Dispensa de Licença – MG",
    priceType: "fixed",
    baseValue: 700,
    docNumbers: [6,9,10,11,12,20,26],
  },
  {
    key: "amb_lic_es",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "Licenciamento de Implantação de Atividade – ES",
    priceType: "fixed",
    baseValue: 5000,
    docNumbers: [6,9,10,11,12,20,26],
  },
  {
    key: "amb_lic_barramento_ba",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "Licenciamento de Barramento Municipal – BA",
    priceType: "fixed",
    baseValue: 5800,
    docNumbers: [6,9,10,11,12,20,26],
  },
  {
    key: "amb_lic_urbano",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "Licenciamento Urbano",
    priceType: "enquadramento",
    needsEnquadramento: true,
    docNumbers: [6,9,10,11,12,20,26],
  },
  {
    key: "amb_gestao_cond",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "Gestão de Condicionantes Ambientais",
    priceType: "enquadramento",
    needsEnquadramento: true,
    docNumbers: [3,6,9,10,11,12,21,26],
  },
  {
    key: "amb_car",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "CAR – Cadastro Ambiental Rural",
    priceType: "per_ha_env",
    perUnitValue: 3,
    minValue: 350,
    questions: [{ field: "hectares", label: "Quantidade de hectares", type: "number", unit: "ha" }],
    docNumbers: [3,6,10,11,12,20,22,26],
  },
  {
    key: "amb_cefir",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "CEFIR – Cadastro Estadual Florestal de Imóveis Rurais",
    priceType: "per_ha_env",
    perUnitValue: 3,
    minValue: 350,
    questions: [{ field: "hectares", label: "Quantidade de hectares", type: "number", unit: "ha" }],
    docNumbers: [3,6,10,11,12,20,23,26],
  },
  {
    key: "amb_ctf",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "CTF – Cadastro Técnico Federal",
    priceType: "fixed",
    baseValue: 400,
    docNumbers: [22,26],
  },
  {
    key: "amb_ceapd",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "CEAPD – Cadastro Estadual de Atividades Potencialmente Degradadoras",
    priceType: "fixed",
    baseValue: 400,
    docNumbers: [6,10,11,23,26],
  },
  {
    key: "amb_raf",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "RAF – Relatório Anual de Atividades",
    priceType: "fixed",
    baseValue: 800,
    docNumbers: [6,10,11,23,26],
  },
  {
    key: "amb_pgrs_nanuque",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "PGRS – Planejamento e Gestão de Resíduos Sólidos",
    subtype: "Obras/Nanuque",
    priceType: "fixed",
    baseValue: 1200,
    docNumbers: [3,6,21,26],
  },
  {
    key: "amb_pgrs_demais",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "PGRS – Planejamento e Gestão de Resíduos Sólidos",
    subtype: "Demais",
    priceType: "enquadramento",
    needsEnquadramento: true,
    docNumbers: [3,6,21,26],
  },
  {
    key: "amb_eia_rima",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "EIA/RIMA – Estudo e Relatório de Impacto Ambiental",
    priceType: "consultar",
    needsConsulta: true,
    docNumbers: [3,6,9,12,20,21,26],
  },
  {
    key: "amb_prada",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "PRADA – Projeto de Recomposição de Áreas Degradadas",
    priceType: "consultar",
    minValue: 3500,
    needsConsulta: true,
    docNumbers: [3,6,9,10,11,12,20,22,23,26],
  },
  {
    key: "amb_pra",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "PRA – Programa de Regularização Ambiental",
    priceType: "fixed",
    baseValue: 3500,
    docNumbers: [3,6,9,10,11,12,20,22,23,26],
  },
  {
    key: "amb_tac",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "Acompanhamento de TAC no Ministério Público",
    priceType: "fixed",
    baseValue: 1500,
    docNumbers: [3,6,9,10,11,12,24,26],
  },
  {
    key: "amb_defesa_multas",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "Defesa de Multas e Notificações Ambientais",
    priceType: "consultar",
    minValue: 2000,
    needsConsulta: true,
    docNumbers: [3,6,9,10,11,12,24,26],
  },
  {
    key: "amb_ptrf",
    group: "Ambiental",
    groupLabel: "Ambiental",
    name: "PTRF – Projeto Técnico de Reconstituição de Flora",
    priceType: "consultar",
    minValue: 3500,
    needsConsulta: true,
    docNumbers: [3,6,9,10,11,12,20,22,23,26],
  },

  // ─── RECURSOS HÍDRICOS ───────────────────────────────────────────
  {
    key: "rh_outorga_insig",
    group: "RecursosHidricos",
    groupLabel: "Recursos Hídricos",
    name: "Outorga de Uso Insignificante – BA e MG",
    priceType: "fixed",
    baseValue: 1000,
    docNumbers: [3,6,9,10,11,12,20,25,26],
  },
  {
    key: "rh_outorga_mg",
    group: "RecursosHidricos",
    groupLabel: "Recursos Hídricos",
    name: "Outorga Superficial – Minas Gerais",
    priceType: "fixed",
    baseValue: 5400,
    docNumbers: [3,6,9,10,11,12,20,25,26],
  },
  {
    key: "rh_outorga_ba",
    group: "RecursosHidricos",
    groupLabel: "Recursos Hídricos",
    name: "Outorga Superficial – Bahia",
    priceType: "fixed",
    baseValue: 7000,
    docNumbers: [3,6,9,10,11,12,20,25,26],
  },
  {
    key: "rh_outorga_es",
    group: "RecursosHidricos",
    groupLabel: "Recursos Hídricos",
    name: "Outorga Superficial – Espírito Santo",
    priceType: "fixed",
    baseValue: 5400,
    docNumbers: [3,6,9,10,11,12,20,25,26],
  },
  {
    key: "rh_outorga_ana",
    group: "RecursosHidricos",
    groupLabel: "Recursos Hídricos",
    name: "Outorga Superficial – ANA (Agência Nacional de Águas)",
    priceType: "fixed",
    baseValue: 7000,
    docNumbers: [3,6,9,10,11,12,20,25,26],
  },
  {
    key: "rh_outorga_sub",
    group: "RecursosHidricos",
    groupLabel: "Recursos Hídricos",
    name: "Outorga Subterrânea – Poços",
    priceType: "suspenso",
    suspended: true,
  },
  {
    key: "rh_dispensa_barramento",
    group: "RecursosHidricos",
    groupLabel: "Recursos Hídricos",
    name: "Dispensa e/ou Outorga para Fins de Barramento",
    priceType: "enquadramento",
    needsEnquadramento: true,
    docNumbers: [3,6,9,10,11,12,20,25,26],
  },
  {
    key: "rh_reg_tanques",
    group: "RecursosHidricos",
    groupLabel: "Recursos Hídricos",
    name: "Regularização de Tanques para Armazenamento de Água",
    priceType: "suspenso",
    suspended: true,
  },
  {
    key: "rh_reg_barramento_ba",
    group: "RecursosHidricos",
    groupLabel: "Recursos Hídricos",
    name: "Regularização Ambiental de Barramentos – Bahia",
    priceType: "fixed",
    baseValue: 7000,
    docNumbers: [3,6,9,10,11,12,20,25,26],
  },
  {
    key: "rh_reg_barramento_mg",
    group: "RecursosHidricos",
    groupLabel: "Recursos Hídricos",
    name: "Regularização Ambiental de Barramentos – MG (até 5 ha)",
    priceType: "fixed",
    baseValue: 7000,
    docNumbers: [3,6,9,10,11,12,20,25,26],
  },
  {
    key: "rh_reg_barramento_ana",
    group: "RecursosHidricos",
    groupLabel: "Recursos Hídricos",
    name: "Regularização Ambiental de Barramentos – ANA",
    priceType: "consultar",
    needsConsulta: true,
    docNumbers: [3,6,9,10,11,12,20,25,26],
  },
  {
    key: "rh_disponibilidade",
    group: "RecursosHidricos",
    groupLabel: "Recursos Hídricos",
    name: "Estudo de Disponibilidade Hídrica",
    priceType: "suspenso",
    suspended: true,
  },
  {
    key: "rh_estudo_agro",
    group: "RecursosHidricos",
    groupLabel: "Recursos Hídricos",
    name: "Estudo Agronômico para Irrigação",
    priceType: "suspenso",
    suspended: true,
  },

  // ─── TOPOGRAFIA ──────────────────────────────────────────────────
  {
    key: "topo_plani_urbano",
    group: "Topografia",
    groupLabel: "Topografia",
    name: "Levantamento Planialtimétrico",
    subtype: "Urbano",
    priceType: "per_sqm",
    baseValue: 800,
    perUnitValue: 2,
    questions: [{ field: "squareMeters", label: "Área (m²)", type: "number", unit: "m²" }],
    docNumbers: [3,6,9,10,11,12,20,25,26],
  },
  {
    key: "topo_plani_rural",
    group: "Topografia",
    groupLabel: "Topografia",
    name: "Levantamento Planialtimétrico",
    subtype: "Rural",
    priceType: "per_hectare",
    perUnitValue: 40,
    confrontanteRanges: [
      { max: 4, perHa: 40 },
      { max: 8, perHa: 55 },
      { max: 12, perHa: 75 },
    ],
    questions: [
      { field: "hectares", label: "Área (hectares)", type: "number", unit: "ha" },
      {
        field: "confrontantes",
        label: "Nº de confrontantes",
        type: "select",
        options: [
          { value: "4", label: "Até 4 confrontantes" },
          { value: "8", label: "De 4 a 8 confrontantes" },
          { value: "12", label: "De 8 a 12 confrontantes" },
        ],
      },
    ],
    docNumbers: [3,6,9,10,11,12,20,25,26],
  },
  {
    key: "topo_geo_incra",
    group: "Topografia",
    groupLabel: "Topografia",
    name: "Georreferenciamento INCRA",
    priceType: "per_hectare",
    baseValue: 3500,
    confrontanteRanges: [
      { max: 4, perHa: 40 },
      { max: 8, perHa: 55 },
      { max: 12, perHa: 75 },
    ],
    questions: [
      { field: "hectares", label: "Área (hectares)", type: "number", unit: "ha" },
      {
        field: "confrontantes",
        label: "Nº de confrontantes",
        type: "select",
        options: [
          { value: "4", label: "Até 4 confrontantes" },
          { value: "8", label: "De 4 a 8 confrontantes" },
          { value: "12", label: "De 8 a 12 confrontantes" },
        ],
      },
    ],
    docNumbers: [3,6,9,10,11,12,20,25,26],
  },
  {
    key: "topo_volume",
    group: "Topografia",
    groupLabel: "Topografia",
    name: "Cálculo de Volume",
    priceType: "suspenso",
    suspended: true,
  },
  {
    key: "topo_terraplanagem",
    group: "Topografia",
    groupLabel: "Topografia",
    name: "Terraplanagem",
    priceType: "consultar",
    needsConsulta: true,
    docNumbers: [3,6,21,25],
  },
  {
    key: "topo_locacao_obra",
    group: "Topografia",
    groupLabel: "Topografia",
    name: "Locação de Obra Civil",
    priceType: "per_sqm",
    baseValue: 800,
    perUnitValue: 2,
    questions: [{ field: "squareMeters", label: "Área (m²)", type: "number", unit: "m²" }],
    docNumbers: [3,6,21,25,26],
  },
  {
    key: "topo_lote_urbano",
    group: "Topografia",
    groupLabel: "Topografia",
    name: "Locação de Divisas e Lotes",
    subtype: "Urbano",
    priceType: "per_sqm_lot",
    baseValue: 400,
    perUnitValue: 2,
    limit: 360,
    questions: [{ field: "squareMeters", label: "Área do lote (m²)", type: "number", unit: "m²" }],
    docNumbers: [3,6,9,10,11,12,20,25,26],
  },
  {
    key: "topo_lote_rural",
    group: "Topografia",
    groupLabel: "Topografia",
    name: "Locação de Divisas e Lotes",
    subtype: "Rural",
    priceType: "per_ha_lot",
    baseValue: 1700,
    limit: 30,
    extraPerUnit: 40,
    questions: [{ field: "hectares", label: "Área do lote (hectares)", type: "number", unit: "ha" }],
    docNumbers: [3,6,9,10,11,12,20,25,26],
  },
  {
    key: "topo_mapeamento",
    group: "Topografia",
    groupLabel: "Topografia",
    name: "Mapeamento para Caracterização Ambiental",
    priceType: "per_ha_map",
    baseValue: 1200,
    limit: 20,
    extraPerUnit: 40,
    questions: [{ field: "hectares", label: "Área (hectares)", type: "number", unit: "ha" }],
    docNumbers: [3,6,9,10,11,12,26],
  },
  {
    key: "topo_aerolevantamento",
    group: "Topografia",
    groupLabel: "Topografia",
    name: "Aerolevantamento",
    priceType: "suspenso",
    suspended: true,
  },

  // ─── REGULARIZAÇÃO FUNDIÁRIA ─────────────────────────────────────
  {
    key: "fund_urbana",
    group: "Fundiaria",
    groupLabel: "Regularização Fundiária",
    name: "Regularização Fundiária Urbana",
    priceType: "suspenso",
    suspended: true,
  },
  {
    key: "fund_rural",
    group: "Fundiaria",
    groupLabel: "Regularização Fundiária",
    name: "Regularização Fundiária Rural",
    priceType: "suspenso",
    suspended: true,
  },
  {
    key: "fund_reurb",
    group: "Fundiaria",
    groupLabel: "Regularização Fundiária",
    name: "REURB",
    priceType: "suspenso",
    suspended: true,
  },
  {
    key: "fund_loteamento",
    group: "Fundiaria",
    groupLabel: "Regularização Fundiária",
    name: "Loteamento",
    priceType: "enquadramento",
    needsEnquadramento: true,
    docNumbers: [3,6,9,10,11,12,20,25,26],
  },
];

// ─── Função de cálculo de preço ──────────────────────────────────────────────
export function calculatePrice(
  service: Service,
  params: {
    hectares?: number;
    squareMeters?: number;
    confrontantes?: number;
    financedValue?: number;
  }
): number | null {
  const { hectares, squareMeters, confrontantes, financedValue } = params;

  switch (service.priceType) {
    case "fixed":
      return service.baseValue ?? null;

    case "percent": {
      if (!financedValue || !service.percentRate) return service.minValue ?? null;
      const val = financedValue * service.percentRate;
      return Math.max(val, service.minValue ?? 0);
    }

    case "per_ha_env": {
      if (!hectares || !service.perUnitValue) return service.minValue ?? null;
      const val = hectares * service.perUnitValue;
      return Math.max(val, service.minValue ?? 0);
    }

    case "per_sqm": {
      if (!squareMeters) return null;
      return (service.baseValue ?? 0) + squareMeters * (service.perUnitValue ?? 0);
    }

    case "per_sqm_lot": {
      if (!squareMeters) return null;
      const base = service.baseValue ?? 0;
      const limit = service.limit ?? 0;
      if (squareMeters <= limit) return base;
      return base + (squareMeters - limit) * (service.perUnitValue ?? 0);
    }

    case "per_ha_lot": {
      if (!hectares) return null;
      const base = service.baseValue ?? 0;
      const limit = service.limit ?? 0;
      if (hectares <= limit) return base;
      return base + (hectares - limit) * (service.extraPerUnit ?? 0);
    }

    case "per_ha_map": {
      if (!hectares) return null;
      const base = service.baseValue ?? 0;
      const limit = service.limit ?? 0;
      if (hectares <= limit) return base;
      return base + (hectares - limit) * (service.extraPerUnit ?? 0);
    }

    case "per_hectare": {
      if (!hectares) return null;
      const base = service.baseValue ?? 0;

      // CCIR: base até 30ha, depois por ha extra
      if (service.key === "cr_ccir") {
        const limit = service.limit ?? 30;
        if (hectares <= limit) return base;
        return base + (hectares - limit) * (service.extraPerUnit ?? 0);
      }

      // Topografia com confrontantes
      if (service.confrontanteRanges && confrontantes) {
        const range = service.confrontanteRanges.find((r) => confrontantes <= r.max);
        const perHa = range?.perHa ?? service.confrontanteRanges[service.confrontanteRanges.length - 1].perHa;
        return base + hectares * perHa;
      }

      return null;
    }

    case "enquadramento":
    case "consultar":
    case "suspenso":
    default:
      return null;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function getServiceByKey(key: string): Service | undefined {
  return SERVICES.find((s) => s.key === key);
}

export function getServicesByGroup(): Record<string, Service[]> {
  return SERVICES.reduce<Record<string, Service[]>>((acc, s) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push(s);
    return acc;
  }, {});
}

export const DOCUMENT_NAMES: Record<number, string> = {
  1:  "Itens de Cadastro / Documentos Pessoais",
  2:  "Certidão de Casamento (quando couber)",
  3:  "Comprovante de Endereço",
  4:  "Comprovante de Renda – Proponente",
  5:  "Comprovante de Renda – Cônjuge",
  6:  "CNH ou RG – Proponente",
  7:  "CNH ou RG – Cônjuge",
  8:  "Itens para Projeto",
  9:  "CAR – Cadastro Ambiental Rural (todas as matrículas)",
  10: "CCIR – INCRA (todas as matrículas)",
  11: "ITR – Certidão Negativa do NIRF (CIB)",
  12: "Certidão de Inteiro Teor / Escritura / Certidão de Posse (todas as matrículas)",
  13: "CAF – PRONAF (quando couber)",
  14: "Licença da Atividade (caso não for PRONAF)",
  15: "Ficha do Gado (ADAB / IMA / INCAPER)",
  16: "Certidão de Uso Insignificante da Água ou Cadastro de Recurso Hídrico",
  17: "Inscrição de Produtor Rural",
  18: "Orçamentos de Máquinas, Equipamentos, Construção, etc.",
  19: "Outros Documentos (se houver necessidade)",
  20: "Mapa do Imóvel (arquivos digitais: SHAP, DWG)",
  21: "Projetos Relacionados",
  22: "Senha GOV",
  23: "Senha SEIA / INema",
  24: "Processo de Autuação Completo",
  25: "Imagens com Descrição do Local (mínimo 5 imagens)",
  26: "Contrato de Prestação de Serviço ALTIS",
  27: "Notas Fiscais de Venda dos Produtos",
};
