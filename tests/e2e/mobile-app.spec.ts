import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function joinRoom(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByLabel("Kod pokoju").fill("1234");
  await page.getByRole("button", { name: "Wejdź do pokoju" }).click();

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const isRoomFull = await page.getByTestId("room-full").isVisible({ timeout: 300 }).catch(() => false);
    if (isRoomFull) {
      throw new Error("Pokój pełny przy próbie dołączenia klienta testowego.");
    }

    const isJoined = await page
      .getByTestId("top-status-bar")
      .getByText("Ty:")
      .isVisible({ timeout: 300 })
      .catch(() => false);
    if (isJoined) {
      return;
    }

    const rolePicker = page.getByTestId("role-picker");
    if (await rolePicker.isVisible({ timeout: 300 }).catch(() => false)) {
      const samiButton = page.getByRole("button", { name: "Sami" });
      if (await samiButton.isVisible().catch(() => false)) {
        await samiButton.click();
      } else {
        await page.getByRole("button", { name: "Patryk" }).click();
      }
    }

    await page.waitForTimeout(250);
  }

  throw new Error("Nie udało się przypisać roli klientowi testowemu.");
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
  await expect(pageA.getByTestId("tab-badge-game")).toHaveCount(0);

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
  await expect(pageA.getByTestId("game-row-fire-water-coop")).toHaveCount(0);
  await expect(pageA.getByTestId("lobby-games").locator(".game-row")).toHaveCount(5);

  const battleshipA = pageA.getByTestId("game-row-mini-battleship");
  const battleshipB = pageB.getByTestId("game-row-mini-battleship");

  await battleshipA.getByTestId("ready-mini-battleship").click();
  await battleshipB.getByTestId("ready-mini-battleship").click();
  await battleshipA.getByTestId("start-mini-battleship").click();

  await expect(pageA.getByTestId("battleship-game")).toBeVisible();
  await expect(pageA.getByTestId("board-setup-0-0")).toBeVisible();
  await expect(pageA.getByTestId("board-setup-4-0")).toBeVisible();
  await expect(pageA.getByRole("heading", { name: "Mini Statki 5x5" })).toHaveCount(1);

  const stickyTop = await pageA.getByTestId("top-status-bar").evaluate((el) => getComputedStyle(el).position);
  const stickyGameHeader = await pageA
    .getByTestId("game-headline")
    .evaluate((el) => getComputedStyle(el).position);
  const stickyScoreboard = await pageA
    .getByTestId("scoreboard")
    .evaluate((el) => getComputedStyle(el).position);

  expect(stickyTop).toBe("sticky");
  expect(stickyGameHeader).toBe("static");
  expect(stickyScoreboard).toBe("static");

  await expect(pageA.getByRole("button", { name: "Zakończ za zgodą" })).toBeVisible();
  await pageA.getByRole("button", { name: "Zakończ za zgodą" }).click();
  await expect(pageB.getByRole("button", { name: "Potwierdź" })).toBeVisible();
  await pageB.getByRole("button", { name: "Potwierdź" }).click();

  await expect(pageA.getByText("Gra przerwana za zgodą obu osób")).toBeVisible();
  await expect(pageA.getByText("Koniec gry")).toBeVisible();
  await expect(pageB.getByText("Koniec gry")).toBeVisible();
  await expect(pageA.getByText("finished")).toHaveCount(0);

  await pageA.getByRole("button", { name: "Powrót do lobby" }).click();
  const feedback = pageA.getByTestId("feedback");
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveClass(/feedback-inline--info/);
  await expect(pageA.getByTestId("tab-badge-history")).toBeVisible();

  await contextA.close();
  await contextB.close();
});

test("science-quiz: wybór kategorii i reveal po 2 odpowiedziach", async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  // Poprzedni test zamyka sockets; krótka pauza pozwala wygasić role po TTL.
  await pageA.waitForTimeout(3000);

  await joinRoom(pageA);
  await joinRoom(pageB);

  await pageA.getByTestId("tab-lobby").click();
  await pageB.getByTestId("tab-lobby").click();

  await pageA.getByTestId("science-category-select").selectOption("geografia");

  const scienceRowA = pageA.getByTestId("game-row-science-quiz");
  const scienceRowB = pageB.getByTestId("game-row-science-quiz");

  await scienceRowA.getByTestId("ready-science-quiz").click();
  await scienceRowB.getByTestId("ready-science-quiz").click();
  await scienceRowA.getByTestId("start-science-quiz").click();

  await expect(pageA.getByTestId("science-quiz-game")).toBeVisible();
  await expect(pageB.getByTestId("science-quiz-game")).toBeVisible();

  await pageA.locator("[data-testid='science-quiz-game'] .option-grid button").first().click();
  await pageB.locator("[data-testid='science-quiz-game'] .option-grid button").first().click();

  await expect(pageA.getByText("Poprawna")).toBeVisible();
  await expect(pageB.getByText("Poprawna")).toBeVisible();

  await contextA.close();
  await contextB.close();
});

test("quick smoke: QA, Better Half i Priorytety uruchamiają się i dają się przerwać za zgodą", async ({ browser }) => {
  test.setTimeout(60000);
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await pageA.waitForTimeout(3000);
  await joinRoom(pageA);
  await joinRoom(pageB);

  await pageA.getByTestId("tab-lobby").click();
  await pageB.getByTestId("tab-lobby").click();

  const hasActiveGame = await pageA.getByTestId("game-shell").isVisible({ timeout: 600 }).catch(() => false);
  if (hasActiveGame) {
    await pageA.getByRole("button", { name: "Zakończ za zgodą" }).click();
    await pageB.getByRole("button", { name: "Potwierdź" }).click();
    await expect(pageA.getByText("Gra przerwana za zgodą obu osób")).toBeVisible();
    await pageA.getByRole("button", { name: "Powrót do lobby" }).click();
    await expect(pageA.getByTestId("tab-panel-lobby")).toBeVisible();
    await pageB.getByTestId("tab-lobby").click();
  }

  await expect(pageA.getByTestId("ready-qa-lightning")).toBeVisible();

  const smokeGames = [
    { id: "qa-lightning", gameTestId: "qa-game" },
    { id: "better-half", gameTestId: "better-half-game" },
    { id: "couple-priorities", gameTestId: "couple-priorities-game" }
  ] as const;

  for (const game of smokeGames) {
    await pageA.getByTestId(`ready-${game.id}`).click();
    await pageB.getByTestId(`ready-${game.id}`).click();
    await pageA.getByTestId(`start-${game.id}`).click();

    await expect(pageA.getByTestId(game.gameTestId)).toBeVisible();
    await expect(pageA.getByRole("button", { name: "Zakończ za zgodą" })).toBeVisible();
    await pageA.getByRole("button", { name: "Zakończ za zgodą" }).click();
    await pageB.getByRole("button", { name: "Potwierdź" }).click();
    await expect(pageA.getByText("Gra przerwana za zgodą obu osób")).toBeVisible();
    await pageA.getByRole("button", { name: "Powrót do lobby" }).click();
    await expect(pageA.getByTestId("tab-panel-lobby")).toBeVisible();
  }

  await contextA.close();
  await contextB.close();
});
