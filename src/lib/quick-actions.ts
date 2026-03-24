export const QUICK_ACTIONS = {
  lums_assign_route: {
    module: "lums",
    label: "Asignar ruta formativa",
    successMessage: "Ruta formativa asignada correctamente.",
  },
  lums_generate_report: {
    module: "lums",
    label: "Generar reporte de madurez",
    successMessage: "Reporte de madurez generado.",
  },
  insights_generate_brief: {
    module: "insights",
    label: "Generar brief de oportunidad",
    successMessage: "Brief de oportunidad generado.",
  },
  insights_export_signals: {
    module: "insights",
    label: "Exportar señales",
    successMessage: "Señales exportadas correctamente.",
  },
  insights_signal_action: {
    module: "insights",
    label: "Acción de señal",
    successMessage: "Acción aplicada sobre la señal.",
  },
  builder_create_experiment: {
    module: "builder-lab",
    label: "Crear nuevo experimento",
    successMessage: "Experimento creado en Builder Lab.",
  },
  builder_open_mvp_board: {
    module: "builder-lab",
    label: "Abrir tablero MVP",
    successMessage: "Tablero MVP abierto correctamente.",
  },
  capital_approve_reallocation: {
    module: "capital-ops",
    label: "Aprobar reasignación",
    successMessage: "Reasignación aprobada.",
  },
  capital_open_committee: {
    module: "capital-ops",
    label: "Abrir comité financiero",
    successMessage: "Comité financiero abierto.",
  },
} as const;

export type QuickActionKey = keyof typeof QUICK_ACTIONS;
export type QuickActionModule =
  (typeof QUICK_ACTIONS)[QuickActionKey]["module"];

export type QuickActionExecution = {
  actionKey: QuickActionKey;
  module: QuickActionModule;
  userId: string;
  executionId: string;
  performedAt: string;
  message: string;
  context?: string;
};

export function executeQuickAction(params: {
  actionKey: QuickActionKey;
  module: QuickActionModule;
  userId: string;
  context?: string;
}): QuickActionExecution {
  const action = QUICK_ACTIONS[params.actionKey];

  return {
    actionKey: params.actionKey,
    module: params.module,
    userId: params.userId,
    executionId: crypto.randomUUID(),
    performedAt: new Date().toISOString(),
    message: action.successMessage,
    context: params.context,
  };
}
