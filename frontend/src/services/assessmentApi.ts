/**
 * Service for communicating with the real Python assessment backend.
 * Reads VITE_API_BASE_URL from the environment or custom user override,
 * and handles multipart upload, Firebase ID token Bearer authentication,
 * status polling, and robust response validation.
 */

import type {
  CompletedAssessmentResult,
  IssueCategory,
} from '../types';

import {
  AssessmentValidationError,
  validateCompletedAssessment,
  validateHistoricalAssessment,
  assertValidCompletedAssessment,
  buildFirestoreAssessmentRecord,
  CANONICAL_CATEGORIES,
  VALID_SEVERITIES,
  isValidIsoDate,
  isValidHttpUrl,
  isValidPhotoObjectKey,
} from '../utils/assessmentValidation';

export {
  AssessmentValidationError,
  validateCompletedAssessment,
  validateHistoricalAssessment,
  assertValidCompletedAssessment,
  buildFirestoreAssessmentRecord,
  CANONICAL_CATEGORIES,
  VALID_SEVERITIES,
  isValidIsoDate,
  isValidHttpUrl,
  isValidPhotoObjectKey,
};

export class BackendNotConfiguredError extends Error {
  constructor(
    message = 'Backend API URL (VITE_API_BASE_URL) is not configured. Please connect your Python backend service to enable live smile assessments.'
  ) {
    super(message);
    this.name = 'BackendNotConfiguredError';
  }
}

export class AssessmentApiError extends Error {
  public statusCode?: number;
  public details?: unknown;

  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message);
    this.name = 'AssessmentApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class AssessmentTimeoutError extends Error {
  constructor(message = 'Assessment processing timed out. The server took too long to complete analysis.') {
    super(message);
    this.name = 'AssessmentTimeoutError';
  }
}

export class AssessmentFailedError extends Error {
  constructor(message = 'The backend assessment could not be completed.') {
    super(message);
    this.name = 'AssessmentFailedError';
  }
}

/**
 * Validates whether a given URL is a syntactically valid absolute HTTP/HTTPS URL
 * and not an unconfigured placeholder.
 */
export function isValidBackendUrl(url: unknown): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (
    trimmed === '' ||
    trimmed === 'abc' ||
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'null' ||
    trimmed.toLowerCase() === 'my_backend_url' ||
    trimmed.toLowerCase() === 'http://localhost:8000/placeholder'
  ) {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Returns the configured backend API base URL.
 * Checks user custom override in localStorage first, then VITE_API_BASE_URL.
 * Rejects placeholder or invalid values.
 */
export function getApiBaseUrl(): string {
  // Check user custom override in localStorage
  if (typeof window !== 'undefined') {
    try {
      const custom = localStorage.getItem('smile_backend_url');
      if (custom && isValidBackendUrl(custom)) {
        return custom.trim().replace(/\/+$/, '');
      }
    } catch {
      // ignore storage access restrictions
    }
  }

  // Fallback to build-time environment variable
  const envUrl = (import.meta as any)?.env?.VITE_API_BASE_URL;
  if (isValidBackendUrl(envUrl)) {
    return (envUrl as string).trim().replace(/\/+$/, '');
  }

  return '';
}

/**
 * Saves a user-configured backend API base URL (e.g. Render, Railway, ngrok).
 */
export function setCustomApiBaseUrl(url: string): boolean {
  const clean = url.trim().replace(/\/+$/, '');
  if (!isValidBackendUrl(clean)) {
    return false;
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('smile_backend_url', clean);
    } catch {
      // ignore
    }
  }
  return true;
}

/**
 * Clears the user-configured backend API base URL override.
 */
export function clearCustomApiBaseUrl(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('smile_backend_url');
    } catch {
      // ignore
    }
  }
}

/**
 * Checks whether a valid backend API base URL is present.
 */
export function isBackendConfigured(): boolean {
  return Boolean(getApiBaseUrl());
}

/**
 * Converts a data URL (base64 image) to a standard Blob for multipart form upload.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const binaryStr = atob(parts[1]);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Assigns standard accessible icon for each canonical category.
 */
export function getCategoryIcon(category: IssueCategory): string {
  switch (category) {
    case 'crowding/alignment':
      return 'reorder';
    case 'gaps':
      return 'space_bar';
    case 'discoloration':
      return 'flare';
    case 'gum line':
      return 'spa';
    case 'symmetry':
      return 'balance';
  }
}

/**
 * Safely parses a response body as JSON.
 * Detects HTML responses (such as SPA 404/200 fallbacks or Render error pages)
 * and raises descriptive, helpful errors instead of throwing SyntaxError: JSON.parse.
 */
