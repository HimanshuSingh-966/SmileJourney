/**
 * Clinical and aesthetic wellness helper utilities for SmileJourneyAI.
 * Pure deterministic functions decoupled from UI rendering.
 * Does not simulate or invent backend findings or scores.
 */

import type { FindingSeverity, IssueCategory, MilestoneComparison } from '../types';

/**
 * Returns human-readable label for the 5 canonical issue categories.
 */
export function getCategoryLabel(category: IssueCategory): string {
  switch (category) {
    case 'crowding/alignment':
      return 'Crowding / Alignment';
    case 'gaps':
      return 'Interdental Gaps';
    case 'discoloration':
      return 'Enamel Shade & Discoloration';
    case 'gum line':
      return 'Gingival Contour & Gum Line';
    case 'symmetry':
      return 'Midline & Symmetry';
    default:
      return category;
  }
}

/**
 * Returns human-readable severity label.
 * Displays "none" as "No visible issue." and other labels plainly as "Mild", "Moderate", and "Severe".
 */
export function getSeverityLabel(severity: FindingSeverity): string {
  switch (severity) {
    case 'none':
      return 'No visible issue.';
    case 'mild':
      return 'Mild';
    case 'moderate':
      return 'Moderate';
    case 'severe':
      return 'Severe';
    default:
      return severity;
  }
}

/**
 * Calculates experimental score difference between two verified milestone scores.
 * Pure mathematical calculation based on confirmed backend scores.
 * Experimental prototype metric; does not represent clinical improvement or deterioration.
 */
export function calculateProgressDelta(
  baselineScore: number,
  currentScore: number,
  daysElapsed: number
): MilestoneComparison {
  const ptsDelta = currentScore - baselineScore;
  const isImproving = ptsDelta > 0;
  const weeks = Math.max(1, Math.round(daysElapsed / 7));
  const velocitySummary = `${ptsDelta >= 0 ? `+${ptsDelta}` : ptsDelta} pts experimental score difference over ${weeks} weeks (${daysElapsed} days)`;

  return {
    baselineScore,
    currentScore,
    ptsDelta,
    isImproving,
    daysElapsed,
    velocitySummary,
  };
}
