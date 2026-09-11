/**
 * XAIEngine — Explainable AI for eye-based emotion detection
 *
 * Explainability layer:
 *  - Computes SHAP-inspired log-odds feature contributions
 *  - For each prediction, shows exactly how much each eye feature
 *    pushed the classification toward or away from the detected emotion
 *  - Generates natural language explanations for each feature
 *  - Provides decision boundary analysis between top-2 emotions
 *
 * Algorithm:
 *   contribution(featureᵢ) = log P(featureᵢ | winning_class)
 *                           − (1/|C|) Σ_c log P(featureᵢ | c)
 *
 *   Positive contribution = feature supports the detected emotion
 *   Negative contribution = feature contradicts it (outweighed by others)
 */

import EmotionClassifier from './EmotionClassifier';

const FEATURE_META = EmotionClassifier.getFeatureMeta();

export default class XAIEngine {
  /**
   * Generate a complete explanation for a classification result
   * @param {Object} features - The 8 extracted feature values
   * @param {Object} classification - Result from EmotionClassifier.classify()
   * @param {Object} params - Emotion parameters from classifier
   * @returns {Object} Full explanation with contributions and narratives
   */
  static explain(features, classification, params) {
    const { emotion: winningEmotion, confidence, secondEmotion, logPosteriors } = classification;
    const emotions = Object.keys(params);
    const numClasses = emotions.length;

    // ── Compute per-feature contributions ──
    const contributions = [];

    for (const [featureName, featureValue] of Object.entries(features)) {
      const winParams = params[winningEmotion]?.features?.[featureName];
      if (!winParams) continue;

      // Log-likelihood under the winning class
      const logLikWin = XAIEngine._logGaussianPDF(
        featureValue, winParams.mean, winParams.std
      );

      // Average log-likelihood across all classes
      let avgLogLik = 0;
      for (const em of emotions) {
        const emParams = params[em]?.features?.[featureName];
        if (emParams) {
          avgLogLik += XAIEngine._logGaussianPDF(
            featureValue, emParams.mean, emParams.std
          );
        }
      }
      avgLogLik /= numClasses;

      // Contribution = how much this feature favors the winning class vs average
      const contribution = logLikWin - avgLogLik;

      // Generate natural language explanation
      const explanation = XAIEngine._generateFeatureExplanation(
        featureName, featureValue, contribution, winningEmotion, params
      );

      contributions.push({
        feature: featureName,
        displayName: FEATURE_META[featureName]?.name || featureName,
        value: featureValue,
        contribution: Math.round(contribution * 1000) / 1000,
        normalizedContribution: 0, // will be filled below
        direction: contribution >= 0 ? 'supports' : 'contradicts',
        explanation,
      });
    }

    // Normalize contributions to -1..+1 range for visualization
    const maxAbsContrib = Math.max(
      ...contributions.map(c => Math.abs(c.contribution)),
      0.01 // prevent division by zero
    );
    for (const c of contributions) {
      c.normalizedContribution = Math.round(
        (c.contribution / maxAbsContrib) * 100
      ) / 100;
    }

    // Sort by absolute contribution (most important first)
    contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    // ── Decision boundary explanation ──
    const decisionBoundary = XAIEngine._generateDecisionBoundary(
      winningEmotion, secondEmotion, confidence, classification.secondConfidence,
      contributions, params
    );

    // ── Overall narrative ──
    const narrative = XAIEngine._generateNarrative(
      winningEmotion, confidence, contributions, params
    );

    return {
      emotion: winningEmotion,
      emotionLabel: params[winningEmotion]?.label || winningEmotion,
      confidence,
      contributions,
      decisionBoundary,
      narrative,
      topContributors: contributions.slice(0, 3).map(c => c.displayName),
    };
  }

  /**
   * Log of Gaussian PDF (must match the classifier's implementation)
   */
  static _logGaussianPDF(x, mean, std) {
    const variance = std * std;
    if (variance < 1e-10) return -100;
    return -0.5 * Math.log(2 * Math.PI * variance) - ((x - mean) ** 2) / (2 * variance);
  }

