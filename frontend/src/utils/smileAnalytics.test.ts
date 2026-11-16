import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProgressDelta,
  getCategoryLabel,
  getSeverityLabel,
} from './smileAnalytics.ts';
import {
  isValidIsoDate,
  isValidHttpUrl,
  isValidPhotoObjectKey,
  validateCompletedAssessment,
  validateHistoricalAssessment,
  assertValidCompletedAssessment,
  buildFirestoreAssessmentRecord,
  validateLegacyMilestone,
  assertValidLegacyMilestone,
  combineMilestones,
  AssessmentValidationError,
} from './assessmentValidation.ts';
import {
  dataUrlToBlob,
  BackendNotConfiguredError,
  AssessmentApiError,
  AssessmentTimeoutError,
  AssessmentFailedError,
  isValidBackendUrl,
  submitAssessment,
  fetchSignedPhotoUrl,
} from '../services/assessmentApi.ts';
import type { CompletedAssessmentResult, HistoricalAssessment } from '../types.ts';

test('calculateProgressDelta accurately calculates positive trajectory (+4 score difference over 37 days)', () => {
  const progress = calculateProgressDelta(68, 72, 37);
  assert.equal(progress.ptsDelta, 4);
  assert.equal(progress.isImproving, true);
  assert.equal(progress.daysElapsed, 37);
  assert.match(progress.velocitySummary, /\+4 pts experimental score difference over 5 weeks/);
});

test('calculateProgressDelta accurately calculates negative or flat trajectory', () => {
  const progress = calculateProgressDelta(80, 75, 14);
  assert.equal(progress.ptsDelta, -5);
  assert.equal(progress.isImproving, false);
  assert.equal(progress.daysElapsed, 14);
  assert.match(progress.velocitySummary, /-5 pts experimental score difference over 2 weeks/);
});

test('getCategoryLabel maps all 5 canonical categories to human-friendly strings', () => {
  assert.equal(getCategoryLabel('crowding/alignment'), 'Crowding / Alignment');
  assert.equal(getCategoryLabel('gaps'), 'Interdental Gaps');
  assert.equal(getCategoryLabel('discoloration'), 'Enamel Shade & Discoloration');
  assert.equal(getCategoryLabel('gum line'), 'Gingival Contour & Gum Line');
  assert.equal(getCategoryLabel('symmetry'), 'Midline & Symmetry');
});

test('getSeverityLabel returns clear descriptions for agreed labels', () => {
  assert.equal(getSeverityLabel('none'), 'No visible issue.');
  assert.equal(getSeverityLabel('mild'), 'Mild');
  assert.equal(getSeverityLabel('moderate'), 'Moderate');
  assert.equal(getSeverityLabel('severe'), 'Severe');
});

test('isValidIsoDate accurately verifies valid ISO 8601 strings and rejects invalid formats', () => {
  assert.equal(isValidIsoDate('2026-11-08T04:13:24Z'), true);
  assert.equal(isValidIsoDate('2026-11-08T04:13:24.123Z'), true);
  assert.equal(isValidIsoDate('2026-11-08T04:13:24+00:00'), true);
  assert.equal(isValidIsoDate('2026-11-08'), true);

  assert.equal(isValidIsoDate(''), false);
  assert.equal(isValidIsoDate('invalid-date'), false);
  assert.equal(isValidIsoDate('Nov 8, 2026'), false);
  assert.equal(isValidIsoDate(null), false);
  assert.equal(isValidIsoDate(undefined), false);
  assert.equal(isValidIsoDate(123456789), false);
});

test('isValidHttpUrl strictly verifies HTTP/HTTPS URLs and rejects placeholders or relative URLs', () => {
  assert.equal(isValidHttpUrl('https://storage.googleapis.com/bucket/photo.jpg'), true);
  assert.equal(isValidHttpUrl('http://127.0.0.1:8000/photo.jpg'), true);

  assert.equal(isValidHttpUrl('data:image/jpeg;base64,...'), false);
  assert.equal(isValidHttpUrl('/photos/scan.jpg'), false);
  assert.equal(isValidHttpUrl(''), false);
  assert.equal(isValidHttpUrl(null), false);
  assert.equal(isValidHttpUrl('not-a-url'), false);
});

