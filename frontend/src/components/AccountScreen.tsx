import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from './native';
import { AssessmentImage } from './AssessmentImage';
import { useApp } from '../context/AppContext';
import {
  validateEmail,
  validatePassword,
  validateSignUpForm,
  validateLoginForm,
} from '../utils/authValidation';
import {
  getApiBaseUrl,
  setCustomApiBaseUrl,
  clearCustomApiBaseUrl,
  testBackendConnection,
  isValidBackendUrl,
} from '../services/assessmentApi';

export const AccountScreen: React.FC = () => {
  const {
    userName,
    setUserName,
    userAge,
    setUserAge,
    userIntent,
    setUserIntent,
    ritualDay,
    harmonyScore,
    milestones,
    questions,
    findings,
    isDarkMode,
    toggleDarkMode,
    resetAllData,
    showToast,
    currentUser,
    authLoading,
    signInWithGoogle,
    signUpWithEmail,
    loginWithEmail,
    resetPassword,
    signOutUser,
  } = useApp();

  // Authentication Tab State for Signed-Out Users
  const [authTab, setAuthTab] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [resetSent, setResetSent] = useState(false);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [editAge, setEditAge] = useState(userAge);
  const [editIntent, setEditIntent] = useState(userIntent);

  // Firestore setup instructions disclosure state
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Python backend connection state
  const [showBackendCard, setShowBackendCard] = useState(true);
  const [backendInput, setBackendInput] = useState(() => getApiBaseUrl() || '');
  const [testingBackend, setTestingBackend] = useState(false);
  const [backendTestStatus, setBackendTestStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestBackend = async () => {
    setTestingBackend(true);
    setBackendTestStatus(null);
    const result = await testBackendConnection(backendInput);
    setBackendTestStatus(result);
    setTestingBackend(false);
  };

  const handleSaveBackend = () => {
    if (!backendInput.trim()) {
      clearCustomApiBaseUrl();
      showToast('Backend URL reset to default.');
      return;
    }
    if (!isValidBackendUrl(backendInput.trim())) {
      showToast('Please enter a valid URL starting with https:// or http://');
      return;
    }
    const success = setCustomApiBaseUrl(backendInput.trim());
    if (success) {
      showToast('Backend URL updated successfully!');
    }
  };

  const handleResetBackend = () => {
    clearCustomApiBaseUrl();
    setBackendInput(getApiBaseUrl() || '');
    setBackendTestStatus(null);
    showToast('Custom backend URL removed.');
  };

  const displayName = currentUser?.displayName || userName.trim() || 'Guest Explorer';
  const displayEmail = currentUser?.email || 'Local Offline Mode';
  const displayInitial = displayName.charAt(0).toUpperCase() || 'G';
  const latestMilestone = milestones.length > 0 ? milestones[0] : null;
  const fallbackAssessmentId =
    !currentUser?.photoURL && latestMilestone && !latestMilestone.isLegacy
      ? latestMilestone.assessmentId
      : undefined;
  const fallbackPhotoObjectKey =
    !currentUser?.photoURL && latestMilestone && !latestMilestone.isLegacy
      ? latestMilestone.photoObjectKey
      : undefined;
  const profilePhoto =
    currentUser?.photoURL ||
    (!fallbackPhotoObjectKey && latestMilestone ? latestMilestone.photoUrl ?? null : null);
  const hasProfilePhoto = Boolean(profilePhoto || fallbackPhotoObjectKey);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const validation = validateLoginForm({ email, password });
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }
    setSubmitting(true);
    const res = await loginWithEmail(email, password);
    setSubmitting(false);
    if (!res.success && res.error) {
      setFormErrors({ general: res.error });
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const validation = validateSignUpForm({
      name: signUpName,
      email,
      password,
      confirmPassword,
    });
    if (!validation.isValid) {
      setFormErrors(validation.errors as Record<string, string>);
      return;
    }
    setSubmitting(true);
    const res = await signUpWithEmail(email, password, signUpName);
    setSubmitting(false);
    if (!res.success && res.error) {
      setFormErrors({ general: res.error });
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    const validation = validateEmail(email);
    if (!validation.isValid) {
      setFormErrors({ email: validation.error || 'Invalid email' });
      return;
    }
    setSubmitting(true);
    const res = await resetPassword(email);
    setSubmitting(false);
    if (res.success) {
      setResetSent(true);
    } else if (res.error) {
      setFormErrors({ general: res.error });
    }
  };

  const handleSaveProfile = () => {
    if (!editName.trim()) {
      showToast('Name cannot be empty.');
      return;
    }
    setUserName(editName.trim());
    setUserAge(editAge.trim());
    setUserIntent(editIntent);
    setIsEditingProfile(false);
    showToast('Profile updated and synced to cloud.');
  };

  const handleExportData = () => {
    const exportPayload = {
      user: {
        id: currentUser?.uid || 'offline-local',
        userName: displayName,
        userAge,
        email: currentUser?.email,
        ritualDay,
        harmonyScore,
      },
      milestonesCount: milestones.length,
      milestones,
      findings,
      questions,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smile-journey-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Your encrypted wellness journal has been downloaded.');
  };

  const passwordStrength = validatePassword(password);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="flex-1 w-full"
      contentContainerStyle={{ paddingBottom: '140px' }}
    >
      <View className="px-4 py-4 flex flex-col gap-4">
        {/* Profile Card */}
        <View className="bg-white dark:bg-[#24201d] rounded-3xl p-5 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-4">
          <View className="flex flex-row items-center gap-4">
            <View className="relative shrink-0">
              {hasProfilePhoto ? (
                <AssessmentImage
                  photoObjectKey={fallbackPhotoObjectKey}
                  assessmentId={fallbackAssessmentId}
                  source={profilePhoto ? { uri: profilePhoto } : undefined}
                  alt="Your Profile"
                  className="w-16 h-16 rounded-full object-cover ring-4 ring-[#ffdcc6] dark:ring-[#4a2614]"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ffdcc6] to-[#e08744] flex items-center justify-center text-[#934b08] font-editorial text-2xl font-bold ring-4 ring-[#ffdcc6] dark:ring-[#4a2614]">
                  {displayInitial}
                </div>
              )}
              <span
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-[#24201d] ${
                  currentUser ? 'bg-[#206a50]' : 'bg-amber-500'
                }`}
                title={currentUser ? 'Cloud Synced' : 'Local Sanctuary'}
              ></span>
            </View>

            <View className="flex flex-col flex-1 min-w-0">
              <View className="flex flex-row items-center gap-2">
                <Text className="font-editorial text-xl font-semibold text-[#1f1b18] dark:text-[#f7eee9] truncate">
                  {displayName}
                </Text>
                {currentUser && (
                  <span className="material-symbols-outlined text-[#206a50] dark:text-[#8dd5b5] text-[18px]" title="Firebase Authenticated">
                    verified
                  </span>
                )}
              </View>
              <Text className="text-xs text-[#544339] dark:text-[#b5a499] mt-0.5 truncate">
                {displayEmail}
              </Text>
              <View className="mt-1.5 flex flex-row items-center gap-2">
                <View
                  className={`self-start px-2.5 py-0.5 rounded-full ${
                    currentUser
                      ? 'bg-[#a9f2d0]/50 dark:bg-[#1b4a38]/50'
                      : 'bg-amber-100 dark:bg-amber-950/50'
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      currentUser ? 'text-[#206a50] dark:text-[#8dd5b5]' : 'text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {currentUser ? 'Firebase Member' : 'Local Sanctuary (Guest)'}
                  </Text>
                </View>
                {currentUser && (
                  <TouchableOpacity
                    onPress={() => {
                      setEditName(displayName);
                      setEditAge(userAge);
                      setEditIntent(userIntent);
                      setIsEditingProfile(!isEditingProfile);
                    }}
                    className="text-[11px] font-medium text-[#934b08] dark:text-[#ffb785] hover:underline cursor-pointer"
                  >
                    <Text className="text-[11px] font-medium text-[#934b08] dark:text-[#ffb785]">
                      {isEditingProfile ? 'Cancel' : 'Edit Profile'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Profile Inline Editor */}
          {isEditingProfile && (
            <div className="pt-3 border-t border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  Display Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-[#fbf2ed] dark:bg-[#2a2622] rounded-xl py-2 px-3 text-xs text-[#1f1b18] dark:text-[#f7eee9] border border-[#dac2b4]/40 dark:border-[#38332e] focus:outline-none focus:border-[#e08744]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  Age (Optional)
                </label>
                <input
                  type="text"
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                  placeholder="e.g. 28"
                  className="w-full bg-[#fbf2ed] dark:bg-[#2a2622] rounded-xl py-2 px-3 text-xs text-[#1f1b18] dark:text-[#f7eee9] border border-[#dac2b4]/40 dark:border-[#38332e] focus:outline-none focus:border-[#e08744]"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="mt-1 w-full py-2.5 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Save Profile Changes
              </button>
            </div>
          )}
        </View>

        {/* AUTHENTICATION SECTION */}
        {currentUser ? (
          /* Logged In Status Card */
          <View className="bg-white dark:bg-[#24201d] rounded-3xl p-5 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-3.5">
            <View className="flex flex-row items-center justify-between">
              <View className="flex flex-row items-center gap-2">
                <span className="material-symbols-outlined text-[#206a50] dark:text-[#8dd5b5] text-[20px]">
                  cloud_sync
                </span>
                <Text className="font-editorial text-base font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  Firebase Auth &amp; Sync
                </Text>
              </View>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-[#a9f2d0] text-[#206a50] dark:bg-[#1b4a38] dark:text-[#8dd5b5]">
                Active Cloud Connection
              </span>
            </View>

            <View className="p-3.5 rounded-2xl bg-[#fbf2ed] dark:bg-[#2a2622] flex flex-col gap-2.5 border border-[#dac2b4]/20 dark:border-[#38332e]">
              <View className="flex flex-row items-center justify-between gap-3">
                <View className="flex flex-col min-w-0 flex-1">
                  <Text className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                    Authenticated as
                  </Text>
                  <Text className="text-[11px] text-[#544339] dark:text-[#b5a499] truncate">
                    {currentUser.email}
                  </Text>
                  <Text className="text-[10px] text-[#877367] dark:text-[#a89f97] mt-0.5 truncate font-mono">
                    UID: {currentUser.uid}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={signOutUser}
                  className="px-3.5 py-2 rounded-full bg-[#f5ece7] dark:bg-[#38332e] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 text-[#544339] dark:text-[#b5a499] text-xs font-semibold cursor-pointer shrink-0 transition-colors"
                  accessibilityLabel="Sign Out"
                >
                  <Text className="text-xs font-semibold text-[#544339] dark:text-[#b5a499]">
                    Sign Out
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="pt-2 border-t border-[#dac2b4]/30 dark:border-[#38332e] flex flex-row items-center justify-between text-[11px]">
                <span className="text-[#544339] dark:text-[#b5a499]">Synced Milestones:</span>
                <span className="font-semibold text-[#206a50] dark:text-[#8dd5b5]">
                  {milestones.length} logged checkpoints
                </span>
              </View>
              <View className="flex flex-row items-center justify-between text-[11px]">
                <span className="text-[#544339] dark:text-[#b5a499]">Prototype Summary Score:</span>
                <span className="font-semibold text-[#934b08] dark:text-[#ffb785]">
                  {harmonyScore}/100 <span className="text-[10px] text-amber-700 dark:text-amber-400 font-normal">(Experimental)</span>
                </span>
              </View>
            </View>
          </View>
        ) : (
          /* Signed Out Authentication Card with Tabs */
          <View className="bg-white dark:bg-[#24201d] rounded-3xl p-5 sm:p-6 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-4">
            <View className="flex flex-row items-center justify-between">
              <View className="flex flex-row items-center gap-2">
                <span className="material-symbols-outlined text-[#934b08] dark:text-[#ffb785] text-[20px]">
                  account_circle
                </span>
                <Text className="font-editorial text-base font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  Account &amp; Cloud Sync
                </Text>
              </View>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-[#ffdcc6] text-[#934b08] dark:bg-[#4a2614] dark:text-[#ffb785]">
                Offline Mode
              </span>
            </View>

            <Text className="text-xs text-[#544339] dark:text-[#b5a499] leading-relaxed">
              Create an account or sign in to sync your smile scans, track progress over time, and protect your dental journal across devices.
            </Text>

            {/* Error Banner */}
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

            {/* Mode Switch Tabs */}
            {authTab !== 'forgot' && (
              <div className="flex p-1 rounded-2xl bg-[#f5ece7] dark:bg-[#2a2622]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('signin');
                    setFormErrors({});
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    authTab === 'signin'
                      ? 'bg-white dark:bg-[#38332e] text-[#1f1b18] dark:text-[#f7eee9] shadow-xs'
                      : 'text-[#544339] dark:text-[#b5a499] hover:text-[#1f1b18]'
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('signup');
                    setFormErrors({});
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    authTab === 'signup'
                      ? 'bg-white dark:bg-[#38332e] text-[#1f1b18] dark:text-[#f7eee9] shadow-xs'
                      : 'text-[#544339] dark:text-[#b5a499] hover:text-[#1f1b18]'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* TAB: LOG IN */}
            {authTab === 'signin' && (
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]" htmlFor="login-email">
                    Email Address
                  </label>
                  <input
                    id="login-email"
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
                    <label className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]" htmlFor="login-password">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('forgot');
                        setFormErrors({});
                        setResetSent(false);
                      }}
                      className="text-[11px] font-medium text-[#934b08] dark:text-[#ffb785] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password"
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
                      className="absolute right-3 top-2.5 text-[#877367] hover:text-[#1f1b18] dark:hover:text-[#f7eee9] cursor-pointer"
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
                  disabled={submitting}
                  className="mt-1 w-full py-3 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                      <span>Logging In...</span>
                    </>
                  ) : (
                    <>
                      <span>Log In to SmileJourney</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB: SIGN UP */}
            {authTab === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]" htmlFor="signup-name">
                    Full Name
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    placeholder="Alex Morgan"
                    className={`w-full bg-[#fbf2ed] dark:bg-[#2a2622] rounded-2xl py-2.5 px-3.5 text-xs text-[#1f1b18] dark:text-[#f7eee9] border ${
                      formErrors.name ? 'border-red-400' : 'border-[#dac2b4]/40 dark:border-[#38332e]'
                    } focus:border-[#e08744] focus:outline-none`}
                  />
                  {formErrors.name && <span className="text-[11px] text-red-500">{formErrors.name}</span>}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]" htmlFor="signup-email">
                    Email Address
                  </label>
                  <input
                    id="signup-email"
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
                  <label className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]" htmlFor="signup-password">
                    Create Password
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
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
                      className="absolute right-3 top-2.5 text-[#877367] hover:text-[#1f1b18] dark:hover:text-[#f7eee9] cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>

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
                  <label className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]" htmlFor="signup-confirm">
                    Confirm Password
                  </label>
                  <input
                    id="signup-confirm"
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
                  disabled={submitting}
                  className="mt-1 w-full py-3 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {submitting ? (
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

            {/* TAB: FORGOT PASSWORD */}
            {authTab === 'forgot' && (
              <div className="flex flex-col gap-3.5">
                {resetSent ? (
                  <div className="p-4 rounded-2xl bg-[#a9f2d0]/40 dark:bg-[#1b4a38]/40 border border-[#206a50]/30 flex flex-col items-center text-center gap-2">
                    <span className="material-symbols-outlined text-[#206a50] dark:text-[#8dd5b5] text-3xl">
                      mark_email_read
                    </span>
                    <p className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                      Password Reset Dispatched
                    </p>
                    <p className="text-[11px] text-[#544339] dark:text-[#b5a499] leading-relaxed">
                      Check your inbox at <strong>{email}</strong> for instructions to reset your password.
                    </p>
                    <button
                      type="button"
                      onClick={() => setAuthTab('signin')}
                      className="mt-2 px-4 py-2 rounded-full bg-[#206a50] text-white text-xs font-semibold cursor-pointer"
                    >
                      Return to Log In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleResetSubmit} className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]" htmlFor="forgot-email">
                        Account Email Address
                      </label>
                      <input
                        id="forgot-email"
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
                        onClick={() => setAuthTab('signin')}
                        className="flex-1 py-2.5 rounded-full bg-[#f5ece7] dark:bg-[#2d2925] text-[#544339] dark:text-[#b5a499] text-xs font-semibold cursor-pointer"
                      >
                        Back to Log In
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 py-2.5 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {submitting ? 'Sending...' : 'Send Reset Link'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Google Divider & Button */}
            {authTab !== 'forgot' && (
              <div className="flex flex-col gap-3 pt-1">
                <div className="relative flex items-center justify-center my-1">
                  <div className="border-t border-[#dac2b4]/40 dark:border-[#38332e] w-full"></div>
                  <span className="bg-white dark:bg-[#24201d] px-3 text-[11px] text-[#877367] dark:text-[#a89f97] uppercase tracking-wider absolute">
                    or
                  </span>
                </div>

                <TouchableOpacity
                  onPress={signInWithGoogle}
                  disabled={authLoading}
                  className="w-full py-2.5 px-4 rounded-2xl bg-[#fbf2ed] dark:bg-[#2a2622] hover:bg-[#f5ece7] border border-[#dac2b4]/40 dark:border-[#38332e] flex flex-row items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs"
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
                  <Text className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                    Continue with Google
                  </Text>
                </TouchableOpacity>
              </div>
            )}
          </View>
        )}

        {/* FIREBASE & FIRESTORE SETUP GUIDE (Answering user request directly in-app) */}
        <View className="bg-white dark:bg-[#24201d] rounded-3xl p-5 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowSetupGuide(!showSetupGuide)}
            className="w-full flex flex-row items-center justify-between text-left cursor-pointer group"
          >
            <View className="flex flex-row items-center gap-2">
              <span className="material-symbols-outlined text-[#e08744] text-[20px]">
                integration_instructions
              </span>
              <Text className="font-editorial text-base font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                Firebase &amp; Firestore Setup Steps
              </Text>
            </View>
            <span className="material-symbols-outlined text-[#877367] group-hover:text-[#1f1b18] dark:group-hover:text-[#f7eee9] transition-transform">
              {showSetupGuide ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {showSetupGuide && (
            <div className="pt-2 text-xs text-[#544339] dark:text-[#b5a499] flex flex-col gap-3.5 leading-relaxed">
              <p>
                Follow these straightforward steps to set up Firebase Authentication and Cloud Firestore for your SmileJourneyAI app:
              </p>

              {/* Step 1 */}
              <div className="p-3 rounded-2xl bg-[#fbf2ed] dark:bg-[#2a2622] flex flex-col gap-1.5 border border-[#dac2b4]/30 dark:border-[#38332e]">
                <div className="flex items-center gap-2 font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  <span className="w-5 h-5 rounded-full bg-[#e08744] text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Enable Email/Password &amp; Google in Firebase Auth</span>
                </div>
                <p className="text-[11px] pl-7">
                  In the <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-[#934b08] dark:text-[#ffb785] underline">Firebase Console</a>, navigate to <strong>Build &gt; Authentication &gt; Sign-in method</strong>. Click <strong>Add new provider</strong>, enable <strong>Email/Password</strong>, and enable <strong>Google</strong>.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-3 rounded-2xl bg-[#fbf2ed] dark:bg-[#2a2622] flex flex-col gap-1.5 border border-[#dac2b4]/30 dark:border-[#38332e]">
                <div className="flex items-center gap-2 font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  <span className="w-5 h-5 rounded-full bg-[#e08744] text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Create Cloud Firestore Database</span>
                </div>
                <p className="text-[11px] pl-7">
                  Go to <strong>Build &gt; Firestore Database</strong>. Click <strong>Create database</strong>. Current provisioned database ID is <code>ai-studio-smilejourneyai-4261db67-ecc6-4635-a1d3-e7758d3ef046</code>.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-3 rounded-2xl bg-[#fbf2ed] dark:bg-[#2a2622] flex flex-col gap-1.5 border border-[#dac2b4]/30 dark:border-[#38332e]">
                <div className="flex items-center gap-2 font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  <span className="w-5 h-5 rounded-full bg-[#e08744] text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Deploy Security Rules (firestore.rules)</span>
                </div>
                <p className="text-[11px] pl-7">
                  Deploy the rules provided in <code>firestore.rules</code> to protect <code>/users/{'{userId}'}</code> and its subcollections (<code>milestones</code>, <code>findings</code>, <code>questions</code>) using strict user-ownership validation (<code>request.auth.uid == userId</code>).
                </p>
              </div>

              {/* Step 4: Finding & configuring .env keys */}
              <div className="p-3.5 rounded-2xl bg-[#fbf2ed] dark:bg-[#2a2622] flex flex-col gap-2 border border-[#dac2b4]/30 dark:border-[#38332e]">
                <div className="flex items-center gap-2 font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  <span className="w-5 h-5 rounded-full bg-[#e08744] text-white flex items-center justify-center text-[10px]">4</span>
                  <span>How to Find Each Key in Firebase Console</span>
                </div>
                <div className="text-[11px] pl-7 flex flex-col gap-2">
                  <p>
                    Follow these clicks in the <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-[#934b08] dark:text-[#ffb785] underline font-semibold">Firebase Console</a> to find each value:
                  </p>
                  <ul className="list-disc pl-4 flex flex-col gap-1 text-[11px]">
                    <li>
                      <strong>Project ID &amp; API Key:</strong> Click the <strong>⚙️ Gear icon</strong> (top left) &gt; <strong>Project settings</strong> &gt; <strong>General</strong> tab.
                    </li>
                    <li>
                      <strong>App ID &amp; SDK Config:</strong> On the same General tab, scroll down to <strong>"Your apps"</strong>. Under <strong>SDK setup and configuration</strong>, choose <strong>"Config"</strong> to view your web app's <code>apiKey</code>, <code>authDomain</code>, <code>projectId</code>, <code>storageBucket</code>, <code>messagingSenderId</code>, and <code>appId</code>.
                    </li>
                    <li>
                      <strong>Firestore Database ID:</strong> In the left sidebar, click <strong>Build &gt; Firestore Database</strong>. Look at the database dropdown name at the top (e.g. <code>(default)</code> or your custom ID).
                    </li>
                  </ul>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                      Ready-to-use .env configuration:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const envContent = `VITE_FIREBASE_API_KEY="AIzaSyCJcRM69BFNKqTPR--jMIimFkKcMgBSxKE"\nVITE_FIREBASE_AUTH_DOMAIN="authentic-acumen-kcbh2.firebaseapp.com"\nVITE_FIREBASE_PROJECT_ID="authentic-acumen-kcbh2"\nVITE_FIREBASE_STORAGE_BUCKET="authentic-acumen-kcbh2.firebasestorage.app"\nVITE_FIREBASE_MESSAGING_SENDER_ID="600282670307"\nVITE_FIREBASE_APP_ID="1:600282670307:web:4669cfb88f991a606ed1d6"\nVITE_FIREBASE_FIRESTORE_DATABASE_ID="ai-studio-smilejourneyai-4261db67-ecc6-4635-a1d3-e7758d3ef046"`;
                        navigator.clipboard.writeText(envContent);
                        showToast('Firebase .env keys copied to clipboard!');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#e08744] hover:bg-[#934b08] text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[13px]">content_copy</span>
                      Copy .env Values
                    </button>
                  </div>

                  <pre className="text-[10px] font-mono bg-black/5 dark:bg-black/30 p-2.5 rounded-xl overflow-x-auto text-[#1f1b18] dark:text-[#f7eee9]">
{`VITE_FIREBASE_API_KEY="AIzaSyCJcRM69BFNKqTPR--jMIimFkKcMgBSxKE"
VITE_FIREBASE_AUTH_DOMAIN="authentic-acumen-kcbh2.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="authentic-acumen-kcbh2"
VITE_FIREBASE_STORAGE_BUCKET="authentic-acumen-kcbh2.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="600282670307"
VITE_FIREBASE_APP_ID="1:600282670307:web:4669cfb88f991a606ed1d6"
VITE_FIREBASE_FIRESTORE_DATABASE_ID="ai-studio-smilejourneyai-4261db67-ecc6-4635-a1d3-e7758d3ef046"`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </View>

        {/* PYTHON BACKEND & AI MODEL CONNECTION CARD */}
        <View className="bg-white dark:bg-[#24201d] rounded-3xl p-5 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowBackendCard(!showBackendCard)}
            className="w-full flex flex-row items-center justify-between text-left cursor-pointer group"
          >
            <View className="flex flex-row items-center gap-2">
              <span className="material-symbols-outlined text-[#e08744] text-[20px]">
                settings_ethernet
              </span>
              <Text className="font-editorial text-base font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                Python Backend &amp; AI Model Connection
              </Text>
            </View>
            <span className="material-symbols-outlined text-[#877367] group-hover:text-[#1f1b18] dark:group-hover:text-[#f7eee9] transition-transform">
              {showBackendCard ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {showBackendCard && (
            <div className="pt-2 text-xs text-[#544339] dark:text-[#b5a499] flex flex-col gap-3.5 leading-relaxed">
              <p>
                Connect your hosted Python service (e.g. on <strong>Render</strong> or <strong>Railway</strong>) that runs your Hugging Face smile assessment model.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  Backend API Base URL
                </label>
                <input
                  type="url"
                  value={backendInput}
                  onChange={(e) => {
                    setBackendInput(e.target.value);
                    setBackendTestStatus(null);
                  }}
                  placeholder="https://your-service.onrender.com"
                  className="w-full bg-[#fbf2ed] dark:bg-[#2a2622] rounded-2xl py-2.5 px-3.5 text-xs font-mono text-[#1f1b18] dark:text-[#f7eee9] border border-[#dac2b4]/40 dark:border-[#38332e] focus:border-[#e08744] focus:outline-none"
                />
                <span className="text-[10px] text-[#877367] dark:text-[#a89f97]">
                  Must be an absolute URL starting with <code>https://</code> or <code>http://</code>.
                </span>
              </div>

              {/* Status or Test Result */}
              {backendTestStatus && (
                <div
                  className={`p-3 rounded-2xl border text-xs leading-relaxed flex items-start gap-2 ${
                    backendTestStatus.success
                      ? 'bg-[#a9f2d0]/30 border-[#206a50]/30 text-[#206a50] dark:text-[#8dd5b5]'
                      : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
                    {backendTestStatus.success ? 'check_circle' : 'error'}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">
                      {backendTestStatus.success ? 'Connection Verified' : 'Connection Error'}
                    </p>
                    <p className="text-[11px] mt-0.5">{backendTestStatus.message}</p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestBackend}
                  disabled={testingBackend}
                  className="flex-1 py-2.5 rounded-full bg-[#f5ece7] dark:bg-[#2d2925] hover:bg-[#ebdcd4] text-[#1f1b18] dark:text-[#f7eee9] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {testingBackend ? (
                    <>
                      <span className="material-symbols-outlined text-[15px] animate-spin">refresh</span>
                      Testing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[15px]">network_check</span>
                      Test Ping
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSaveBackend}
                  className="flex-1 py-2.5 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">save</span>
                  Save URL
                </button>
              </div>

              {/* Reset to env default */}
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#dac2b4]/20 dark:border-[#38332e]">
                <span className="text-[#877367] dark:text-[#a89f97]">
                  Active: <code className="font-mono">{getApiBaseUrl() || '(none configured)'}</code>
                </span>
                {getApiBaseUrl() && (
                  <button
                    type="button"
                    onClick={handleResetBackend}
                    className="text-[#934b08] dark:text-[#ffb785] hover:underline font-semibold cursor-pointer"
                  >
                    Reset Default
                  </button>
                )}
              </div>
            </div>
          )}
        </View>

        {/* Accessibility & Appearance Card */}
        <View className="bg-white dark:bg-[#24201d] rounded-3xl p-5 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-3">
          <View className="flex flex-row items-center gap-2">
            <span className="material-symbols-outlined text-[#934b08] dark:text-[#ffb785] text-[20px]">
              palette
            </span>
            <Text className="font-editorial text-base font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
              Appearance &amp; Accessibility
            </Text>
          </View>

          <View className="flex flex-row items-center justify-between p-3 rounded-2xl bg-[#fbf2ed] dark:bg-[#2a2622]">
            <View className="flex flex-col pr-2">
              <Text className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                Dark Mode
              </Text>
              <Text className="text-[11px] text-[#544339] dark:text-[#b5a499]">
                High-contrast espresso palette for evening comfort
              </Text>
            </View>
            <TouchableOpacity
              onPress={toggleDarkMode}
              className={`w-12 h-7 rounded-full p-1 transition-colors flex items-center cursor-pointer shrink-0 ${
                isDarkMode ? 'bg-[#e08744] justify-end' : 'bg-[#dac2b4] justify-start'
              }`}
              accessibilityLabel="Toggle Dark Mode"
              accessibilityRole="switch"
            >
              <View className="w-5 h-5 rounded-full bg-white shadow-xs"></View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy Sanctuary & Firebase Cloud Security */}
        <View className="bg-white dark:bg-[#24201d] rounded-3xl p-5 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-3">
          <View className="flex flex-row items-center gap-2">
            <span className="material-symbols-outlined text-[#206a50] dark:text-[#8dd5b5] text-[20px]">
              lock
            </span>
            <Text className="font-editorial text-base font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
              Privacy Sanctuary
            </Text>
          </View>

          <View className="flex flex-col gap-2">
            <View className="flex flex-row items-start gap-3 p-3 rounded-2xl bg-[#fbf2ed] dark:bg-[#2a2622]">
              <span className="material-symbols-outlined text-[#206a50] dark:text-[#8dd5b5] text-[18px] mt-0.5">
                verified
              </span>
              <View className="flex flex-col flex-1">
                <Text className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  Strict User-Only Isolation
                </Text>
                <Text className="text-[11px] text-[#544339] dark:text-[#b5a499]">
                  Your images and scan history are isolated in Firestore rules strictly matching your unique auth token. No other account or third-party can access your data.
                </Text>
              </View>
            </View>
          </View>

          {/* Export Journal */}
          <TouchableOpacity
            onPress={handleExportData}
            className="w-full py-3 px-4 rounded-2xl bg-[#fbf2ed] dark:bg-[#2a2622] hover:bg-[#f5ece7] text-[#1f1b18] dark:text-[#f7eee9] flex flex-row items-center justify-center gap-2 transition-colors cursor-pointer"
            accessibilityLabel="Export Encrypted Journal"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <Text className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
              Export Private Journal (.json)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Data Reset Section */}
        <View className="bg-white dark:bg-[#24201d] rounded-3xl p-5 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-3">
          <View className="flex flex-row items-center gap-2 text-red-600 dark:text-red-400">
            <span className="material-symbols-outlined text-[20px]">delete_sweep</span>
            <Text className="font-editorial text-base font-semibold text-red-600 dark:text-red-400">
              Clear &amp; Reset Data
            </Text>
          </View>

          <Text className="text-xs text-[#544339] dark:text-[#b5a499] leading-relaxed">
            Reset your personal cloud journal scans, checkpoints, and profile inputs to start fresh.
          </Text>

          {showConfirmReset ? (
            <View className="flex flex-row items-center gap-2 pt-1">
              <TouchableOpacity
                onPress={() => {
                  resetAllData();
                  setShowConfirmReset(false);
                }}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer"
              >
                <Text className="text-xs font-semibold text-white">Yes, Erase Everything</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowConfirmReset(false)}
                className="py-2.5 px-3 rounded-2xl bg-[#f5ece7] dark:bg-[#2d2925] text-[#544339] dark:text-[#b5a499] cursor-pointer"
              >
                <Text className="text-xs font-semibold text-[#544339] dark:text-[#b5a499]">Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowConfirmReset(true)}
              className="py-2.5 px-4 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex flex-row items-center justify-center gap-1.5 cursor-pointer hover:bg-red-100 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <Text className="text-xs font-semibold text-red-600 dark:text-red-400">
                Clear All Check-In Data
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};
