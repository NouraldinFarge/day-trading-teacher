import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  calculatePositionSize,
  calculateTradeResult,
} from "../domain/calculations";
import { validateImportedLessonPlan } from "../domain/lesson-plan-schema";
import { allowedSkillIds } from "../domain/skills";
import type {
  AppState,
  MarketDataProvider,
  PositionSizeResult,
  TradeSide,
} from "../domain/types";

const STORAGE_KEY = "day-trading-teacher-state-v1";
const STORAGE_BACKUP_KEY = `${STORAGE_KEY}-backup`;

export const isTauri = () =>
  typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);

export type FidelityStatus = {
  installed: boolean;
  source: string;
  message: string;
};

export type FidelityExportFile = {
  name: string;
  path: string;
  modifiedAt: number;
  content: string;
};

export type MarketDataProviderStatus = {
  configured: boolean;
  provider: string;
  message: string;
};

export async function getMarketDataProviderStatus(
  provider: MarketDataProvider,
): Promise<MarketDataProviderStatus> {
  if (!isTauri())
    return {
      configured: false,
      provider,
      message:
        "Use the installed desktop app to configure automatic chart downloads.",
    };
  return invoke<MarketDataProviderStatus>("market_data_provider_status", {
    provider,
  });
}

export async function saveMarketDataProviderCredentials(
  provider: MarketDataProvider,
  apiKey: string,
  apiSecret = "",
): Promise<MarketDataProviderStatus> {
  if (!isTauri())
    throw new Error(
      "Automatic downloads are available in the installed desktop app.",
    );
  return invoke<MarketDataProviderStatus>(
    "save_market_data_provider_credentials",
    { provider, apiKey, apiSecret },
  );
}

export async function clearMarketDataProviderCredentials(
  provider: MarketDataProvider,
): Promise<MarketDataProviderStatus> {
  if (!isTauri())
    throw new Error(
      "Automatic downloads are available in the installed desktop app.",
    );
  return invoke<MarketDataProviderStatus>(
    "clear_market_data_provider_credentials",
    { provider },
  );
}

export async function fetchMarketData(
  provider: MarketDataProvider,
  symbol: string,
  interval: "daily" | "1min",
): Promise<string> {
  if (!isTauri())
    throw new Error(
      "Automatic downloads are available in the installed desktop app.",
    );
  return invoke<string>("fetch_market_data", { provider, symbol, interval });
}

export async function openMarketDataProviderPage(
  provider: MarketDataProvider,
): Promise<void> {
  if (isTauri())
    return invoke<void>("open_market_data_provider_page", { provider });
  const urls: Record<MarketDataProvider, string> = {
    massive: "https://massive.com/dashboard/signup",
    alpaca: "https://app.alpaca.markets/signup",
    tradier: "https://onboarding.tradier.com/signup",
    alpha_vantage: "https://www.alphavantage.co/support/#api-key",
  };
  window.open(urls[provider], "_blank", "noopener,noreferrer");
}

export async function chooseFidelityExportFolder(): Promise<string | null> {
  if (!isTauri()) return null;
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Choose your Fidelity CSV export folder",
  });
  return typeof selected === "string" ? selected : null;
}

export async function scanFidelityExports(
  folderPath: string,
): Promise<FidelityExportFile[]> {
  if (!isTauri()) return [];
  return invoke<FidelityExportFile[]>("scan_fidelity_exports", {
    folderPath,
  });
}

export async function detectFidelityTraderPlus(): Promise<FidelityStatus> {
  if (isTauri()) return invoke<FidelityStatus>("detect_fidelity_trader_plus");
  return {
    installed: false,
    source: "Desktop app required",
    message:
      "Open the installed Day-Trading Teacher app to detect Fidelity Trader+.",
  };
}

export async function launchFidelityTraderPlus(): Promise<string> {
  if (isTauri()) return invoke<string>("launch_fidelity_trader_plus");
  window.open(
    "https://www.fidelity.com/trading/trading-platforms",
    "_blank",
    "noopener,noreferrer",
  );
  return "Fidelity setup opened in a new tab.";
}

export async function openFidelitySetupPage(): Promise<void> {
  if (isTauri()) return invoke<void>("open_fidelity_setup_page");
  window.open(
    "https://www.fidelity.com/trading/trading-platforms",
    "_blank",
    "noopener,noreferrer",
  );
}

export async function calculatePosition(input: {
  entry: string;
  stop: string;
  maximum_risk: string;
  slippage_per_unit: string;
  side: TradeSide;
}): Promise<PositionSizeResult> {
  return isTauri()
    ? invoke<PositionSizeResult>("calculate_position_size", { request: input })
    : calculatePositionSize(input);
}

export async function calculateResult(input: {
  entry: string;
  exit: string;
  quantity: string;
  fees: string;
  multiplier: string;
  side: TradeSide;
  planned_risk: string | null;
}) {
  return isTauri()
    ? invoke<{
        gross_pnl: string;
        net_pnl: string;
        r_multiple: string | null;
        outcome: "profitable" | "losing" | "flat";
      }>("calculate_trade_result", { request: input })
    : calculateTradeResult(input);
}

export async function validateLessonPlanAtBoundary(raw: string) {
  if (!isTauri()) return validateImportedLessonPlan(raw);
  const native = await invoke<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    lesson_count: number;
  }>("validate_lesson_plan", { raw, allowedSkillIds });
  const frontend = validateImportedLessonPlan(raw);
  return {
    ...frontend,
    valid: native.valid && frontend.valid,
    errors: [...native.errors, ...frontend.errors],
    warnings: [...new Set([...native.warnings, ...frontend.warnings])],
  };
}

export async function loadState(): Promise<unknown | null> {
  if (isTauri()) return invoke<AppState | null>("load_app_state");
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    const backup = localStorage.getItem(STORAGE_BACKUP_KEY);
    if (backup) {
      try {
        return JSON.parse(backup) as unknown;
      } catch {
        // The caller must surface the storage failure without overwriting either copy.
      }
    }
    throw new Error(
      "Saved app data could not be read. The existing browser data was left unchanged.",
    );
  }
}

export async function saveState(state: AppState) {
  if (isTauri()) {
    await invoke("save_app_state", { state });
  } else {
    const serialized = JSON.stringify(state);
    const previous = localStorage.getItem(STORAGE_KEY);
    if (previous && previous.length <= 1_000_000) {
      try {
        localStorage.setItem(STORAGE_BACKUP_KEY, previous);
      } catch {
        /* Preserve the primary copy when storage is tight. */
      }
    }
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      throw new Error(
        "This browser could not save the latest changes. Export your data or use the portable desktop app for larger chart and screenshot records.",
      );
    }
  }
}