const sampleValidPayload: CompletedAssessmentResult = {
  assessment_id: 'assess-101',
  status: 'complete',
  score: 84,
  photo_object_key: 'user-photos/firebase-uid-1/assess-101.jpg',
  created_at: '2026-11-08T04:00:00.000Z',
  completed_at: '2026-11-08T04:00:05.000Z',
  findings: [
    {
      id: 'f-1',
      category: 'crowding/alignment',
      title: 'Mild Anterior Overlap',
      severity: 'mild',
      description: 'Lower anterior teeth present slight rotation.',
    },
    {
      id: 'f-2',
      category: 'gaps',
      title: 'Continuous Contact',
      severity: 'none',
      description: 'Continuous interdental proximal contact.',
    },
    {
      id: 'f-3',
      category: 'discoloration',
      title: 'Natural Enamel Tone',
      severity: 'none',
      description: 'Bright enamel reflectivity observed.',
    },
    {
      id: 'f-4',
      category: 'gum line',
      title: 'Mild Marginal Recession',
      severity: 'mild',
      description: 'Slight gingival margin irregularity observed.',
    },
    {
      id: 'f-5',
      category: 'symmetry',
      title: 'Facial Midline Centricity',
      severity: 'none',
      description: 'Dental midline aligns with facial center.',
    },
  ],
  specialist_recommendation: {
    primarySpecialist: 'Orthodontist',
    coSpecialist: null,
    notes: 'Consult orthodontist for aligner suitability.',
    reasons: ['Mild anterior overlap'],
    discipline: 'Orthodontics',
  },
};

test('validateCompletedAssessment succeeds for a fully compliant backend report', () => {
  const result = validateCompletedAssessment(sampleValidPayload, { expectedUid: 'firebase-uid-1' });
  assert.equal(result.success, true);
  assert.ok(result.data);
  assert.equal(result.data?.assessment_id, 'assess-101');
  assert.equal(result.data?.status, 'complete');
  assert.equal(result.data?.score, 84);
  assert.equal(result.data?.photo_object_key, 'user-photos/firebase-uid-1/assess-101.jpg');
  assert.equal((result.data as any)?.photo_url, undefined);
  assert.equal(result.data?.findings.length, 5);
  assert.equal(result.errors.length, 0);
});

test('validateCompletedAssessment and validateLegacyMilestone accept valid score of 0', () => {
  const zeroScorePayload: CompletedAssessmentResult = {
    ...sampleValidPayload,
    assessment_id: 'assess-zero',
    score: 0,
    findings: sampleValidPayload.findings.map((f) => ({
      ...f,
      severity: 'severe',
    })),
  };

  const assessmentResult = validateCompletedAssessment(zeroScorePayload);
  assert.equal(assessmentResult.success, true);
  assert.equal(assessmentResult.data?.score, 0);

  const legacyZeroResult = validateLegacyMilestone(
    {
      score: 0,
      photoUrl: 'https://storage.googleapis.com/bucket/legacy-zero.jpg',
      createdAt: '2026-10-14T10:00:00.000Z',
    },
    'legacy-zero-1'
  );
  assert.equal(legacyZeroResult.success, true);
  assert.equal(legacyZeroResult.data?.score, 0);
});

test('validateCompletedAssessment rejects missing or invalid score without defaulting to 0', () => {
  // Missing score
  const noScore = { ...sampleValidPayload, score: undefined };
  const r1 = validateCompletedAssessment(noScore);
  assert.equal(r1.success, false);
  assert.match(r1.errors.join('; '), /score must be an integer between 0 and 100/);

  // String score
  const strScore = { ...sampleValidPayload, score: '84' };
  const r2 = validateCompletedAssessment(strScore);
  assert.equal(r2.success, false);

  // Floating point score
  const floatScore = { ...sampleValidPayload, score: 84.5 };
  const r3 = validateCompletedAssessment(floatScore);
  assert.equal(r3.success, false);

  // Negative score
  const negScore = { ...sampleValidPayload, score: -1 };
  const r4 = validateCompletedAssessment(negScore);
  assert.equal(r4.success, false);

  // Over 100 score
  const overScore = { ...sampleValidPayload, score: 101 };
  const r5 = validateCompletedAssessment(overScore);
  assert.equal(r5.success, false);
});

