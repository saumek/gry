type SectionDividerProps = {
  label?: string;
};

export function SectionDivider({ label }: SectionDividerProps) {
  return (
    <div className="section-divider" role="separator" aria-label={label ?? "separator sekcji"}>
      {label ? <span>{label}</span> : null}
    </div>
  );
}
