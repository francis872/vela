/**
 * VELA Data Classification — single source of truth for sensitivity levels.
 *
 * Controls (access rules, encryption decisions, export restrictions) reference
 * this catalog instead of being hardcoded per view. Not rendered as a page.
 */

export type DataClassification = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "HIGHLY_SENSITIVE";

export type ClassifiedEntity = {
  entity: string;
  classification: DataClassification;
  notes: string;
};

export const DATA_CLASSIFICATION: readonly ClassifiedEntity[] = [
  // PUBLIC
  { entity: "InspirePost", classification: "PUBLIC", notes: "Contenido publicado por el usuario para la comunidad" },
  { entity: "SpaceResource", classification: "PUBLIC", notes: "Recursos compartidos" },
  { entity: "Venture (name, sector, stage)", classification: "PUBLIC", notes: "Identidad pública opcional del venture" },

  // INTERNAL
  { entity: "Objective / Signal / Sprint / Gate / Decision", classification: "INTERNAL", notes: "Datos operacionales del venture; solo owner y staff autorizado" },
  { entity: "Thread / CoworkingMessage", classification: "INTERNAL", notes: "Colaboración interna de la plataforma" },
  { entity: "EngagementMetric", classification: "INTERNAL", notes: "Métricas de uso del producto" },

  // CONFIDENTIAL
  { entity: "Evaluation (monthlyRevenue, costs)", classification: "CONFIDENTIAL", notes: "Datos financieros del venture" },
  { entity: "Diagnostic responses", classification: "CONFIDENTIAL", notes: "Información sensible del negocio" },
  { entity: "AccessLog / AuditLog / SecurityEvent", classification: "CONFIDENTIAL", notes: "Trazabilidad de seguridad; admin only" },

  // HIGHLY_SENSITIVE
  { entity: "User.passwordHash", classification: "HIGHLY_SENSITIVE", notes: "Hash scrypt; nunca salir del servidor" },
  { entity: "User.mfaSecret", classification: "HIGHLY_SENSITIVE", notes: "Secreto TOTP; nunca exponer tras enrollment" },
  { entity: "AuthSession.tokenHash / *Token.tokenHash", classification: "HIGHLY_SENSITIVE", notes: "Tokens siempre hasheados" },
  { entity: "AIModel.apiKey", classification: "HIGHLY_SENSITIVE", notes: "Credenciales de proveedores" },
] as const;

export function getClassification(entity: string): DataClassification {
  const normalized = entity.toLowerCase();
  const exact = DATA_CLASSIFICATION.find((item) => item.entity.toLowerCase() === normalized);
  if (exact) return exact.classification;
  const partial = DATA_CLASSIFICATION.find((item) => normalized.startsWith(item.entity.toLowerCase().split(" ")[0]));
  return partial?.classification ?? "INTERNAL";
}

/** Whether a field may leave the server (API responses). HIGHLY_SENSITIVE never does. */
export function isExposable(entity: string): boolean {
  return getClassification(entity) !== "HIGHLY_SENSITIVE";
}
