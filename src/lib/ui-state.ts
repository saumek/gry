import { getGameCatalogItem } from "./game-catalog";
import type { ActiveGameState, AppTab, ConnectionStatus, Role, TopBarModel } from "./types";

export function displayRoleName(role: Role): string {
  return role === "Sami" ? "Samuel" : "Patryk";
}

export function gameShortLabel(gameId: ActiveGameState["gameId"]): string {
  return getGameCatalogItem(gameId).shortTitle;
}

export function phaseShortLabel(phase: ActiveGameState["phase"]): string {
  if (phase === "in_round") {
    return "Runda";
  }

  if (phase === "reveal") {
    return "Odkrycie";
  }

  if (phase === "finished") {
    return "Koniec";
  }

  if (phase === "setup") {
    return "Ustawienie";
  }

  if (phase === "ready") {
    return "Gotowość";
  }

  return "Lobby";
}

export function createTopBarModel(
  meRole: Role | undefined,
  activeGame: ActiveGameState | null,
  connectionStatus: ConnectionStatus,
  connectionLabel: string
): TopBarModel {
  if (!activeGame) {
    return {
      roleLabel: meRole ? `Ty: ${displayRoleName(meRole)}` : "Gość",
      connectionStatus,
      connectionLabel,
      gameLabel: "Brak aktywnej gry",
      jumpToResult: false
    };
  }

  return {
    roleLabel: meRole ? `Ty: ${displayRoleName(meRole)}` : "Gość",
    connectionStatus,
    connectionLabel,
    gameLabel: gameShortLabel(activeGame.gameId),
    phaseLabel: phaseShortLabel(activeGame.phase),
    scoreLabel: `${activeGame.scores.Sami}:${activeGame.scores.Patryk}`,
    jumpToResult: activeGame.phase === "finished"
  };
}

export function resolveTab(current: AppTab, hasActiveGame: boolean): AppTab {
  if (current === "game") {
    return hasActiveGame ? "game" : "lobby";
  }

  return current;
}