  /**
   * Generate a natural language explanation for a single feature's contribution
   */
  static _generateFeatureExplanation(featureName, value, contribution, emotion, params) {
    const meta = FEATURE_META[featureName];
    if (!meta) return `${featureName}: ${value}`;

    const emParams = params[emotion]?.features?.[featureName];
    if (!emParams) return `${meta.name}: ${value}`;

    const isAboveNormal = value > meta.normalRange[1];
    const isBelowNormal = value < meta.normalRange[0];
    const deviationFromMean = value - emParams.mean;
    const emotionLabel = params[emotion]?.label || emotion;

    // Build explanation based on feature type and contribution direction
    if (contribution >= 0) {
      // Feature supports the detected emotion
      switch (featureName) {
        case 'eyeAspectRatio':
          if (value > 0.32) return `Your eyes are wider open than usual — consistent with ${emotionLabel.toLowerCase()} state`;
          if (value < 0.22) return `Your eyes appear more closed/droopy — a key indicator of ${emotionLabel.toLowerCase()}`;
          return `Eye openness (${value.toFixed(3)}) aligns with typical ${emotionLabel.toLowerCase()} patterns`;

        case 'blinkRate':
          if (value > 25) return `Elevated blink rate (${value.toFixed(0)}/min vs normal 15-20) suggests heightened ${emotionLabel.toLowerCase() === 'anxious' ? 'stress' : 'arousal'}`;
          if (value < 12) return `Low blink rate (${value.toFixed(0)}/min) indicates ${emotionLabel.toLowerCase() === 'focused' ? 'deep concentration' : 'reduced alertness'}`;
          return `Blink rate (${value.toFixed(0)}/min) is within the expected range for ${emotionLabel.toLowerCase()}`;

        case 'gazeStability':
          if (value > 0.05) return `Your eyes are moving around frequently — gaze instability is a strong indicator of ${emotionLabel.toLowerCase()}`;
          if (value < 0.015) return `Your gaze is very steady and focused — consistent with ${emotionLabel.toLowerCase()}`;
          return `Gaze stability (σ=${value.toFixed(3)}) matches ${emotionLabel.toLowerCase()} patterns`;

        case 'pupilDilation':
          if (value > 0.42) return `Dilated pupils detected — heightened arousal consistent with ${emotionLabel.toLowerCase()}`;
          if (value < 0.30) return `Constricted pupils suggest lower arousal — typical of ${emotionLabel.toLowerCase()}`;
          return `Pupil size (${value.toFixed(3)}) aligns with ${emotionLabel.toLowerCase()}`;

        case 'browTension':
          if (value > 0.5) return `Furrowed brows indicate tension or worry — a hallmark of ${emotionLabel.toLowerCase()}`;
          if (value < 0.2) return `Relaxed brows support the ${emotionLabel.toLowerCase()} classification`;
          return `Brow tension level (${value.toFixed(3)}) is consistent with ${emotionLabel.toLowerCase()}`;

        case 'eyeSquintScore':
          if (value > 0.25) return `Eye squinting detected — narrowed eyes are characteristic of ${emotionLabel.toLowerCase()}`;
          return `Squint level (${value.toFixed(3)}) matches ${emotionLabel.toLowerCase()} expression`;

        case 'eyeWidenessScore':
          if (value > 0.3) return `Eyes are notably wide open — a defining feature of ${emotionLabel.toLowerCase()}`;
          return `Eye aperture (${value.toFixed(3)}) supports ${emotionLabel.toLowerCase()} detection`;

        case 'gazeDirection':
          if (Math.abs(value - 0.5) > 0.15) return `Averted gaze detected — looking away is associated with ${emotionLabel.toLowerCase()}`;
          return `Direct gaze engagement supports ${emotionLabel.toLowerCase()} classification`;

        default:
          return `${meta.name} (${value}) supports ${emotionLabel.toLowerCase()}`;
      }
    } else {
      // Feature contradicts but was outweighed
      return `${meta.name} (${value.toFixed(3)}) is atypical for ${emotionLabel.toLowerCase()}, but outweighed by stronger signals`;
    }
  }

  /**
   * Generate decision boundary explanation between top-2 emotions
   */
  static _generateDecisionBoundary(winner, second, winConf, secConf, contributions, params) {
    const winLabel = params[winner]?.label || winner;
    const secLabel = params[second]?.label || second;
    const margin = Math.round((winConf - secConf) * 100);

    const topSupporting = contributions
      .filter(c => c.direction === 'supports')
      .slice(0, 2)
      .map(c => c.displayName.toLowerCase());

    const differentiator = topSupporting.length > 0
      ? topSupporting.join(' and ')
      : 'overall feature pattern';

    if (margin > 30) {
      return `${winLabel} detected with high confidence (${Math.round(winConf * 100)}%). ` +
        `The key differentiators were ${differentiator}. ` +
        `${secLabel} was the next closest at ${Math.round(secConf * 100)}%.`;
    } else if (margin > 10) {
      return `${winLabel} scored ${Math.round(winConf * 100)}% vs ${secLabel} at ${Math.round(secConf * 100)}%. ` +
        `The deciding factor was ${differentiator}.`;
    } else {
      return `Close call: ${winLabel} (${Math.round(winConf * 100)}%) narrowly beat ${secLabel} (${Math.round(secConf * 100)}%). ` +
        `${differentiator} tipped the balance. Detection confidence is moderate.`;
    }
  }

  /**
   * Generate an overall human-readable narrative summary
   */
  static _generateNarrative(emotion, confidence, contributions, params) {
    const label = params[emotion]?.label || emotion;
    const topFeatures = contributions.slice(0, 3);
    const supportingCount = contributions.filter(c => c.direction === 'supports').length;
    const totalCount = contributions.length;

    const confidenceWord = confidence > 0.7 ? 'strong' :
      confidence > 0.4 ? 'moderate' : 'tentative';

    const featureList = topFeatures
      .map(c => `${c.displayName.toLowerCase()} (${c.direction === 'supports' ? '✓' : '✗'})`)
      .join(', ');

    return `The system detected **${label}** with ${confidenceWord} confidence (${Math.round(confidence * 100)}%). ` +
      `${supportingCount} out of ${totalCount} eye features support this classification. ` +
      `The most influential features were: ${featureList}.`;
  }
}
