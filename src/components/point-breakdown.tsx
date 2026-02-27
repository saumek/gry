import type { PointBreakdownItem } from "../lib/types";

type PointBreakdownProps = {
  title?: string;
  items: PointBreakdownItem[];
};

export function PointBreakdown({ title = "Punktacja", items }: PointBreakdownProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="point-breakdown" aria-label={title} data-testid="point-breakdown">
      <h4>{title}</h4>
      <div className="point-breakdown__list">
        {items.map((item, index) => (
          <article
            key={`${item.label}-${item.value}`}
            className={`point-breakdown__item point-breakdown__item--${item.tone}`}
            style={{ ["--pb-delay" as string]: `${index * 50}ms` }}
          >
            <span className="point-breakdown__icon" aria-hidden="true">
              {item.icon}
            </span>
            <div className="point-breakdown__content">
              <strong>{item.label}</strong>
              {item.detail ? <small>{item.detail}</small> : null}
            </div>
            <span className="point-breakdown__value">{item.value}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
