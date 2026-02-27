import { describe, expect, it } from "vitest";

import { resolveFeedbackTone, shouldAutoDismiss } from "../../src/lib/ui-feedback";

describe("ui-feedback", () => {
  it("mapuje źródła wiadomości na właściwy ton", () => {
    expect(resolveFeedbackTone("error")).toBe("error");
    expect(resolveFeedbackTone("event")).toBe("info");
    expect(resolveFeedbackTone("result")).toBe("success");
    expect(resolveFeedbackTone("question_added")).toBe("success");
  });

  it("autochowa tylko info i success", () => {
    expect(shouldAutoDismiss("success")).toBe(true);
    expect(shouldAutoDismiss("info")).toBe(true);
    expect(shouldAutoDismiss("warning")).toBe(false);
    expect(shouldAutoDismiss("error")).toBe(false);
  });
});