test('validateCompletedAssessment rejects missing, invalid, or cross-user photo_object_key without falling back', () => {
  // Missing photo_object_key
  const noPhoto = { ...sampleValidPayload, photo_object_key: undefined };
  const r1 = validateCompletedAssessment(noPhoto);
  assert.equal(r1.success, false);
  assert.match(r1.errors.join('; '), /photo_object_key must be a valid key/);

  // Empty photo_object_key
  const emptyPhoto = { ...sampleValidPayload, photo_object_key: '' };
  const r2 = validateCompletedAssessment(emptyPhoto);
  assert.equal(r2.success, false);

  // Public/arbitrary URL instead of private object key
  const publicUrl = { ...sampleValidPayload, photo_object_key: 'https://f005.backblazeb2.com/file/public/img.jpg' };
  const r3 = validateCompletedAssessment(publicUrl);
  assert.equal(r3.success, false);

  // Another user's UID rejected when expectedUid is enforced
  const wrongUid = validateCompletedAssessment(sampleValidPayload, { expectedUid: 'different-user-uid' });
  assert.equal(wrongUid.success, false);
  assert.match(wrongUid.errors.join('; '), /user-photos\/different-user-uid\//);

  // Reject slashes in assessment_id
  const badId = validateCompletedAssessment({ ...sampleValidPayload, assessment_id: 'bad/id' });
  assert.equal(badId.success, false);
});

test('validateCompletedAssessment rejects missing, incomplete or duplicate canonical categories', () => {
  // Incomplete: only 4 findings (missing symmetry)
  const missingCat = {
    ...sampleValidPayload,
    findings: sampleValidPayload.findings.slice(0, 4),
  };
  const r1 = validateCompletedAssessment(missingCat);
  assert.equal(r1.success, false);
  assert.match(r1.errors.join('; '), /findings must contain exactly 5 category findings/);

  // Duplicate category (2 crowding, 0 gaps)
  const duplicateCat = {
    ...sampleValidPayload,
    findings: [
      sampleValidPayload.findings[0],
      { ...sampleValidPayload.findings[0], id: 'f-dup' },
      sampleValidPayload.findings[2],
      sampleValidPayload.findings[3],
      sampleValidPayload.findings[4],
    ],
  };
  const r2 = validateCompletedAssessment(duplicateCat);
  assert.equal(r2.success, false);
  assert.match(r2.errors.join('; '), /Duplicate finding category found/);
});

test('validateCompletedAssessment rejects invalid severity without silently converting to defaults', () => {
  const invalidSev = {
    ...sampleValidPayload,
    findings: sampleValidPayload.findings.map((f, i) => (i === 0 ? { ...f, severity: 'extreme' } : f)),
  };
  const r = validateCompletedAssessment(invalidSev);
  assert.equal(r.success, false);
  assert.match(r.errors.join('; '), /invalid severity "extreme"/);

  // Reject deprecated labels like 'optimal' or 'good'
  const deprecatedSev = {
    ...sampleValidPayload,
    findings: sampleValidPayload.findings.map((f, i) => (i === 0 ? { ...f, severity: 'optimal' } : f)),
  };
  const r2 = validateCompletedAssessment(deprecatedSev);
  assert.equal(r2.success, false);
  assert.match(r2.errors.join('; '), /invalid severity "optimal"/);
});

test('validateCompletedAssessment enforces consistency check against Firestore document ID', () => {
  // Document ID matches assessment_id: succeeds
  const matchResult = validateCompletedAssessment(sampleValidPayload, { expectedDocId: 'assess-101' });
  assert.equal(matchResult.success, true);

  // Document ID mismatch: fails
  const mismatchResult = validateCompletedAssessment(sampleValidPayload, { expectedDocId: 'different-doc-id' });
  assert.equal(mismatchResult.success, false);
  assert.match(mismatchResult.errors.join('; '), /Document ID mismatch/);
});

test('assertValidCompletedAssessment throws AssessmentValidationError on invalid data', () => {
  assert.throws(
    () => {
      assertValidCompletedAssessment({ status: 'incomplete' });
    },
    (err: any) => {
      return err instanceof AssessmentValidationError && err.validationErrors.length > 0;
    }
  );
});

test('dataUrlToBlob accurately converts base64 image data URL into a binary Blob', () => {
  const sampleDataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const blob = dataUrlToBlob(sampleDataUrl);
  assert.ok(blob instanceof Blob);
  assert.equal(blob.type, 'image/png');
  assert.ok(blob.size > 0);
});

test('Assessment error classes instantiate with correct names and messages', () => {
  const configErr = new BackendNotConfiguredError('Missing URL');
  assert.equal(configErr.name, 'BackendNotConfiguredError');
  assert.equal(configErr.message, 'Missing URL');

  const apiErr = new AssessmentApiError('Server 500 error', 500, { detail: 'Internal failure' });
  assert.equal(apiErr.name, 'AssessmentApiError');
  assert.equal(apiErr.statusCode, 500);

  const timeoutErr = new AssessmentTimeoutError();
  assert.equal(timeoutErr.name, 'AssessmentTimeoutError');

  const failedErr = new AssessmentFailedError('Model failed');
  assert.equal(failedErr.name, 'AssessmentFailedError');

  const valErr = new AssessmentValidationError('Validation error', ['field error']);
  assert.equal(valErr.name, 'AssessmentValidationError');
  assert.deepEqual(valErr.validationErrors, ['field error']);
});

test('isValidBackendUrl accurately validates absolute URLs and rejects invalid or placeholder strings', () => {
  assert.equal(isValidBackendUrl('https://my-backend.onrender.com'), true);
  assert.equal(isValidBackendUrl('http://localhost:8000'), true);
  assert.equal(isValidBackendUrl('http://127.0.0.1:5000/api'), true);

  assert.equal(isValidBackendUrl('abc'), false);
  assert.equal(isValidBackendUrl(''), false);
  assert.equal(isValidBackendUrl(undefined), false);
  assert.equal(isValidBackendUrl('null'), false);
  assert.equal(isValidBackendUrl('undefined'), false);
  assert.equal(isValidBackendUrl('/api/assessments'), false);
  assert.equal(isValidBackendUrl('ftp://example.com'), false);
});

test('validateLegacyMilestone validates a complete legacy record without inventing defaults', () => {
  const rawDoc = {
    score: 78,
    photoUrl: 'https://storage.googleapis.com/bucket/legacy-photo-1.jpg',
    date: 'Oct 14, 2026',
    createdAt: '2026-10-14T10:00:00.000Z',
    dayLabel: 'Day 1',
    title: 'Baseline Intake',
    description: 'Initial scan',
    tags: ['baseline'],
  };

  const res = validateLegacyMilestone(rawDoc, 'legacy-doc-1');
  assert.equal(res.success, true);
  assert.ok(res.data);
  assert.equal(res.data.id, 'legacy-doc-1');
  assert.equal(res.data.score, 78);
  assert.equal(res.data.photoUrl, 'https://storage.googleapis.com/bucket/legacy-photo-1.jpg');
  assert.equal(res.data.date, 'Oct 14, 2026');
  assert.equal(res.data.isLegacy, true);
  assert.equal(res.data.hasFullReport, false);
  assert.ok(res.data.timestamp > 0);

  const direct = assertValidLegacyMilestone(rawDoc, 'legacy-doc-1');
  assert.equal(direct.score, 78);
});

test('validateLegacyMilestone rejects missing score and does not invent 0', () => {
  const missingScore = {
    photoUrl: 'https://storage.googleapis.com/bucket/photo.jpg',
    createdAt: '2026-10-14T10:00:00.000Z',
  };

  const res1 = validateLegacyMilestone(missingScore, 'bad-score-1');
  assert.equal(res1.success, false);
  assert.match(res1.errors.join('; '), /score/);

  assert.throws(
    () => assertValidLegacyMilestone(missingScore, 'bad-score-1'),
    (err: any) => err instanceof AssessmentValidationError && /score/.test(err.message)
  );

  const invalidScore = {
    score: 150,
    photoUrl: 'https://storage.googleapis.com/bucket/photo.jpg',
    createdAt: '2026-10-14T10:00:00.000Z',
  };

  const res2 = validateLegacyMilestone(invalidScore, 'bad-score-2');
  assert.equal(res2.success, false);
  assert.match(res2.errors.join('; '), /score/);

  assert.throws(
    () => assertValidLegacyMilestone(invalidScore, 'bad-score-2'),
    (err: any) => err instanceof AssessmentValidationError && /score/.test(err.message)
  );
});

test('validateLegacyMilestone rejects missing or empty photoUrl', () => {
  const missingPhoto = {
    score: 75,
    createdAt: '2026-10-14T10:00:00.000Z',
  };

  const res1 = validateLegacyMilestone(missingPhoto, 'bad-photo-1');
  assert.equal(res1.success, false);
  assert.match(res1.errors.join('; '), /photoUrl/);

  assert.throws(
    () => assertValidLegacyMilestone(missingPhoto, 'bad-photo-1'),
    (err: any) => err instanceof AssessmentValidationError && /photoUrl/.test(err.message)
  );

  const emptyPhoto = {
    score: 75,
    photoUrl: '',
    createdAt: '2026-10-14T10:00:00.000Z',
  };

  const res2 = validateLegacyMilestone(emptyPhoto, 'bad-photo-2');
  assert.equal(res2.success, false);
  assert.match(res2.errors.join('; '), /photoUrl/);

  assert.throws(
    () => assertValidLegacyMilestone(emptyPhoto, 'bad-photo-2'),
    (err: any) => err instanceof AssessmentValidationError && /photoUrl/.test(err.message)
  );
});

test('validateLegacyMilestone rejects missing/unparseable date without substituting current date', () => {
  const noDate = {
    score: 75,
    photoUrl: 'https://storage.googleapis.com/bucket/photo.jpg',
  };

  const res1 = validateLegacyMilestone(noDate, 'bad-date-1');
  assert.equal(res1.success, false);
  assert.match(res1.errors.join('; '), /date/);

  assert.throws(
    () => assertValidLegacyMilestone(noDate, 'bad-date-1'),
    (err: any) => err instanceof AssessmentValidationError && /date/.test(err.message)
  );

  const invalidDate = {
    score: 75,
    photoUrl: 'https://storage.googleapis.com/bucket/photo.jpg',
    date: 'totally-invalid-date-string-392931',
  };

  const res2 = validateLegacyMilestone(invalidDate, 'bad-date-2');
  assert.equal(res2.success, false);
  assert.match(res2.errors.join('; '), /date/);

  assert.throws(
    () => assertValidLegacyMilestone(invalidDate, 'bad-date-2'),
    (err: any) => err instanceof AssessmentValidationError && /date/.test(err.message)
  );
});

test('combineMilestones merges new assessments and legacy milestones sorted newest-first', () => {
  const newAssessments = [
    {
      ...sampleValidPayload,
      assessment_id: 'assess-new',
      created_at: '2026-11-08T12:00:00.000Z',
      score: 88,
    },
  ];

  const legacyMilestones = [
    {
      id: 'legacy-older',
      score: 72,
      photoUrl: 'https://storage.googleapis.com/bucket/older.jpg',
      date: 'Nov 1, 2026',
      timestamp: new Date('2026-11-01T10:00:00.000Z').getTime(),
      dayLabel: 'Day 1',
      title: 'Historical Smile Photo',
      description: 'Historical photo checkpoint (score 72).',
      tags: ['historical', 'photo-log'],
      isLegacy: true as const,
      hasFullReport: false as const,
    },
  ];

  const combined = combineMilestones(newAssessments, legacyMilestones);
  assert.equal(combined.length, 2);
  // Newest first
  assert.equal(combined[0].id, 'assess-new');
  assert.equal(combined[0].hasFullReport, true);
  assert.equal(combined[0].isLegacy, false);
  assert.equal(combined[0].score, 88);

  assert.equal(combined[1].id, 'legacy-older');
  assert.equal(combined[1].hasFullReport, false);
  assert.equal(combined[1].isLegacy, true);
  assert.equal(combined[1].score, 72);
});

test('combineMilestones deduplicates legacy milestone when assessmentId matches new assessment', () => {
  const newAssessments = [
    {
      ...sampleValidPayload,
      assessment_id: 'assess-shared-id',
      created_at: '2026-11-08T12:00:00.000Z',
      score: 85,
    },
  ];

  const legacyMilestones = [
    {
      id: 'legacy-doc-with-match',
      assessmentId: 'assess-shared-id', // matches new assessment
      score: 80,
      photoUrl: 'https://storage.googleapis.com/bucket/duplicate.jpg',
      date: 'Nov 8, 2026',
      timestamp: new Date('2026-11-08T10:00:00.000Z').getTime(),
      dayLabel: 'Day 7',
      title: 'Historical Smile Photo',
      description: 'Historical photo checkpoint',
      tags: ['historical'],
      isLegacy: true as const,
      hasFullReport: false as const,
    },
  ];

  const combined = combineMilestones(newAssessments, legacyMilestones);
  // Deduplicated: should only have 1 item (the new verified assessment)
  assert.equal(combined.length, 1);
  assert.equal(combined[0].id, 'assess-shared-id');
  assert.equal(combined[0].hasFullReport, true);
  assert.equal(combined[0].isLegacy, false);
});

test('isValidPhotoObjectKey enforces user-photos/ prefix and expectedUid ownership', () => {
  assert.equal(isValidPhotoObjectKey('user-photos/uid-123/assess-1.jpg'), true);
  assert.equal(isValidPhotoObjectKey('user-photos/u1/nested/img.png'), true);
  assert.equal(isValidPhotoObjectKey('user-photos/uid-123/assess-1.jpg', 'uid-123'), true);

  assert.equal(isValidPhotoObjectKey('user-photos/uid-123/assess-1.jpg', 'other-uid'), false);
  assert.equal(isValidPhotoObjectKey('user-photos/uid-123/../other/assess-1.jpg', 'uid-123'), false);
  assert.equal(isValidPhotoObjectKey('user-photos/uid-123/', 'uid-123'), false);
  assert.equal(isValidPhotoObjectKey('user-photos/'), false);
  assert.equal(isValidPhotoObjectKey('user-photos/   '), false);
  assert.equal(isValidPhotoObjectKey('public-photos/uid-123/scan.jpg'), false);
  assert.equal(isValidPhotoObjectKey('https://f005.backblazeb2.com/file/bucket/x.jpg'), false);
  assert.equal(isValidPhotoObjectKey(''), false);
  assert.equal(isValidPhotoObjectKey(null), false);
});

test('validateHistoricalAssessment accepts photo_object_key without photo_url and supports legacy photo_url', () => {
  const firestoreDoc = {
    ...sampleValidPayload,
    assessment_id: 'assess-b2-01',
    photo_object_key: 'user-photos/firebase-uid-1/assess-b2-01.jpg',
  };

  const histRes = validateHistoricalAssessment(firestoreDoc, {
    expectedDocId: 'assess-b2-01',
    expectedUid: 'firebase-uid-1',
  });
  assert.equal(histRes.success, true);
  assert.ok(histRes.data);
  assert.equal(histRes.data.assessment_id, 'assess-b2-01');
  assert.equal(histRes.data.photo_object_key, 'user-photos/firebase-uid-1/assess-b2-01.jpg');
  assert.equal(histRes.data.photo_url, undefined);

  // Legacy historical assessment with HTTP(S) photo_url and no photo_object_key remains readable
  const { photo_object_key: _omittedKey, ...legacyBase } = sampleValidPayload;
  const legacyDoc = {
    ...legacyBase,
    assessment_id: 'assess-legacy-01',
    photo_url: 'https://storage.googleapis.com/legacy-bucket/scan.jpg',
  };
  const legacyHistRes = validateHistoricalAssessment(legacyDoc, {
    expectedDocId: 'assess-legacy-01',
    expectedUid: 'firebase-uid-1',
  });
  assert.equal(legacyHistRes.success, true);
  assert.equal(legacyHistRes.data?.photo_url, 'https://storage.googleapis.com/legacy-bucket/scan.jpg');

  // Strict API validation must still require photo_object_key
  const apiRes = validateCompletedAssessment(legacyDoc);
  assert.equal(apiRes.success, false);
  assert.match(apiRes.errors.join('; '), /photo_object_key/);
});

test('validateHistoricalAssessment rejects missing photo references and invalid or cross-user photo_object_key', () => {
  const { photo_object_key: _omitted, ...withoutPhoto } = sampleValidPayload;

  const missingBoth = validateHistoricalAssessment(withoutPhoto);
  assert.equal(missingBoth.success, false);
  assert.match(missingBoth.errors.join('; '), /photo_object_key beginning with "user-photos\/"/);

  const badPrefix = validateHistoricalAssessment({
    ...withoutPhoto,
    photo_object_key: 'other-bucket/uid/photo.jpg',
  });
  assert.equal(badPrefix.success, false);
  assert.match(badPrefix.errors.join('; '), /user-photos\//);

  const crossUser = validateHistoricalAssessment(sampleValidPayload, {
    expectedUid: 'another-user',
  });
  assert.equal(crossUser.success, false);
  assert.match(crossUser.errors.join('; '), /user-photos\/another-user\//);

  const badUrlWithValidKey = validateHistoricalAssessment({
    ...withoutPhoto,
    photo_url: 'data:image/jpeg;base64,abc',
    photo_object_key: 'user-photos/uid/photo.jpg',
  });
  assert.equal(badUrlWithValidKey.success, false);
});

test('buildFirestoreAssessmentRecord strips undefined fields and omits photo_url', () => {
  const withExtras = {
    ...sampleValidPayload,
    photo_url: 'https://should-never-be-saved.example.com/signed.jpg',
    findings: sampleValidPayload.findings.map((f) => ({ ...f, icon: undefined })),
  } as CompletedAssessmentResult;

  const record = buildFirestoreAssessmentRecord(withExtras);
  assert.equal('photo_url' in record, false);
  assert.equal(record.photo_object_key, 'user-photos/firebase-uid-1/assess-101.jpg');
  assert.equal(record.assessment_id, 'assess-101');
  assert.equal(record.status, 'complete');
  assert.equal(record.score, 84);
  const serialized = JSON.stringify(record);
  assert.equal(serialized.includes('should-never-be-saved'), false);
});

test('combineMilestones preserves assessmentId and photoObjectKey without inventing photoUrl', () => {
  const historicalDocs: HistoricalAssessment[] = [
    {
      ...sampleValidPayload,
      assessment_id: 'assess-b2-hist',
      photo_object_key: 'user-photos/uid-1/assess-b2-hist.jpg',
      created_at: '2026-11-10T12:00:00.000Z',
    },
  ];

  const combined = combineMilestones(historicalDocs, []);
  assert.equal(combined.length, 1);
  assert.equal(combined[0].assessmentId, 'assess-b2-hist');
  assert.equal(combined[0].photoObjectKey, 'user-photos/uid-1/assess-b2-hist.jpg');
  assert.equal(combined[0].photoUrl, undefined);
});

test('submitAssessment posts synchronously to /api/assessments and enforces expectedUid on photo_object_key', async () => {
  const originalWindow = (globalThis as any).window;
  const originalLocalStorage = (globalThis as any).localStorage;
  const originalFetch = globalThis.fetch;

  const storageMap = new Map<string, string>([
    ['smile_backend_url', 'https://api.example.com/'],
  ]);
  (globalThis as any).window = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, val: string) => storageMap.set(key, val),
    removeItem: (key: string) => storageMap.delete(key),
  };

  let capturedUrl = '';
  let capturedMethod = '';
  let capturedAuth = '';

  try {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedMethod = init?.method || '';
      const headers = (init?.headers || {}) as Record<string, string>;
      capturedAuth = headers.Authorization || '';
      return new Response(JSON.stringify(sampleValidPayload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    const blob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
    const result = await submitAssessment(blob, 'firebase-jwt-token', 'firebase-uid-1');

    assert.equal(capturedUrl, 'https://api.example.com/api/assessments');
    assert.equal(capturedMethod, 'POST');
    assert.equal(capturedAuth, 'Bearer firebase-jwt-token');
    assert.equal(result.assessment_id, 'assess-101');
    assert.equal(result.photo_object_key, 'user-photos/firebase-uid-1/assess-101.jpg');

    // Reject response returning a key owned by a different UID
    await assert.rejects(
      () => submitAssessment(blob, 'firebase-jwt-token', 'different-uid'),
      (err: any) => err instanceof AssessmentValidationError && /different-uid/.test(err.message)
    );

    // Reject status: 'failed'
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ status: 'failed', error: 'No face detected' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch;

    await assert.rejects(
      () => submitAssessment(blob, 'firebase-jwt-token', 'firebase-uid-1'),
      (err: any) => err instanceof AssessmentFailedError && /No face detected/.test(err.message)
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = originalWindow;
    }
    if (originalLocalStorage === undefined) {
      delete (globalThis as any).localStorage;
    } else {
      (globalThis as any).localStorage = originalLocalStorage;
    }
  }
});

test('fetchSignedPhotoUrl sends POST JSON photo_object_key with Bearer token and validates signed photo_url', async () => {
  const originalWindow = (globalThis as any).window;
  const originalLocalStorage = (globalThis as any).localStorage;
  const originalFetch = globalThis.fetch;

  const storageMap = new Map<string, string>([
    ['smile_backend_url', 'https://api.example.com/'],
  ]);
  (globalThis as any).window = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, val: string) => storageMap.set(key, val),
    removeItem: (key: string) => storageMap.delete(key),
  };

  let capturedUrl = '';
  let capturedMethod = '';
  let capturedAuth = '';
  let capturedBody = '';

  try {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedMethod = init?.method || '';
      const headers = (init?.headers || {}) as Record<string, string>;
      capturedAuth = headers.Authorization || '';
      capturedBody = String(init?.body || '');
      return new Response(
        JSON.stringify({
          photo_url: 'https://f005.backblazeb2.com/file/private-bucket/signed?Authorization=abc',
          expires_in: 900,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }) as typeof fetch;

    const url = await fetchSignedPhotoUrl(
      'user-photos/firebase-uid-1/assess-123.jpg',
      'firebase-jwt-token'
    );
    assert.equal(capturedUrl, 'https://api.example.com/api/photos/signed-url');
    assert.equal(capturedMethod, 'POST');
    assert.equal(capturedAuth, 'Bearer firebase-jwt-token');
    assert.deepEqual(JSON.parse(capturedBody), {
      photo_object_key: 'user-photos/firebase-uid-1/assess-123.jpg',
    });
    assert.equal(
      url,
      'https://f005.backblazeb2.com/file/private-bucket/signed?Authorization=abc'
    );

    // Reject invalid photo_object_key before making a request
    await assert.rejects(
      () => fetchSignedPhotoUrl('not-a-valid-key.jpg', 'firebase-jwt-token'),
      (err: any) => err instanceof AssessmentApiError && /photo_object_key/i.test(err.message)
    );

    // Reject missing token
    await assert.rejects(
      () => fetchSignedPhotoUrl('user-photos/firebase-uid-1/assess-1.jpg', ''),
      (err: any) => err instanceof AssessmentApiError && /token/i.test(err.message)
    );

    // Reject non-OK response
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ detail: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch;

    await assert.rejects(
      () => fetchSignedPhotoUrl('user-photos/firebase-uid-1/assess-1.jpg', 'bad-token'),
      (err: any) => err instanceof AssessmentApiError && err.statusCode === 401
    );

    // Reject invalid photo_url in JSON response
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ photo_url: 'user-photos/uid/not-a-url.jpg' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })) as typeof fetch;

    await assert.rejects(
      () => fetchSignedPhotoUrl('user-photos/firebase-uid-1/assess-1.jpg', 'firebase-jwt-token'),
      (err: any) => err instanceof AssessmentApiError && /valid HTTP\/HTTPS photo_url/i.test(err.message)
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = originalWindow;
    }
    if (originalLocalStorage === undefined) {
      delete (globalThis as any).localStorage;
    } else {
      (globalThis as any).localStorage = originalLocalStorage;
    }
  }
});



