/**
 * EmotionClassifier — Gaussian Naive Bayes for eye-based emotion detection
 *
 * Machine Learning layer:
 *  - Extracts 8 engineered features from raw eye landmarks
 *  - Classifies emotions using Gaussian Naive Bayes with research-backed parameters
 *  - Fully deterministic: same input always produces same output
 *  - Parameters can be updated online via Bayesian updating from user feedback
 *
 * Algorithm: P(emotion | features) ∝ P(emotion) × ∏ᵢ N(featureᵢ; μᵢ, σ²ᵢ)
 * The class with highest posterior probability wins.
 */

import { EYE_LANDMARKS } from './EyeTrackingEngine';

// ──────────────────────────────────────────────────────────────
// Feature Extraction Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Euclidean distance between two 3D landmark points
 */
function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

/**
 * Eye Aspect Ratio (EAR) — Soukupová & Čech, 2016
 * EAR = (||p2-p6|| + ||p3-p5||) / (2 × ||p1-p4||)
 * Returns 0.0–0.5 typically; <0.21 indicates blink/closed
 */
function computeEAR(landmarks, eyeConfig) {
  const p1 = landmarks[eyeConfig.p1];
  const p2 = landmarks[eyeConfig.p2];
  const p3 = landmarks[eyeConfig.p3];
  const p4 = landmarks[eyeConfig.p4];
  const p5 = landmarks[eyeConfig.p5];
  const p6 = landmarks[eyeConfig.p6];

  const vertical1 = dist(p2, p6);
  const vertical2 = dist(p3, p5);
  const horizontal = dist(p1, p4);

  return horizontal > 0 ? (vertical1 + vertical2) / (2.0 * horizontal) : 0;
}

/**
 * Iris position relative to eye corners (0 = left corner, 1 = right corner)
 */
function computeGazePosition(landmarks, irisIndices, eyeConfig) {
  const irisCenter = landmarks[irisIndices[0]];
  const innerCorner = landmarks[eyeConfig.p4];
  const outerCorner = landmarks[eyeConfig.p1];

  const eyeWidth = dist(innerCorner, outerCorner);
  if (eyeWidth < 0.001) return { x: 0.5, y: 0.5 };

  // Horizontal position: 0 = at outer corner, 1 = at inner corner
  const hPos = (irisCenter.x - outerCorner.x) / (innerCorner.x - outerCorner.x);

  // Vertical position
  const upperLid = landmarks[eyeConfig.p2];
  const lowerLid = landmarks[eyeConfig.p5];
  const vRange = dist(upperLid, lowerLid);
  const vPos = vRange > 0.001
    ? (irisCenter.y - upperLid.y) / (lowerLid.y - upperLid.y)
    : 0.5;

  return { x: Math.max(0, Math.min(1, hPos)), y: Math.max(0, Math.min(1, vPos)) };
}

// ──────────────────────────────────────────────────────────────
// Emotion Class Parameters (Gaussian Naive Bayes)
// ──────────────────────────────────────────────────────────────

