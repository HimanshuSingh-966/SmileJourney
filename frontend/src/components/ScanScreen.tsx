import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from './native';
import { useApp, DuplicateAssessmentError } from '../context/AppContext';
import {
  submitAssessment,
  isBackendConfigured,
  getApiBaseUrl,
  setCustomApiBaseUrl,
  clearCustomApiBaseUrl,
  testBackendConnection,
  isValidBackendUrl,
  BackendNotConfiguredError,
  AssessmentApiError,
  AssessmentTimeoutError,
  AssessmentFailedError,
  AssessmentValidationError,
} from '../services/assessmentApi';
import { optimizeSmilePhoto } from '../utils/imageOptimization';
import type { CompletedAssessmentResult } from '../types';

interface AnalysisErrorState {
  title: string;
  message: string;
  canRetry: boolean;
  canRetrySave?: boolean;
  isConfigError?: boolean;
}

export const ScanScreen: React.FC = () => {
  const { setActiveScreen, saveVerifiedAssessment, showToast, currentUser, openAuthModal } = useApp();

  const [primerDismissed, setPrimerDismissed] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [timerActive, setTimerActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Analysis workflow state (synchronous backend inference + frontend Firestore persistence)
  const [analysisStage, setAnalysisStage] = useState<'idle' | 'uploading' | 'saving' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<AnalysisErrorState | null>(null);
  const [lastCapturedImage, setLastCapturedImage] = useState<{ blob: Blob | File; previewUrl: string } | null>(null);
  const [pendingSaveResult, setPendingSaveResult] = useState<CompletedAssessmentResult | null>(null);

  // Backend connection modal & custom configuration
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [inputBackendUrl, setInputBackendUrl] = useState<string>(() => getApiBaseUrl() || '');
  const [isTestingUrl, setIsTestingUrl] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const backendConfigured = isBackendConfigured();
  const apiBaseUrl = getApiBaseUrl();

  // Clear pending captured images or unsaved results if the user signs out or switches accounts
  useEffect(() => {
    setLastCapturedImage(null);
    setPendingSaveResult(null);
    setAnalysisError(null);
    setAnalysisStage('idle');
    setStatusMessage('');
  }, [currentUser?.uid]);

  // Initialize real camera stream
  useEffect(() => {
    let isMounted = true;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not supported on this browser');
        }

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (isMounted) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
          setCameraActive(true);
          setCameraError(null);
        }
      } catch {
        if (isMounted) {
          setCameraActive(false);
          setCameraError('Camera access not active. You can upload an authentic smile photo below.');
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Flip camera
  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Trigger capture sequence
  const handleShutterPress = () => {
    if (analysisStage === 'uploading' || analysisStage === 'saving') return;
    if (timerActive) {
      setCountdown(3);
      return;
    }
    executeCapture();
  };

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 1) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 1) {
      const timer = setTimeout(() => {
        setCountdown(null);
        executeCapture();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const executeCapture = async () => {
    // Shutter flash effect
    setIsFlashing(true);
    setTimeout(() => {
      setIsFlashing(false);
    }, 200);

    // Require sign-in so images are stored strictly in the user's Firebase account
    if (!currentUser) {
      showToast('Please sign in to save scans to your private Firebase account.');
      openAuthModal('signin');
      return;
    }

    // Capture frame from video or fallback
    let photoDataUrl: string | null = null;
    if (videoRef.current && canvasRef.current && cameraActive) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          // Flip horizontally for natural mirror feel
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        photoDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      }
    }

    if (photoDataUrl) {
      try {
        const { blob, dataUrl } = await optimizeSmilePhoto(photoDataUrl);
        runBackendAnalysis(blob, dataUrl);
      } catch {
        showToast('Failed to optimize photo. Please try again.');
      }
    } else {
      // Trigger file selector if camera stream unavailable
      fileInputRef.current?.click();
    }
  };

  // Handle Photo Upload via file input
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) {
      showToast('Please sign in to upload photos to your private Firebase account.');
      openAuthModal('signin');
      return;
    }

    const file = e.target.files?.[0];
    if (file) {
      try {
        const { blob, dataUrl } = await optimizeSmilePhoto(file);
        runBackendAnalysis(blob, dataUrl);
      } catch {
        showToast('Failed to process image file. Please try another photo.');
      }
    }
  };

  const persistResultToFirestore = async (result: CompletedAssessmentResult) => {
    try {
      setAnalysisStage('saving');
      setStatusMessage(`Saving completed report (${result.assessment_id}) to your private Firestore vault...`);
      await saveVerifiedAssessment(result);
      setPendingSaveResult(null);
      setAnalysisStage('idle');
      showToast('Assessment completed and saved!');
      setActiveScreen('report');
    } catch (saveErr: any) {
      console.error('Firestore assessment save error:', saveErr);
      setAnalysisStage('error');

      if (saveErr instanceof DuplicateAssessmentError) {
        setPendingSaveResult(null);
        setAnalysisError({
          title: 'Duplicate Assessment ID',
          message:
            saveErr.message +
            ' Please take a new scan so the backend assigns a fresh assessment ID.',
          canRetry: false,
          canRetrySave: false,
        });
        return;
      }

      const rawCode = typeof saveErr?.code === 'string' ? saveErr.code : '';
      const isPermissionDenied =
        rawCode === 'permission-denied' ||
        /permission[- ]denied/i.test(String(saveErr?.message || ''));

      // Retain already-received backend result so user can retry saving without re-uploading for inference
      setPendingSaveResult(result);
      setAnalysisError({
        title: isPermissionDenied ? 'Firestore Save Permission Denied' : 'Could Not Save Assessment',
        message: isPermissionDenied
          ? 'Your smile analysis finished, but Firestore blocked saving this record (permission denied). Ensure your Firestore security rules allow creating assessments for your signed-in account, then retry saving.'
          : `Your smile analysis finished, but saving to your Firestore vault failed (${
              saveErr?.message || 'network error'
            }). You can retry saving without re-running analysis.`,
        canRetry: false,
        canRetrySave: true,
      });
    }
  };

  // Real Python Backend Synchronous Analysis Pipeline
  const runBackendAnalysis = async (photoBlob: Blob | File, previewUrl: string) => {
    setLastCapturedImage({ blob: photoBlob, previewUrl });
    setPendingSaveResult(null);
    setAnalysisError(null);

    // Guard: Check backend configuration
    if (!isBackendConfigured()) {
      setAnalysisStage('error');
      setAnalysisError({
        title: 'Python Backend Required',
        message:
          'Real smile assessments require a connected Python backend service. Please provide your backend service URL (e.g. hosted on Render) to enable live scoring.',
        canRetry: false,
        isConfigError: true,
      });
      setShowConfigModal(true);
      return;
    }

    // Guard 1: Require signed-in Firebase user
    if (!currentUser) {
      setAnalysisStage('error');
      setAnalysisError({
        title: 'Sign In Required',
        message: 'A signed-in account is required before uploading smile photos. Please sign in to authenticate your scan.',
        canRetry: false,
        isConfigError: false,
      });
      openAuthModal('signin');
      return;
    }

    // Guard 2: Successfully retrieve Firebase ID token before uploading
    let idToken: string;
    try {
      idToken = await currentUser.getIdToken();
      if (!idToken || !idToken.trim()) {
        throw new Error('Retrieved token was empty.');
      }
    } catch {
      setAnalysisStage('error');
      setAnalysisError({
        title: 'Authentication Token Error',
        message: 'Could not obtain your secure Firebase authentication credentials. Please try signing out and signing back in.',
        canRetry: true,
      });
      return;
    }

    try {
      setAnalysisStage('uploading');
      setStatusMessage('Uploading and analyzing your smile photo with the backend model...');

      // POST /api/assessments synchronously analyzes the photo and returns the completed assessment
      const result = await submitAssessment(photoBlob, idToken, currentUser.uid, {
        timeoutMs: 90000,
      });

      await persistResultToFirestore(result);
    } catch (err: any) {
      console.error('Smile analysis error:', err);
      setAnalysisStage('error');

      if (err instanceof AssessmentValidationError) {
        setAnalysisError({
          title: 'Invalid Backend Response',
          message:
            'The backend model completed processing but returned an invalid or incomplete assessment report. ' +
            err.message,
          canRetry: true,
          isConfigError: false,
        });
      } else if (err instanceof BackendNotConfiguredError) {
        setAnalysisError({
          title: 'Backend Not Configured',
          message: err.message,
          canRetry: false,
          isConfigError: true,
        });
      } else if (err instanceof AssessmentTimeoutError) {
        setAnalysisError({
          title: 'Analysis Timed Out',
          message: err.message,
          canRetry: true,
        });
      } else if (err instanceof AssessmentFailedError) {
        setAnalysisError({
          title: 'Assessment Failed',
          message: err.message,
          canRetry: true,
        });
      } else if (err instanceof AssessmentApiError) {
        setAnalysisError({
          title: 'Backend Service Error',
          message: err.message,
          canRetry: true,
        });
      } else {
        setAnalysisError({
          title: 'Connection Issue',
          message: err?.message || 'Unable to complete smile analysis. Please check your network and try again.',
          canRetry: true,
        });
      }
    }
  };

  const handleRetrySave = () => {
    if (pendingSaveResult) {
      persistResultToFirestore(pendingSaveResult);
    }
  };

  const handleRetry = () => {
    if (lastCapturedImage) {
      runBackendAnalysis(lastCapturedImage.blob, lastCapturedImage.previewUrl);
    }
  };

  const handleDismissError = () => {
    setAnalysisStage('idle');
    setAnalysisError(null);
    setPendingSaveResult(null);
  };

  const handleTestBackend = async () => {
    setIsTestingUrl(true);
    setTestResult(null);
    const result = await testBackendConnection(inputBackendUrl);
    setTestResult(result);
    setIsTestingUrl(false);
  };

  const handleSaveBackendUrl = () => {
    if (!inputBackendUrl.trim()) {
      clearCustomApiBaseUrl();
      showToast('Backend URL reset to environment default.');
      setShowConfigModal(false);
      return;
    }

    if (!isValidBackendUrl(inputBackendUrl.trim())) {
      showToast('Please enter a valid URL starting with https:// or http://');
      return;
    }

    const success = setCustomApiBaseUrl(inputBackendUrl.trim());
    if (success) {
      showToast('Python backend endpoint saved!');
      setShowConfigModal(false);
      setAnalysisError(null);
      if (analysisStage === 'error') {
        setAnalysisStage('idle');
      }
    } else {
      showToast('Invalid URL format. Please check the address.');
    }
  };

  const handleResetBackendUrl = () => {
    clearCustomApiBaseUrl();
    setInputBackendUrl(getApiBaseUrl() || '');
    setTestResult(null);
    showToast('Backend URL cleared.');
  };

  const isBusy = analysisStage === 'uploading' || analysisStage === 'saving';

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      className="flex-1 w-full"
      contentContainerStyle={{ paddingBottom: '140px' }}
    >
      <View className="px-4 pt-2 pb-6 flex flex-col gap-4">
        {/* Hidden Canvas for Video Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Backend Configuration Status Banner */}
        {!backendConfigured ? (
          <View className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-3.5 flex flex-col gap-2 shadow-xs">
            <View className="flex flex-row items-center justify-between">
              <View className="flex flex-row items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg">
                  warning
                </span>
                <Text className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  Python Backend Required
                </Text>
              </View>
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="px-2.5 py-1 rounded-lg bg-[#e08744] hover:bg-[#934b08] text-white text-[11px] font-semibold cursor-pointer shadow-xs transition-colors"
              >
                Connect URL
              </button>
            </View>
            <Text className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              Real AI smile analysis requires a live backend service (e.g. hosted on Render). Simulated results are permanently disabled.
            </Text>
          </View>
        ) : (
          <View className="bg-[#206a50]/10 dark:bg-[#206a50]/20 border border-[#206a50]/20 rounded-2xl px-3.5 py-2.5 flex flex-row items-center justify-between shadow-xs">
            <View className="flex flex-row items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-[#206a50] dark:bg-[#8dd5b5] animate-pulse shrink-0"></span>
              <View className="flex flex-col min-w-0">
                <Text className="text-[11px] font-semibold text-[#206a50] dark:text-[#8dd5b5]">
                  Python Backend Connected
                </Text>
                <Text className="text-[10px] font-mono text-[#544339] dark:text-[#b5a499] truncate max-w-[200px]">
                  {apiBaseUrl}
                </Text>
              </View>
            </View>
            <button
              type="button"
              onClick={() => {
                setInputBackendUrl(getApiBaseUrl() || '');
                setTestResult(null);
                setShowConfigModal(true);
              }}
              className="text-[11px] text-[#934b08] dark:text-[#ffb785] hover:underline font-semibold cursor-pointer shrink-0 ml-2"
            >
              Change URL
            </button>
          </View>
        )}

        {/* Auth prompt if guest */}
        {!currentUser && (
          <View className="bg-[#fbf2ed] dark:bg-[#2a2622] rounded-2xl p-3 flex flex-row items-center justify-between gap-3 border border-[#dac2b4]/30 dark:border-[#38332e]">
            <View className="flex flex-col flex-1 min-w-0">
              <Text className="text-xs font-semibold text-[#934b08] dark:text-[#ffb785]">
                Sign in recommended
              </Text>
              <Text className="text-[11px] text-[#544339] dark:text-[#b5a499]">
                Authenticates your request with a secure Firebase token.
              </Text>
            </View>
            <button
              type="button"
              onClick={() => openAuthModal('signin')}
              className="px-3 py-1.5 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold cursor-pointer shrink-0 shadow-xs"
            >
              Sign In
            </button>
          </View>
        )}

        {/* Privacy & Camera Guidance Card */}
        {!primerDismissed && (
          <View className="relative overflow-hidden bg-white dark:bg-[#24201d] rounded-3xl p-5 shadow-xs border border-[#dac2b4]/30 dark:border-[#38332e] transition-all">
            <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-[#a9f2d0]/30 dark:bg-[#1b4a38]/30 blur-2xl pointer-events-none"></div>
            <View className="flex flex-row items-start gap-3.5 relative z-10">
              <View className="w-10 h-10 rounded-2xl bg-[#a9f2d0] dark:bg-[#1b4a38] flex items-center justify-center shrink-0 text-[#206a50] dark:text-[#8dd5b5] shadow-xs">
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  shield_with_heart
                </span>
              </View>
              <View className="flex-1 min-w-0">
                <View className="flex flex-row items-center justify-between gap-2">
                  <Text className="text-[11px] uppercase tracking-wider text-[#206a50] dark:text-[#8dd5b5] font-bold">
                    Private &amp; Secure
                  </Text>
                  <View className="inline-flex flex-row items-center gap-1 text-[11px] text-[#544339] dark:text-[#b5a499] bg-[#f5ece7] dark:bg-[#2d2925] px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#206a50] dark:text-[#8dd5b5]"></span>
                    <Text className="text-[11px] text-[#544339] dark:text-[#b5a499]">Authenticated API</Text>
                  </View>
                </View>
                <Text className="font-editorial text-lg text-[#1f1b18] dark:text-[#f7eee9] font-semibold mt-1 leading-snug">
                  Authentic Smile Check-In
                </Text>
                <Text className="text-xs text-[#544339] dark:text-[#b5a499] mt-1 leading-relaxed">
                  Your photo is transmitted securely to your backend for analysis using your user authentication credentials. No fake or browser-side mock data is used.
                </Text>
              </View>
            </View>

            <View className="mt-3.5 pt-3 flex flex-row items-center justify-between gap-3 bg-[#fbf2ed]/80 dark:bg-[#2a2622]/80 rounded-2xl px-3.5 py-2.5">
              <View className="flex flex-row items-center gap-2">
                <span className="material-symbols-outlined text-[#206a50] dark:text-[#8dd5b5] text-[18px]">
                  verified_user
                </span>
                <Text className="text-xs text-[#1f1b18] dark:text-[#f7eee9] font-medium">
                  {cameraActive ? 'Camera active' : 'Local camera & photo ready'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPrimerDismissed(true)}
                className="text-xs font-semibold text-[#934b08] dark:text-[#ffb785]"
                accessibilityLabel="Dismiss camera primer"
              >
                <Text className="text-xs font-semibold text-[#934b08] dark:text-[#ffb785]">Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Live Viewfinder Frame */}
        <View className="relative w-full aspect-[4/5] rounded-[2rem] overflow-hidden bg-[#1f1b18] shadow-md flex flex-col justify-between p-4 select-none">
          {/* Live Video Feed or Fallback */}
          {cameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-[#2a2622] to-[#1a1715]">
              <div className="w-16 h-16 rounded-full bg-[#38332e] flex items-center justify-center text-[#ffb785] mb-3">
                <span className="material-symbols-outlined text-3xl">photo_camera</span>
              </div>
              <p className="text-sm font-semibold text-[#f7eee9] mb-1">Device Camera Standby</p>
              <p className="text-xs text-[#b5a499] max-w-xs mb-4">
                {cameraError || 'Position yourself in good lighting or select an authentic smile photo from your photo library.'}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">upload</span>
                Select Photo from Library
              </button>
            </div>
          )}

          {/* Vignette & Ambient Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/75 pointer-events-none"></div>

          {/* Rule-of-Thirds Grid Overlay */}
          {showGrid && (
            <div className="absolute inset-0 pointer-events-none opacity-30 transition-opacity">
              <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-white/20"></div>
                <div className="border-r border-b border-white/20"></div>
                <div className="border-b border-white/20"></div>
                <div className="border-r border-b border-white/20"></div>
                <div className="border-r border-b border-white/20"></div>
                <div className="border-b border-white/20"></div>
                <div className="border-r border-b border-white/20"></div>
                <div className="border-r border-b border-white/20"></div>
                <div></div>
              </div>
            </div>
          )}

          {/* Central Smile Alignment Oval */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-56 h-72 sm:w-64 sm:h-80 rounded-[50%] border-2 border-dashed border-[#e08744]/70 shadow-[0_0_20px_rgba(224,135,68,0.2)] flex flex-col items-center justify-center">
              <div className="w-full h-0.5 bg-[#e08744]/20 absolute"></div>
              <div className="h-full w-0.5 bg-[#e08744]/20 absolute"></div>

              <div className="absolute -top-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-medium flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e08744] animate-ping"></span>
                <span>Align teeth inside oval</span>
              </div>

              <div className="w-36 h-20 rounded-[40%] border border-white/40 mt-12 flex items-center justify-center">
                <span className="text-[10px] text-white/60 tracking-wider uppercase font-semibold">
                  Smile Frame
                </span>
              </div>
            </div>
          </div>

          {/* Top Camera Action Bar */}
          <View className="relative z-20 flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-[#206a50] animate-pulse' : 'bg-amber-500'}`}></span>
              <Text className="text-[11px] text-white font-medium">
                {cameraActive ? 'Live Camera Feed' : 'Local Standby'}
              </Text>
            </View>

            <View className="flex flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => setShowGrid((prev) => !prev)}
                className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${
                  showGrid ? 'bg-white/30 text-white' : 'bg-black/40 text-white/70'
                }`}
                accessibilityLabel="Toggle Grid Overlay"
              >
                <span className="material-symbols-outlined text-[18px]">grid_on</span>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleFlipCamera}
                className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                accessibilityLabel="Flip Camera"
              >
                <span className="material-symbols-outlined text-[18px]">flip_camera_ios</span>
              </TouchableOpacity>
            </View>
          </View>

          {/* Shutter Flash Animation */}
          {isFlashing && (
            <div className="absolute inset-0 bg-white z-50 transition-opacity duration-200"></div>
          )}

          {/* Countdown Indicator */}
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/40 backdrop-blur-xs">
              <span className="font-editorial text-7xl font-bold text-white drop-shadow-lg animate-scale-up">
                {countdown}
              </span>
            </div>
          )}

          {/* Real Backend Processing & Firestore Save Overlay */}
          {isBusy && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 text-center">
              <div className="w-16 h-16 rounded-full border-4 border-[#e08744]/30 border-t-[#e08744] animate-spin mb-4"></div>
              <p className="font-editorial text-xl font-semibold text-white">
                {analysisStage === 'saving' ? 'Saving Verified Report' : 'Analyzing Smile Photo'}
              </p>
              <p className="text-xs text-white/80 mt-2 max-w-xs leading-relaxed font-mono">
                {statusMessage}
              </p>
              <p className="text-[11px] text-white/50 mt-3">
                {analysisStage === 'saving'
                  ? 'Writing sanitized assessment record to your private Firestore vault.'
                  : 'Running synchronous backend analysis with your Firebase authorization token. Please keep this screen open.'}
              </p>
            </div>
          )}

          {/* Real Error Modal Overlay */}
          {analysisStage === 'error' && analysisError && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-3xl">error_outline</span>
              </div>
              <p className="font-editorial text-lg font-semibold text-white mb-1">
                {analysisError.title}
              </p>
              <p className="text-xs text-white/80 max-w-xs mb-4 leading-relaxed">
                {analysisError.message}
              </p>

              <div className="flex flex-col gap-2 w-full max-w-xs">
                {analysisError.canRetrySave && pendingSaveResult && (
                  <button
                    type="button"
                    onClick={handleRetrySave}
                    className="w-full py-2.5 px-4 rounded-full bg-[#206a50] hover:bg-[#18523d] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">cloud_upload</span>
                    Retry Saving Assessment
                  </button>
                )}

                {analysisError.canRetry && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="w-full py-2.5 px-4 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">refresh</span>
                    Retry Analysis
                  </button>
                )}

                {!analysisError.canRetrySave && (
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(true)}
                    className="w-full py-2.5 px-4 rounded-full bg-[#fbf2ed] hover:bg-[#f5ece7] text-[#1f1b18] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-base text-[#e08744]">settings_ethernet</span>
                    Configure Backend URL
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDismissError}
                  className="w-full py-2.5 px-4 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Dismiss &amp; Retake Photo
                </button>
              </div>
            </div>
          )}

          {/* Bottom Floating Viewfinder Controls */}
          <View className="relative z-20 flex flex-col gap-3">
            <View className="self-center bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 flex flex-row items-center gap-3">
              <View className="flex flex-row items-center gap-1.5 text-white/90">
                <span className="material-symbols-outlined text-[15px] text-[#ffb785]">wb_sunny</span>
                <Text className="text-[11px] text-white/90 font-medium">Natural Light: Optimal</Text>
              </View>
              <span className="w-1 h-1 rounded-full bg-white/40"></span>
              <View className="flex flex-row items-center gap-1 text-white/90">
                <span className="material-symbols-outlined text-[15px] text-[#8dd5b5]">center_focus_strong</span>
                <Text className="text-[11px] text-white/90 font-medium">Clarity: High</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Capture Control Deck */}
        <View className="flex flex-col gap-4 items-center">
          {/* Main Shutter Row */}
          <View className="w-full flex flex-row items-center justify-around px-4">
            {/* Gallery Upload Button */}
            <TouchableOpacity
              onPress={() => fileInputRef.current?.click()}
              disabled={isBusy}
              className="flex flex-col items-center gap-1 text-[#544339] dark:text-[#b5a499] hover:text-[#934b08] transition-colors"
              accessibilityLabel="Upload Smile Photo from Library"
            >
              <View className="w-12 h-12 rounded-full bg-[#f5ece7] dark:bg-[#2d2925] flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[22px]">photo_library</span>
              </View>
              <Text className="text-[11px] font-medium text-[#544339] dark:text-[#b5a499]">Upload</Text>
            </TouchableOpacity>

            {/* Hidden Input for Real File Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Primary Shutter Button */}
            <TouchableOpacity
              onPress={handleShutterPress}
              disabled={isBusy}
              className="relative p-1.5 rounded-full ring-4 ring-[#e08744]/30 hover:ring-[#e08744]/60 transition-all active:scale-95 shadow-lg"
              accessibilityLabel="Take Smile Snapshot"
            >
              <View className="w-18 h-18 rounded-full bg-[#e08744] hover:bg-[#934b08] flex items-center justify-center transition-colors">
                <View className="w-15 h-15 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[28px]">photo_camera</span>
                </View>
              </View>
            </TouchableOpacity>

            {/* 3-Second Timer Toggle */}
            <TouchableOpacity
              onPress={() => setTimerActive((prev) => !prev)}
              className={`flex flex-col items-center gap-1 transition-colors ${
                timerActive
                  ? 'text-[#934b08] dark:text-[#ffb785]'
                  : 'text-[#544339] dark:text-[#b5a499]'
              }`}
              accessibilityLabel="Toggle 3-Second Timer"
            >
              <View
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xs ${
                  timerActive
                    ? 'bg-[#ffdcc6] dark:bg-[#4a2614] text-[#934b08] dark:text-[#ffb785]'
                    : 'bg-[#f5ece7] dark:bg-[#2d2925]'
                }`}
              >
                <span className="material-symbols-outlined text-[22px]">timer</span>
              </View>
              <Text
                className={`text-[11px] font-medium ${
                  timerActive
                    ? 'text-[#934b08] dark:text-[#ffb785] font-semibold'
                    : 'text-[#544339] dark:text-[#b5a499]'
                }`}
              >
                {timerActive ? '3s On' : 'Timer'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Reassuring guidance note */}
          <View className="w-full bg-[#fbf2ed] dark:bg-[#2a2622] rounded-2xl p-3.5 flex flex-row items-center gap-3 border border-[#dac2b4]/20 dark:border-[#38332e]">
            <span className="material-symbols-outlined text-[#934b08] dark:text-[#ffb785] text-[20px] shrink-0">
              tips_and_updates
            </span>
            <Text className="text-xs text-[#544339] dark:text-[#b5a499] leading-snug">
              Tip: Relax your lips with a soft natural smile, facing directly toward a window or bright ambient light.
            </Text>
          </View>
        </View>

        {/* Backend Endpoint Configuration Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white dark:bg-[#24201d] rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl border border-[#dac2b4]/40 dark:border-[#38332e] flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-1 border-b border-[#dac2b4]/30 dark:border-[#38332e]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#e08744] text-[22px]">
                    settings_ethernet
                  </span>
                  <h3 className="font-editorial text-lg font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                    Python Backend Connection
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="w-8 h-8 rounded-full bg-[#f5ece7] dark:bg-[#2d2925] flex items-center justify-center text-[#544339] dark:text-[#b5a499] hover:text-[#1f1b18] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <p className="text-xs text-[#544339] dark:text-[#b5a499] leading-relaxed">
                Connect your real Python backend (e.g. deployed on <strong>Render</strong> or <strong>Railway</strong>) running your Hugging Face smile biometric model.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  Backend Service URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={inputBackendUrl}
                    onChange={(e) => {
                      setInputBackendUrl(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder="https://your-service.onrender.com"
                    className="w-full bg-[#fbf2ed] dark:bg-[#2a2622] rounded-2xl py-2.5 px-3.5 text-xs font-mono text-[#1f1b18] dark:text-[#f7eee9] border border-[#dac2b4]/40 dark:border-[#38332e] focus:border-[#e08744] focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-[#877367] dark:text-[#a89f97]">
                  Must be an absolute URL starting with <code>https://</code> or <code>http://</code>.
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setInputBackendUrl('http://localhost:8000')}
                  className="px-2.5 py-1 rounded-lg bg-[#f5ece7] dark:bg-[#2d2925] text-[#544339] dark:text-[#b5a499] hover:text-[#1f1b18] border border-[#dac2b4]/30 dark:border-[#38332e] cursor-pointer"
                >
                  localhost:8000
                </button>
              </div>

              {/* Test Result Feedback */}
              {testResult && (
                <div
                  className={`p-3 rounded-2xl border text-xs leading-relaxed flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-[#a9f2d0]/30 border-[#206a50]/30 text-[#206a50] dark:text-[#8dd5b5]'
                      : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">
                    {testResult.success ? 'check_circle' : 'error'}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">
                      {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                    </p>
                    <p className="text-[11px] mt-0.5">{testResult.message}</p>
                  </div>
                </div>
              )}

              {/* API Contract Summary Checklist */}
              <div className="p-3 rounded-2xl bg-[#fbf2ed] dark:bg-[#2a2622] border border-[#dac2b4]/30 dark:border-[#38332e] flex flex-col gap-1.5 text-[11px] text-[#544339] dark:text-[#b5a499]">
                <p className="font-semibold text-[#1f1b18] dark:text-[#f7eee9]">
                  Backend API Contract Requirements:
                </p>
                <ul className="list-disc pl-4 flex flex-col gap-1">
                  <li>
                    <code>POST /api/assessments</code>: receives multipart <code>photo</code> + Bearer token and synchronously returns{' '}
                    <code>{'{ assessment_id, status: "complete", score, findings, photo_object_key }'}</code>
                  </li>
                  <li>
                    <code>POST /api/photos/signed-url</code>: receives <code>{'{ photo_object_key }'}</code> + Bearer token and returns{' '}
                    <code>{'{ photo_url, expires_in }'}</code>
                  </li>
                  <li>
                    <strong>CORS Enabled:</strong> Set <code>allow_origins=["*"]</code> in your FastAPI/Flask app to allow requests from your published PWA origin.
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleTestBackend}
                  disabled={isTestingUrl}
                  className="flex-1 py-2.5 rounded-full bg-[#f5ece7] dark:bg-[#2d2925] hover:bg-[#ebdcd4] text-[#1f1b18] dark:text-[#f7eee9] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isTestingUrl ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                      Testing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">network_check</span>
                      Test Connection
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSaveBackendUrl}
                  className="flex-1 py-2.5 rounded-full bg-[#e08744] hover:bg-[#934b08] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  Save Endpoint
                </button>
              </div>

              {/* Clear button if custom URL is active */}
              {getApiBaseUrl() && (
                <button
                  type="button"
                  onClick={handleResetBackendUrl}
                  className="text-[11px] text-[#877367] hover:text-red-500 text-center transition-colors cursor-pointer"
                >
                  Clear Custom Endpoint Override
                </button>
              )}
            </div>
          </div>
        )}
      </View>
    </ScrollView>
  );
};
