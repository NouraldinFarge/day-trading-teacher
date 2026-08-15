export type ResetSignal =
  | "urgency"
  | "tunnel_vision"
  | "physical_activation"
  | "recover_outcome"
  | "euphoria"
  | "focus_drop";

export type ResetRecommendation = "continue_review" | "pause" | "review_only";

export function recommendResetAction(input: {
  activation: number;
  signals: ResetSignal[];
  boundaryReached: boolean;
  planStillValid: boolean;
}): {
  recommendation: ResetRecommendation;
  reason: string;
} {
  if (
    !Number.isInteger(input.activation) ||
    input.activation < 1 ||
    input.activation > 5
  )
    throw new Error("Activation must be an integer from 1 to 5.");
  if (input.boundaryReached)
    return {
      recommendation: "review_only",
      reason:
        "A preset boundary has been reached. The session belongs in review-only mode regardless of the next chart.",
    };
  if (
    input.activation >= 4 ||
    input.signals.includes("recover_outcome") ||
    input.signals.length >= 3
  )
    return {
      recommendation: "review_only",
      reason:
        "The current activation or outcome-repair urge is too strong for an independent next decision. End execution and preserve the evidence for review.",
    };
  if (
    input.activation === 3 ||
    input.signals.length > 0 ||
    !input.planStillValid
  )
    return {
      recommendation: "pause",
      reason:
        "Pause, separate facts from the story, and rebuild the decision from current evidence. Waiting or stopping fully completes the reset.",
    };
  return {
    recommendation: "continue_review",
    reason:
      "No escalation signal is recorded. Return only to the written plan and remain willing to take no trade.",
  };
}
