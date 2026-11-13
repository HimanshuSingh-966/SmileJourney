/**
 * Service for communicating with the real Python assessment backend.
 * Reads VITE_API_BASE_URL from the environment or custom user override,
 * and handles multipart upload, Firebase ID token Bearer authentication,
 * status polling, and robust response validation.
 */

import type {
  AssessmentSubmitResponse,
  AssessmentStatusResponse,
  BackendAssessmentResult,
  CompletedAssessmentResult,
  CompletedAssessmentFinding,
  IssueCategory,
  FindingSeverity,
} from '../types';

import {
  AssessmentValidationError,
  validateCompletedAssessment,
  assertValidCompletedAssessment,
  CANONICAL_CATEGORIES,
  VALID_SEVERITIES,
  isValidIsoDate,
  isValidHttpUrl,
} from '../utils/assessmentValidation';

export {
  AssessmentValidationError,
  validateCompletedAssessment,
  assertValidCompletedAssessment,
  CANONICAL_CATEGORIES,
  VALID_SEVERITIES,
  isValidIsoDate,
  isValidHttpUrl,
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
 * Submits a captured photo to POST /api/assessments.
 *
 * @param photo - Blob or File containing the smile photograph
 * @param idToken - Required Firebase Auth ID token for Bearer authentication
 * @returns AssessmentSubmitResponse with assessment_id and processing status
 */
export async function submitAssessment(
  photo: Blob | File,
  idToken: string
): Promise<AssessmentSubmitResponse> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new BackendNotConfiguredError(
      'Python backend URL is not configured. Please configure your backend service URL (e.g. Render endpoint) to enable live smile assessments.'
    );
  }

  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
    throw new AssessmentApiError(
      'A valid Firebase user authentication token is required before uploading. Please sign in to submit a smile photo for analysis.'
    );
  }

  const formData = new FormData();
  // Follow API contract: send actual captured photo as multipart form data using the `photo` field
  formData.append('photo', photo, 'smile-capture.jpg');

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${idToken.trim()}`,
  };

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/assessments`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch (netErr: any) {
    throw new AssessmentApiError(
      `Unable to connect to assessment backend at ${baseUrl}. Please check your network connection and backend server status.`,
      undefined,
      netErr
    );
  }

  if (!res.ok) {
    let errorMsg = `Server responded with status ${res.status}: ${res.statusText}`;
    let errorDetails: unknown = null;
    try {
      const errJson = await parseJsonResponse<any>(res, baseUrl, '/api/assessments');
      errorDetails = errJson;
      if (errJson.detail) {
        errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      } else if (errJson.message) {
        errorMsg = errJson.message;
      } else if (errJson.error) {
        errorMsg = errJson.error;
      }
    } catch (parseErr) {
      if (parseErr instanceof AssessmentApiError) {
        errorMsg = parseErr.message;
      }
    }
    throw new AssessmentApiError(errorMsg, res.status, errorDetails);
  }

  const data = await parseJsonResponse<AssessmentSubmitResponse>(res, baseUrl, '/api/assessments');
  if (!data || !data.assessment_id) {
    throw new AssessmentApiError('Backend response did not return an assessment_id.', res.status, data);
  }

  return data;
}

/**
 * Polls GET /api/assessments/{assessment_id} until completion or failure.
 *
 * @param assessmentId - The ID returned from submitAssessment
 * @param idToken - Required Firebase ID token
 * @param options - Polling interval, timeout, and progress callback
 */
export async function pollAssessment(
  assessmentId: string,
  idToken: string,
  options?: {
    intervalMs?: number;
    maxWaitMs?: number;
    onProgress?: (status: string, elapsedMs: number) => void;
  }
): Promise<CompletedAssessmentResult> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new BackendNotConfiguredError('Python backend URL is not configured.');
  }

  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
    throw new AssessmentApiError('A valid Firebase ID token is required to retrieve assessment status.');
  }

  const intervalMs = options?.intervalMs ?? 1500;
  const maxWaitMs = options?.maxWaitMs ?? 50000;
  const startTime = Date.now();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${idToken.trim()}`,
  };

  while (Date.now() - startTime < maxWaitMs) {
    const elapsed = Date.now() - startTime;
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/api/assessments/${encodeURIComponent(assessmentId)}`, {
        method: 'GET',
        headers,
      });
    } catch (netErr: any) {
      throw new AssessmentApiError(
        `Lost connection to backend while polling assessment ${assessmentId}.`,
        undefined,
        netErr
      );
    }

    if (!res.ok) {
      let errorMsg = `Assessment check failed (${res.status} ${res.statusText})`;
      try {
        const errJson = await parseJsonResponse<any>(
          res,
          baseUrl,
          `/api/assessments/${assessmentId}`
        );
        if (errJson.detail) errorMsg = errJson.detail;
        else if (errJson.message) errorMsg = errJson.message;
        else if (errJson.error) errorMsg = errJson.error;
      } catch (parseErr) {
        if (parseErr instanceof AssessmentApiError) {
          errorMsg = parseErr.message;
        }
      }
      throw new AssessmentApiError(errorMsg, res.status);
    }

    const payload = await parseJsonResponse<AssessmentStatusResponse>(
      res,
      baseUrl,
      `/api/assessments/${assessmentId}`
    );
    const currentStatus = (payload.status || '').toLowerCase();

    if (options?.onProgress) {
      options.onProgress(currentStatus || 'processing', elapsed);
    }

    if (currentStatus === 'complete' || currentStatus === 'completed' || currentStatus === 'success') {
      // Validate completed response strictly.
      // Rejects missing/invalid fields, fabricated defaults, and incomplete finding categories.
      const validated = assertValidCompletedAssessment(payload);
      return validated;
    }

    if (currentStatus === 'failed' || currentStatus === 'error') {
      throw new AssessmentFailedError(
        payload.error || 'The backend model reported that smile analysis could not be completed for this image.'
      );
    }

    // Wait before next poll tick
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new AssessmentTimeoutError(
    `Assessment timed out after ${Math.round(maxWaitMs / 1000)}s without reaching completion. If your Python backend or Hugging Face model is warming up, please try again.`
  );
}
