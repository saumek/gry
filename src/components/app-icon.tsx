type AppIconProps = {
  src: string;
  className?: string;
};

export function AppIcon({ src, className }: AppIconProps) {
  return (
    <span
      className={`app-icon ${className ?? ""}`.trim()}
      style={{ ["--icon-url" as string]: `url(${src})` }}
      aria-hidden="true"
    />
  );
}
