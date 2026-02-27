"use client";

import { useState } from "react";

import type { GameId } from "../lib/types";

type QuestionCreateFormProps = {
  gameId: GameId;
  disabled?: boolean;
  onAddQuestion: (payload: {
    gameId: "qa-lightning" | "better-half";
    text: string;
    options: [string, string, string, string];
  }) => void;
};

const initialOptions: [string, string, string, string] = ["", "", "", ""];

export function QuestionCreateForm({ gameId, disabled, onAddQuestion }: QuestionCreateFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [options, setOptions] = useState<[string, string, string, string]>(initialOptions);

  if (gameId !== "qa-lightning" && gameId !== "better-half") {
    return null;
  }

  return (
    <section className="section-block section-block--subtle" data-testid={`question-form-${gameId}`}>
      <div className="section-header">
        <h3>Dodaj własne pytanie</h3>
        <button
          className="btn btn--ghost btn--small"
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Ukryj" : "Rozwiń"}
        </button>
      </div>

      {expanded ? (
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmedText = text.trim();
            const trimmedOptions = options.map((entry) => entry.trim()) as [
              string,
              string,
              string,
              string
            ];

            if (!trimmedText || trimmedOptions.some((entry) => !entry)) {
              return;
            }

            onAddQuestion({
              gameId,
              text: trimmedText,
              options: trimmedOptions
            });

            setText("");
            setOptions(initialOptions);
          }}
        >
          <label className="label" htmlFor="custom-question-text">
            Treść pytania
          </label>
          <textarea
            id="custom-question-text"
            className="input input--multiline"
            maxLength={220}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Napisz pytanie..."
            disabled={disabled}
          />

          {options.map((option, index) => (
            <input
              key={index}
              className="input"
              type="text"
              maxLength={120}
              value={option}
              onChange={(event) => {
                const next = [...options] as [string, string, string, string];
                next[index] = event.target.value;
                setOptions(next);
              }}
              placeholder={`Opcja ${index + 1}`}
              disabled={disabled}
            />
          ))}

          <button className="btn" type="submit" disabled={disabled}>
            Zapisz pytanie
          </button>
        </form>
      ) : null}
    </section>
  );
}
