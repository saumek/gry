import type { ResultTone } from "../lib/types";

type ResultChipProps = {
  tone: ResultTone;
  icon: string;
  label: string;
};

export function ResultChip({ tone, icon, label }: ResultChipProps) {
  return (
    <span className={`result-chip result-chip--${tone}`}>
      <span aria-hidden="true" className="result-chip__icon">
        {icon}
      </span>
      <span>{label}</span>
    </span>
  );
}