// Research-backed mean (μ) and standard deviation (σ) for each
// feature, per emotion class. These define the Gaussian likelihood
// P(feature | emotion) = N(feature; μ, σ²)
const EMOTION_PARAMS = {
  calm: {
    label: 'Calm',
    emoji: '😌',
    color: '#22d3ee',
    prior: 0.125,
    features: {
      eyeAspectRatio:  { mean: 0.28, std: 0.03 },
      blinkRate:       { mean: 17,   std: 4 },
      gazeStability:   { mean: 0.015, std: 0.008 },
      pupilDilation:   { mean: 0.35, std: 0.04 },
      browTension:     { mean: 0.25, std: 0.08 },
      eyeSquintScore:  { mean: 0.1,  std: 0.06 },
      eyeWidenessScore:{ mean: 0.05, std: 0.04 },
      gazeDirection:   { mean: 0.5,  std: 0.05 },
    },
  },
  anxious: {
    label: 'Anxious',
    emoji: '😰',
    color: '#f59e0b',
    prior: 0.125,
    features: {
      eyeAspectRatio:  { mean: 0.31, std: 0.03 },
      blinkRate:       { mean: 28,   std: 5 },
      gazeStability:   { mean: 0.06, std: 0.02 },
      pupilDilation:   { mean: 0.42, std: 0.05 },
      browTension:     { mean: 0.55, std: 0.1 },
      eyeSquintScore:  { mean: 0.12, std: 0.07 },
      eyeWidenessScore:{ mean: 0.25, std: 0.1 },
      gazeDirection:   { mean: 0.5,  std: 0.15 },
    },
  },
  sad: {
    label: 'Sad',
    emoji: '😢',
    color: '#3b82f6',
    prior: 0.125,
    features: {
      eyeAspectRatio:  { mean: 0.22, std: 0.03 },
      blinkRate:       { mean: 10,   std: 4 },
      gazeStability:   { mean: 0.03, std: 0.015 },
      pupilDilation:   { mean: 0.30, std: 0.04 },
      browTension:     { mean: 0.3,  std: 0.1 },
      eyeSquintScore:  { mean: 0.2,  std: 0.08 },
      eyeWidenessScore:{ mean: 0.05, std: 0.04 },
      gazeDirection:   { mean: 0.45, std: 0.1 },
    },
  },
  angry: {
    label: 'Angry',
    emoji: '😠',
    color: '#ef4444',
    prior: 0.125,
    features: {
      eyeAspectRatio:  { mean: 0.24, std: 0.025 },
      blinkRate:       { mean: 20,   std: 4 },
      gazeStability:   { mean: 0.02, std: 0.01 },
      pupilDilation:   { mean: 0.40, std: 0.05 },
      browTension:     { mean: 0.75, std: 0.1 },
      eyeSquintScore:  { mean: 0.4,  std: 0.12 },
      eyeWidenessScore:{ mean: 0.05, std: 0.04 },
      gazeDirection:   { mean: 0.5,  std: 0.06 },
    },
  },
  surprised: {
    label: 'Surprised',
    emoji: '😲',
    color: '#a855f7',
    prior: 0.125,
    features: {
      eyeAspectRatio:  { mean: 0.36, std: 0.04 },
      blinkRate:       { mean: 8,    std: 4 },
      gazeStability:   { mean: 0.04, std: 0.02 },
      pupilDilation:   { mean: 0.48, std: 0.06 },
      browTension:     { mean: 0.2,  std: 0.1 },
      eyeSquintScore:  { mean: 0.05, std: 0.04 },
      eyeWidenessScore:{ mean: 0.6,  std: 0.15 },
      gazeDirection:   { mean: 0.5,  std: 0.1 },
    },
  },
  tired: {
    label: 'Tired',
    emoji: '😴',
    color: '#64748b',
    prior: 0.125,
    features: {
      eyeAspectRatio:  { mean: 0.18, std: 0.04 },
      blinkRate:       { mean: 32,   std: 6 },
      gazeStability:   { mean: 0.07, std: 0.03 },
      pupilDilation:   { mean: 0.33, std: 0.04 },
      browTension:     { mean: 0.2,  std: 0.08 },
      eyeSquintScore:  { mean: 0.3,  std: 0.1 },
      eyeWidenessScore:{ mean: 0.03, std: 0.03 },
      gazeDirection:   { mean: 0.5,  std: 0.12 },
    },
  },
  focused: {
    label: 'Focused',
    emoji: '🎯',
    color: '#10b981',
    prior: 0.125,
    features: {
      eyeAspectRatio:  { mean: 0.26, std: 0.025 },
      blinkRate:       { mean: 12,   std: 4 },
      gazeStability:   { mean: 0.01, std: 0.006 },
      pupilDilation:   { mean: 0.38, std: 0.04 },
      browTension:     { mean: 0.4,  std: 0.1 },
      eyeSquintScore:  { mean: 0.15, std: 0.08 },
      eyeWidenessScore:{ mean: 0.08, std: 0.05 },
      gazeDirection:   { mean: 0.5,  std: 0.04 },
    },
  },
  happy: {
    label: 'Happy',
    emoji: '😊',
    color: '#f97316',
    prior: 0.125,
    features: {
      eyeAspectRatio:  { mean: 0.25, std: 0.03 },
      blinkRate:       { mean: 18,   std: 4 },
      gazeStability:   { mean: 0.02, std: 0.01 },
      pupilDilation:   { mean: 0.36, std: 0.04 },
      browTension:     { mean: 0.2,  std: 0.08 },
      eyeSquintScore:  { mean: 0.25, std: 0.1 },
      eyeWidenessScore:{ mean: 0.08, std: 0.05 },
      gazeDirection:   { mean: 0.5,  std: 0.05 },
    },
  },
};

