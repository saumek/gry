import { ResultChip } from "./result-chip";
import type { RoundBadgeModel } from "../lib/types";

type RoundResultStripProps = {
  title: string;
  description?: string;
  badges: RoundBadgeModel[];
};

export function RoundResultStrip({ title, description, badges }: RoundResultStripProps) {
  return (
    <section className="round-strip motion-fade-up" data-testid="round-result-strip">
      <h3>{title}</h3>
      {description ? <p className="muted">{description}</p> : null}
      <div className="result-chip-row">
        {badges.map((badge, index) => (
          <ResultChip key={`${badge.label}-${index}`} tone={badge.tone} icon={badge.icon} label={badge.label} />
        ))}
      </div>
    </section>
  );
}
