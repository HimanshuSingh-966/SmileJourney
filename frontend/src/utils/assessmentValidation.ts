/**
 * Strict validation utilities for SmileJourneyAI backend responses and Firestore assessment records.
 *
 * Enforces:
 * - Exactly one finding per canonical category (crowding/alignment, gaps, discoloration, gum line, symmetry).
 * - Integer score [0..100].
 * - Valid backend photo_url (HTTP/HTTPS).
 * - Valid ISO 8601 created_at timestamp.
 * - Non-empty IDs, titles, descriptions, and canonical severities.
 * - Zero fallback or invented data.
 */

import type {
  IssueCategory,
  FindingSeverity,
  CompletedAssessmentResult,
  CompletedAssessmentFinding,
  BackendSpecialistRecommendation,
  MilestoneItem,
  ValidatedLegacyMilestone,
} from '../types';

export const CANONICAL_CATEGORIES: readonly IssueCategory[] = [
  'crowding/alignment',
  'gaps',
  'discoloration',
  'gum line',
  'symmetry',
] as const;

export const VALID_SEVERITIES: readonly FindingSeverity[] = [
  'none',
  'mild',
  'moderate',
  'severe',
] as const;

export class AssessmentValidationError extends Error {
  public validationErrors: string[];

  constructor(message: string, validationErrors: string[] = []) {
    super(message);
    this.name = 'AssessmentValidationError';
    this.validationErrors = validationErrors;
  }
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors: string[];
}

/**
 * Validates whether a value is a valid ISO 8601 date-time string.
 */
export function isValidIsoDate(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  const trimmed = value.trim();
  // Validates standard ISO 8601 representation (e.g. 2026-11-08T04:13:24Z or with timezone offset)
  const isoPattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)?)?$/i;
  if (!isoPattern.test(trimmed)) {
    return false;
  }
  const timestamp = Date.parse(trimmed);
  return !Number.isNaN(timestamp);
}

/**
 * Validates whether a value is a valid absolute HTTP or HTTPS URL.
 */
