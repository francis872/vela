import type { MetricStatus } from "@/lib/functional-contracts";

type DataStateProps = {
  status: MetricStatus;
  explanation?: string;
  action?: { label: string; href: string };
};

const labels: Record<MetricStatus, string> = {
  READY: "Datos listos",
  INSUFFICIENT_DATA: "Datos insuficientes",
  UNAVAILABLE: "Datos no disponibles",
};

export default function DataState({ status, explanation, action }: DataStateProps) {
  return (
    <div className={`vela-data-state vela-data-state-${status.toLowerCase()}`} role="status">
      <span className="vela-data-state-label">{labels[status]}</span>
      {explanation && <p>{explanation}</p>}
      {action && <a href={action.href} className="btn-ghost">{action.label}</a>}
    </div>
  );
}
