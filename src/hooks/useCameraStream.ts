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
  | 'UNKNOWN';

export interface CameraErrorDetails {
  type: CameraErrorType;
  message: string;
  instructions?: string;
  originalError?: any;
}

interface UseCameraStreamOptions {
  constraints?: MediaStreamConstraints;
  onStreamReady?: (stream: MediaStream) => void;
  onError?: (error: CameraErrorDetails) => void;
}

export function useCameraStream({
  constraints = {
    video: {
      facingMode: 'user',
      width: { ideal: 640 },
      height: { ideal: 480 },
    },
    audio: false,
  },
  onStreamReady,
  onError,
}: UseCameraStreamOptions = {}) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<CameraErrorDetails | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | 'unknown'>('unknown');

  const streamRef = useRef<MediaStream | null>(null);

  // Helper to detect browser and OS for targeted permission instructions
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

  // Pre-flight permission query
  const checkPermissions = useCallback(async () => {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermissionState(result.state);
        result.onchange = () => {
          setPermissionState(result.state);
        };
      } catch (e) {
        // Some browsers don't support querying 'camera' directly
        setPermissionState('unknown');
      }
    }
  }, []);

  // Execute getUserMedia with 10s Timeout & Transient Retry (max 3 attempts)
  const startCamera = useCallback(async (customConstraints?: MediaStreamConstraints) => {
    setIsLoading(true);
    setError(null);
    stopStream();

    const activeConstraints = customConstraints || constraints;
    const { browser, isIOS } = getBrowserInfo();

    // 1. PRE-FLIGHT CHECK: Secure Context
    if (window.isSecureContext === false) {
      const errDetails: CameraErrorDetails = {
        type: 'INSECURE_CONTEXT',
        message: 'Insecure Connection: Camera access requires a secure context (HTTPS or localhost).',
        instructions: 'Please access this application via HTTPS or localhost to enable biometric features.',
      };
      setError(errDetails);
      setIsLoading(false);
      onError?.(errDetails);
      console.error('[CameraStream] Pre-flight failed: Insecure context', window.location.href);
      return null;
    }

    // 2. PRE-FLIGHT CHECK: MediaDevices API existence
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
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

    // 3. PRE-FLIGHT CHECK: Videoinput device enumeration
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      if (videoDevices.length === 0) {
        const errDetails: CameraErrorDetails = {
          type: 'NO_CAMERA_DETECTED',
          message: 'No Camera Detected: No video input devices were found on this device.',
          instructions: 'Please verify your webcam is connected or enable camera access.',
        };
        setError(errDetails);
        setIsLoading(false);
        onError?.(errDetails);
        console.warn('[CameraStream] Pre-flight warning: No videoinput devices enumerated');
      }
    } catch (enumErr) {
      console.warn('[CameraStream] Device enumeration error:', enumErr);
    }

    // Check pre-flight permission state if already denied
    if (permissionState === 'denied') {
      const errDetails: CameraErrorDetails = {
        type: 'PERMISSION_DENIED',
        message: 'Camera Permission Denied.',
        instructions: getPermissionInstructions(browser, isIOS),
      };
      setError(errDetails);
      setIsLoading(false);
      onError?.(errDetails);
      return null;
    }

    // getUserMedia with 10s Timeout & Transient Retry (max 3 attempts)
    let attempts = 0;
    const maxAttempts = 3;
    let acquiredStream: MediaStream | null = null;
    let lastErr: any = null;

    while (attempts < maxAttempts && !acquiredStream) {
      attempts++;
      try {
        const getUserMediaPromise = navigator.mediaDevices.getUserMedia(activeConstraints);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Camera request timed out after 10 seconds.')), 10000)
        );

        acquiredStream = await Promise.race([getUserMediaPromise, timeoutPromise]);
      } catch (err: any) {
        lastErr = err;
        console.warn(`[CameraStream] Attempt ${attempts} failed:`, err.name, err.message);

        // If NotReadableError / TrackStartError (camera busy), retry with backoff
        if ((err.name === 'NotReadableError' || err.name === 'TrackStartError') && attempts < maxAttempts) {
          await new Promise((res) => setTimeout(res, 1000 * attempts));
          continue;
        }

        // If OverconstrainedError, try relaxed fallback once
        if (err.name === 'OverconstrainedError' && attempts === 1) {
          console.warn('[CameraStream] Overconstrained error encountered. Retrying with relaxed video: true constraints.');
          try {
            acquiredStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            break;
          } catch (relaxedErr: any) {
            lastErr = relaxedErr;
          }
        }
        break;
      }
    }

    if (!acquiredStream) {
      const errName = lastErr?.name || 'UnknownError';
      const errMsg = lastErr?.message || 'Unable to access camera.';
      console.error('[CameraStream] Fatal camera error:', { name: errName, message: errMsg, browser, userAgent: navigator.userAgent });

      let type: CameraErrorType = 'UNKNOWN';
      let message = errMsg;
      let instructions = 'Please verify camera permissions and hardware.';

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        type = 'PERMISSION_DENIED';
        message = 'Camera access was denied.';
        instructions = getPermissionInstructions(browser, isIOS);
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        type = 'CAMERA_NOT_FOUND';
        message = 'No camera found on this device.';
        instructions = 'Please connect an external webcam or ensure your device camera is enabled.';
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        type = 'CAMERA_BUSY';
        message = 'Camera is currently in use by another application or browser tab.';
        instructions = 'Please close other apps using the camera (Zoom, Teams, other browser tabs) and retry.';
      } else if (errName === 'OverconstrainedError') {
        type = 'OVERCONSTRAINED';
        message = 'Camera does not support requested resolution or facing mode.';
        instructions = 'Try switching cameras or updating your browser.';
      } else if (errName === 'AbortError') {
        type = 'ABORTED';
        message = 'Camera access request was aborted.';
        instructions = 'Please retry camera connection.';
      } else if (errName === 'SecurityError') {
        type = 'INSECURE_CONTEXT';
        message = 'Camera access blocked due to security restrictions.';
        instructions = 'Ensure your connection is secure (HTTPS).';
      }

      const finalError: CameraErrorDetails = { type, message, instructions, originalError: lastErr };
      setError(finalError);
      setIsLoading(false);
      onError?.(finalError);
      return null;
    }

    // Success
    streamRef.current = acquiredStream;
    setStream(acquiredStream);
    setIsLoading(false);
    setError(null);
    onStreamReady?.(acquiredStream);
    return acquiredStream;
  }, [constraints, permissionState, onStreamReady, onError, stopStream]);

  // Initial permission check on mount
  useEffect(() => {
    checkPermissions();
    return () => {
      stopStream();
    };
  }, [checkPermissions, stopStream]);

  return {
    stream,
    isLoading,
    error,
    permissionState,
    startCamera,
    stopStream,
    checkPermissions,
  };
}
