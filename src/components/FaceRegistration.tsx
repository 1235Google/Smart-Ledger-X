/**
 * FaceRegistration Component - Optimized for Accuracy & Robust Enrollment
 * 
 * KEY ACCURACY & PERFORMANCE OPTIMIZATIONS IMPLEMENTED:
 * -------------------------------------------------------------
 * 1. HIGH-ACCURACY DETECTOR (SSD MobileNet v1):
 *    - Uses faceapi.SsdMobilenetv1Options() instead of TinyFaceDetector for enrollment,
 *      ensuring maximum feature extraction fidelity since registration is a one-time operation.
 *    - Loads faceapi.nets.ssdMobilenetv1 alongside landmarks and recognition nets.
 * 
 * 2. 6-ANGLE MULTI-POSE ENROLLMENT:
 *    - Expands capture samples from 3 to 6 distinct facial angles:
 *      (1) "Look straight", (2) "Turn slightly left", (3) "Turn slightly right",
 *      (4) "Tilt up slightly", (5) "Tilt down slightly", (6) "Move closer".
 *    - Provides real-time visual prompts and step-by-step progress tracking.
 * 
 * 3. STRICT CONFIDENCE VALIDATION (Score >= 0.7):
 *    - Validates detection confidence (detection.detection.score) before accepting each sample.
 *    - Rejects frames with score < 0.7 and prompts: "Face not clear, please retry this angle."
 * 
 * 4. ELEMENT-WISE MEAN NORMALIZATION:
 *    - Computes the element-wise arithmetic average of all 6 128-dimensional vectors
 *      into a single robust reference descriptor before saving to localStorage and Firestore.
 * 
 * 5. MOBILE & RESOURCE OPTIMIZATION:
 *    - Video element configured with playsInline, muted, and autoPlay to prevent mobile stalls.
 *    - Video constraints set to 320x240 for optimal tensor memory footprint.
 *    - Real-time Dev Latency/FPS indicator to verify speed and hardware performance.
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, CheckCircle2, AlertTriangle, RefreshCw, X, Sparkles, Zap, Eye, Loader2 } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { auth, db } from '../lib/firebase';
import confetti from 'canvas-confetti';
import { useCameraStream } from '../hooks/useCameraStream';

interface FaceRegistrationProps {
  onComplete?: () => void;
  onCancel?: () => void;
  isOpen?: boolean;
}

// 6 Discrete Pose Steps for High-Accuracy Registration
export type PoseStep = 0 | 1 | 2 | 3 | 4 | 5;

export interface PoseInstruction {
  step: number;
  title: string;
  desc: string;
  icon: string;
}

export const POSE_INSTRUCTIONS: PoseInstruction[] = [
  { step: 1, title: "Look straight", desc: "Look directly into the camera", icon: "👤" },
  { step: 2, title: "Turn slightly left", desc: "Tilt your head slightly to your left", icon: "👈" },
  { step: 3, title: "Turn slightly right", desc: "Tilt your head slightly to your right", icon: "👉" },
  { step: 4, title: "Tilt up slightly", desc: "Tilt your chin upwards slightly", icon: "👆" },
  { step: 5, title: "Tilt down slightly", desc: "Tilt your chin downwards slightly", icon: "👇" },
  { step: 6, title: "Move closer", desc: "Bring your face slightly closer to the frame", icon: "🔍" },
];

export default function FaceRegistration({ onComplete, onCancel, isOpen = true }: FaceRegistrationProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Model loading & error states
  const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Camera & Face capture states
  const [cameraActive, setCameraActive] = useState(false);
  const [currentStep, setCurrentStep] = useState<PoseStep>(0);
  const [capturedDescriptors, setCapturedDescriptors] = useState<Float32Array[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("Position your face in the circular frame");
  const [isComplete, setIsComplete] = useState(false);
  const [stepFlash, setStepFlash] = useState(false);

  // Performance & Accuracy monitoring states
  const [detectionLatency, setDetectionLatency] = useState<number | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [showDevMetrics, setShowDevMetrics] = useState(true);

  // Use robust useCameraStream hook
  const {
    stream: cameraStream,
    isLoading: isCameraLoading,
    error: cameraErrorDetails,
    startCamera,
    stopStream: stopCamera,
  } = useCameraStream({
    constraints: {
      video: {
        facingMode: "user",
        width: { ideal: 320 },
        height: { ideal: 240 },
      },
      audio: false,
    },
    onStreamReady: (stream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.warn("Video play interrupted:", e));
          setCameraActive(true);
          setStatusMessage(`Pose 1/6: ${POSE_INSTRUCTIONS[0].title}`);
        };
      }
    },
  });

  /**
   * OPTIMIZATION 1: Load SSD MobileNet V1 for Maximum Registration Precision
   * Pre-verifies manifest reachability and sets a 15-second timeout.
   */
  async function loadModelsWithTimeout() {
    setIsLoadingModels(true);
    setLoadError(null);

    console.log("Attempting to load high-accuracy registration models from:", window.location.origin + "/models");

    const loadModels = async () => {
      const MODEL_URL = '/models';

      // Pre-flight check: Verify SSD MobileNet V1 manifest is reachable
      const testFetch = await fetch(`${MODEL_URL}/ssd_mobilenetv1_model-weights_manifest.json`);
      console.log("SSD MobileNet manifest fetch status:", testFetch.status);
      if (!testFetch.ok) {
        throw new Error(`SSD MobileNet manifest not reachable, status: ${testFetch.status}`);
      }

      // Load SSD MobileNet v1 for high accuracy face capture during registration
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      console.log("SSD MobileNet V1 model loaded successfully");

      // Load 68-point landmarks and 128-d recognition neural networks
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      console.log("Face landmark model loaded successfully");

      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      console.log("Face recognition model loaded successfully");

      setModelsLoaded(true);
    };

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Model loading timed out after 15 seconds")), 15000)
    );

    try {
      await Promise.race([loadModels(), timeout]);
      setIsLoadingModels(false);
      startCamera();
    } catch (error: any) {
      console.error("Registration model loading failed with error:", error);
      setLoadError(error.message || "Failed to load SSD MobileNet detection models");
      setIsLoadingModels(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadModelsWithTimeout();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  /**
   * OPTIMIZATION 1 & 3: SSD MobileNet Detection Loop with Strict Confidence (Score >= 0.7)
   */
  useEffect(() => {
    if (!cameraActive || isComplete || isLoadingModels || loadError || cameraErrorDetails) {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      return;
    }

    // High accuracy SSD MobileNet options (minConfidence: 0.5)
    const ssdOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
      if (isDetecting) return;

      setIsDetecting(true);
      const startTime = performance.now();

      try {
        // High-accuracy face detection + landmarks + descriptor extraction using SSD MobileNet
        const detection = await faceapi
          .detectSingleFace(videoRef.current, ssdOptions)
          .withFaceLandmarks()
          .withFaceDescriptor();

        const latency = Math.round(performance.now() - startTime);
        setDetectionLatency(latency);

        if (detection) {
          const score = detection.detection.score;
          setConfidenceScore(Math.round(score * 100));

          // STRICT CHECK: Reject frames with confidence below 0.7
          if (score < 0.7) {
            setStatusMessage("Face not clear, please retry this angle.");
            return;
          }

          // Confident detection (score >= 0.7) -> Capture sample!
          handleSampleCaptured(detection.descriptor, score);
        } else {
          setConfidenceScore(null);
          setStatusMessage(`Please adjust: ${POSE_INSTRUCTIONS[currentStep].title}`);
        }
      } catch (err) {
        console.warn("SSD MobileNet detection error:", err);
      } finally {
        setIsDetecting(false);
      }
    }, 450);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    };
  }, [cameraActive, currentStep, capturedDescriptors, isComplete, isLoadingModels, loadError, cameraErrorDetails]);

  /**
   * OPTIMIZATION 2: Capture 6 Angles Progressively
   */
  const handleSampleCaptured = (descriptor: Float32Array, score: number) => {
    // Visual flash confirmation
    setStepFlash(true);
    setTimeout(() => setStepFlash(false), 300);

    const updated = [...capturedDescriptors, descriptor];
    setCapturedDescriptors(updated);

    const nextStep = (currentStep + 1) as PoseStep;
    if (nextStep < 6) {
      setCurrentStep(nextStep);
      setStatusMessage(`Captured (${updated.length}/6) ✅ ${POSE_INSTRUCTIONS[nextStep].title}`);
    } else {
      // All 6 captured successfully!
      finishRegistration(updated);
    }
  };

  /**
   * OPTIMIZATION 4: Element-Wise Mean Reference Descriptor
   * Averages all 6 descriptors element-by-element into a single 128-d reference embedding.
   */
  const finishRegistration = async (descriptors: Float32Array[]) => {
    if (descriptors.length < 6) return;
    setStatusMessage("Registration complete! Averaging all 6 facial angles...");
    setIsComplete(true);
    stopCamera();

    // Compute element-wise arithmetic mean across 6 vectors of 128 dimensions each
    const averaged = new Float32Array(128);
    for (let i = 0; i < 128; i++) {
      let sum = 0;
      for (let s = 0; s < 6; s++) {
        sum += descriptors[s][i];
      }
      averaged[i] = sum / 6;
    }

    const finalDescriptorArray = Array.from(averaged);

    // Save to localStorage for instant client-side biometric validation
    try {
      localStorage.setItem('faceDescriptor', JSON.stringify(finalDescriptorArray));
      localStorage.setItem('faceUnlockEnabled', 'true');
      localStorage.setItem('faceEnrolledAt', new Date().toISOString());
      localStorage.setItem('faceEnrolledModel', 'ssd_mobilenetv1_6angles');
    } catch (storageErr) {
      console.error("LocalStorage write error:", storageErr);
    }

    // Synchronize to Firestore if user session is active
    if (auth?.currentUser?.uid && db) {
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, {
          faceDescriptor: finalDescriptorArray,
          faceUnlockEnabled: true,
          faceEnrolledAt: new Date().toISOString(),
          faceEnrolledModel: 'ssd_mobilenetv1_6angles',
        }, { merge: true });
      } catch (firestoreErr) {
        console.warn("Firestore sync error (non-fatal):", firestoreErr);
      }
    }

    // Celebration confetti
    try {
      confetti({
        particleCount: 75,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#8b5cf6', '#10b981'],
      });
    } catch (_) {}

    setTimeout(() => {
      onComplete?.();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg bg-neutral-900/95 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.85)] flex flex-col items-center text-center overflow-hidden"
      >
        {/* Ambient Glow */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => {
            stopCamera();
            onCancel?.();
          }}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors border border-white/5"
          title="Cancel"
        >
          <X size={18} />
        </button>

        {/* Header Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-3">
          <Sparkles size={13} />
          <span>High-Accuracy Biometric Setup</span>
        </div>

        <h2 className="text-2xl font-bold text-white tracking-tight mb-1">
          Enroll 6 Face Angles
        </h2>
        <p className="text-xs text-slate-400 mb-5 max-w-sm">
          Uses high-precision SSD MobileNet neural matching with 6 distinct angles for maximum unlock accuracy.
        </p>

        {/* Model Loading Error UI */}
        {loadError ? (
          <div className="w-full max-w-sm bg-red-500/10 border border-red-500/25 rounded-3xl p-6 mb-6 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mb-3 shadow-lg">
              <AlertTriangle size={28} />
            </div>
            <p className="text-sm font-semibold text-white mb-1.5">Model Loading Error</p>
            <div className="w-full p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-xs text-red-300 font-mono text-center mb-4 break-words leading-relaxed">
              {loadError}
            </div>
            <div className="flex gap-2 w-full">
              <button
                onClick={loadModelsWithTimeout}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-red-600/30"
              >
                <RefreshCw size={14} /> Retry
              </button>
              <button
                onClick={() => {
                  stopCamera();
                  onCancel?.();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : isLoadingModels ? (
          <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-white/10 bg-black/40 flex flex-col items-center justify-center p-6 mb-6">
            <RefreshCw size={36} className="text-blue-400 animate-spin mb-4" />
            <p className="text-sm font-semibold text-white mb-1">Loading SSD MobileNet...</p>
            <p className="text-[11px] text-slate-400 text-center">
              Fetching high-accuracy neural weights from <code className="text-blue-300 font-mono">/models</code>
            </p>
          </div>
        ) : isCameraLoading ? (
          <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-white/10 bg-black/40 flex flex-col items-center justify-center p-6 mb-6">
            <Loader2 size={36} className="text-blue-400 animate-spin mb-4" />
            <p className="text-sm font-semibold text-white mb-1">Opening Camera...</p>
            <p className="text-[11px] text-slate-400 text-center px-4">
              Running pre-flight checks and requesting camera stream with timeout...
            </p>
          </div>
        ) : cameraErrorDetails ? (
          <div className="w-full max-w-sm bg-red-500/10 border border-red-500/20 rounded-3xl p-6 mb-6 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mb-3">
              <AlertTriangle size={28} />
            </div>
            <p className="text-sm font-semibold text-white mb-1">
              {cameraErrorDetails.type === 'INSECURE_CONTEXT'
                ? 'Insecure Connection'
                : cameraErrorDetails.type === 'BROWSER_NOT_SUPPORTED'
                ? 'Browser Not Supported'
                : cameraErrorDetails.type === 'NO_CAMERA_DETECTED'
                ? 'No Camera Detected'
                : cameraErrorDetails.type === 'PERMISSION_DENIED'
                ? 'Permission Denied'
                : cameraErrorDetails.type === 'CAMERA_BUSY'
                ? 'Camera In Use'
                : 'Camera Error'}
            </p>
            <p className="text-xs text-red-200 font-medium text-center mb-2 leading-relaxed">
              {cameraErrorDetails.message}
            </p>
            {cameraErrorDetails.instructions && (
              <p className="text-[11px] text-red-300/90 text-center mb-4 bg-red-950/40 p-3 rounded-xl border border-red-500/20 leading-relaxed">
                {cameraErrorDetails.instructions}
              </p>
            )}
            <div className="flex gap-2 w-full">
              <button
                onClick={() => startCamera()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={14} /> Retry Camera
              </button>
              <button
                onClick={() => {
                  stopCamera();
                  onCancel?.();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
              >
                Use PIN
              </button>
            </div>
          </div>
        ) : isComplete ? (
          <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-full border-2 border-emerald-500/50 bg-emerald-500/10 flex flex-col items-center justify-center p-6 mb-6 animate-pulse">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
              <CheckCircle2 size={42} />
            </div>
            <p className="text-base font-bold text-white">Enrollment Complete!</p>
            <p className="text-xs text-emerald-300 mt-1">6 Face Angles Averaged</p>
          </div>
        ) : (
          /* Live Camera View with Circular Frame */
          <div className="relative mb-5">
            {/* Pulsing Scan Ring */}
            <div className="absolute -inset-2 rounded-full border-2 border-blue-500/40 animate-pulse pointer-events-none" />

            {/* Step Flash */}
            {stepFlash && (
              <div className="absolute inset-0 rounded-full bg-emerald-500/30 z-20 pointer-events-none transition-opacity duration-300" />
            )}

            {/* Circular Video Container */}
            <div className="w-60 h-60 sm:w-68 sm:h-68 rounded-full overflow-hidden border-4 border-white/15 shadow-[0_0_50px_rgba(59,130,246,0.3)] bg-black relative flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                width={320}
                height={240}
                className="w-full h-full object-cover transform scale-x-[-1]"
              />

              {/* Face Guide Silhouette Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-36 h-48 sm:w-40 sm:h-52 rounded-[50%] border-2 border-dashed border-blue-400/40 opacity-70" />
              </div>

              {/* Scanning Active Bar */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-bounce opacity-70 pointer-events-none" />
            </div>

            {/* Current Angle Instruction Badge */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-neutral-900/95 border border-white/20 text-white text-[11px] font-medium shadow-lg flex items-center gap-1.5 whitespace-nowrap">
              <span>{POSE_INSTRUCTIONS[currentStep].icon}</span>
              <span className="font-semibold">{POSE_INSTRUCTIONS[currentStep].title}</span>
            </div>
          </div>
        )}

        {/* 6 Step Progress Indicators */}
        <div className="flex items-center gap-1.5 mb-3">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const isDone = capturedDescriptors.length > idx;
            const isCurrent = currentStep === idx && !isComplete;
            return (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  isDone
                    ? 'w-7 bg-emerald-400'
                    : isCurrent
                    ? 'w-9 bg-blue-500 animate-pulse'
                    : 'w-6 bg-white/10'
                }`}
                title={`Step ${idx + 1}: ${POSE_INSTRUCTIONS[idx].title}`}
              />
            );
          })}
        </div>

        {/* Step Count & Description */}
        <div className="text-[11px] text-slate-400 mb-1">
          Angle <span className="text-white font-semibold">{Math.min(currentStep + 1, 6)}</span> of 6 &bull; {POSE_INSTRUCTIONS[currentStep]?.desc}
        </div>

        {/* Status Message */}
        <p className={`text-xs font-medium mb-3 min-h-[20px] transition-colors ${
          statusMessage.includes('not clear') ? 'text-amber-400 font-semibold' : 'text-slate-300'
        }`}>
          {statusMessage}
        </p>

        {/* Dev-Friendly Performance & Confidence Indicator */}
        {showDevMetrics && cameraActive && !isComplete && (
          <div className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-slate-400">
            <Zap size={11} className="text-amber-400" />
            <span>SSD Latency: {detectionLatency !== null ? `${detectionLatency}ms` : 'Measuring...'}</span>
            {confidenceScore !== null && (
              <>
                <span className="text-white/20">&bull;</span>
                <span className={confidenceScore >= 70 ? "text-emerald-400" : "text-amber-400"}>
                  Confidence: {confidenceScore}% (min 70%)
                </span>
              </>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="w-full flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onCancel?.();
            }}
            className="flex-1 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-xs border border-white/10 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              setCapturedDescriptors([]);
              setCurrentStep(0);
              setStatusMessage(`Look straight at the camera`);
            }}
            disabled={capturedDescriptors.length === 0 || isComplete}
            className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-slate-400 hover:text-white font-medium text-xs border border-white/10 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={13} />
            <span>Reset Angles</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