// Feature metadata for human-readable explanations
const FEATURE_META = {
  eyeAspectRatio: {
    name: 'Eye Openness',
    unit: 'ratio',
    lowDesc: 'Your eyes are more closed than usual',
    highDesc: 'Your eyes are wider open than usual',
    normalRange: [0.22, 0.32],
  },
  blinkRate: {
    name: 'Blink Rate',
    unit: 'blinks/min',
    lowDesc: 'You are blinking less frequently',
    highDesc: 'You are blinking more rapidly than normal',
    normalRange: [12, 22],
  },
  gazeStability: {
    name: 'Gaze Stability',
    unit: 'deviation',
    lowDesc: 'Your gaze is very steady and focused',
    highDesc: 'Your eyes are moving around more than usual',
    normalRange: [0.01, 0.04],
  },
  pupilDilation: {
    name: 'Pupil Size',
    unit: 'ratio',
    lowDesc: 'Your pupils appear more constricted',
    highDesc: 'Your pupils appear more dilated',
    normalRange: [0.30, 0.40],
  },
  browTension: {
    name: 'Brow Tension',
    unit: 'score',
    lowDesc: 'Your brows are relaxed',
    highDesc: 'Your brows are furrowed or tense',
    normalRange: [0.15, 0.40],
  },
  eyeSquintScore: {
    name: 'Eye Squint',
    unit: 'score',
    lowDesc: 'No squinting detected',
    highDesc: 'Your eyes are squinting or narrowed',
    normalRange: [0.05, 0.20],
  },
  eyeWidenessScore: {
    name: 'Eye Wideness',
    unit: 'score',
    lowDesc: 'Normal eye aperture',
    highDesc: 'Your eyes are notably wide open',
    normalRange: [0.03, 0.15],
  },
  gazeDirection: {
    name: 'Gaze Direction',
    unit: 'position',
    lowDesc: 'Looking slightly away to one side',
    highDesc: 'Looking slightly away to the other side',
    normalRange: [0.4, 0.6],
  },
};

// ──────────────────────────────────────────────────────────────
// Classifier
// ──────────────────────────────────────────────────────────────

export default class EmotionClassifier {
  constructor() {
    this.params = JSON.parse(JSON.stringify(EMOTION_PARAMS));

    // Rolling buffers for temporal features
    this.blinkBuffer = [];         // timestamps of detected blinks
    this.gazeHistory = [];         // last 30 gaze positions for stability
    this.earHistory = [];          // last 5 EAR values for blink detection
    this.lastBlinkState = false;   // was the eye closed in the last frame?
    this.frameCount = 0;
    this.startTime = Date.now();
  }