async function parseJsonResponse<T>(res: Response, baseUrl: string, endpoint: string): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  const rawText = await res.text();

  if (
    rawText.trim().startsWith('<') ||
    contentType.includes('text/html') ||
    rawText.includes('<!DOCTYPE') ||
    rawText.includes('<html')
  ) {
    throw new AssessmentApiError(
      `The server at ${baseUrl} returned an HTML webpage instead of a JSON API response for ${endpoint}. If your backend is hosted on Render, ensure the URL is your exact Python API service (e.g. https://your-service.onrender.com) and that the backend route is registered.`,
      res.status,
      rawText.slice(0, 200)
    );
  }

  try {
    return JSON.parse(rawText) as T;
  } catch (parseErr: any) {
    throw new AssessmentApiError(
      `Invalid response from ${baseUrl}${endpoint}: expected JSON but received unexpected data format.`,
      res.status,
      parseErr
    );
  }
}

/**
 * Tests connection to a Python backend service URL.
 */
export async function testBackendConnection(
  customUrl?: string
): Promise<{ success: boolean; message: string; latencyMs?: number }> {
  const baseUrl = (customUrl || getApiBaseUrl()).trim().replace(/\/+$/, '');
  if (!isValidBackendUrl(baseUrl)) {
    return {
      success: false,
      message: 'Invalid backend URL. Please provide an absolute URL starting with https:// or http://',
    };
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/health`, { method: 'GET', signal: controller.signal });
    } catch {
      try {
        res = await fetch(`${baseUrl}/api/health`, { method: 'GET', signal: controller.signal });
      } catch {
        res = await fetch(`${baseUrl}/`, { method: 'GET', signal: controller.signal });
      }
    } finally {
      clearTimeout(timeout);
    }

    const latency = Date.now() - start;
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();

    if (text.includes('<!DOCTYPE') || text.includes('<html') || contentType.includes('text/html')) {
      return {
        success: false,
        message: `Endpoint returned an HTML webpage rather than a Python API. Ensure the URL points to your Render backend web service, not the frontend app.`,
      };
    }

    if (res.ok) {
      return {
        success: true,
        message: `Connected successfully to Python backend (${latency}ms)!`,
        latencyMs: latency,
      };
    }

    return {
      success: false,
      message: `Server reached at ${baseUrl} but responded with HTTP ${res.status} (${res.statusText}).`,
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        message: 'Connection timed out after 9s. Free tier instances on Render spin down after inactivity and may take 40-50s to wake up.',
      };
    }
    return {
      success: false,
      message: `Unable to connect to ${baseUrl}: ${err.message || 'Network error or CORS issue. Please enable CORS on your FastAPI/Flask app.'}`,
    };
  }
}

/**
 * Submits a captured photo to POST /api/assessments and waits synchronously
 * for backend inference to return the validated completed assessment.
 *
 * @param photo - Blob or File containing the smile photograph
 * @param idToken - Required Firebase Auth ID token for Bearer authentication
 * @param expectedUid - Signed-in Firebase user's UID for photo_object_key ownership check
 * @param options - Optional timeoutMs and external AbortSignal
 * @returns Validated CompletedAssessmentResult
 */
export async function submitAssessment(
  photo: Blob | File,
  idToken: string,
  expectedUid: string,
  options?: { timeoutMs?: number; signal?: AbortSignal }
): Promise<CompletedAssessmentResult> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new BackendNotConfiguredError(
      'Python backend URL is not configured. Please configure your backend service URL (e.g. hosted on Render) to enable live smile assessments.'
    );
  }

  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
    throw new AssessmentApiError(
      'A valid Firebase user authentication token is required before uploading. Please sign in to submit a smile photo for analysis.'
    );
  }

  if (!expectedUid || typeof expectedUid !== 'string' || !expectedUid.trim()) {
    throw new AssessmentApiError(
      'A signed-in user UID is required before submitting a smile photo for analysis.'
    );
  }

  const formData = new FormData();
  formData.append('photo', photo, 'smile-capture.jpg');

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${idToken.trim()}`,
  };

  const timeoutMs = options?.timeoutMs ?? 90000;
  const controller = new AbortController();
  let timedOut = false;

  const onExternalAbort = () => controller.abort();
  if (options?.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/assessments`, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    });
  } catch (netErr: any) {
    if (timedOut) {
      throw new AssessmentTimeoutError(
        `Assessment analysis timed out after ${Math.round(timeoutMs / 1000)}s. If your Python backend or model is warming up, please try again.`
      );
    }
    if (netErr?.name === 'AbortError') {
      throw netErr;
    }
    throw new AssessmentApiError(
      `Unable to connect to assessment backend at ${baseUrl}. Please check your network connection and backend server status.`,
      undefined,
      netErr
    );
  } finally {
    clearTimeout(timeoutId);
    options?.signal?.removeEventListener('abort', onExternalAbort);
  }

  if (!res.ok) {
    let errorMsg = `Server responded with status ${res.status}: ${res.statusText}`;
    let errorDetails: unknown = null;
    let isFailedStatus = false;
    try {
      const errJson = await parseJsonResponse<any>(res, baseUrl, '/api/assessments');
      errorDetails = errJson;
      if (errJson?.status === 'failed' || errJson?.status === 'error') {
        isFailedStatus = true;
      }
      if (errJson?.detail) {
        errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      } else if (errJson?.message) {
        errorMsg = errJson.message;
      } else if (errJson?.error) {
        errorMsg = errJson.error;
      }
    } catch (parseErr) {
      if (parseErr instanceof AssessmentApiError) {
        errorMsg = parseErr.message;
      }
    }

    if (isFailedStatus) {
      throw new AssessmentFailedError(errorMsg);
    }
    throw new AssessmentApiError(errorMsg, res.status, errorDetails);
  }

  const payload = await parseJsonResponse<Record<string, any>>(
    res,
    baseUrl,
    '/api/assessments'
  );

  const rawStatus = typeof payload?.status === 'string' ? payload.status.toLowerCase() : '';
  if (rawStatus === 'failed' || rawStatus === 'error') {
    throw new AssessmentFailedError(
      (typeof payload?.error === 'string' && payload.error) ||
        (typeof payload?.message === 'string' && payload.message) ||
        'The backend model reported that smile analysis could not be completed for this image.'
    );
  }

  return assertValidCompletedAssessment(payload, {
    expectedUid: expectedUid.trim(),
  });
}

/**
 * Requests a short-lived signed photo URL from POST /api/photos/signed-url
 * using a private B2 `photo_object_key` and the user's Firebase Bearer token.
 *
 * @param photoObjectKey - Private B2 key, e.g. `user-photos/<uid>/<filename>`
 * @param idToken - Firebase Auth ID token
 * @param options - Optional AbortSignal for request cancellation
 * @returns Validated temporary HTTP/HTTPS signed photo URL
 */
export async function fetchSignedPhotoUrl(
  photoObjectKey: string,
  idToken: string,
  options?: { signal?: AbortSignal }
): Promise<string> {
  if (!isValidPhotoObjectKey(photoObjectKey)) {
    throw new AssessmentApiError(
      'A valid photo_object_key beginning with "user-photos/<uid>/" is required to sign the photo URL.'
    );
  }

  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new BackendNotConfiguredError('Python backend URL is not configured.');
  }

  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
    throw new AssessmentApiError(
      'A valid Firebase ID token is required to retrieve a signed photo URL.'
    );
  }

  const cleanKey = photoObjectKey.trim();
  const endpoint = '/api/photos/signed-url';

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken.trim()}`,
      },
      body: JSON.stringify({ photo_object_key: cleanKey }),
      signal: options?.signal,
    });
  } catch (netErr: any) {
    if (netErr?.name === 'AbortError') {
      throw netErr;
    }
    throw new AssessmentApiError(
      `Unable to connect to assessment backend at ${baseUrl} to resolve signed photo URL.`,
      undefined,
      netErr
    );
  }

  if (!res.ok) {
    let errorMsg = `Failed to load assessment photo (${res.status} ${res.statusText})`;
    let errorDetails: unknown = null;
    try {
      const errJson = await parseJsonResponse<any>(res, baseUrl, endpoint);
      errorDetails = errJson;
      if (errJson?.detail) {
        errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      } else if (errJson?.message) {
        errorMsg = errJson.message;
      } else if (errJson?.error) {
        errorMsg = errJson.error;
      }
    } catch (parseErr) {
      if (parseErr instanceof AssessmentApiError) {
        errorMsg = parseErr.message;
      }
    }
    throw new AssessmentApiError(errorMsg, res.status, errorDetails);
  }

  const payload = await parseJsonResponse<{ photo_url?: unknown; expires_in?: unknown }>(
    res,
    baseUrl,
    endpoint
  );
  if (!payload || typeof payload !== 'object' || !isValidHttpUrl(payload.photo_url)) {
    throw new AssessmentApiError(
      'Backend signed-url response did not contain a valid HTTP/HTTPS photo_url.',
      res.status,
      payload
    );
  }

  return (payload.photo_url as string).trim();
}
