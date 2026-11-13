import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  validateEmail,
  validatePassword,
  validateSignUpForm,
  validateLoginForm,
} from '../utils/authValidation';

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    setAuthModalOpen,
    authModalMode,
    setAuthModalMode,
    signUpWithEmail,
    loginWithEmail,
    resetPassword,
    signInWithGoogle,
    userName,
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState(userName || '');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [resetSent, setResetSent] = useState(false);

  if (!authModalOpen) return null;

  const handleClose = () => {
    setAuthModalOpen(false);
    setFormErrors({});
    setResetSent(false);
  };

  const handleModeSwitch = (mode: 'signin' | 'signup' | 'forgot') => {
    setAuthModalMode(mode);
    setFormErrors({});
    setResetSent(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const validation = validateLoginForm({ email, password });
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }

    setLoading(true);
    const res = await loginWithEmail(email, password);
    setLoading(false);
    if (!res.success && res.error) {
      setFormErrors({ general: res.error });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const validation = validateSignUpForm({
      name,
      email,
      password,
      confirmPassword,
    });
    if (!validation.isValid) {
      setFormErrors(validation.errors as Record<string, string>);
      return;
    }

    setLoading(true);
    const res = await signUpWithEmail(email, password, name);
    setLoading(false);
    if (!res.success && res.error) {
      setFormErrors({ general: res.error });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const validation = validateEmail(email);
    if (!validation.isValid) {
      setFormErrors({ email: validation.error || 'Invalid email' });
      return;
    }

    setLoading(true);
    const res = await resetPassword(email);
    setLoading(false);
    if (res.success) {
      setResetSent(true);
    } else if (res.error) {
      setFormErrors({ general: res.error });
    }
  };

  const passwordStrength = validatePassword(password);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-[#201c19] rounded-3xl p-4 sm:p-7 shadow-2xl border border-[#dac2b4]/40 dark:border-[#38332e] flex flex-col gap-4 sm:gap-5 max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header with Close */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#ffdcc6] dark:bg-[#4a2614] text-[#934b08] dark:text-[#ffb785] flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">spa</span>
            </div>
            <div>
              <h2
                id="auth-modal-title"
                className="font-editorial text-xl font-semibold text-[#1f1b18] dark:text-[#f7eee9]"
              >
                {authModalMode === 'signin' && 'Sign into SmileJourney'}
                {authModalMode === 'signup' && 'Create your sanctuary'}
                {authModalMode === 'forgot' && 'Reset Password'}
              </h2>
              <p className="text-[11px] text-[#544339] dark:text-[#b5a499]">
                {authModalMode === 'signin' && 'Access your scans, milestones, and questions.'}
                {authModalMode === 'signup' && 'Private, mindful smile tracking backed by Firebase.'}
                {authModalMode === 'forgot' && 'We’ll email you a secure link to reset.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-full hover:bg-[#f5ece7] dark:hover:bg-[#2d2925] text-[#544339] dark:text-[#b5a499] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* General Error Banner */}
        {formErrors.general && (
          <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5">
            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-[18px] shrink-0 mt-0.5">
              error
            </span>
            <p className="text-xs text-red-700 dark:text-red-300 flex-1 leading-relaxed">
              {formErrors.general}
            </p>
          </div>
        )}

        {/* Tab switchers if not forgot password */}
        {authModalMode !== 'forgot' && (
          <div className="flex p-1 rounded-2xl bg-[#f5ece7] dark:bg-[#2a2622]">
            <button
              type="button"
              onClick={() => handleModeSwitch('signin')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                authModalMode === 'signin'
                  ? 'bg-white dark:bg-[#38332e] text-[#1f1b18] dark:text-[#f7eee9] shadow-xs'
                  : 'text-[#544339] dark:text-[#b5a499] hover:text-[#1f1b18]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('signup')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                authModalMode === 'signup'
                  ? 'bg-white dark:bg-[#38332e] text-[#1f1b18] dark:text-[#f7eee9] shadow-xs'
                  : 'text-[#544339] dark:text-[#b5a499] hover:text-[#1f1b18]'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Google Quick Button */}
        {authModalMode !== 'forgot' && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-2xl bg-white dark:bg-[#282420] hover:bg-[#fbf2ed] dark:hover:bg-[#322d28] border border-[#dac2b4]/50 dark:border-[#3d3732] flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.32 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.32 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                Continue with Google
              </span>
            </button>

            <div className="relative flex items-center justify-center my-1">
              <div className="border-t border-[#dac2b4]/40 dark:border-[#38332e] w-full"></div>
              <span className="bg-white dark:bg-[#201c19] px-3 text-[11px] text-[#877367] dark:text-[#a89f97] uppercase tracking-wider absolute">
                or with email
              </span>
            </div>
          </div>
        )}

        {/* Form: Sign In */}
        {authModalMode === 'signin' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]" htmlFor="modal-signin-email">
                Email Address
              </label>
              <input
                id="modal-signin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className={`w-full bg-[#fbf2ed] dark:bg-[#2a2622] rounded-2xl py-2.5 px-3.5 text-xs text-[#1f1b18] dark:text-[#f7eee9] border ${
                  formErrors.email ? 'border-red-400' : 'border-[#dac2b4]/40 dark:border-[#38332e]'
                } focus:border-[#e08744] focus:outline-none`}
              />
              {formErrors.email && <span className="text-[11px] text-red-500">{formErrors.email}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]" htmlFor="modal-signin-pass">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('forgot')}
                  className="text-[11px] font-medium text-[#934b08] dark:text-[#ffb785] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="modal-signin-pass"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`w-full bg-[#fbf2ed] dark:bg-[#2a2622] rounded-2xl py-2.5 pl-3.5 pr-10 text-xs text-[#1f1b18] dark:text-[#f7eee9] border ${
                    formErrors.password ? 'border-red-400' : 'border-[#dac2b4]/40 dark:border-[#38332e]'
                  } focus:border-[#e08744] focus:outline-none`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-[#877367] hover:text-[#1f1b18] dark:hover:text-[#f7eee9] cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {formErrors.password && <span className="text-[11px] text-red-500">{formErrors.password}</span>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to SmileJourney</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Form: Sign Up */}
        {authModalMode === 'signup' && (
          <form onSubmit={handleSignUp} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]" htmlFor="modal-signup-name">
                Your Full Name
              </label>
              <input
                id="modal-signup-name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Morgan"
                className={`w-full bg-[#fbf2ed] dark:bg-[#2a2622] rounded-2xl py-2.5 px-3.5 text-xs text-[#1f1b18] dark:text-[#f7eee9] border ${
                  formErrors.name ? 'border-red-400' : 'border-[#dac2b4]/40 dark:border-[#38332e]'
                } focus:border-[#e08744] focus:outline-none`}
              />
              {formErrors.name && <span className="text-[11px] text-red-500">{formErrors.name}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]" htmlFor="modal-signup-email">
                Email Address
              </label>
              <input
                id="modal-signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className={`w-full bg-[#fbf2ed] dark:bg-[#2a2622] rounded-2xl py-2.5 px-3.5 text-xs text-[#1f1b18] dark:text-[#f7eee9] border ${
                  formErrors.email ? 'border-red-400' : 'border-[#dac2b4]/40 dark:border-[#38332e]'
                } focus:border-[#e08744] focus:outline-none`}
              />
              {formErrors.email && <span className="text-[11px] text-red-500">{formErrors.email}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]" htmlFor="modal-signup-pass">
                Create Password
              </label>
              <div className="relative">
                <input
                  id="modal-signup-pass"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className={`w-full bg-[#fbf2ed] dark:bg-[#2a2622] rounded-2xl py-2.5 pl-3.5 pr-10 text-xs text-[#1f1b18] dark:text-[#f7eee9] border ${
                    formErrors.password ? 'border-red-400' : 'border-[#dac2b4]/40 dark:border-[#38332e]'
                  } focus:border-[#e08744] focus:outline-none`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-[#877367] hover:text-[#1f1b18] dark:hover:text-[#f7eee9] cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>

              {/* Password strength visual */}
              {password && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 rounded-full bg-[#dac2b4]/30 overflow-hidden flex gap-0.5">
                    <div
                      className={`h-full flex-1 rounded-full ${
                        password.length >= 6 ? 'bg-amber-500' : 'bg-red-400'
                      }`}
                    ></div>
                    <div
                      className={`h-full flex-1 rounded-full ${
                        passwordStrength.strength === 'fair' || passwordStrength.strength === 'strong'
                          ? 'bg-[#e08744]'
                          : 'bg-transparent'
                      }`}
                    ></div>
                    <div
                      className={`h-full flex-1 rounded-full ${
                        passwordStrength.strength === 'strong' ? 'bg-[#206a50]' : 'bg-transparent'
                      }`}
                    ></div>
                  </div>
                  <span className="text-[10px] font-medium text-[#544339] dark:text-[#b5a499] capitalize">
                    {passwordStrength.strength}
                  </span>
                </div>
              )}
              {formErrors.password && <span className="text-[11px] text-red-500">{formErrors.password}</span>}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]" htmlFor="modal-signup-confirm">
                Confirm Password
              </label>
              <input
                id="modal-signup-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className={`w-full bg-[#fbf2ed] dark:bg-[#2a2622] rounded-2xl py-2.5 px-3.5 text-xs text-[#1f1b18] dark:text-[#f7eee9] border ${
                  formErrors.confirmPassword ? 'border-red-400' : 'border-[#dac2b4]/40 dark:border-[#38332e]'
                } focus:border-[#e08744] focus:outline-none`}
              />
              {formErrors.confirmPassword && (
                <span className="text-[11px] text-red-500">{formErrors.confirmPassword}</span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create SmileJourney Account</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Form: Forgot Password */}
        {authModalMode === 'forgot' && (
          <div className="flex flex-col gap-4">
            {resetSent ? (
              <div className="p-4 rounded-2xl bg-[#a9f2d0]/40 dark:bg-[#1b4a38]/40 border border-[#206a50]/30 flex flex-col items-center text-center gap-2">
                <span className="material-symbols-outlined text-[#206a50] dark:text-[#8dd5b5] text-3xl">
                  mark_email_read
                </span>
                <p className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  Reset Link Dispatched
                </p>
                <p className="text-[11px] text-[#544339] dark:text-[#b5a499] leading-relaxed">
                  We've emailed a password reset link to <strong>{email}</strong>. Check your inbox and follow the instructions.
                </p>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signin')}
                  className="mt-2 px-4 py-2 rounded-full bg-[#206a50] text-white text-xs font-semibold cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]" htmlFor="modal-forgot-email">
                    Account Email
                  </label>
                  <input
                    id="modal-forgot-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className={`w-full bg-[#fbf2ed] dark:bg-[#2a2622] rounded-2xl py-2.5 px-3.5 text-xs text-[#1f1b18] dark:text-[#f7eee9] border ${
                      formErrors.email ? 'border-red-400' : 'border-[#dac2b4]/40 dark:border-[#38332e]'
                    } focus:border-[#e08744] focus:outline-none`}
                  />
                  {formErrors.email && <span className="text-[11px] text-red-500">{formErrors.email}</span>}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleModeSwitch('signin')}
                    className="flex-1 py-2.5 rounded-full bg-[#f5ece7] dark:bg-[#2d2925] text-[#544339] dark:text-[#b5a499] text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer Disclaimer */}
        <p className="text-[10px] text-center text-[#877367] dark:text-[#a89f97] leading-relaxed">
          Your dental journey notes &amp; scans stay encrypted and protected according to Firestore security rules.
        </p>
      </div>
    </div>
  );
};
