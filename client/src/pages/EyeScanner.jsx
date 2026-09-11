import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Camera, CameraOff, Save, RotateCcw, Info,
  ChevronDown, ChevronUp, Activity, Brain, Clock,
  AlertTriangle, CheckCircle, Zap,
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import EyeTrackingEngine from '../utils/EyeTrackingEngine';
import EmotionClassifier from '../utils/EmotionClassifier';
import XAIEngine from '../utils/XAIEngine';

// ── Error boundary — catches silent crashes so page is never blank ──
import { Component } from 'react';
class EyeScannerErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="max-w-lg mx-auto mt-20 card border border-red-500/30 bg-red-500/10 space-y-3">
          <div className="flex items-center gap-2 text-red-400 font-semibold">
            <AlertTriangle size={18} /> Eye Scanner failed to load
          </div>
          <p className="text-sm text-red-300/80">{this.state.error?.message}</p>
          <p className="text-xs text-slate-500">
            This usually means the MediaPipe WASM model could not be fetched. Check your internet connection and try refreshing.
          </p>
          <button onClick={() => this.setState({ error: null })} className="btn-primary text-sm">
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Smoothing utility ──
function exponentialMovingAvg(current, newVal, alpha = 0.3) {
  return current + alpha * (newVal - current);
}

