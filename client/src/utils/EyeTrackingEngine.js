/**
 * EyeTrackingEngine — MediaPipe Face Landmarker wrapper for real-time eye tracking
 *
 * Computer Vision layer:
 *  - Initializes MediaPipe FaceLandmarker with iris tracking + blendshapes
 *  - Manages webcam lifecycle (start/stop)
 *  - Extracts raw landmarks and blendshape scores per frame
 *  - Emits processed data to registered callbacks at ~30fps
 *
 * Privacy: All processing happens client-side. No frames leave the browser.
 *
 * NOTE: MediaPipe is imported dynamically inside initialize() to prevent
 * top-level WASM failures from crashing the entire React module graph.
 */

// Eye landmark indices from the MediaPipe 478-point face mesh
export const EYE_LANDMARKS = {
  // Left eye contour (for EAR calculation)
  leftEye: {
    p1: 33,   // lateral corner
    p2: 160,  // upper lid (outer)
    p3: 158,  // upper lid (inner)
    p4: 133,  // medial corner
    p5: 153,  // lower lid (inner)
    p6: 144,  // lower lid (outer)
    contour: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  },
  // Right eye contour
  rightEye: {
    p1: 362,  // lateral corner
    p2: 385,  // upper lid (outer)
    p3: 387,  // upper lid (inner)
    p4: 263,  // medial corner
    p5: 380,  // lower lid (inner)
    p6: 373,  // lower lid (outer)
    contour: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398],
  },
  // Iris landmarks (5 points each: center + 4 cardinal)
  leftIris: [468, 469, 470, 471, 472],
  rightIris: [473, 474, 475, 476, 477],
  // Eyebrow landmarks for brow tension measurement
  leftBrow: [70, 63, 105, 66, 107],
  rightBrow: [336, 296, 334, 293, 300],
  // Inner brow points for tension calculation
  leftInnerBrow: 107,
  rightInnerBrow: 336,
};

// BlendShape names we extract for emotion analysis
export const BLENDSHAPE_KEYS = [
  'eyeBlinkLeft', 'eyeBlinkRight',
  'eyeSquintLeft', 'eyeSquintRight',
  'eyeWideLeft', 'eyeWideRight',
  'browDownLeft', 'browDownRight',
  'browInnerUp',
  'browOuterUpLeft', 'browOuterUpRight',
];

export default class EyeTrackingEngine {
  constructor() {
    this.faceLandmarker = null;
    this.videoElement = null;
    this.canvasElement = null;
    this.canvasCtx = null;
    this.isRunning = false;
    this.callbacks = [];
    this.animFrameId = null;
    this.lastTimestamp = -1;
  }

  /**
   * Initialize MediaPipe FaceLandmarker model
   * Downloads the model (~5MB) on first load, cached thereafter
   */
  async initialize() {
    // Dynamic import prevents WASM module from crashing the React module graph
    // on page load if MediaPipe fails to initialize
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: false,
    });

    return true;
  }

  /**
   * Start webcam stream and begin processing frames
   * @param {HTMLVideoElement} videoEl - Video element to render camera feed
   * @param {HTMLCanvasElement} canvasEl - Canvas for drawing landmark overlay
   */
  async start(videoEl, canvasEl) {
    if (!this.faceLandmarker) {
      await this.initialize();
    }

    this.videoElement = videoEl;
    this.canvasElement = canvasEl;
    this.canvasCtx = canvasEl.getContext('2d');

    // Request webcam with optimal constraints for face tracking
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 },
        facingMode: 'user',
      },
      audio: false,
    });

    this.videoElement.srcObject = stream;
    await new Promise(resolve => {
      this.videoElement.onloadedmetadata = () => {
        this.videoElement.play();
        resolve();
      };
    });

    // Match canvas to video dimensions
    this.canvasElement.width = this.videoElement.videoWidth;
    this.canvasElement.height = this.videoElement.videoHeight;

    this.isRunning = true;
    this._processFrame();
  }

  /**
   * Stop tracking and release webcam
   */
  stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.videoElement?.srcObject) {
      this.videoElement.srcObject.getTracks().forEach(t => t.stop());
      this.videoElement.srcObject = null;
    }
  }

  /**
   * Register a callback for each processed frame
   * @param {Function} callback - Receives { landmarks, blendshapes, timestamp }
   */
  onFrame(callback) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Internal: Process a single video frame
   */
  _processFrame() {
    if (!this.isRunning) return;

    const now = performance.now();
    if (this.videoElement.readyState >= 2 && now !== this.lastTimestamp) {
      this.lastTimestamp = now;

      const result = this.faceLandmarker.detectForVideo(this.videoElement, now);

      if (result.faceLandmarks?.length > 0) {
        const landmarks = result.faceLandmarks[0];
        const blendshapes = this._extractBlendshapes(result.faceBlendshapes?.[0]);

        // Draw overlay
        this._drawOverlay(landmarks);

        // Emit to callbacks
        const frameData = { landmarks, blendshapes, timestamp: now };
        for (const cb of this.callbacks) {
          try { cb(frameData); } catch (e) { console.error('Frame callback error:', e); }
        }
      } else {
        // No face detected — clear overlay
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
      }
    }

    this.animFrameId = requestAnimationFrame(() => this._processFrame());
  }

  /**
   * Extract relevant blendshape scores from MediaPipe result
   */
  _extractBlendshapes(blendshapeResult) {
    const scores = {};
    if (!blendshapeResult?.categories) return scores;

    for (const cat of blendshapeResult.categories) {
      if (BLENDSHAPE_KEYS.includes(cat.categoryName)) {
        scores[cat.categoryName] = cat.score;
      }
    }
    return scores;
  }

  /**
   * Draw eye landmarks and iris tracking on the canvas overlay
   */
  _drawOverlay(landmarks) {
    const ctx = this.canvasCtx;
    const w = this.canvasElement.width;
    const h = this.canvasElement.height;

    ctx.clearRect(0, 0, w, h);

    // Draw eye contours
    this._drawContour(ctx, landmarks, EYE_LANDMARKS.leftEye.contour, w, h, '#6366f1', 1.5);
    this._drawContour(ctx, landmarks, EYE_LANDMARKS.rightEye.contour, w, h, '#6366f1', 1.5);

    // Draw iris circles
    this._drawIris(ctx, landmarks, EYE_LANDMARKS.leftIris, w, h, '#22d3ee');
    this._drawIris(ctx, landmarks, EYE_LANDMARKS.rightIris, w, h, '#22d3ee');

    // Draw eyebrow landmarks
    this._drawContour(ctx, landmarks, EYE_LANDMARKS.leftBrow, w, h, '#a78bfa', 1);
    this._drawContour(ctx, landmarks, EYE_LANDMARKS.rightBrow, w, h, '#a78bfa', 1);
  }

  _drawContour(ctx, landmarks, indices, w, h, color, lineWidth) {
    if (indices.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    const first = landmarks[indices[0]];
    ctx.moveTo(first.x * w, first.y * h);
    for (let i = 1; i < indices.length; i++) {
      const pt = landmarks[indices[i]];
      ctx.lineTo(pt.x * w, pt.y * h);
    }
    ctx.closePath();
    ctx.stroke();
  }

  _drawIris(ctx, landmarks, indices, w, h, color) {
    const center = landmarks[indices[0]];
    const edge = landmarks[indices[1]];
    const cx = center.x * w;
    const cy = center.y * h;
    const radius = Math.hypot((edge.x - center.x) * w, (edge.y - center.y) * h);

    // Glow effect
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
    ctx.strokeStyle = color + '40';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Main iris circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}
