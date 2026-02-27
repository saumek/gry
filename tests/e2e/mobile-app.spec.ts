import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function joinRoom(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Kod pokoju").fill("1234");
  await page.getByRole("button", { name: "Wejdź do pokoju" }).click();

  const isRoomFull = await page.getByTestId("room-full").isVisible({ timeout: 1500 }).catch(() => false);
  if (isRoomFull) {
    throw new Error("Pokój pełny przy próbie dołączenia klienta testowego.");
  }

  const rolePicker = page.getByTestId("role-picker");
  if (await rolePicker.isVisible({ timeout: 5000 }).catch(() => false)) {
    const samiButton = page.getByRole("button", { name: "Sami" });
    if (await samiButton.isVisible().catch(() => false)) {
      await samiButton.click();
    } else {
      await page.getByRole("button", { name: "Patryk" }).click();
    }
  }

  await expect(page.getByTestId("top-status-bar")).toContainText("Ty:", { timeout: 8000 });
}

test("dwie osoby łączą się, trzecia widzi pełny pokój i działa zakończenie gry za zgodą", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const contextC = await browser.newContext();

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  const pageC = await contextC.newPage();

  await joinRoom(pageA);
  await expect(pageA.getByTestId("bottom-nav")).toBeVisible();

  await joinRoom(pageB);
  await expect(pageA.getByText("Mini-czat")).toHaveCount(0);
  await expect(pageA.getByText("Włącz powiadomienia")).toHaveCount(0);

  await pageC.goto("/");
  await pageC.getByLabel("Kod pokoju").fill("1234");
  await pageC.getByRole("button", { name: "Wejdź do pokoju" }).click();

  await expect(pageC.getByTestId("room-full")).toBeVisible();
  await contextC.close();

  await pageA.getByTestId("tab-lobby").click();
  await pageB.getByTestId("tab-lobby").click();

  const qaCardA = pageA.getByTestId("game-row-qa-lightning");
  const qaCardB = pageB.getByTestId("game-row-qa-lightning");

  await qaCardA.getByTestId("ready-qa-lightning").click();
  await qaCardB.getByTestId("ready-qa-lightning").click();
  await qaCardA.getByTestId("start-qa-lightning").click();

  await expect(pageA.getByRole("button", { name: "Zakończ grę za zgodą obu osób" })).toBeVisible();
  await pageA.getByRole("button", { name: "Zakończ grę za zgodą obu osób" }).click();
  await expect(pageB.getByRole("button", { name: "Potwierdź" })).toBeVisible();
  await pageB.getByRole("button", { name: "Potwierdź" }).click();

  await expect(pageA.getByText("Gra przerwana za zgodą obu osób")).toBeVisible();
  await expect(pageA.getByText("Koniec gry")).toBeVisible();
  await expect(pageB.getByText("Koniec gry")).toBeVisible();

  await contextA.close();
  await contextB.close();
});
