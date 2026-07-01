export const QUICK_ACTIONS = {
  align_team: {
    module: "lums",
    message: "Alineaste al equipo con un objetivo de aprendizaje operativo.",
  },
  lums_assign_route: {
    module: "lums",
    message: "Asignaste una ruta formativa en LUMS.",
  },
  lums_generate_report: {
    module: "lums",
    message: "Generaste un reporte de madurez en LUMS.",
  },
  map_signal: {
    module: "insights",
    message: "Registraste una señal crítica para toma de decisiones.",
  },
  insights_signal_action: {
    module: "insights",
    message: "Ejecutaste una acción sobre una señal estratégica.",
  },
  insights_generate_brief: {
    module: "insights",
    message: "Generaste un brief de oportunidad en Insights.",
  },
  insights_export_signals: {
    module: "insights",
    message: "Exportaste señales del módulo de Insights.",
  },
  validate_hypothesis: {
    module: "builder-lab",
    message: "Validaste una hipótesis de producto en Builder Lab.",
  },
  improve_runway: {
    module: "capital-ops",
    message: "Actualizaste una acción para mejorar runway y operaciones.",
  },
  capital_approve_reallocation: {
    module: "capital-ops",
    message: "Aprobaste una reasignación de capital.",
  },
  capital_open_committee: {
    module: "capital-ops",
    message: "Abriste un comité financiero en Capital y Operaciones.",
  },
} as const;

export type QuickActionKey = keyof typeof QUICK_ACTIONS;