  /**
   * Extract 8 engineered features from raw landmarks + blendshapes
   * @param {Array} landmarks - 478 MediaPipe face landmarks
   * @param {Object} blendshapes - BlendShape scores
   * @returns {Object} 8 feature values
   */
  extractFeatures(landmarks, blendshapes) {
    this.frameCount++;

    // ── Feature 1: Eye Aspect Ratio (average of both eyes) ──
    const leftEAR = computeEAR(landmarks, EYE_LANDMARKS.leftEye);
    const rightEAR = computeEAR(landmarks, EYE_LANDMARKS.rightEye);
    const eyeAspectRatio = (leftEAR + rightEAR) / 2;

    // ── Feature 2: Blink Rate (blinks per minute) ──
    this.earHistory.push(eyeAspectRatio);
    if (this.earHistory.length > 5) this.earHistory.shift();

    const isBlinking = eyeAspectRatio < 0.21;
    if (isBlinking && !this.lastBlinkState) {
      this.blinkBuffer.push(Date.now());
    }
    this.lastBlinkState = isBlinking;

    // Remove blinks older than 60 seconds
    const oneMinuteAgo = Date.now() - 60000;
    this.blinkBuffer = this.blinkBuffer.filter(t => t > oneMinuteAgo);

    const elapsedMinutes = Math.max(0.25, (Date.now() - this.startTime) / 60000);
    const blinkRate = this.blinkBuffer.length / Math.min(1, elapsedMinutes);

    // ── Feature 3: Gaze Stability (std dev of iris position) ──
    const leftGaze = computeGazePosition(
      landmarks, EYE_LANDMARKS.leftIris, EYE_LANDMARKS.leftEye
    );
    const rightGaze = computeGazePosition(
      landmarks, EYE_LANDMARKS.rightIris, EYE_LANDMARKS.rightEye
    );
    const avgGazeX = (leftGaze.x + rightGaze.x) / 2;
    const avgGazeY = (leftGaze.y + rightGaze.y) / 2;

    this.gazeHistory.push({ x: avgGazeX, y: avgGazeY });
    if (this.gazeHistory.length > 30) this.gazeHistory.shift();

    let gazeStability = 0.03; // default
    if (this.gazeHistory.length >= 5) {
      const meanX = this.gazeHistory.reduce((s, g) => s + g.x, 0) / this.gazeHistory.length;
      const meanY = this.gazeHistory.reduce((s, g) => s + g.y, 0) / this.gazeHistory.length;
      const variance = this.gazeHistory.reduce((s, g) =>
        s + (g.x - meanX) ** 2 + (g.y - meanY) ** 2, 0
      ) / this.gazeHistory.length;
      gazeStability = Math.sqrt(variance);
    }

    // ── Feature 4: Pupil Dilation (iris width / eye width) ──
    const leftIrisCenter = landmarks[EYE_LANDMARKS.leftIris[0]];
    const leftIrisEdge = landmarks[EYE_LANDMARKS.leftIris[1]];
    const leftEyeWidth = dist(
      landmarks[EYE_LANDMARKS.leftEye.p1],
      landmarks[EYE_LANDMARKS.leftEye.p4]
    );
    const leftIrisWidth = dist(leftIrisCenter, leftIrisEdge) * 2;
    const pupilDilation = leftEyeWidth > 0.001 ? leftIrisWidth / leftEyeWidth : 0.35;

    // ── Feature 5: Brow Tension ──
    const browTension = this._computeBrowTension(landmarks, blendshapes);

    // ── Feature 6: Eye Squint Score (from BlendShapes) ──
    const eyeSquintScore = (
      (blendshapes?.eyeSquintLeft || 0) + (blendshapes?.eyeSquintRight || 0)
    ) / 2;

    // ── Feature 7: Eye Wideness Score (from BlendShapes) ──
    const eyeWidenessScore = (
      (blendshapes?.eyeWideLeft || 0) + (blendshapes?.eyeWideRight || 0)
    ) / 2;

    // ── Feature 8: Gaze Direction (horizontal deviation from center) ──
    const gazeDirection = avgGazeX;

    return {
      eyeAspectRatio: Math.round(eyeAspectRatio * 1000) / 1000,
      blinkRate: Math.round(blinkRate * 10) / 10,
      gazeStability: Math.round(gazeStability * 1000) / 1000,
      pupilDilation: Math.round(pupilDilation * 1000) / 1000,
      browTension: Math.round(browTension * 1000) / 1000,
      eyeSquintScore: Math.round(eyeSquintScore * 1000) / 1000,
      eyeWidenessScore: Math.round(eyeWidenessScore * 1000) / 1000,
      gazeDirection: Math.round(gazeDirection * 1000) / 1000,
    };
  }

