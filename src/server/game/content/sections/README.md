Sekcyjne pliki contentu do bezpośredniej, ręcznej edycji.

Zasady:
- jeden plik = jedna sekcja gry lub jedna kategoria science
- relacyjne sekcje używają rekordów `{ "text": string, "options": [4 stringi] }`
- science używa rekordów `{ "text": string, "options": [4 stringi], "correctIndex": 0-3 }`
- zachowuj naturalny język, bez generatorowych dopisków i seryjnych szablonów
- loader składa całość z tych plików w `load-question-pack.ts`
