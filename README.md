# DuoPlay

Mobilna aplikacja webowa dla dokładnie 2 osób (`Sami` i `Patryk`) z PIN-em wejścia i grami realtime.

## Stack

- Next.js (App Router, TypeScript)
- Własny serwer Node + Socket.IO
- SQLite w pliku lokalnym (`data/app.db`)
- Testy: Vitest + Playwright

## Wymagania

- Node.js 20+
- npm

## Konfiguracja

1. Skopiuj `.env.example` do `.env`.
2. Ustaw przynajmniej `ROOM_PIN`.

Przykład:

```bash
cp .env.example .env
```

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Aplikacja będzie dostępna pod `http://localhost:3000`.

## Produkcyjnie na Twoim komputerze

```bash
npm run build
npm run start
```

Następnie możesz wystawić port (np. `3000`) przez router (port forwarding).

## Zmienne środowiskowe

- `ROOM_PIN` - kod wejścia do pokoju (wymagany)
- `SESSION_TTL_MS` - timeout sesji roli (domyślnie `30000`)
- `HEARTBEAT_INTERVAL_MS` - heartbeat klienta (domyślnie `10000`)
- `DB_PATH` - ścieżka do pliku SQLite (domyślnie `./data/app.db`)
- `PORT` - port HTTP (domyślnie `3000`)
- `ALLOWED_DEV_ORIGINS` - dodatkowe hosty/originy dla deva przez LAN jako lista po przecinku (np. `192.168.100.110,192.168.100.111`)

## Testy

```bash
npm test
npm run test:e2e
```

## iPhone / LAN w trybie dev

Przy otwieraniu aplikacji z telefonu po adresie LAN (np. `http://192.168.100.110:3000`) Next.js może blokować żądania `/_next/*`, jeśli host nie jest dozwolony.
Dodaj dokładny host telefonu/laptopa do `ALLOWED_DEV_ORIGINS` (bez wildcardów IP), a potem zrestartuj `npm run dev`.

## Co jest gotowe

- PIN wejścia do pokoju
- Role tylko `Sami` i `Patryk`
- Jeden aktywny użytkownik na rolę
- Auto-przydział drugiej roli, gdy pierwsza zajęta
- Widok `Pokój pełny` dla 3. osoby
- Jedna aktywna gra na raz
- Wznowienie sesji po reconnect
- Historia gier i wyników w SQLite
- Podstawowe PWA (manifest + service worker)

## Uwaga bezpieczeństwa

W v1 aplikacja działa po HTTP. Przy wystawieniu jej do internetu, jako kolejny krok wdroż HTTPS (np. reverse proxy Caddy/Nginx + certyfikat).