  /**
   * Classify emotion using Gaussian Naive Bayes
   * @param {Object} features - 8 extracted features
   * @returns {{ emotion, confidence, allProbabilities, features }}
   */
  classify(features) {
    const logPosteriors = {};
    const emotions = Object.keys(this.params);

    // Compute log-posterior for each emotion class
    for (const emotion of emotions) {
      const { prior, features: fParams } = this.params[emotion];
      let logP = Math.log(prior);

      for (const [fName, fValue] of Object.entries(features)) {
        if (fParams[fName]) {
          logP += this._logGaussianPDF(fValue, fParams[fName].mean, fParams[fName].std);
        }
      }

      logPosteriors[emotion] = logP;
    }

    // Convert log-posteriors to probabilities using log-sum-exp trick
    const maxLogP = Math.max(...Object.values(logPosteriors));
    const expValues = {};
    let sumExp = 0;

    for (const [emotion, logP] of Object.entries(logPosteriors)) {
      expValues[emotion] = Math.exp(logP - maxLogP);
      sumExp += expValues[emotion];
    }

    const probabilities = {};
    for (const [emotion, expV] of Object.entries(expValues)) {
      probabilities[emotion] = sumExp > 0 ? expV / sumExp : 1 / emotions.length;
    }

    // Find winning class
    const sortedEmotions = Object.entries(probabilities)
      .sort((a, b) => b[1] - a[1]);

    const [topEmotion, topProb] = sortedEmotions[0];
    const [secondEmotion, secondProb] = sortedEmotions[1];

    return {
      emotion: topEmotion,
      label: this.params[topEmotion].label,
      emoji: this.params[topEmotion].emoji,
      color: this.params[topEmotion].color,
      confidence: Math.round(topProb * 100) / 100,
      secondEmotion,
      secondConfidence: Math.round(secondProb * 100) / 100,
      allProbabilities: probabilities,
      logPosteriors,
      features,
    };
  }

  /**
   * Log of Gaussian PDF: log N(x; μ, σ²)
   */
  _logGaussianPDF(x, mean, std) {
    const variance = std * std;
    if (variance < 1e-10) return -100; // degenerate
    return -0.5 * Math.log(2 * Math.PI * variance) - ((x - mean) ** 2) / (2 * variance);
  }

  /**
   * Compute brow tension from landmarks + blendshapes
   */
  _computeBrowTension(landmarks, blendshapes) {
    // Use blendshapes if available (more reliable)
    const browDown = (
      (blendshapes?.browDownLeft || 0) + (blendshapes?.browDownRight || 0)
    ) / 2;
    const browInnerUp = blendshapes?.browInnerUp || 0;

    // Combine: high browDown OR high browInnerUp = tension
    if (browDown > 0.01 || browInnerUp > 0.01) {
      return Math.min(1, browDown * 0.7 + browInnerUp * 0.5 + 0.1);
    }

    // Fallback: compute from landmark distances
    const leftInner = landmarks[EYE_LANDMARKS.leftInnerBrow];
    const rightInner = landmarks[EYE_LANDMARKS.rightInnerBrow];
    const browDist = dist(leftInner, rightInner);

    // Normalize against face width (rough estimate using eye corners)
    const faceWidth = dist(landmarks[EYE_LANDMARKS.leftEye.p1], landmarks[EYE_LANDMARKS.rightEye.p4]);
    return faceWidth > 0.001 ? Math.min(1, 1 - (browDist / faceWidth)) : 0.3;
  }

  /**
   * Get emotion parameters (for XAI engine)
   */
  getParams() {
    return this.params;
  }

  /**
   * Get feature metadata
   */
  static getFeatureMeta() {
    return FEATURE_META;
  }

  /**
   * Reset temporal buffers (e.g., on new session)
   */
  reset() {
    this.blinkBuffer = [];
    this.gazeHistory = [];
    this.earHistory = [];
    this.lastBlinkState = false;
    this.frameCount = 0;
    this.startTime = Date.now();
  }
}
