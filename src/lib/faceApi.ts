/**
 * Smart Ledger X - Custom Face Recognition Service using face-api.js
 * 
 * MODEL FILES SETUP INSTRUCTIONS:
 * -------------------------------------------------------------
 * The face-api.js TensorFlow weights must be located in:
 *   /public/models/
 * 
 * Specifically, the following models are required (~6.7 MB total):
 *   1. tinyFaceDetector:
 *      - tiny_face_detector_model-weights_manifest.json
 *      - tiny_face_detector_model-shard1
 *   2. faceLandmark68Net:
 *      - face_landmark_68_model-weights_manifest.json
 *      - face_landmark_68_model-shard1
 *   3. faceRecognitionNet:
 *      - face_recognition_model-weights_manifest.json
 *      - face_recognition_model-shard1
 *      - face_recognition_model-shard2
 * 
 * Note: These model files are stored in /public/models to ensure instant local offline loading.
 */

import * as faceapi from 'face-api.js';

let modelsLoadedPromise: Promise<boolean> | null = null;

export const areModelsLoaded = (): boolean => {
  return (
    faceapi.nets.tinyFaceDetector.isLoaded &&
    faceapi.nets.faceLandmark68Net.isLoaded &&
    faceapi.nets.faceRecognitionNet.isLoaded
  );
};

export async function loadFaceApiModels(onProgress?: (msg: string) => void): Promise<boolean> {
  if (areModelsLoaded()) {
    return true;
  }

  if (modelsLoadedPromise) {
    return modelsLoadedPromise;
  }

  modelsLoadedPromise = (async () => {
    const MODEL_URL = '/models';

    // 1. Log the exact resolved URL being fetched
    console.log("Attempting to load models from:", window.location.origin + "/models");

    const loadModels = async () => {
      onProgress?.('Verifying model manifest...');
      // 2. Manually fetch manifest file first
      const testFetch = await fetch(`${MODEL_URL}/tiny_face_detector_model-weights_manifest.json`);
      console.log("Manifest fetch status:", testFetch.status);
      if (!testFetch.ok) {
        throw new Error(`Manifest file not reachable, status: ${testFetch.status}`);
      }

      onProgress?.('Loading face detector...');
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      console.log("Tiny face detector loaded");

      onProgress?.('Loading face landmark model...');
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      console.log("Face landmark model loaded");

      onProgress?.('Loading face recognition model...');
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      console.log("Face recognition model loaded");

      return true;
    };

    // 4. 15-second timeout using Promise.race
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Model loading timed out after 15 seconds")), 15000)
    );

    try {
      await Promise.race([loadModels(), timeout]);
      return true;
    } catch (err: any) {
      console.error("Model loading failed with error:", err);
      modelsLoadedPromise = null;
      throw err;
    }
  })();

  return modelsLoadedPromise;
}

export { faceapi };
