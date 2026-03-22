"use client";

type PinEntryProps = {
  pin: string;
  onPinChange: (next: string) => void;
  onSubmit: () => void;
  isBusy: boolean;
  message?: string;
};

const players = [
  { id: "Samuel", label: "PLAYER 01", accent: "primary", status: "Połączony kodem pokoju" },
  { id: "Patryk", label: "PLAYER 02", accent: "secondary", status: "Dołączy po wyborze roli" }
] as const;

export function PinEntry({ pin, onPinChange, onSubmit, isBusy, message }: PinEntryProps) {
  return (
    <section className="entry-screen" data-testid="pin-entry">
      <div className="duel-hero duel-hero--login">
        <p className="duel-hero__eyebrow">Ready To Sync?</p>
        <h1 className="duel-hero__title">
          IDENTITY <span>SYNC</span>
        </h1>
        <p className="duel-hero__copy">
          Samuel i Patryk wpadają do jednego pokoju przez wspólny kod. Najpierw połącz sesję, potem wybierzesz
          swoje imię.
        </p>
      </div>

      <div className="duel-role-stack duel-role-stack--preview" aria-hidden="true">
        {players.map((player, index) => (
          <article
            key={player.id}
            className={`duel-role-card duel-role-card--${player.accent} ${index === 1 ? "is-shifted" : ""}`}
          >
            <div className="duel-role-card__avatar">{player.id.slice(0, 1)}</div>
            <div className="duel-role-card__copy">
              <div className="duel-role-card__meta">
                <span>{player.label}</span>
                <span className={`duel-role-card__pulse ${index === 0 ? "is-live" : ""}`} />
              </div>
              <strong>{player.id}</strong>
              <small>{player.status}</small>
            </div>
            <span className="duel-role-card__chevron" aria-hidden="true">
              ›
            </span>
          </article>
        ))}
      </div>

      <form
        className="entry-console"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isBusy) {
            onSubmit();
          }
        }}
      >
        <label htmlFor="pin" className="entry-console__label">
          Kod pokoju
        </label>
        <input
          id="pin"
          className="input input--duel"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Wpisz kod pokoju"
          value={pin}
          onChange={(event) => onPinChange(event.target.value)}
          minLength={4}
          maxLength={32}
          required
        />

        <button className={`btn btn--duel ${isBusy ? "btn--loading" : ""}`} type="submit" disabled={isBusy}>
          {isBusy ? "ŁĄCZENIE..." : "WEJDŹ DO POKOJU"}
        </button>

        <div className="entry-console__footer">
          <span>Pokój prywatny dla dwóch osób</span>
          <span>Samuel + Patryk</span>
        </div>
      </form>

      {message ? (
        <p className="feedback-inline feedback-inline--error entry-console__feedback" role="status">
          {message}
        </p>
      ) : null}
    </section>
  );
}
