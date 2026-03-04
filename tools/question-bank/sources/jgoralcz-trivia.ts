type TriviaRow = {
  question: string;
  category: string;
  type: "multiple" | "boolean";
  difficulty: "easy" | "medium" | "hard";
  correct_answer: string;
  incorrect_answers: string[];
  id: number;
};

export type TriviaMultiple = {
  id: number;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  correctAnswer: string;
  incorrectAnswers: [string, string, string];
};

const BASE_URL = "https://beta-trivia.bongobot.io/";

export async function fetchTriviaBatch(params: {
  category: string;
  difficulty: "easy" | "medium" | "hard";
  limit: number;
  retries?: number;
}): Promise<TriviaMultiple[]> {
  const retries = params.retries ?? 3;
  const query = new URLSearchParams({
    category: params.category,
    type: "multiple",
    difficulty: params.difficulty,
    limit: String(Math.max(1, Math.min(10, params.limit)))
  });

  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}?${query.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as TriviaRow[];
      return payload
        .filter((entry) => entry.type === "multiple" && entry.incorrect_answers.length >= 3)
        .map((entry) => ({
          id: entry.id,
          category: entry.category,
          difficulty: entry.difficulty,
          question: decodeHtmlEntities(entry.question),
          correctAnswer: decodeHtmlEntities(entry.correct_answer),
          incorrectAnswers: [
            decodeHtmlEntities(entry.incorrect_answers[0]),
            decodeHtmlEntities(entry.incorrect_answers[1]),
            decodeHtmlEntities(entry.incorrect_answers[2])
          ]
        }));
    } catch (error) {
      lastError = error;
      await wait(180 * attempt);
    }
  }

  throw new Error(`Nie udało się pobrać danych z jgoralcz/trivia: ${String(lastError)}`);
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&eacute;/g, "é")
    .replace(/&uuml;/g, "ü")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, "\"")
    .replace(/&rdquo;/g, "\"");
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
