import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Modal } from "./Modal";
import { useAppState } from "../state/AppStateContext";
import type { Profile } from "../domain/types";

const steps = ["Welcome", "Your guardrails", "Ready"];
const positiveNumber = (value: string) =>
  Number.isFinite(Number(value)) && Number(value) > 0;

export function WelcomeFlow() {
  const { state, completeOnboarding } = useAppState();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>(state.profile);
  const update = <K extends keyof Profile>(field: K, value: Profile[K]) =>
    setProfile((current) => ({ ...current, [field]: value }));
  const riskValid = positiveNumber(profile.maxRiskPerTrade);
  const dailyLimitValid = positiveNumber(profile.dailyLossLimit);

  if (state.onboardingComplete) return null;

  return (
    <Modal
      title={steps[step]}
      description={`Step ${step + 1} of ${steps.length}`}
      onClose={() => undefined}
      dismissible={false}
    >
      <div
        className="step-indicator"
        aria-label={`Setup progress: step ${step + 1} of ${steps.length}`}
      >
        {steps.map((label, index) => (
          <div className={index <= step ? "step active" : "step"} key={label}>
            <span>{index < step ? <Check size={13} /> : index + 1}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>

      {step === 0 ? (
        <div className="welcome-panel">
          <span className="welcome-icon">
            <BookOpenCheck size={28} />
          </span>
          <h3>Practice better decisions—not more trades.</h3>
          <p>
            Trading Teacher helps you learn risk, write plans before outcomes
            are known, and review completed trades without confusing profit with
            process quality.
          </p>
          <div className="trust-grid">
            <div>
              <LockKeyhole size={18} />
              <span>
                <strong>Private by default</strong>
                <small>Your records stay on this device.</small>
              </span>
            </div>
            <div>
              <ShieldCheck size={18} />
              <span>
                <strong>No signals or orders</strong>
                <small>Education and review only.</small>
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="welcome-name">What should we call you?</label>
              <input
                id="welcome-name"
                autoFocus
                value={profile.displayName}
                onChange={(event) => update("displayName", event.target.value)}
                maxLength={40}
              />
            </div>
            <div className="field">
              <label htmlFor="welcome-path">Learning path</label>
              <select
                id="welcome-path"
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
              <label htmlFor="welcome-risk">
                Maximum risk per practice trade
              </label>
              <div className="input-prefix">
                <span>$</span>
                <input
                  id="welcome-risk"
                  inputMode="decimal"
                  value={profile.maxRiskPerTrade}
                  onChange={(event) =>
                    update("maxRiskPerTrade", event.target.value)
                  }
                  aria-describedby="welcome-risk-hint"
                  aria-invalid={!riskValid}
                />
              </div>
              <small id="welcome-risk-hint" className="field-hint">
                {riskValid
                  ? "Used as the default in the position-size calculator."
                  : "Enter a number greater than zero."}
              </small>
            </div>
            <div className="field">
              <label htmlFor="welcome-limit">Daily loss guardrail</label>
              <div className="input-prefix">
                <span>$</span>
                <input
                  id="welcome-limit"
                  inputMode="decimal"
                  value={profile.dailyLossLimit}
                  onChange={(event) =>
                    update("dailyLossLimit", event.target.value)
                  }
                  aria-describedby="welcome-limit-hint"
                  aria-invalid={!dailyLimitValid}
                />
              </div>
              <small id="welcome-limit-hint" className="field-hint">
                {dailyLimitValid
                  ? "Used as a visible stop-work boundary."
                  : "Enter a number greater than zero."}
              </small>
            </div>
            <div className="field">
              <label htmlFor="welcome-account">Practice environment</label>
              <select
                id="welcome-account"
                value={profile.accountType}
                onChange={(event) =>
                  update(
                    "accountType",
                    event.target.value as Profile["accountType"],
                  )
                }
              >
                <option value="paper">Paper/simulated</option>
                <option value="cash">Cash account</option>
                <option value="margin">Margin account</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="welcome-time">Daily study time</label>
              <select
                id="welcome-time"
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
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="welcome-panel">
          <span className="welcome-icon">
            <ShieldCheck size={28} />
          </span>
          <h3>Your workspace is ready.</h3>
          <p>
            Start with the short risk lesson, then write a practice plan. You
            can change every preference later in Settings.
          </p>
          <div className="callout">
            <LockKeyhole size={18} />
            <p>
              Custom lessons are created outside the app and imported only when
              you approve them. Nothing is sent to ChatGPT automatically.
            </p>
          </div>
        </div>
      ) : null}

      <div className="form-actions split-actions">
        <button
          className="button secondary"
          type="button"
          disabled={step === 0}
          onClick={() => setStep((current) => current - 1)}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        {step < steps.length - 1 ? (
          <button
            className="button primary"
            type="button"
            disabled={
              step === 1 &&
              (!profile.displayName.trim() || !riskValid || !dailyLimitValid)
            }
            onClick={() => setStep((current) => current + 1)}
          >
            Continue
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            className="button primary"
            type="button"
            onClick={() =>
              completeOnboarding({
                ...profile,
                displayName: profile.displayName.trim(),
              })
            }
          >
            Start learning
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </Modal>
  );
}
