export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="px-1 pb-1 text-xs font-medium tracking-wider text-muted-foreground uppercase">
        {title}
      </h2>
      {description && <p className="px-1 pb-2 text-xs text-muted-foreground/70">{description}</p>}
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}
