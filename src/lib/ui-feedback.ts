import type { UiMessageTone } from "./types";

export type FeedbackOrigin = "error" | "event" | "result" | "question_added";

export function resolveFeedbackTone(origin: FeedbackOrigin): UiMessageTone {
  if (origin === "error") {
    return "error";
  }

  if (origin === "result" || origin === "question_added") {
    return "success";
  }

  return "info";
}

export function shouldAutoDismiss(tone: UiMessageTone): boolean {
  return tone === "success" || tone === "info";
}
