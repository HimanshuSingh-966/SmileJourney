/**
 * Authentication and input validation helper functions for SmileJourneyAI
 * Decoupled, pure functions for easy unit testing and robust client-side validation.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export interface SignUpErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

/**
 * Validates email address format
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Email address is required.' };
  }
  // Standard RFC 5322 simplified email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Please enter a valid email address.' };
  }
  return { isValid: true };
}

/**
 * Evaluates password strength and minimum length
 */
export function validatePassword(password: string): {
  isValid: boolean;
  strength: 'weak' | 'fair' | 'strong';
  error?: string;
} {
  if (!password) {
    return { isValid: false, strength: 'weak', error: 'Password is required.' };
  }
  if (password.length < 6) {
    return {
      isValid: false,
      strength: 'weak',
      error: 'Password must be at least 6 characters.',
    };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  let strength: 'weak' | 'fair' | 'strong' = 'weak';
  if (score >= 3) {
    strength = 'strong';
  } else if (score >= 1) {
    strength = 'fair';
  }

  return { isValid: true, strength };
}

/**
 * Validates complete Sign Up form submission
 */
export function validateSignUpForm(data: {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
}): { isValid: boolean; errors: SignUpErrors } {
  const errors: SignUpErrors = {};

  if (!data.name.trim()) {
    errors.name = 'Please provide your name.';
  } else if (data.name.trim().length > 100) {
    errors.name = 'Name must be 100 characters or fewer.';
  }

  const emailRes = validateEmail(data.email);
  if (!emailRes.isValid) {
    errors.email = emailRes.error;
  }

  const passwordRes = validatePassword(data.password);
  if (!passwordRes.isValid) {
    errors.password = passwordRes.error;
  }

  if (data.confirmPassword !== undefined && data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates Log In form
 */
export function validateLoginForm(data: {
  email: string;
  password: string;
}): { isValid: boolean; errors: { email?: string; password?: string } } {
  const errors: { email?: string; password?: string } = {};

  const emailRes = validateEmail(data.email);
  if (!emailRes.isValid) {
    errors.email = emailRes.error;
  }

  if (!data.password) {
    errors.password = 'Password is required.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Translates Firebase Auth error codes into supportive, user-friendly messages
 */
export function getFirebaseAuthErrorMessage(errorOrCode: any): string {
  const code = typeof errorOrCode === 'string'
    ? errorOrCode
    : errorOrCode?.code || errorOrCode?.message || '';

  if (code.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists. Try logging in instead.';
  }
  if (code.includes('auth/invalid-email')) {
    return 'The email format is invalid. Please double check.';
  }
  if (code.includes('auth/user-not-found')) {
    return 'No account was found with this email. Would you like to sign up?';
  }
  if (code.includes('auth/wrong-password') || code.includes('auth/invalid-credential')) {
    return 'Incorrect email or password. Please try again or reset your password.';
  }
  if (code.includes('auth/weak-password')) {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (code.includes('auth/popup-closed-by-user')) {
    return 'The sign-in popup was closed before completing. Please try again.';
  }
  if (code.includes('auth/popup-blocked')) {
    return 'The browser popup was blocked. Please allow popups for this site.';
  }
  if (code.includes('auth/too-many-requests')) {
    return 'Access temporarily restricted due to many failed attempts. Please try again in a few minutes.';
  }
  if (code.includes('auth/network-request-failed')) {
    return 'Network connection issue. Please check your internet connection.';
  }
  if (code.includes('auth/operation-not-allowed')) {
    return 'Email/Password authentication is not yet enabled in the Firebase Console. Please enable it in Firebase Authentication > Sign-in method.';
  }

  return errorOrCode?.message || 'Authentication error. Please check your details and try again.';
}
