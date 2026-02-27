import type { ReactNode } from "react";

import type { ResultHeroModel } from "../lib/types";

type ResultHeroProps = {
  model: ResultHeroModel;
  children?: ReactNode;
};

export function ResultHero({ model, children }: ResultHeroProps) {
  return (
    <section className={`result-hero result-hero--${model.tone}`} data-testid="result-hero">
      <header className="result-hero__head">
        <span className="result-hero__icon" aria-hidden="true">
          {model.icon}
        </span>
        <div>
          <h3>{model.title}</h3>
          <p>{model.subtitle}</p>
        </div>
      </header>

      <div className="result-hero__stats">
        {model.stats.map((stat) => (
          <article key={stat.label} className="result-hero__stat">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>

      {children ? <div className="result-hero__actions">{children}</div> : null}
    </section>
  );
}
