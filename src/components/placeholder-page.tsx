export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-display font-semibold tracking-tight">{title}</h1>
      <div className="rounded-lg border border-dashed border-border bg-background-elevated p-8">
        <p className="text-body text-foreground-muted">{description}</p>
      </div>
    </div>
  );
}
