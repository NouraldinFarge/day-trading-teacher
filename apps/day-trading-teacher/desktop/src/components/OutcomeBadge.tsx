export function OutcomeBadge({ value }: { value: string }) {
  return (
    <span className={`badge badge-${value.replace("_", "-")}`}>
      {value.replace("_", " ")}
    </span>
  );
}
