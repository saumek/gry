export type CountryCapital = {
  countryPl: string;
  capital: string;
};

type RestCountryRow = {
  translations?: {
    pol?: {
      common?: string;
    };
  };
  name?: {
    common?: string;
  };
  capital?: string[];
};

const FALLBACK_COUNTRIES: CountryCapital[] = [
  { countryPl: "Polska", capital: "Warszawa" },
  { countryPl: "Niemcy", capital: "Berlin" },
  { countryPl: "Francja", capital: "Paryż" },
  { countryPl: "Włochy", capital: "Rzym" },
  { countryPl: "Hiszpania", capital: "Madryt" },
  { countryPl: "Portugalia", capital: "Lizbona" },
  { countryPl: "Czechy", capital: "Praga" },
  { countryPl: "Słowacja", capital: "Bratysława" },
  { countryPl: "Węgry", capital: "Budapeszt" },
  { countryPl: "Austria", capital: "Wiedeń" },
  { countryPl: "Rumunia", capital: "Bukareszt" },
  { countryPl: "Bułgaria", capital: "Sofia" },
  { countryPl: "Szwecja", capital: "Sztokholm" },
  { countryPl: "Norwegia", capital: "Oslo" },
  { countryPl: "Dania", capital: "Kopenhaga" },
  { countryPl: "Finlandia", capital: "Helsinki" },
  { countryPl: "Irlandia", capital: "Dublin" },
  { countryPl: "Kanada", capital: "Ottawa" },
  { countryPl: "Australia", capital: "Canberra" },
  { countryPl: "Japonia", capital: "Tokio" }
];

export async function fetchCountryCapitals(): Promise<CountryCapital[]> {
  try {
    const response = await fetch(
      "https://restcountries.com/v3.1/all?fields=name,capital,translations"
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = (await response.json()) as RestCountryRow[];
    const unique = new Map<string, string>();

    for (const entry of payload) {
      const countryPl =
        entry.translations?.pol?.common?.trim() ??
        entry.name?.common?.trim();
      const capital = entry.capital?.[0]?.trim();

      if (!countryPl || !capital) {
        continue;
      }

      if (capital.toLowerCase() === countryPl.toLowerCase()) {
        continue;
      }

      unique.set(countryPl, capital);
    }

    if (unique.size < 60) {
      return FALLBACK_COUNTRIES;
    }

    return [...unique.entries()]
      .map(([countryPl, capital]) => ({ countryPl, capital }))
      .sort((a, b) => a.countryPl.localeCompare(b.countryPl, "pl"));
  } catch {
    return FALLBACK_COUNTRIES;
  }
}
