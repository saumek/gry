import type { RoundTimelineItem } from "../lib/types";

type RoundTimelineProps = {
  items: RoundTimelineItem[];
};

export function RoundTimeline({ items }: RoundTimelineProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="round-timeline" data-testid="round-timeline" aria-label="Historia rund">
      <h4>Przebieg rund</h4>
      <div className="round-timeline__row">
        {items.map((item) => (
          <article key={item.round} className={`round-timeline__item round-timeline__item--${item.tone}`}>
            <span className="round-timeline__dot" aria-hidden="true" />
            <small>{`R${item.round}`}</small>
            <span>{item.label}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
