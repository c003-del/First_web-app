/**
 * Placeholder for admin sections that are scaffolded but not yet implemented.
 * Each references the guidelines phase that builds it out.
 */
export function AdminPlaceholder({
  title,
  phase,
  summary,
}: {
  title: string;
  phase: string;
  summary: string;
}) {
  return (
    <div>
      <h1 className="text-2xl">{title}</h1>
      <div className="mt-6 rounded-lg border border-soft bg-surface-1 p-5">
        <p className="text-[13px] font-medium text-accent-primary">{phase}</p>
        <p className="mt-2 text-[14px] leading-6 text-ink-secondary">
          {summary}
        </p>
      </div>
    </div>
  );
}
