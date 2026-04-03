const colors = {
  operational: "bg-green-500",
  degraded: "bg-yellow-500",
  down: "bg-red-500",
};

interface StatusRowProps {
  label: string;
  status: "operational" | "degraded" | "down";
}

export function StatusRow({ label, status }: StatusRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${colors[status]}`} />
        <span className="text-xs text-muted-foreground capitalize">
          {status}
        </span>
      </div>
    </div>
  );
}
