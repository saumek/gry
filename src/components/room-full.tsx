export function RoomFull() {
  return (
    <section className="entry-screen entry-screen--warning" data-testid="room-full">
      <div className="duel-hero duel-hero--warning">
        <p className="duel-hero__eyebrow">Lobby Locked</p>
        <h1 className="duel-hero__title">
          ROOM <span>FULL</span>
        </h1>
        <p className="duel-hero__copy">
          Oba miejsca są już zajęte. W tym pokoju grają teraz Samuel i Patryk. Spróbuj ponownie za chwilę.
        </p>
      </div>
    </section>
  );
}
