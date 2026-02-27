"use client";

type PinEntryProps = {
  pin: string;
  onPinChange: (next: string) => void;
  onSubmit: () => void;
  isBusy: boolean;
  message?: string;
};

export function PinEntry({ pin, onPinChange, onSubmit, isBusy, message }: PinEntryProps) {
  return (
    <section className="section-block section-block--hero" data-testid="pin-entry">
      <p className="muted">Pokój dla dwóch osób. Wpisz kod, aby wejść do wspólnego lobby.</p>

      <form
        className="stack stack--spacious"
        onSubmit={(event) => {
          event.preventDefault();
          if (!isBusy) {
            onSubmit();
          }
        }}
      >
        <label htmlFor="pin" className="label">
          Kod pokoju
        </label>
        <input
          id="pin"
          className="input"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          placeholder="Np. 1234"
          value={pin}
          onChange={(event) => onPinChange(event.target.value)}
          minLength={4}
          maxLength={32}
          required
        />

        <button className={`btn ${isBusy ? "btn--loading" : ""}`} type="submit" disabled={isBusy}>
          {isBusy ? "Łączenie..." : "Wejdź do pokoju"}
        </button>
      </form>

      {message ? <p className="feedback-inline" role="status">{message}</p> : null}
    </section>
  );
}
