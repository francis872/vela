import type { MetricResult } from "@/lib/functional-contracts";

type MetricProps = {
  label: string;
  result: MetricResult;
  source?: string;
  trend?: string;
};

export default function Metric({ label, result, source, trend }: MetricProps) {
  const value = result.value === null ? "—" : result.value;
  return (
    <div className="vela-metric" data-status={result.status}>
      <div className="vela-metric-label">{label}</div>
      <div className="vela-metric-value">{value}{result.value === null ? "" : "%"}</div>
      <div className="vela-metric-meta">
        <span>{result.status === "READY" ? "Ready" : result.status === "INSUFFICIENT_DATA" ? "Insufficient data" : "Unavailable"}</span>
        {trend && <span>{trend}</span>}
      </div>
      {result.explanation && <p className="vela-metric-explanation">{result.explanation}</p>}
      {source && <span className="vela-metric-source">Source: {source}</span>}
    </div>
  );
}
