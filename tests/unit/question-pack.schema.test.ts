import { describe, expect, it } from "vitest";

import { loadQuestionPack } from "../../src/server/game/content/load-question-pack";
import { validateQuestionPack } from "../../src/server/game/content/question-pack.schema";

describe("question pack schema", () => {
  it("ładuje aktualny pack pytań z kompletną liczbą rekordów", () => {
    const pack = loadQuestionPack();

    expect(pack.version).toBe("v2.0.0-curated-content-pl");
    expect(pack.qaLightning).toHaveLength(300);
    expect(pack.betterHalf).toHaveLength(300);
    expect(pack.scienceQuiz.matma).toHaveLength(200);
    expect(pack.scienceQuiz.geografia).toHaveLength(200);
    expect(pack.scienceQuiz.nauka).toHaveLength(200);
    expect(pack.scienceQuiz["wiedza-ogolna"]).toHaveLength(200);
    expect(pack.couplePriorities).toHaveLength(220);
  });

  it("odrzuca dokładny duplikat pytania", () => {
    const pack = structuredClone(loadQuestionPack());
    pack.qaLightning[1].text = pack.qaLightning[0].text;

    expect(() => validateQuestionPack(pack)).toThrow(/Duplikat dokładny pytania/);
  });

  it("odrzuca near-duplicate pytania", () => {
    const pack = structuredClone(loadQuestionPack());
    const base = pack.qaLightning[0].text;
    pack.qaLightning[1].text = base.split(" ").reverse().join(" ");

    expect(() => validateQuestionPack(pack)).toThrow(/Near-duplicate/);
  });
});
