export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-soft bg-surface-1 px-6 py-16 text-center">
      <p className="text-ink-primary">{title}</p>
      {hint ? <p className="mt-2 text-[14px] text-ink-muted">{hint}</p> : null}
    </div>
  );
}
