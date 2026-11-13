import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type {
  ScreenType,
  FindingItem,
  MilestoneItem,
  ConsultationQuestion,
  BackendAssessmentResult,
  CompletedAssessmentResult,
  HistoricalAssessment,
  ValidatedLegacyMilestone,
} from '../types';
import {
  validateCompletedAssessment,
  validateLegacyMilestone,
  combineMilestones,
} from '../utils/assessmentValidation';
import { getFirebaseAuthErrorMessage } from '../utils/authValidation';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  handleFirestoreError,
  OperationType,
  testConnection,
  type FirebaseUser,
} from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
} from 'firebase/firestore';

import { detectDevice, type DeviceInfo } from '../utils/deviceDetection';

export type AuthMode = 'signin' | 'signup' | 'forgot';

interface AppContextType {
  activeScreen: ScreenType;
  setActiveScreen: (screen: ScreenType) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  currentUser: FirebaseUser | null;
  authLoading: boolean;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<{ success: boolean; error?: string }>;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOutUser: () => Promise<void>;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalMode: AuthMode;
  setAuthModalMode: (mode: AuthMode) => void;
  openAuthModal: (mode?: AuthMode) => void;
  userName: string;
  setUserName: (name: string) => void;
  userAge: string;
  setUserAge: (age: string) => void;
  userIntent: string;
  setUserIntent: (intent: string) => void;
  saveUserProfile: (name: string, age: string, intent: string) => void;
  ritualDay: number;
  harmonyScore: number;
  currentAssessment: BackendAssessmentResult | null;
  saveVerifiedAssessment: (result: CompletedAssessmentResult) => void;
  assessments: HistoricalAssessment[];
  malformedAssessments: Array<{ id: string; errors: string[] }>;
  legacyMilestones: ValidatedLegacyMilestone[];
  malformedLegacyMilestones: Array<{ id: string; errors: string[] }>;
  historyLoading: boolean;
  selectHistoricalAssessment: (assessmentId: string) => void;
  findings: FindingItem[];
  milestones: MilestoneItem[];
  questions: ConsultationQuestion[];
  toggleQuestion: (id: string) => void;
  addCustomQuestion: (question: string) => void;
  resetAllData: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  capturedPhoto: string | null;
  setCapturedPhoto: (url: string | null) => void;
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isOPPO: boolean;
  isMobile: boolean;
  viewModeOverride: 'auto' | 'mobile' | 'desktop';
  toggleViewMode: () => void;
  showInstallGuide: boolean;
  setShowInstallGuide: (val: boolean) => void;
  installPWA: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Clean up any legacy shared in-phone vault keys so no images or records leak across user accounts
try {
  const legacyKeys = [
    'smile_milestones',
    'smile_findings',
    'smile_harmonyScore',
    'smile_ritualDay',
    'smile_questions',
    'smile_active_assessment',
    'smile_userName',
    'smile_userAge',
    'smile_userIntent',
  ];
  legacyKeys.forEach((key) => localStorage.removeItem(key));
} catch {
  // ignore
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('signin');

  // User state stored exclusively in Firebase Firestore per authenticated user
  const [userName, setUserNameState] = useState<string>('');
  const [userAge, setUserAgeState] = useState<string>('');
  const [userIntent, setUserIntentState] = useState<string>('');
  const [assessments, setAssessments] = useState<HistoricalAssessment[]>([]);
  const [malformedAssessments, setMalformedAssessments] = useState<Array<{ id: string; errors: string[] }>>([]);
  const [legacyMilestones, setLegacyMilestones] = useState<ValidatedLegacyMilestone[]>([]);
  const [malformedLegacyMilestones, setMalformedLegacyMilestones] = useState<Array<{ id: string; errors: string[] }>>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  const [milestones, setMilestones] = useState<MilestoneItem[]>([]);
  const [findings, setFindings] = useState<FindingItem[]>([]);
  const [harmonyScore, setHarmonyScore] = useState<number>(0);
  const [ritualDay, setRitualDay] = useState<number>(0);
  const [questions, setQuestions] = useState<ConsultationQuestion[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<BackendAssessmentResult | null>(null);

  const [activeScreen, setActiveScreen] = useState<ScreenType>('welcome');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('smile_theme') === 'dark';
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Active Firestore listeners cleanup registry and session race-condition guards
  const firestoreUnsubsRef = useRef<Array<() => void>>([]);
  const activeSessionIdRef = useRef<number>(0);
  const activeUserUidRef = useRef<string | null>(null);

  const cleanupFirestoreListeners = () => {
    const unsubs = firestoreUnsubsRef.current;
    firestoreUnsubsRef.current = [];
    for (const unsub of unsubs) {
      try {
        unsub();
      } catch (err) {
        console.error('Error cleaning up Firestore listener:', err);
      }
    }
  };

  // Active Device Autodetection (Android, OPPO, iOS, Desktop)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => detectDevice());
  const [viewModeOverride, setViewModeOverride] = useState<'auto' | 'mobile' | 'desktop'>(() => {
    return (localStorage.getItem('smile_viewMode') as 'auto' | 'mobile' | 'desktop') || 'auto';
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      setDeviceInfo(detectDevice());
    };
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);
    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  // Compute effective mobile layout state
  const isMobile =
    viewModeOverride === 'mobile'
      ? true
      : viewModeOverride === 'desktop'
      ? false
      : deviceInfo.isMobile;

  const toggleViewMode = () => {
    const nextMode = isMobile ? 'desktop' : 'mobile';
    setViewModeOverride(nextMode);
    localStorage.setItem('smile_viewMode', nextMode);
    showToast(`Switched to ${nextMode === 'mobile' ? 'Mobile' : 'Desktop'} layout`);
  };

  // Progressive Web App (PWA) installation hook
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isOPPO,
    showInstallGuide,
    setShowInstallGuide,
    install,
  } = usePWAInstall();

  const installPWA = async () => {
    const res = await install();
    if (res.outcome === 'accepted') {
      if (isOPPO || isAndroid) {
        showToast('App adding! On OPPO / Android: Swipe up on your home screen to check your App Drawer for SmileJourney.');
      } else {
        showToast('SmileJourneyAI install prompt accepted! Adding to your applications.');
      }
    }
  };

  // Test Firestore connection on boot
  useEffect(() => {
    testConnection();
  }, []);

  // Theme synchronization
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('smile_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('smile_theme', 'light');
    }
  }, [isDarkMode]);

  // Firebase Auth State Listener & Firestore Sync
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // 1. Advance session counter and update active user UID
      activeSessionIdRef.current += 1;
      const currentSessionId = activeSessionIdRef.current;
      const currentUid = user ? user.uid : null;
      activeUserUidRef.current = currentUid;

      // 2. Always clean up any existing Firestore listeners before attaching new ones or on sign-out
      cleanupFirestoreListeners();

      setCurrentUser(user);
      setAuthLoading(false);

      if (user) {
        // Clear previous user state while switching accounts
        setMilestones([]);
        setFindings([]);
        setHarmonyScore(0);
        setRitualDay(0);
        setQuestions([]);
        setCapturedPhoto(null);
        setCurrentAssessment(null);
        setAssessments([]);
        setMalformedAssessments([]);
        setLegacyMilestones([]);
        setMalformedLegacyMilestones([]);

        // User is authenticated - navigate from welcome hero to dashboard
        setActiveScreen((prev: ScreenType) => (prev === 'welcome' ? 'home' : prev));
        const userRef = doc(db, 'users', user.uid);
        try {
          const userSnap = await getDoc(userRef);
          // Guard: prevent stale asynchronous profile read from old session from updating state
          if (activeSessionIdRef.current !== currentSessionId || activeUserUidRef.current !== user.uid) {
            return;
          }

          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserNameState(data.name || user.displayName || 'Smile Explorer');
            setUserAgeState(data.age || '');
            setUserIntentState(data.intent || '');
            setRitualDay(data.ritualDay !== undefined ? data.ritualDay : 0);
            setHarmonyScore(data.harmonyScore !== undefined ? data.harmonyScore : 0);
          } else {
            // Create user document in Firestore
            const initialName = user.displayName || 'Smile Explorer';
            await setDoc(userRef, {
              id: user.uid,
              name: initialName,
              email: user.email || '',
              age: '',
              intent: '',
              ritualDay: 0,
              harmonyScore: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            // Guard: prevent stale asynchronous setDoc from updating state if user changed
            if (activeSessionIdRef.current !== currentSessionId || activeUserUidRef.current !== user.uid) {
              return;
            }
            setUserNameState(initialName);
            setUserAgeState('');
            setUserIntentState('');
            setRitualDay(0);
            setHarmonyScore(0);
          }
        } catch (error) {
          if (activeSessionIdRef.current === currentSessionId && activeUserUidRef.current === user.uid) {
            handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          }
        }

        // Guard before attaching snapshot listeners
        if (activeSessionIdRef.current !== currentSessionId || activeUserUidRef.current !== user.uid) {
          return;
        }

        // Listen to User Assessments subcollection strictly scoped to user.uid
        // The Python backend writes completed assessments here; frontend reads history.
        const assessmentsRef = collection(db, 'users', user.uid, 'assessments');
        const legacyMilestonesRef = collection(db, 'users', user.uid, 'milestones');
        const questionsRef = collection(db, 'users', user.uid, 'questions');
        setHistoryLoading(true);

        let latestAssessments: HistoricalAssessment[] = [];
        let latestLegacy: ValidatedLegacyMilestone[] = [];

        const updateCombinedTimeline = () => {
          if (activeSessionIdRef.current !== currentSessionId || activeUserUidRef.current !== user.uid) {
            return;
          }
          const combined = combineMilestones(latestAssessments, latestLegacy);
          setMilestones(combined);

          if (latestAssessments.length > 0) {
            setHarmonyScore(latestAssessments[0].score);
            setCapturedPhoto(latestAssessments[0].photo_url);
            setFindings(latestAssessments[0].findings);
          } else if (combined.length > 0) {
            setHarmonyScore(combined[0].score);
            setCapturedPhoto(combined[0].photoUrl);
            setFindings([]);
          } else {
            setHarmonyScore(0);
            setCapturedPhoto(null);
            setFindings([]);
          }
        };

        const unsubAssessments = onSnapshot(
          assessmentsRef,
          (snapshot) => {
            if (activeSessionIdRef.current !== currentSessionId || activeUserUidRef.current !== user.uid) {
              return;
            }
            const validLoaded: HistoricalAssessment[] = [];
            const malformedLoaded: Array<{ id: string; errors: string[] }> = [];

            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              const validation = validateCompletedAssessment(data, { expectedDocId: docSnap.id });
              if (validation.success && validation.data) {
                validLoaded.push(validation.data);
              } else {
                malformedLoaded.push({
                  id: docSnap.id,
                  errors: validation.errors,
                });
              }
            });

            validLoaded.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            latestAssessments = validLoaded;
            setAssessments(validLoaded);
            setMalformedAssessments(malformedLoaded);
            setHistoryLoading(false);
            updateCombinedTimeline();
          },
          (error) => {
            if (activeSessionIdRef.current === currentSessionId && activeUserUidRef.current === user.uid) {
              setHistoryLoading(false);
              handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/assessments`);
            }
          }
        );

        // Listen to User Legacy Milestones subcollection strictly scoped to user.uid (read-only)
        const unsubLegacyMilestones = onSnapshot(
          legacyMilestonesRef,
          (snapshot) => {
            if (activeSessionIdRef.current !== currentSessionId || activeUserUidRef.current !== user.uid) {
              return;
            }
            const validLegacy: ValidatedLegacyMilestone[] = [];
            const malformedLegacy: Array<{ id: string; errors: string[] }> = [];

            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              const validation = validateLegacyMilestone(data, docSnap.id);
              if (validation.success && validation.data) {
                validLegacy.push(validation.data);
              } else {
                malformedLegacy.push({
                  id: docSnap.id,
                  errors: validation.errors,
                });
              }
            });

            validLegacy.sort((a, b) => b.timestamp - a.timestamp);
            latestLegacy = validLegacy;
            setLegacyMilestones(validLegacy);
            setMalformedLegacyMilestones(malformedLegacy);
            updateCombinedTimeline();
          },
          (error) => {
            if (activeSessionIdRef.current === currentSessionId && activeUserUidRef.current === user.uid) {
              handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/milestones`);
            }
          }
        );

        // Listen to User Questions subcollection strictly scoped to user.uid
        const unsubQuestions = onSnapshot(
          questionsRef,
          (snapshot) => {
            if (activeSessionIdRef.current !== currentSessionId || activeUserUidRef.current !== user.uid) {
              return;
            }
            const loaded: ConsultationQuestion[] = [];
            snapshot.forEach((docSnap) => {
              loaded.push(docSnap.data() as ConsultationQuestion);
            });
            setQuestions(loaded);
          },
          (error) => {
            if (activeSessionIdRef.current === currentSessionId && activeUserUidRef.current === user.uid) {
              handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/questions`);
            }
          }
        );

        // Store active unsubscribe functions in safe cleanup ref (never return from onAuthStateChanged)
        firestoreUnsubsRef.current = [unsubAssessments, unsubLegacyMilestones, unsubQuestions];
      } else {
        // User is logged out - completely purge any data from active view
        setUserNameState('');
        setUserAgeState('');
        setUserIntentState('');
        setAssessments([]);
        setMalformedAssessments([]);
        setLegacyMilestones([]);
        setMalformedLegacyMilestones([]);
        setMilestones([]);
        setFindings([]);
        setHarmonyScore(0);
        setRitualDay(0);
        setQuestions([]);
        setCapturedPhoto(null);
        setCurrentAssessment(null);
        setHistoryLoading(false);
      }
    });

    return () => {
      // Provider unmount cleanup
      activeSessionIdRef.current += 1;
      activeUserUidRef.current = null;
      cleanupFirestoreListeners();
      unsubscribeAuth();
    };
  }, []);

  const openAuthModal = (mode: AuthMode = 'signin') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      showToast(`Welcome, ${result.user.displayName || 'friend'}!`);
      setAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      const message = getFirebaseAuthErrorMessage(err);
      showToast(message);
      return { success: false, error: message };
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      const cleanName = name.trim() || 'Smile Explorer';
      if (cleanName) {
        await updateProfile(cred.user, { displayName: cleanName });
      }

      // Initialize Firestore document
      const userRef = doc(db, 'users', cred.user.uid);
      await setDoc(userRef, {
        id: cred.user.uid,
        name: cleanName,
        email: cred.user.email || email.trim(),
        age: userAge || '',
        intent: userIntent || '',
        ritualDay: ritualDay || 0,
        harmonyScore: harmonyScore || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setUserNameState(cleanName);
      showToast(`Welcome to SmileJourneyAI, ${cleanName}!`);
      setAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      console.error('Sign up error:', err);
      const message = getFirebaseAuthErrorMessage(err);
      showToast(message);
      return { success: false, error: message };
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      showToast(`Welcome back, ${cred.user.displayName || 'friend'}!`);
      setAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      console.error('Log in error:', err);
      const message = getFirebaseAuthErrorMessage(err);
      showToast(message);
      return { success: false, error: message };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      showToast('Password reset link sent to your email.');
      return { success: true };
    } catch (err: any) {
      console.error('Password reset error:', err);
      const message = getFirebaseAuthErrorMessage(err);
      showToast(message);
      return { success: false, error: message };
    }
  };

  const signOutUser = async () => {
    // 1. Invalidate active session and clean up Firestore listeners immediately
    activeSessionIdRef.current += 1;
    activeUserUidRef.current = null;
    cleanupFirestoreListeners();

    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserNameState('');
      setUserAgeState('');
      setUserIntentState('');
      setMilestones([]);
      setFindings([]);
      setHarmonyScore(0);
      setCurrentAssessment(null);
      setAssessments([]);
      setMalformedAssessments([]);
      setLegacyMilestones([]);
      setMalformedLegacyMilestones([]);
      setHistoryLoading(false);
      setRitualDay(0);
      setQuestions([]);
      setCapturedPhoto(null);
      setActiveScreen('welcome');
      showToast('Signed out safely.');
    } catch (err: any) {
      console.error('Sign-out error:', err);
      showToast('Failed to sign out. Please try again.');
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev: boolean) => !prev);
  };

  const setUserName = (name: string) => {
    setUserNameState(name);
    if (currentUser) {
      setDoc(
        doc(db, 'users', currentUser.uid),
        { name, updatedAt: new Date().toISOString() },
        { merge: true }
      ).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`));
    }
  };

  const setUserAge = (age: string) => {
    setUserAgeState(age);
    if (currentUser) {
      setDoc(
        doc(db, 'users', currentUser.uid),
        { age, updatedAt: new Date().toISOString() },
        { merge: true }
      ).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`));
    }
  };

  const setUserIntent = (intent: string) => {
    setUserIntentState(intent);
    if (currentUser) {
      setDoc(
        doc(db, 'users', currentUser.uid),
        { intent, updatedAt: new Date().toISOString() },
        { merge: true }
      ).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`));
    }
  };

  const saveUserProfile = (name: string, age: string, intent: string) => {
    setUserName(name);
    setUserAge(age);
    setUserIntent(intent);
  };

  const toggleQuestion = (id: string) => {
    setQuestions((prev: ConsultationQuestion[]) => {
      const target = prev.find((q: ConsultationQuestion) => q.id === id);
      const updated = prev.map((q: ConsultationQuestion) => (q.id === id ? { ...q, checked: !q.checked } : q));

      if (currentUser && target) {
        setDoc(
          doc(db, 'users', currentUser.uid, 'questions', id),
          { checked: !target.checked },
          { merge: true }
        ).catch((err) =>
          handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}/questions/${id}`)
        );
      }

      return updated;
    });
  };

  const addCustomQuestion = (questionText: string) => {
    if (!questionText.trim()) return;
    const newId = 'custom-' + Date.now();
    const newQ: ConsultationQuestion = {
      id: newId,
      question: `“${questionText.trim()}”`,
      explanation: 'Custom question added by you for your specialist consultation.',
      checked: true,
    };
    setQuestions((prev: ConsultationQuestion[]) => [newQ, ...prev]);

    if (currentUser) {
      setDoc(doc(db, 'users', currentUser.uid, 'questions', newId), {
        ...newQ,
        userId: currentUser.uid,
        createdAt: new Date().toISOString(),
      }).catch((err) =>
        handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/questions/${newId}`)
      );
    }

    showToast('Question added to your consultation checklist');
  };

  const selectHistoricalAssessment = (assessmentId: string) => {
    const found = assessments.find((a: HistoricalAssessment) => a.assessment_id === assessmentId);
    if (found) {
      setCurrentAssessment(found);
      setHarmonyScore(found.score);
      setFindings(found.findings);
      setCapturedPhoto(found.photo_url);
      setActiveScreen('report');
    }
  };

  const saveVerifiedAssessment = (result: CompletedAssessmentResult) => {
    // Update client in-memory state only. The frontend MUST NOT write assessment results
    // or milestone copies to Firestore. The backend saves to users/{uid}/assessments/{assessment_id}.
    // Strictly uses the backend's validated photo_url as the photo source.
    setCurrentAssessment(result);
    setFindings(result.findings);
    setHarmonyScore(result.score);
    setCapturedPhoto(result.photo_url);

    if (result.consultation_questions && Array.isArray(result.consultation_questions) && result.consultation_questions.length > 0) {
      setQuestions(result.consultation_questions);
    }
  };

  const resetAllData = () => {
    setUserNameState('');
    setUserAgeState('');
    setUserIntentState('');
    setMilestones([]);
    setFindings([]);
    setHarmonyScore(0);
    setCurrentAssessment(null);
    setAssessments([]);
    setMalformedAssessments([]);
    setLegacyMilestones([]);
    setMalformedLegacyMilestones([]);
    setHistoryLoading(false);
    setRitualDay(0);
    setQuestions([]);
    setCapturedPhoto(null);
    setActiveScreen('welcome');

    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      setDoc(
        userRef,
        {
          name: currentUser.displayName || 'Smile Explorer',
          email: currentUser.email || '',
          age: '',
          intent: '',
          ritualDay: 0,
          harmonyScore: 0,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      ).catch((err) => handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`));
    }

    showToast('All journal and scan data cleared.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  return (
    <AppContext.Provider
      value={{
        activeScreen,
        setActiveScreen,
        isDarkMode,
        toggleDarkMode,
        currentUser,
        authLoading,
        signInWithGoogle,
        signUpWithEmail,
        loginWithEmail,
        resetPassword,
        signOutUser,
        authModalOpen,
        setAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        openAuthModal,
        userName,
        setUserName,
        userAge,
        setUserAge,
        userIntent,
        setUserIntent,
        saveUserProfile,
        ritualDay,
        harmonyScore,
        currentAssessment,
        saveVerifiedAssessment,
        assessments,
        malformedAssessments,
        legacyMilestones,
        malformedLegacyMilestones,
        historyLoading,
        selectHistoricalAssessment,
        findings,
        milestones,
        questions,
        toggleQuestion,
        addCustomQuestion,
        resetAllData,
        toastMessage,
        showToast,
        capturedPhoto,
        setCapturedPhoto,
        isInstallable,
        isInstalled,
        isIOS,
        isAndroid,
        isOPPO,
        isMobile,
        viewModeOverride,
        toggleViewMode,
        showInstallGuide,
        setShowInstallGuide,
        installPWA,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
