import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  Download,
  ExternalLink,
  FileUp,
  FolderOpen,
  LayoutGrid,
  MonitorUp,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  Trash2,
} from "lucide-react";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { defaultProfile, useAppState } from "../../state/AppStateContext";
import type { AppState, Profile } from "../../domain/types";
import { MARKET_DATA_PROVIDERS } from "../../domain/market-data-acquisition";
import {
  chooseFidelityExportFolder,
  clearMarketDataProviderCredentials,
  detectFidelityTraderPlus,
  isTauri,
  launchFidelityTraderPlus,
  openFidelitySetupPage,
  type FidelityStatus,
} from "../../platform/bridge";
import {
  MAX_STATE_IMPORT_BYTES,
  validateAppState,
} from "../../state/app-state-validation";
import { serializeStateExport } from "../../state/state-data-security";

function downloadState(state: AppState) {
  const url = URL.createObjectURL(
    new Blob([serializeStateExport(state)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `day-trading-teacher-data_${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SettingsPage() {
  const {
    state,
    updateProfile,
    updateFidelityImport,
    replaceState,
    resetState,
  } = useAppState();
  const [profile, setProfile] = useState<Profile>(state.profile);
  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importError, setImportError] = useState("");
  const [profileError, setProfileError] = useState("");
  const [restored, setRestored] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<{
    state: AppState;
    exportedAt: string | null;
  } | null>(null);
  const [eraseBusy, setEraseBusy] = useState(false);
  const [eraseError, setEraseError] = useState("");
  const [fidelityStatus, setFidelityStatus] = useState<FidelityStatus | null>(
    null,
  );
  const [fidelityBusy, setFidelityBusy] = useState(false);
  const [fidelityMessage, setFidelityMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const checkFidelity = async () => {
    setFidelityBusy(true);
    setFidelityMessage("");
    try {
      setFidelityStatus(await detectFidelityTraderPlus());
    } catch (error) {
      setFidelityMessage(
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setFidelityBusy(false);
    }
  };

  useEffect(() => {
    void checkFidelity();
  }, []);

  const openFidelity = async () => {
    setFidelityBusy(true);
    setFidelityMessage("");
    try {
      setFidelityMessage(await launchFidelityTraderPlus());
    } catch (error) {
      setFidelityMessage(
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setFidelityBusy(false);
    }
  };

  const chooseExportFolder = async () => {
    setFidelityMessage("");
    try {
      const folderPath = await chooseFidelityExportFolder();
      if (folderPath) {
        updateFidelityImport({
          folderPath,
          autoScan: true,
          lastScanAt: null,
          lastFileKey: null,
        });
        setFidelityMessage(
          "Export folder connected. The Journal will now scan it for the newest Fidelity Orders CSV.",
        );
      }
    } catch (error) {
      setFidelityMessage(
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  const profileDirty =
    JSON.stringify(profile) !== JSON.stringify(state.profile);
  const update = <K extends keyof Profile>(field: K, value: Profile[K]) => {
    setSaved(false);
    setProfile((current) => ({ ...current, [field]: value }));
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    setProfileError("");
    if (!profile.displayName.trim())
      return setProfileError("Enter a display name.");
    if (
      !Number.isFinite(Number(profile.maxRiskPerTrade)) ||
      Number(profile.maxRiskPerTrade) <= 0
    )
      return setProfileError(
        "Maximum risk per trade must be greater than zero.",
      );
    if (
      !Number.isFinite(Number(profile.dailyLossLimit)) ||
      Number(profile.dailyLossLimit) <= 0
    )
      return setProfileError("Daily loss limit must be greater than zero.");
    if (
      !Number.isFinite(Number(profile.startingBalance)) ||
      Number(profile.startingBalance) <= 0
    )
      return setProfileError(
        "Analytics starting balance must be greater than zero.",
      );
    updateProfile({ ...profile, displayName: profile.displayName.trim() });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const importData = async (file?: File) => {
    if (!file) return;
    setImportError("");
    try {
      if (file.size > MAX_STATE_IMPORT_BYTES)
        throw new Error(
          `This backup is larger than the ${Math.round(MAX_STATE_IMPORT_BYTES / 1_000_000)} MB restore safety limit.`,
        );
      const parsed = JSON.parse(await file.text()) as {
        app?: unknown;
        exportedAt?: unknown;
        state?: unknown;
      };
      if (parsed.app !== "day-trading-teacher") {
        throw new Error(
          "This is not a compatible Day-Trading Teacher data export.",
        );
      }
      const validation = validateAppState(parsed.state);
      if (!validation.valid)
        throw new Error(
          `This backup is incomplete or damaged: ${validation.errors.join("; ")}`,
        );
      setPendingRestore({
        state: validation.state,
        exportedAt:
          typeof parsed.exportedAt === "string" &&
          Number.isFinite(Date.parse(parsed.exportedAt))
            ? parsed.exportedAt
            : null,
      });
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "The data file could not be imported.",
      );
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const applyRestore = () => {
    if (!pendingRestore) return;
    try {
      replaceState(pendingRestore.state);
      setProfile(pendingRestore.state.profile);
      setPendingRestore(null);
      setRestored(true);
      window.setTimeout(() => setRestored(false), 2500);
    } catch (error) {
      setPendingRestore(null);
      setImportError(
        error instanceof Error
          ? error.message
          : "The backup could not be restored.",
      );
    }
  };

  const eraseAllData = async () => {
    setEraseBusy(true);
    setEraseError("");
    if (isTauri()) {
      const results = await Promise.allSettled(
        MARKET_DATA_PROVIDERS.map((provider) =>
          clearMarketDataProviderCredentials(provider.id),
        ),
      );
      if (results.some((result) => result.status === "rejected")) {
        setEraseError(
          "Saved market-data credentials could not all be removed. No app records were erased; close other copies of the app and try again.",
        );
        setEraseBusy(false);
        return;
      }
    }
    resetState();
    setProfile(defaultProfile);
    setDeleteOpen(false);
    setEraseBusy(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Preferences and privacy"
        title="Keep the app aligned with you"
        description="Choose a lesson-guided or standalone workspace, then adjust learning, risk, Fidelity, appearance, and local data settings."
        actions={
          <span
            className={`settings-save-status ${profileDirty ? "unsaved" : ""}`}
          >
            {profileDirty ? <Save size={15} /> : <CheckCircle2 size={15} />}
            {profileDirty ? "Unsaved changes" : "Preferences saved"}
          </span>
        }
      />
      <nav className="settings-jump-nav" aria-label="Settings sections">
        <a href="#workspace-settings">Workspace mode</a>
        <a href="#profile-settings">Profile & appearance</a>
        <a href="#fidelity-settings">Fidelity</a>
        <a href="#data-settings">Local data</a>
        <a href="#privacy-settings">Privacy boundary</a>
      </nav>
      <section className="card">
        <form
          className="settings-section"
          id="profile-settings"
          onSubmit={save}
        >
          <section className="workspace-mode-setting" id="workspace-settings">
            <div className="workspace-mode-icon">
              {profile.standaloneTools ? (
                <LayoutGrid size={22} />
              ) : (
                <BookOpenCheck size={22} />
              )}
            </div>
            <div className="workspace-mode-copy">
              <span className="eyebrow accent">Navigation and focus</span>
              <h2>
                {profile.standaloneTools
                  ? "Standalone feature navigation"
                  : "Lesson-guided workspace"}
              </h2>
              <p>
                {profile.standaloneTools
                  ? "Plan, Journal, and Charts appear as separate destinations while remaining connected to lessons."
                  : "Lessons stay primary. Planning, journaling, charts, paper trading, and analysis open when a lesson calls for them."}
              </p>
              <small>
                Switching modes changes navigation only. It never removes,
                resets, or duplicates your saved plans, trades, charts, or
                progress.
              </small>
            </div>
            <label className="workspace-mode-switch" htmlFor="standalone-tools">
              <input
                id="standalone-tools"
                type="checkbox"
                role="switch"
                checked={Boolean(profile.standaloneTools)}
                onChange={(event) =>
                  update("standaloneTools", event.target.checked)
                }
              />
              <span aria-hidden="true" />
              <strong>Show tools separately</strong>
            </label>
            <p className="workspace-mode-save-note">
              Save preferences below to apply this navigation change.
            </p>
          </section>
          <h2>Learner profile</h2>
          <p>
            These preferences guide wording and study pacing. They do not
            authorize live recommendations.
          </p>
          <div className="form-grid three section-gap">
            <div className="field">
              <label htmlFor="display-name">Display name</label>
              <input
                id="display-name"
                required
                maxLength={40}
                value={profile.displayName}
                onChange={(event) => update("displayName", event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="experience">Learning path</label>
              <select
                id="experience"
                value={profile.experience}
                onChange={(event) =>
                  update(
                    "experience",
                    event.target.value as Profile["experience"],
                  )
                }
              >
                <option value="beginner">Beginner</option>
                <option value="developing">Developing</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="broker">Broker context</label>
              <input
                id="broker"
                value={profile.broker}
                onChange={(event) => update("broker", event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="account-type">Account mode</label>
              <select
                id="account-type"
                value={profile.accountType}
                onChange={(event) =>
                  update(
                    "accountType",
                    event.target.value as Profile["accountType"],
                  )
                }
              >
                <option value="paper">Paper/simulated</option>
                <option value="cash">Cash</option>
                <option value="margin">Margin</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="risk-per-trade">Maximum risk per trade</label>
              <div className="input-prefix">
                <span>$</span>
                <input
                  id="risk-per-trade"
                  required
                  inputMode="decimal"
                  value={profile.maxRiskPerTrade}
                  onChange={(event) =>
                    update("maxRiskPerTrade", event.target.value)
                  }
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="daily-loss">Daily loss limit</label>
              <div className="input-prefix">
                <span>$</span>
                <input
                  id="daily-loss"
                  required
                  inputMode="decimal"
                  value={profile.dailyLossLimit}
                  onChange={(event) =>
                    update("dailyLossLimit", event.target.value)
                  }
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="starting-balance">
                Analytics starting balance
              </label>
              <div className="input-prefix">
                <span>$</span>
                <input
                  id="starting-balance"
                  inputMode="decimal"
                  value={profile.startingBalance ?? "10000"}
                  onChange={(event) =>
                    update("startingBalance", event.target.value)
                  }
                />
              </div>
              <small className="field-hint">
                Used only to calculate cumulative return percentages and
                drawdown context.
              </small>
            </div>
            <div className="field">
              <label htmlFor="study-time">Daily study budget</label>
              <select
                id="study-time"
                value={profile.studyMinutes}
                onChange={(event) =>
                  update(
                    "studyMinutes",
                    Number(event.target.value) as Profile["studyMinutes"],
                  )
                }
              >
                <option value="10">10 minutes</option>
                <option value="20">20 minutes</option>
                <option value="45">45 minutes</option>
                <option value="90">90 minutes</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="theme">Appearance</label>
              <select
                id="theme"
                value={profile.theme}
                onChange={(event) =>
                  update("theme", event.target.value as Profile["theme"])
                }
              >
                <option value="system">Follow system</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <small className="field-hint">
                Dark mode uses lower-glare surfaces while preserving contrast.
              </small>
            </div>
          </div>
          <div className="form-grid section-gap">
            <div className="checkbox-row">
              <input
                id="plain-language"
                type="checkbox"
                checked={profile.plainLanguage}
                onChange={(event) =>
                  update("plainLanguage", event.target.checked)
                }
              />
              <label htmlFor="plain-language">
                Prefer plain language and shorter explanations.
              </label>
            </div>
            <div className="checkbox-row">
              <input
                id="reduced-motion"
                type="checkbox"
                checked={profile.reducedMotion}
                onChange={(event) =>
                  update("reducedMotion", event.target.checked)
                }
              />
              <label htmlFor="reduced-motion">
                Reduce nonessential motion.
              </label>
            </div>
          </div>
          {profileError ? (
            <div className="error-message" role="alert">
              {profileError}
            </div>
          ) : null}
          <div className="form-actions settings-save-actions">
            <span>
              {profileDirty
                ? "Review and save your changes."
                : "Your preferences are stored on this device."}
            </span>
            <button
              className="button primary"
              type="submit"
              disabled={!profileDirty && !saved}
            >
              {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              {saved
                ? "Preferences saved"
                : profileDirty
                  ? "Save changes"
                  : "Up to date"}
            </button>
          </div>
        </form>

        <section className="settings-section" id="fidelity-settings">
          <div className="integration-heading">
            <div>
              <h2>Fidelity Trader+ Desktop companion</h2>
              <p>
                Move from a completed learning plan to Fidelity with a
                deliberate, manual handoff.
              </p>
            </div>
            <span
              className={`badge ${fidelityStatus?.installed ? "badge-strong" : "badge-partial"}`}
            >
              {fidelityStatus?.installed ? "Detected" : "Not detected"}
            </span>
          </div>
          <div className="integration-panel section-gap">
            <div className="integration-status">
              <span>
                <MonitorUp size={20} />
              </span>
              <div>
                <strong>
                  {fidelityStatus?.message ?? "Checking this computer…"}
                </strong>
                <small>
                  {fidelityStatus?.source ?? "Windows installation check"}
                </small>
              </div>
            </div>
            <div className="data-actions">
              <button
                className="button primary"
                type="button"
                disabled={fidelityBusy || !fidelityStatus?.installed}
                onClick={() => void openFidelity()}
              >
                <MonitorUp size={16} />
                Open Trader+
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={fidelityBusy}
                onClick={() => void checkFidelity()}
              >
                <RefreshCw size={16} />
                Recheck
              </button>
              {!fidelityStatus?.installed ? (
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => void openFidelitySetupPage()}
                >
                  <ExternalLink size={16} />
                  Official setup
                </button>
              ) : null}
            </div>
          </div>
          {fidelityMessage ? (
            <div
              className={
                fidelityStatus?.installed ? "success-message" : "error-message"
              }
              role="status"
            >
              {fidelityMessage}
            </div>
          ) : null}
          <ol className="integration-steps">
            <li>
              <strong>Build a linked Fidelity layout.</strong>
              <span>
                Keep Chart, Quote, Trade, Orders, and Positions visible; link
                the tools by symbol inside Trader+.
              </span>
            </li>
            <li>
              <strong>Keep preview and confirmation on.</strong>
              <span>
                Review symbol, side, quantity, order type, duration, and
                estimated value before submitting.
              </span>
            </li>
            <li>
              <strong>Use the plan handoff.</strong>
              <span>
                Copy a saved plan’s ticket checklist, open Trader+, and enter
                each field manually.
              </span>
            </li>
            <li>
              <strong>Close the loop.</strong>
              <span>
                After the trade is complete, record the result here and review
                whether the plan was followed.
              </span>
            </li>
          </ol>
          <div className="import-automation-panel">
            <div className="integration-status">
              <span>
                <FolderOpen size={20} />
              </span>
              <div>
                <strong>Fidelity export inbox</strong>
                <small>
                  {state.fidelityImport?.folderPath || "No folder selected"}
                </small>
              </div>
            </div>
            <div className="data-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => void chooseExportFolder()}
              >
                <FolderOpen size={16} />
                Choose folder
              </button>
              {state.fidelityImport?.folderPath ? (
                <button
                  className="button ghost"
                  type="button"
                  onClick={() =>
                    updateFidelityImport({
                      folderPath: "",
                      autoScan: false,
                      lastScanAt: null,
                      lastFileKey: null,
                    })
                  }
                >
                  Disconnect
                </button>
              ) : null}
            </div>
          </div>
          <div className="checkbox-row section-gap">
            <input
              id="auto-fidelity-scan"
              type="checkbox"
              disabled={!state.fidelityImport?.folderPath}
              checked={Boolean(state.fidelityImport?.autoScan)}
              onChange={(event) =>
                updateFidelityImport({
                  folderPath: state.fidelityImport?.folderPath ?? "",
                  autoScan: event.target.checked,
                  lastScanAt: state.fidelityImport?.lastScanAt ?? null,
                  lastFileKey: state.fidelityImport?.lastFileKey ?? null,
                })
              }
            />
            <label htmlFor="auto-fidelity-scan">
              Automatically scan this folder and its dated subfolders when the
              Journal opens and while it remains open.
              <br />
              <span className="field-hint">
                Up to 100 recent CSV exports are reconciled oldest-first.
                Duplicate executions are ignored, import remains read-only, and
                completed positions still require your reflection.
              </span>
            </label>
          </div>
          <div className="callout">
            <Shield size={18} />
            <p>
              Private by design: this companion never reads Fidelity
              credentials, watches the screen, or places orders. When you import
              an export, account columns are ignored and identifiers are not
              stored.
            </p>
          </div>
        </section>

        <section className="settings-section" id="data-settings">
          <h2>Local data</h2>
          <p>
            Export includes profile, plans, trades, reviews, progress, custom
            lessons, provider-bound chart watchlists, and historical datasets.
            Market-data credentials are deliberately excluded. Review the file
            before sharing it.
          </p>
          <div className="data-actions section-gap">
            <button
              className="button secondary"
              onClick={() => downloadState(state)}
            >
              <Download size={16} />
              Export my data
            </button>
            <button
              className="button secondary"
              onClick={() => fileRef.current?.click()}
            >
              <FileUp size={16} />
              Restore an export
            </button>
            <input
              ref={fileRef}
              hidden
              type="file"
              accept="application/json,.json"
              onChange={(event) => void importData(event.target.files?.[0])}
            />
            <button
              className="button danger"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 size={16} />
              Erase local data
            </button>
          </div>
          {importError ? (
            <div className="error-message" role="alert">
              {importError}
            </div>
          ) : null}
          {restored ? (
            <div className="success-message" role="status">
              <span>
                <CheckCircle2 size={16} /> Backup restored successfully.
              </span>
            </div>
          ) : null}
        </section>

        <section className="settings-section" id="privacy-settings">
          <h2>Product boundary</h2>
          <div className="callout">
            <Shield size={18} />
            <p>
              The app has no embedded AI and never sends your data to ChatGPT.
              Custom lessons are files you create externally and explicitly
              import. Fidelity imports are read-only. Automatic OHLCV requests
              go only to the market-data provider you explicitly configure.
              Credentials stay outside exports, provider/feed provenance stays
              visible, and backtests remain local simulations—not forecasts,
              live quotes, or order automation.
            </p>
          </div>
        </section>
      </section>

      {pendingRestore ? (
        <Modal
          title="Replace current local data?"
          description="Review this backup before it replaces the records currently open in the app."
          onClose={() => setPendingRestore(null)}
        >
          <div className="restore-preview">
            <div>
              <span>Backup date</span>
              <strong>
                {pendingRestore.exportedAt
                  ? new Date(pendingRestore.exportedAt).toLocaleString()
                  : "Not recorded"}
              </strong>
            </div>
            <div>
              <span>Profile</span>
              <strong>{pendingRestore.state.profile.displayName}</strong>
            </div>
            <div>
              <span>Plans</span>
              <strong>{pendingRestore.state.plans.length}</strong>
            </div>
            <div>
              <span>Trades</span>
              <strong>{pendingRestore.state.trades.length}</strong>
            </div>
            <div>
              <span>Custom lesson plans</span>
              <strong>{pendingRestore.state.customLessonPlans.length}</strong>
            </div>
            <div>
              <span>Chart datasets</span>
              <strong>
                {pendingRestore.state.marketDataSets?.length ?? 0}
              </strong>
            </div>
          </div>
          <div className="callout warning">
            <RotateCcw size={18} />
            <p>
              Export the current data first if you may need it. Restoring
              replaces the current profile and records; market-data credentials
              are not changed.
            </p>
          </div>
          <div className="form-actions">
            <button
              className="button secondary"
              type="button"
              onClick={() => setPendingRestore(null)}
            >
              Keep current data
            </button>
            <button
              className="button danger"
              type="button"
              onClick={applyRestore}
            >
              <FileUp size={16} />
              Replace with backup
            </button>
          </div>
        </Modal>
      ) : null}
      {deleteOpen ? (
        <Modal
          title="Erase all local app data?"
          description="This permanently removes profiles, plans, trades, reviews, progress, imported lessons, chart datasets, watchlists, and all saved market-data credentials from this installation."
          onClose={() => {
            if (!eraseBusy) setDeleteOpen(false);
          }}
          dismissible={!eraseBusy}
        >
          <div className="callout warning">
            <RotateCcw size={18} />
            <p>
              Export a backup first if you may want these records later. This
              action cannot be undone inside the app.
            </p>
          </div>
          {eraseError ? (
            <div className="error-message" role="alert">
              {eraseError}
            </div>
          ) : null}
          <div className="form-actions">
            <button
              className="button secondary"
              type="button"
              disabled={eraseBusy}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </button>
            <button
              className="button danger"
              type="button"
              disabled={eraseBusy}
              onClick={() => void eraseAllData()}
            >
              <Trash2 size={16} />
              {eraseBusy ? "Erasing…" : "Erase everything"}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