function EyeScannerInner() {
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const classifierRef = useRef(null);
  const frameCountRef = useRef(0);
  const emotionBufferRef = useRef([]);

  // State
  const [status, setStatus] = useState('idle'); // idle | loading | calibrating | scanning | error
  const [error, setError] = useState(null);
  const [currentEmotion, setCurrentEmotion] = useState(null);
  const [smoothedProbs, setSmoothedProbs] = useState({});
  const [features, setFeatures] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [sessionStart, setSessionStart] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [showXAI, setShowXAI] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calibrationCountdown, setCalibrationCountdown] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);

  // Duration timer
  useEffect(() => {
    if (status !== 'scanning' || !sessionStart) return;
    const timer = setInterval(() => {
      setSessionDuration(Math.floor((Date.now() - sessionStart) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [status, sessionStart]);

  // ── Start scanning ──
  const startScanning = useCallback(async () => {
    try {
      setStatus('loading');
      setError(null);

      // Initialize engine and classifier
      const engine = new EyeTrackingEngine();
      const classifier = new EmotionClassifier();
      engineRef.current = engine;
      classifierRef.current = classifier;

      await engine.start(videoRef.current, canvasRef.current);

      // Calibration phase (3 seconds)
      setStatus('calibrating');
      setCalibrationCountdown(3);

      for (let i = 3; i > 0; i--) {
        setCalibrationCountdown(i);
        await new Promise(r => setTimeout(r, 1000));
      }

      // Start emotion detection
      setStatus('scanning');
      setSessionStart(Date.now());
      setSessionDuration(0);
      setTimeline([]);
      emotionBufferRef.current = [];
      frameCountRef.current = 0;

      // Smoothed probabilities state
      let currentSmoothed = {};

      // Register frame callback
      engine.onFrame(({ landmarks, blendshapes, timestamp }) => {
        frameCountRef.current++;
        setFaceDetected(true);

        // Extract features
        const feats = classifier.extractFeatures(landmarks, blendshapes);

        // Classify every 3rd frame to reduce CPU load
        if (frameCountRef.current % 3 !== 0) return;

        const result = classifier.classify(feats);

        // Smooth probabilities with EMA
        for (const [em, prob] of Object.entries(result.allProbabilities)) {
          currentSmoothed[em] = currentSmoothed[em] !== undefined
            ? exponentialMovingAvg(currentSmoothed[em], prob, 0.2)
            : prob;
        }

        // Find smoothed winner
        const smoothedWinner = Object.entries(currentSmoothed)
          .sort((a, b) => b[1] - a[1])[0];

        const smoothedResult = {
          ...result,
          emotion: smoothedWinner[0],
          confidence: smoothedWinner[1],
          label: classifier.getParams()[smoothedWinner[0]]?.label || smoothedWinner[0],
          emoji: classifier.getParams()[smoothedWinner[0]]?.emoji || '❓',
          color: classifier.getParams()[smoothedWinner[0]]?.color || '#6366f1',
        };

        // Generate XAI explanation every 10th classified frame
        if (frameCountRef.current % 30 === 0) {
          const xai = XAIEngine.explain(feats, smoothedResult, classifier.getParams());
          setExplanation(xai);
        }

        setCurrentEmotion(smoothedResult);
        setSmoothedProbs({ ...currentSmoothed });
        setFeatures(feats);

        // Add to timeline every 2 seconds
        emotionBufferRef.current.push({
          emotion: smoothedResult.emotion,
          label: smoothedResult.label,
          emoji: smoothedResult.emoji,
          confidence: smoothedResult.confidence,
          timestamp: Date.now(),
        });

        if (emotionBufferRef.current.length % 60 === 0) {
          // Sample timeline point
          setTimeline(prev => [
            ...prev,
            {
              emotion: smoothedResult.emotion,
              label: smoothedResult.label,
              emoji: smoothedResult.emoji,
              confidence: Math.round(smoothedResult.confidence * 100),
              time: Math.floor((Date.now() - (sessionStart || Date.now())) / 1000),
            },
          ]);
        }
      });
    } catch (err) {
      console.error('Eye scanning error:', err);
      setStatus('error');
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access and try again.'
          : err.name === 'NotFoundError'
          ? 'No camera found. Please connect a webcam and try again.'
          : `Failed to start eye tracking: ${err.message}`
      );
    }
  }, []);

  // ── Stop scanning ──
  const stopScanning = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
    setStatus('idle');
    setFaceDetected(false);
  }, []);

  // ── Save session ──
  const saveSession = async () => {
    if (!currentEmotion) return;
    setSaving(true);
    try {
      // Compute session summary — most frequent emotion
      const emotionCounts = {};
      for (const entry of emotionBufferRef.current) {
        emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
      }
      const dominantEmotion = Object.entries(emotionCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || currentEmotion.emotion;

      await api.post('/eye-scan', {
        emotion: dominantEmotion,
        confidence: currentEmotion.confidence,
        duration: sessionDuration,
        features,
        explanation: explanation ? {
          narrative: explanation.narrative,
          topContributors: explanation.topContributors,
          decisionBoundary: explanation.decisionBoundary,
        } : null,
        allProbabilities: smoothedProbs,
        emotionTimeline: timeline,
      });

      toast.success('Eye scan session saved! 🧠');
      stopScanning();
    } catch {
      toast.error('Failed to save scan session');
    } finally {
      setSaving(false);
    }
  };

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (engineRef.current) engineRef.current.stop();
    };
  }, []);

  // Format duration
  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Eye className="text-indigo-400" size={24} />
            Eye Scanner
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time emotion detection through eye tracking — powered by Explainable AI
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status === 'scanning' && (
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Live · {formatDuration(sessionDuration)}
            </span>
          )}
          {status === 'idle' ? (
            <button onClick={startScanning} className="btn-primary flex items-center gap-2">
              <Camera size={16} /> Start Scan
            </button>
          ) : status === 'scanning' ? (
            <div className="flex gap-2">
              <button onClick={saveSession} disabled={saving}
                className="btn-primary flex items-center gap-2">
                <Save size={16} /> {saving ? 'Saving...' : 'Save & Stop'}
              </button>
              <button onClick={stopScanning}
                className="btn-ghost flex items-center gap-2 text-red-400 hover:text-red-300">
                <CameraOff size={16} /> Stop
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Error state */}
      <AnimatePresence>
        {status === 'error' && error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="card bg-red-500/10 border border-red-500/30 flex items-start gap-3"
          >
            <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-medium text-red-300">Camera Error</p>
              <p className="text-xs text-red-400/80 mt-1">{error}</p>
              <button onClick={startScanning}
                className="mt-3 text-xs text-red-300 hover:text-red-200 underline flex items-center gap-1">
                <RotateCcw size={12} /> Try Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Camera Feed */}
        <div className="space-y-4">
          <div className="card p-0 overflow-hidden relative">
            {/* Video + Canvas overlay */}
            <div className="relative bg-black aspect-[4/3]">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ transform: 'scaleX(-1)' }}
              />

              {/* Idle state overlay */}
              {status === 'idle' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 gap-4">
                  <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Eye size={36} className="text-indigo-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-slate-300 font-medium">Ready to scan</p>
                    <p className="text-slate-500 text-xs mt-1">Click "Start Scan" to begin emotion detection</p>
                  </div>
                </div>
              )}

              {/* Loading overlay */}
              {status === 'loading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 gap-4">
                  <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-400 text-sm">Loading AI model & camera...</p>
                </div>
              )}

              {/* Calibration overlay */}
              {status === 'calibrating' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/70 gap-4">
                  <motion.div
                    key={calibrationCountdown}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-6xl font-bold text-indigo-400"
                  >
                    {calibrationCountdown}
                  </motion.div>
                  <p className="text-slate-300 text-sm">Look straight at the camera</p>
                  <p className="text-slate-500 text-xs">Calibrating baseline...</p>
                </div>
              )}

              {/* Scanning indicator */}
              {status === 'scanning' && currentEmotion && (
                <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
                  <span className="text-lg">{currentEmotion.emoji}</span>
                  <span className="text-xs font-medium text-white">{currentEmotion.label}</span>
                  <span className="text-xs text-slate-400">
                    {Math.round(currentEmotion.confidence * 100)}%
                  </span>
                </div>
              )}

              {/* Face detection indicator */}
              {status === 'scanning' && (
                <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${
                  faceDetected ? 'bg-green-400' : 'bg-red-400 animate-pulse'
                }`} title={faceDetected ? 'Face detected' : 'No face detected'} />
              )}
            </div>
          </div>

          {/* Features panel */}
          {status === 'scanning' && features && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="card space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Activity size={14} className="text-indigo-400" />
                Live Feature Values
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(features).map(([key, value]) => {
                  const meta = EmotionClassifier.getFeatureMeta()[key];
                  const [lo, hi] = meta?.normalRange || [0, 1];
                  const pct = Math.min(100, Math.max(0, ((value - lo) / (hi - lo)) * 100));
                  const isOutside = value < lo || value > hi;
                  return (
                    <div key={key} className="p-2 rounded-lg bg-white/5 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">{meta?.name || key}</span>
                        <span className={`font-mono ${isOutside ? 'text-amber-400' : 'text-slate-300'}`}>
                          {typeof value === 'number' ? value.toFixed(3) : value}
                        </span>
                      </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            isOutside ? 'bg-amber-500' : 'bg-indigo-500'
                          }`}
                          animate={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right: Emotion Results + XAI */}
        <div className="space-y-4">
          {/* Emotion Gauge */}
          {status === 'scanning' && currentEmotion && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="card space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Brain size={14} className="text-purple-400" />
                Detected Emotion
              </div>

              {/* Main emotion display */}
              <div className="text-center py-4">
                <motion.div
                  key={currentEmotion.emotion}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-5xl mb-2"
                >
                  {currentEmotion.emoji}
                </motion.div>
                <h2 className="text-2xl font-bold" style={{ color: currentEmotion.color }}>
                  {currentEmotion.label}
                </h2>
                <p className="text-slate-500 text-xs mt-1">
                  {Math.round(currentEmotion.confidence * 100)}% confidence
                </p>
              </div>

              {/* Probability bars for all emotions */}
              <div className="space-y-1.5">
                {Object.entries(smoothedProbs)
                  .sort((a, b) => b[1] - a[1])
                  .map(([emotion, prob]) => {
                    const params = classifierRef.current?.getParams()?.[emotion];
                    return (
                      <div key={emotion} className="flex items-center gap-2">
                        <span className="text-sm w-5">{params?.emoji || '❓'}</span>
                        <span className="text-xs text-slate-400 w-20 truncate">
                          {params?.label || emotion}
                        </span>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: params?.color || '#6366f1' }}
                            animate={{ width: `${Math.round(prob * 100)}%` }}
                            transition={{ duration: 0.4 }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-10 text-right font-mono">
                          {Math.round(prob * 100)}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}

          {/* XAI Explanation Panel */}
          {status === 'scanning' && explanation && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="card space-y-3">
              <button
                onClick={() => setShowXAI(!showXAI)}
                className="flex items-center justify-between w-full text-sm font-medium text-slate-300"
              >
                <span className="flex items-center gap-2">
                  <Zap size={14} className="text-green-400" />
                  Why this emotion? (XAI Analysis)
                </span>
                {showXAI ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              <AnimatePresence>
                {showXAI && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-3"
                  >
                    {/* Decision boundary */}
                    <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                      <p className="text-xs text-indigo-300 leading-relaxed">
                        {explanation.decisionBoundary}
                      </p>
                    </div>

                    {/* Feature contributions */}
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                        Feature Contributions
                      </p>
                      {explanation.contributions.map((contrib, i) => (
                        <div key={contrib.feature} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 font-medium flex items-center gap-1">
                              {contrib.direction === 'supports' ? (
                                <CheckCircle size={10} className="text-green-400" />
                              ) : (
                                <AlertTriangle size={10} className="text-amber-400" />
                              )}
                              {contrib.displayName}
                            </span>
                            <span className={`font-mono ${
                              contrib.contribution >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {contrib.contribution >= 0 ? '+' : ''}{contrib.contribution.toFixed(3)}
                            </span>
                          </div>
                          {/* Contribution bar */}
                          <div className="flex items-center gap-1">
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                              {/* Center line */}
                              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
                              {/* Bar */}
                              <motion.div
                                className={`absolute top-0 h-full rounded-full ${
                                  contrib.normalizedContribution >= 0 ? 'bg-green-500' : 'bg-red-500'
                                }`}
                                style={{
                                  left: contrib.normalizedContribution >= 0 ? '50%' : undefined,
                                  right: contrib.normalizedContribution < 0 ? '50%' : undefined,
                                }}
                                animate={{
                                  width: `${Math.abs(contrib.normalizedContribution) * 50}%`,
                                }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed pl-3">
                            {contrib.explanation}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Narrative */}
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-start gap-2">
                        <Info size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {explanation.narrative.replace(/\*\*/g, '')}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Session Timeline */}
          {status === 'scanning' && timeline.length > 0 && (
            <div className="card space-y-3">
              <button
                onClick={() => setShowTimeline(!showTimeline)}
                className="flex items-center justify-between w-full text-sm font-medium text-slate-300"
              >
                <span className="flex items-center gap-2">
                  <Clock size={14} className="text-cyan-400" />
                  Session Timeline ({timeline.length} points)
                </span>
                {showTimeline ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              <AnimatePresence>
                {showTimeline && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-end gap-1 h-24 mt-2">
                      {timeline.map((point, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                          <span className="text-xs">{point.emoji}</span>
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${point.confidence}%` }}
                            className="w-full rounded-t"
                            style={{
                              backgroundColor:
                                classifierRef.current?.getParams()?.[point.emotion]?.color || '#6366f1',
                              opacity: 0.6,
                            }}
                          />
                          <span className="text-[8px] text-slate-600">
                            {formatDuration(point.time)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* How it works — idle state */}
          {status === 'idle' && !error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card space-y-4">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Info size={14} className="text-indigo-400" />
                How Eye Scanner Works
              </h3>
              <div className="space-y-3">
                {[
                  {
                    icon: Camera,
                    title: 'Computer Vision',
                    desc: 'MediaPipe Face Landmarker detects 478 facial landmarks including iris position, eye contours, and brow movement — all processed locally in your browser.',
                    color: 'text-blue-400',
                  },
                  {
                    icon: Brain,
                    title: 'Machine Learning',
                    desc: 'A Gaussian Naive Bayes classifier analyzes 8 engineered eye features (blink rate, gaze stability, pupil dilation, etc.) to detect emotions. Fully deterministic — no randomness.',
                    color: 'text-purple-400',
                  },
                  {
                    icon: Zap,
                    title: 'Explainable AI',
                    desc: 'SHAP-inspired log-odds decomposition shows exactly which eye feature contributed how much to each prediction. Every decision is transparent and auditable.',
                    color: 'text-green-400',
                  },
                ].map(({ icon: Icon, title, desc, color }) => (
                  <div key={title} className="flex gap-3 p-3 rounded-lg bg-white/5">
                    <Icon size={18} className={`${color} flex-shrink-0 mt-0.5`} />
                    <div>
                      <p className="text-sm font-medium text-slate-200">{title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-xs text-indigo-300 flex items-center gap-1.5">
                  <Eye size={12} />
                  Your camera feed is processed entirely in your browser. No video data is ever sent to any server.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EyeScanner() {
  return (
    <EyeScannerErrorBoundary>
      <EyeScannerInner />
    </EyeScannerErrorBoundary>
  );
}