export function isValidHttpUrl(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates a completed assessment payload from either the Python backend API or Cloud Firestore.
 *
 * @param raw - The untrusted raw data
 * @param options - Optional consistency checks, such as expectedDocId
 */
export function validateCompletedAssessment(
  raw: unknown,
  options?: { expectedDocId?: string }
): ValidationResult<CompletedAssessmentResult> {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      success: false,
      errors: ['Assessment record must be a non-null JSON object.'],
    };
  }

  const obj = raw as Record<string, any>;

  // 1. assessment_id check
  if (typeof obj.assessment_id !== 'string' || !obj.assessment_id.trim()) {
    errors.push('assessment_id is missing or empty.');
  }

  // Consistency check against Firestore document ID
  if (options?.expectedDocId) {
    if (obj.assessment_id !== options.expectedDocId) {
      errors.push(
        `Document ID mismatch: Firestore doc ID "${options.expectedDocId}" does not match payload assessment_id "${obj.assessment_id}".`
      );
    }
  }

  // 2. status check
  if (obj.status !== 'complete') {
    errors.push(`Assessment status must be strictly "complete" (received: "${obj.status}").`);
  }

  // 3. score check (integer between 0 and 100)
  if (typeof obj.score !== 'number' || !Number.isInteger(obj.score) || obj.score < 0 || obj.score > 100) {
    errors.push(
      `score must be an integer between 0 and 100 (received: ${
        typeof obj.score === 'number' ? obj.score : JSON.stringify(obj.score)
      }).`
    );
  }

  // 4. photo_url check (non-empty valid HTTP/HTTPS URL)
  if (!isValidHttpUrl(obj.photo_url)) {
    errors.push(
      `photo_url must be a valid, non-empty HTTP/HTTPS URL provided by backend (received: ${JSON.stringify(
        obj.photo_url
      )}).`
    );
  }

  // 5. created_at check (valid ISO 8601 string)
  if (!isValidIsoDate(obj.created_at)) {
    errors.push(
      `created_at must be a valid ISO 8601 timestamp (received: ${JSON.stringify(obj.created_at)}).`
    );
  }

  // 6. completed_at check (optional, but if present must be valid ISO 8601)
  if (obj.completed_at !== undefined && obj.completed_at !== null) {
    if (!isValidIsoDate(obj.completed_at)) {
      errors.push(
        `completed_at must be a valid ISO 8601 timestamp (received: ${JSON.stringify(obj.completed_at)}).`
      );
    }
  }

  // 7. findings check (exactly one finding per canonical category)
  const canonicalSet = new Set<IssueCategory>(CANONICAL_CATEGORIES);
  const validatedFindings: CompletedAssessmentFinding[] = [];

  if (!Array.isArray(obj.findings)) {
    errors.push('findings must be an array.');
  } else if (obj.findings.length !== 5) {
    errors.push(
      `findings must contain exactly 5 category findings (received ${obj.findings.length}).`
    );
  } else {
    const seenCategories = new Set<string>();

    for (let i = 0; i < obj.findings.length; i++) {
      const f = obj.findings[i];
      if (!f || typeof f !== 'object') {
        errors.push(`Finding at index ${i} is not a valid object.`);
        continue;
      }

      // Check id
      if (typeof f.id !== 'string' || !f.id.trim()) {
        errors.push(`Finding at index ${i} has a missing or empty id.`);
      }

      // Check category
      if (!canonicalSet.has(f.category)) {
        errors.push(
          `Finding at index ${i} has invalid category "${f.category}". Supported categories: ${CANONICAL_CATEGORIES.join(
            ', '
          )}.`
        );
      } else {
        if (seenCategories.has(f.category)) {
          errors.push(`Duplicate finding category found: "${f.category}".`);
        }
        seenCategories.add(f.category);
      }

      // Check title
      if (typeof f.title !== 'string' || !f.title.trim()) {
        errors.push(`Finding at index ${i} has a missing or empty title.`);
      }

      // Check severity
      if (!VALID_SEVERITIES.includes(f.severity)) {
        errors.push(
          `Finding at index ${i} has invalid severity "${f.severity}". Supported severities: ${VALID_SEVERITIES.join(
            ', '
          )}.`
        );
      }

      // Check description
      if (typeof f.description !== 'string' || !f.description.trim()) {
        errors.push(`Finding at index ${i} has a missing or empty description.`);
      }

      if (
        typeof f.id === 'string' &&
        f.id.trim() &&
        canonicalSet.has(f.category) &&
        typeof f.title === 'string' &&
        f.title.trim() &&
        VALID_SEVERITIES.includes(f.severity) &&
        typeof f.description === 'string' &&
        f.description.trim()
      ) {
        validatedFindings.push({
          id: f.id.trim(),
          category: f.category,
          title: f.title.trim(),
          severity: f.severity,
          description: f.description.trim(),
          icon: typeof f.icon === 'string' && f.icon.trim() ? f.icon.trim() : undefined,
        });
      }
    }

    // Verify all canonical categories are represented
    for (const cat of CANONICAL_CATEGORIES) {
      if (!seenCategories.has(cat)) {
        errors.push(`Missing required canonical category finding: "${cat}".`);
      }
    }
  }

  // 8. specialist_recommendation check (optional or null allowed)
  let specialistRecommendation: BackendSpecialistRecommendation | null = null;
  if (obj.specialist_recommendation !== undefined && obj.specialist_recommendation !== null) {
    if (typeof obj.specialist_recommendation !== 'object') {
      errors.push('specialist_recommendation must be an object or null.');
    } else {
      const rec = obj.specialist_recommendation;
      if (rec.primarySpecialist !== undefined && typeof rec.primarySpecialist !== 'string') {
        errors.push('specialist_recommendation.primarySpecialist must be a string.');
      }
      if (rec.coSpecialist !== undefined && rec.coSpecialist !== null && typeof rec.coSpecialist !== 'string') {
        errors.push('specialist_recommendation.coSpecialist must be a string or null.');
      }
      if (rec.notes !== undefined && typeof rec.notes !== 'string') {
        errors.push('specialist_recommendation.notes must be a string.');
      }
      if (rec.reasons !== undefined && (!Array.isArray(rec.reasons) || rec.reasons.some((r: any) => typeof r !== 'string'))) {
        errors.push('specialist_recommendation.reasons must be an array of strings.');
      }
      if (rec.discipline !== undefined && typeof rec.discipline !== 'string') {
        errors.push('specialist_recommendation.discipline must be a string.');
      }

      if (errors.length === 0) {
        specialistRecommendation = {
          primarySpecialist: rec.primarySpecialist,
          coSpecialist: rec.coSpecialist ?? null,
          notes: rec.notes,
          reasons: rec.reasons,
          discipline: rec.discipline,
        };
      }
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  const validatedData: CompletedAssessmentResult = {
    assessment_id: obj.assessment_id.trim(),
    status: 'complete',
    score: obj.score,
    findings: validatedFindings,
    photo_url: obj.photo_url.trim(),
    created_at: obj.created_at.trim(),
    completed_at: obj.completed_at ? obj.completed_at.trim() : undefined,
    specialist_recommendation: specialistRecommendation,
    consultation_questions: Array.isArray(obj.consultation_questions)
      ? obj.consultation_questions
      : undefined,
  };

  return {
    success: true,
    data: validatedData,
    errors: [],
  };
}

/**
 * Asserts that a raw assessment is valid, throwing an AssessmentValidationError if it is not.
 */
export function assertValidCompletedAssessment(
  raw: unknown,
  options?: { expectedDocId?: string }
): CompletedAssessmentResult {
  const result = validateCompletedAssessment(raw, options);
  if (!result.success || !result.data) {
    throw new AssessmentValidationError(
      `Assessment validation failed: ${result.errors.join('; ')}`,
      result.errors
    );
  }
  return result.data;
}

/**
 * Strictly validates a legacy milestone document from users/{uid}/milestones/{milestoneId}.
 *
 * Rules:
 * - Does not invent score, date, photoUrl, or missing fields.
 * - Score must be a valid number between 0 and 100.
 * - PhotoUrl must be a non-empty string.
 * - Stored date/createdAt must be parseable into a valid timestamp.
 * - Marks record as isLegacy: true and hasFullReport: false.
 */
export function validateLegacyMilestone(
  raw: unknown,
  docId: string
): ValidationResult<ValidatedLegacyMilestone> {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      success: false,
      errors: ['Legacy milestone record must be a non-null object.'],
    };
  }

  const obj = raw as Record<string, any>;

  // 1. ID check
  const id = typeof obj.id === 'string' && obj.id.trim() ? obj.id.trim() : docId;
  if (!id) {
    errors.push('Legacy milestone has no valid document ID.');
  }

  // 2. Score check: must be a valid number 0..100
  if (
    typeof obj.score !== 'number' ||
    Number.isNaN(obj.score) ||
    obj.score < 0 ||
    obj.score > 100
  ) {
    errors.push(
      `score must be a valid number between 0 and 100 (received: ${
        typeof obj.score === 'number' ? obj.score : JSON.stringify(obj.score)
      }).`
    );
  }

  // 3. Photo check: photoUrl must be a non-empty string
  if (typeof obj.photoUrl !== 'string' || !obj.photoUrl.trim()) {
    errors.push('photoUrl is missing or empty.');
  }

  // 4. Date & Timestamp check: must parse from stored timestamp, createdAt, or date
  let parsedTimestamp: number | null = null;
  if (typeof obj.timestamp === 'number' && !Number.isNaN(obj.timestamp) && obj.timestamp > 0) {
    parsedTimestamp = obj.timestamp;
  } else if (typeof obj.createdAt === 'string' && !Number.isNaN(Date.parse(obj.createdAt))) {
    parsedTimestamp = Date.parse(obj.createdAt);
  } else if (typeof obj.date === 'string' && !Number.isNaN(Date.parse(obj.date))) {
    parsedTimestamp = Date.parse(obj.date);
  }

  if (parsedTimestamp === null) {
    errors.push('Missing or invalid stored date/timestamp; cannot determine creation time.');
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  const timestamp = parsedTimestamp as number;
  const dateStr =
    typeof obj.date === 'string' && obj.date.trim()
      ? obj.date.trim()
      : new Date(timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

  return {
    success: true,
    data: {
      id,
      score: obj.score,
      photoUrl: obj.photoUrl.trim(),
      date: dateStr,
      timestamp,
      dayLabel: typeof obj.dayLabel === 'string' && obj.dayLabel.trim() ? obj.dayLabel.trim() : 'Historical Checkpoint',
      title: typeof obj.title === 'string' && obj.title.trim() ? obj.title.trim() : 'Archived photo scan',
      description: `Historical photo checkpoint · Score ${obj.score}/100`,
      tags: ['Archived Log', 'Historical'],
      assessmentId: typeof obj.assessmentId === 'string' && obj.assessmentId.trim() ? obj.assessmentId.trim() : undefined,
      isLegacy: true,
      hasFullReport: false,
    },
    errors: [],
  };
}

/**
 * Asserts that a legacy milestone document is valid, throwing an AssessmentValidationError if it is not.
 */
export function assertValidLegacyMilestone(
  raw: unknown,
  docId: string
): ValidatedLegacyMilestone {
  const result = validateLegacyMilestone(raw, docId);
  if (!result.success || !result.data) {
    throw new AssessmentValidationError(
      `Legacy milestone validation failed for doc "${docId}": ${result.errors.join('; ')}`,
      result.errors
    );
  }
  return result.data;
}

/**
 * Combines new backend-verified assessments and legacy milestone scans into a unified timeline:
 * - Deduplicates: if a legacy milestone has assessmentId matching a new assessment, the new assessment entry takes precedence.
 * - Sorts newest first by timestamp.
 * - Clearly marks legacy entries vs verified assessment entries.
 */
export function combineMilestones(
  newAssessments: CompletedAssessmentResult[],
  legacyMilestones: ValidatedLegacyMilestone[]
): MilestoneItem[] {
  // Set of assessment IDs from new assessments for deduplication
  const newAssessmentIds = new Set<string>();
  for (const item of newAssessments) {
    if (item.assessment_id) {
      newAssessmentIds.add(item.assessment_id);
    }
  }

  // Map new assessments into MilestoneItem entries
  const newItems: MilestoneItem[] = newAssessments.map((item, idx) => {
    const revIdx = newAssessments.length - idx;
    const isFirst = revIdx === 1;
    const d = new Date(item.created_at);
    const dateStr = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return {
      id: item.assessment_id,
      date: dateStr,
      dayLabel: isFirst ? 'Baseline (Day 1)' : `Scan #${revIdx}`,
      score: item.score,
      photoUrl: item.photo_url,
      altText: `Smile photo logged on ${dateStr}`,
      title: isFirst ? 'Baseline intake check-in' : `Follow-up scan #${revIdx}`,
      description: `Verified by backend model · Overall score ${item.score}/100`,
      tags: isFirst ? ['Baseline Intake', 'Verified'] : ['Routine Checkpoint', 'Verified'],
      assessmentId: item.assessment_id,
      timestamp: d.getTime(),
      isLegacy: false,
      hasFullReport: true,
    };
  });

  // Filter legacy milestones: avoid duplicates if assessmentId or id matches a new assessment
  const filteredLegacy: MilestoneItem[] = [];
  for (const leg of legacyMilestones) {
    if (leg.assessmentId && newAssessmentIds.has(leg.assessmentId)) {
      continue; // Skip duplicate!
    }
    if (newAssessmentIds.has(leg.id)) {
      continue; // Skip duplicate!
    }

    filteredLegacy.push({
      id: leg.id,
      date: leg.date,
      dayLabel: leg.dayLabel,
      score: leg.score,
      photoUrl: leg.photoUrl,
      altText: `Historical smile photo from ${leg.date}`,
      title: leg.title,
      description: leg.description,
      tags: leg.tags,
      assessmentId: leg.assessmentId,
      timestamp: leg.timestamp,
      isLegacy: true,
      hasFullReport: false,
    });
  }

  // Combine and sort newest first by timestamp
  const combined = [...newItems, ...filteredLegacy];
  combined.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

  return combined;
}
