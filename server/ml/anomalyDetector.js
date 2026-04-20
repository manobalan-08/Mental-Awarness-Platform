/**
 * Anomaly Detector — Z-score based per-user baseline analysis
 *
 * How it works:
 *  1. Build a rolling baseline from the user's last N mood logs (mean + stddev)
 *  2. For each new log, compute Z-scores for mood, stress, sleep, screenTime
 *  3. A Z-score > threshold means the value is statistically unusual for THIS user
 *  4. Combine signals into an anomaly report with severity and actionable alerts
 *
 * Why Z-score per user (not global thresholds)?
 *  - A mood of 4 might be normal for one user but a red flag for another
 *  - Adapts to each person's personal baseline automatically
 */

const BASELINE_WINDOW = 14;   // days of history to build baseline from
const Z_THRESHOLD     = 1.8;  // standard deviations to flag as anomaly
const MIN_SAMPLES     = 5;    // minimum logs needed before anomaly detection kicks in

/**
 * Compute mean and standard deviation for an array of numbers
 */
function stats(values) {
  if (!values.length) return { mean: 0, std: 0 };
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

/**
 * Compute Z-score: how many standard deviations from the mean
 * Returns 0 if std is too small (avoids division by near-zero)
 */
function zScore(value, mean, std) {
  if (std < 0.01) return 0;
  return (value - mean) / std;
}

/**
 * Classify Z-score magnitude into severity
 */
function severity(z) {
  const abs = Math.abs(z);
  if (abs >= 3.0) return 'critical';
  if (abs >= 2.5) return 'high';
  if (abs >= Z_THRESHOLD) return 'moderate';
  return 'normal';
}

/**
 * Analyze a new mood log against the user's historical baseline
 *
 * @param {object} newLog - the freshly submitted mood log
 * @param {Array}  history - array of past mood logs (sorted newest first)
 * @param {object} behaviorLog - optional behavior data (sleep, screenTime, etc.)
 * @returns {AnomalyReport}
 */
function detectAnomalies(newLog, history, behaviorLog = null) {
  // Use only the baseline window, excluding the new log itself
  const baseline = history
    .filter(l => l._id !== newLog._id)
    .slice(0, BASELINE_WINDOW);

  if (baseline.length < MIN_SAMPLES) {
    return {
      hasAnomaly: false,
      reason: 'insufficient_history',
      message: `Need at least ${MIN_SAMPLES} previous logs to detect anomalies. Keep logging!`,
      anomalies: [],
      overallSeverity: 'normal',
      baselineSamples: baseline.length,
    };
  }

  const anomalies = [];

  // --- Mood anomaly ---
  const moodValues = baseline.map(l => l.mood);
  const moodStats  = stats(moodValues);
  const moodZ      = zScore(newLog.mood, moodStats.mean, moodStats.std);
  const moodSev    = severity(moodZ);

  if (moodSev !== 'normal') {
    const direction = moodZ < 0 ? 'lower' : 'higher';
    anomalies.push({
      metric: 'mood',
      value: newLog.mood,
      baseline: Math.round(moodStats.mean * 10) / 10,
      zScore: Math.round(moodZ * 100) / 100,
      severity: moodSev,
      direction,
      alert: moodZ < 0
        ? `Your mood (${newLog.mood}/10) is significantly lower than your usual average of ${moodStats.mean.toFixed(1)}.`
        : `Your mood (${newLog.mood}/10) is notably higher than your usual average of ${moodStats.mean.toFixed(1)}.`,
    });
  }

  // --- Stress anomaly ---
  const stressValues = baseline.map(l => l.stressLevel);
  const stressStats  = stats(stressValues);
  const stressZ      = zScore(newLog.stressLevel, stressStats.mean, stressStats.std);
  const stressSev    = severity(stressZ);

  if (stressSev !== 'normal') {
    anomalies.push({
      metric: 'stress',
      value: newLog.stressLevel,
      baseline: Math.round(stressStats.mean * 10) / 10,
      zScore: Math.round(stressZ * 100) / 100,
      severity: stressSev,
      direction: stressZ > 0 ? 'higher' : 'lower',
      alert: stressZ > 0
        ? `Your stress (${newLog.stressLevel}/10) is unusually high compared to your average of ${stressStats.mean.toFixed(1)}.`
        : `Your stress (${newLog.stressLevel}/10) is unusually low — great sign!`,
    });
  }

  // --- Behavior anomalies (if behavior data provided) ---
  if (behaviorLog) {
    const behaviorHistory = baseline.filter(l => l._behaviorRef);

    if (behaviorLog.sleepHours !== undefined) {
      // Use a general healthy sleep baseline if not enough behavior history
      const sleepBaseline = { mean: 7.0, std: 1.2 };
      const sleepZ   = zScore(behaviorLog.sleepHours, sleepBaseline.mean, sleepBaseline.std);
      const sleepSev = severity(sleepZ);

      if (sleepSev !== 'normal' && sleepZ < 0) {
        anomalies.push({
          metric: 'sleep',
          value: behaviorLog.sleepHours,
          baseline: sleepBaseline.mean,
          zScore: Math.round(sleepZ * 100) / 100,
          severity: sleepSev,
          direction: 'lower',
          alert: `Only ${behaviorLog.sleepHours}h of sleep detected — significantly below the healthy baseline of 7h.`,
        });
      }
    }

    if (behaviorLog.screenTime !== undefined) {
      const screenBaseline = { mean: 4.0, std: 1.5 };
      const screenZ   = zScore(behaviorLog.screenTime, screenBaseline.mean, screenBaseline.std);
      const screenSev = severity(screenZ);

      if (screenSev !== 'normal' && screenZ > 0) {
        anomalies.push({
          metric: 'screenTime',
          value: behaviorLog.screenTime,
          baseline: screenBaseline.mean,
          zScore: Math.round(screenZ * 100) / 100,
          severity: screenSev,
          direction: 'higher',
          alert: `${behaviorLog.screenTime}h of screen time is unusually high and may be contributing to stress or poor sleep.`,
        });
      }
    }
  }

  // --- Streak / consistency anomaly ---
  // Detect sudden mood crash after a streak of good days
  const recentMoods = baseline.slice(0, 5).map(l => l.mood);
  if (recentMoods.length >= 3) {
    const recentAvg = recentMoods.reduce((s, v) => s + v, 0) / recentMoods.length;
    if (recentAvg >= 7 && newLog.mood <= 4) {
      anomalies.push({
        metric: 'mood_crash',
        value: newLog.mood,
        baseline: Math.round(recentAvg * 10) / 10,
        zScore: null,
        severity: 'high',
        direction: 'lower',
        alert: `Sudden mood drop detected. You've been averaging ${recentAvg.toFixed(1)}/10 recently — today's ${newLog.mood}/10 is a significant shift.`,
      });
    }
  }

  // Overall severity = worst individual severity
  const severityRank = { normal: 0, moderate: 1, high: 2, critical: 3 };
  const overallSeverity = anomalies.length > 0
    ? anomalies.reduce((worst, a) => severityRank[a.severity] > severityRank[worst] ? a.severity : worst, 'normal')
    : 'normal';

  return {
    hasAnomaly: anomalies.length > 0,
    anomalies,
    overallSeverity,
    baselineSamples: baseline.length,
    baselineMood: Math.round(moodStats.mean * 10) / 10,
    baselineStress: Math.round(stressStats.mean * 10) / 10,
    alerts: anomalies.map(a => a.alert),
  };
}

/**
 * Generate a human-readable summary of the anomaly report
 */
function summarizeAnomalies(report) {
  if (!report.hasAnomaly) return null;

  const criticalOrHigh = report.anomalies.filter(a => ['critical', 'high'].includes(a.severity));
  if (criticalOrHigh.length === 0) return 'Minor deviations from your usual patterns detected. Keep an eye on how you feel over the next few days.';

  const metrics = criticalOrHigh.map(a => a.metric).join(' and ');
  return `Significant changes in your ${metrics} detected compared to your personal baseline. Consider checking in with yourself or using a Micro Tool.`;
}

module.exports = { detectAnomalies, summarizeAnomalies };
