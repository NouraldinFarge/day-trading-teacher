import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  note,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
  tone?: "default" | "positive" | "warning";
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <span className="metric-icon">{icon}</span>
      <div>
        <span className="metric-label">{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}
