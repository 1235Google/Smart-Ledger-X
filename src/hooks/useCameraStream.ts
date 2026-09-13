import { useState, useEffect, useRef, useCallback } from 'react';

export type CameraErrorType =
  | 'INSECURE_CONTEXT'
  | 'BROWSER_NOT_SUPPORTED'
  | 'NO_CAMERA_DETECTED'
  | 'PERMISSION_DENIED'
  | 'CAMERA_BUSY'
  | 'CAMERA_NOT_FOUND'
  | 'OVERCONSTRAINED'
  | 'ABORTED'
  | 'SECURITY_ERROR'
  | 'UNKNOWN';

export interface CameraErrorDetails {
  type: CameraErrorType;
  message: string;
  instructions?: string;
  originalError?: any;
}

export interface MediaDeviceInfoItem {
  deviceId: string;
  label: string;
  isVirtual: boolean;
}

interface UseCameraStreamOptions {
  onStreamReady?: (stream: MediaStream) => void;
  onError?: (error: CameraErrorDetails) => void;
}

export function useCameraStream({
  onStreamReady,
  onError,
}: UseCameraStreamOptions = {}) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingStatusText, setLoadingStatusText] = useState<string>('Opening camera...');
  const [error, setError] = useState<CameraErrorDetails | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfoItem[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    try {
      return localStorage.getItem('selectedCameraId') || '';
    } catch {
      return '';
    }
  });

  const streamRef = useRef<MediaStream | null>(null);
  const loadingTimerRef = useRef<any>(null);

  // Helper to detect browser and OS
  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    let browser = 'Unknown';
    if (/chrome|crios|crmo/i.test(ua)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/edg/i.test(ua)) browser = 'Edge';

    const isMobile = /android|iphone|ipad|ipod/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    return { browser, isMobile, isIOS };
  };

  const getPermissionInstructions = (browser: string, isIOS: boolean): string => {
    if (isIOS) {
      return 'On iOS Safari: Go to Settings > Safari > Camera, and ensure "Allow" or "Ask" is selected for this website. Then refresh.';
    }
    switch (browser) {
      case 'Chrome':
        return 'Click the camera/lock icon in your address bar, select "Site Settings", and change Camera permission to "Allow".';
      case 'Firefox':
        return 'Click the permission icon next to the address bar, remove any blocked permission overrides, and reload.';
      case 'Safari':
        return 'Open Safari Settings > Websites > Camera, locate this site, and set permission to "Allow".';
      case 'Edge':
        return 'Click the lock/settings icon in the address bar > "Permissions for this site" > set Camera to "Allow".';
      default:
        return 'Please check your browser settings and ensure camera access is granted for this site.';
    }
  };

  // Stop stream tracks
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn('Error stopping track:', e);
        }
      });
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  // Enumerate video devices and smart-select best non-virtual camera
  const enumerateAndSelectDevices = useCallback(async (): Promise<MediaDeviceInfoItem[]> => {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');

      const mapped: MediaDeviceInfoItem[] = videoInputs.map((d, index) => {
        const label = d.label || `Camera ${index + 1}`;
        const lowerLabel = label.toLowerCase();
        const isVirtual = /obs|virtual|snap|manycam|droidcam|iriun|epoccam/i.test(lowerLabel);
        return {
          deviceId: d.deviceId,
          label,
          isVirtual,
        };
      });

      setDevices(mapped);

      // Determine default selected device if none or invalid
      if (mapped.length > 0) {
        const currentStored = localStorage.getItem('selectedCameraId');
        const exists = mapped.some((m) => m.deviceId === currentStored);
        if (exists && currentStored) {
          setSelectedDeviceId(currentStored);
        } else {
          // Find first non-virtual camera if available, else first camera
          const preferred = mapped.find((m) => !m.isVirtual) || mapped[0];
          setSelectedDeviceId(preferred.deviceId);
          try {
            localStorage.setItem('selectedCameraId', preferred.deviceId);
          } catch {}
        }
      }

      return mapped;
    } catch (e) {
      console.warn('[useCameraStream] Error enumerating devices:', e);
      return [];
    }
  }, []);

  // Select a specific device ID
  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
    try {
      localStorage.setItem('selectedCameraId', deviceId);
    } catch {}
  }, []);

  // Main camera request function with pre-flight checks, timeout, fallback chain & retries
  const startCamera = useCallback(async (overrideDeviceId?: string) => {
    setIsLoading(true);
    setLoadingStatusText('Opening camera...');
    setError(null);
    stopStream();

    // Diagnostic logging for production environment checks
    console.log('Secure context:', window.isSecureContext);
    console.log('Protocol:', window.location.protocol);
    console.log('In iframe:', window.self !== window.top);
    console.log('mediaDevices exists:', !!navigator.mediaDevices);
    navigator.permissions?.query({ name: 'camera' as PermissionName })
      .then(r => console.log('Permission state:', r.state))
      .catch(e => console.log('Permission query failed:', e));

    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
    // Update loading text after 2 seconds for slow USB webcams
    loadingTimerRef.current = setTimeout(() => {
      setLoadingStatusText('Initializing camera... this may take a few seconds');
    }, 2000);

    const { browser, isIOS } = getBrowserInfo();

    // 1. PRE-FLIGHT CHECK: Secure Context
    if (window.isSecureContext === false) {
      clearTimeout(loadingTimerRef.current);
      const errDetails: CameraErrorDetails = {
        type: 'INSECURE_CONTEXT',
        message: 'Camera access blocked due to an insecure connection (HTTP). Please use HTTPS.',
        instructions: 'Biometric security features require a secure context (HTTPS or localhost).',
      };
      setError(errDetails);
      setIsLoading(false);
      onError?.(errDetails);
      console.error('[CameraStream] Pre-flight failed: Insecure context', window.location.href);
      return null;
    }

    // 2. PRE-FLIGHT CHECK: MediaDevices API existence
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      clearTimeout(loadingTimerRef.current);
      const errDetails: CameraErrorDetails = {
        type: 'BROWSER_NOT_SUPPORTED',
        message: 'Browser Not Supported: MediaDevices API is not available in this browser.',
        instructions: 'Please use a modern browser such as Google Chrome, Mozilla Firefox, Apple Safari, or Microsoft Edge.',
      };
      setError(errDetails);
      setIsLoading(false);
      onError?.(errDetails);
      console.error('[CameraStream] Pre-flight failed: mediaDevices not found');
      return null;
    }

    // 3. ENUMERATE DEVICES PRE-FLIGHT
    const videoDevices = await enumerateAndSelectDevices();
    if (videoDevices.length === 0) {
      clearTimeout(loadingTimerRef.current);
      const errDetails: CameraErrorDetails = {
        type: 'NO_CAMERA_DETECTED',
        message: 'No camera detected. Please connect a webcam and click Retry.',
        instructions: 'Check your USB webcam connection or ensure your laptop camera driver is enabled.',
      };
      setError(errDetails);
      setIsLoading(false);
      onError?.(errDetails);
      console.warn('[CameraStream] Pre-flight warning: 0 video input devices found');
      return null;
    }

    const targetDeviceId = overrideDeviceId || selectedDeviceId || videoDevices[0]?.deviceId;

    // Construct fallback constraint chain
    const constraintChain: MediaStreamConstraints[] = [];
    if (targetDeviceId) {
      constraintChain.push({
        video: { deviceId: { exact: targetDeviceId }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      constraintChain.push({
        video: { deviceId: { ideal: targetDeviceId } },
        audio: false,
      });
    }
    constraintChain.push({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false,
    });
    constraintChain.push({
      video: true,
      audio: false,
    });

    let acquiredStream: MediaStream | null = null;
    let lastErr: any = null;
    let attempts = 0;
    const maxAttempts = 3;

    // Transient busy retry loop (NotReadableError / TrackStartError) with exponential backoff (1s, 2s, 4s)
    while (attempts < maxAttempts && !acquiredStream) {
      attempts++;

      for (const constraints of constraintChain) {
        try {
          const getUserMediaPromise = navigator.mediaDevices.getUserMedia(constraints);
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Camera request timed out after 10 seconds.')), 10000)
          );

          acquiredStream = await Promise.race([getUserMediaPromise, timeoutPromise]);
          if (acquiredStream) break;
        } catch (err: any) {
          lastErr = err;
          console.warn(`[CameraStream] Constraint attempt failed (${err.name}):`, err.message);

          // If OverconstrainedError, try next in chain
          if (err.name === 'OverconstrainedError') {
            continue;
          }

          // If NotReadableError / TrackStartError, break to outer while for backoff retry
          if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            break;
          }

          // For permission denied or not found, break immediately without unnecessary retries
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'NotFoundError') {
            break;
          }
        }
      }

      if (!acquiredStream && lastErr) {
        if ((lastErr.name === 'NotReadableError' || lastErr.name === 'TrackStartError') && attempts < maxAttempts) {
          const backoffMs = Math.pow(2, attempts - 1) * 1000; // 1s, 2s
          console.warn(`[CameraStream] Camera busy (NotReadableError). Retrying in ${backoffMs}ms (Attempt ${attempts}/${maxAttempts})...`);
          await new Promise((res) => setTimeout(res, backoffMs));
          continue;
        }
      }
      break;
    }

    clearTimeout(loadingTimerRef.current);
    setIsLoading(false);

    if (!acquiredStream) {
      const errName = lastErr?.name || 'UnknownError';
      const errMsg = lastErr?.message || 'Unable to access camera.';

      // Detailed logging for analytics / monitoring
      console.error('[CameraStream] Fatal Camera Error:', {
        name: errName,
        message: errMsg,
        userAgent: navigator.userAgent,
        deviceCount: videoDevices.length,
        selectedDeviceId: targetDeviceId,
      });

      let type: CameraErrorType = 'UNKNOWN';
      let message = errMsg;
      let instructions = 'Please verify camera permissions and hardware.';

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        type = 'PERMISSION_DENIED';
        message = "Camera permission denied. Click the camera icon in your browser's address bar and allow access, then retry.";
        instructions = getPermissionInstructions(browser, isIOS);
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        type = 'CAMERA_NOT_FOUND';
        message = 'No camera detected. Please connect a webcam and click Retry.';
        instructions = 'Check your USB connection or ensure your webcam is securely plugged in.';
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        type = 'CAMERA_BUSY';
        message = 'Your camera is busy or blocked. Please close other apps using it (Zoom, Teams, OBS, Skype) and click Retry.';
        instructions = 'Windows: Settings → Privacy & Security → Camera → enable "Let desktop apps access your camera".';
      } else if (errName === 'OverconstrainedError') {
        type = 'OVERCONSTRAINED';
        message = 'Camera does not support requested resolution.';
        instructions = 'Try switching cameras using the dropdown above.';
      } else if (errName === 'AbortError') {
        type = 'ABORTED';
        message = 'Camera access was interrupted. Please click Retry.';
        instructions = 'Retry connecting to your camera.';
      } else if (errName === 'SecurityError') {
        type = 'SECURITY_ERROR';
        message = 'Camera blocked due to an insecure connection (HTTP). Please use HTTPS.';
        instructions = 'Switch to HTTPS or localhost.';
      }

      const finalError: CameraErrorDetails = { type, message, instructions, originalError: lastErr };
      setError(finalError);
      onError?.(finalError);
      return null;
    }

    // Success
    streamRef.current = acquiredStream;
    setStream(acquiredStream);
    setError(null);
    onStreamReady?.(acquiredStream);
    return acquiredStream;
  }, [selectedDeviceId, enumerateAndSelectDevices, onStreamReady, onError, stopStream]);

  // Retry wrapper
  const retry = useCallback(() => {
    return startCamera();
  }, [startCamera]);

  // Listen to device changes mid-session (plug/unplug USB webcam)
  useEffect(() => {
    const handleDeviceChange = () => {
      console.log('[CameraStream] Hardware device change detected. Re-enumerating...');
      enumerateAndSelectDevices();
    };

    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }
    return () => {
      if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
      stopStream();
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, [enumerateAndSelectDevices, stopStream]);

  return {
    stream,
    error,
    isLoading,
    loadingStatusText,
    devices,
    selectedDeviceId,
    selectDevice,
    retry,
    stop: stopStream,
    startCamera,
    enumerateAndSelectDevices,
  };
}
