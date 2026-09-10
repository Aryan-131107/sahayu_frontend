import React, { useState, useRef, useEffect } from "react";
import { transcribeAudio, synthesizeSpeech } from "./api";

export function getDeterministicResponse(transcript) {
  if (!transcript || typeof transcript !== "string") {
    return "Aapki request receive ho gayi hai.";
  }
  const clean = transcript.toLowerCase().trim();
  if (
    clean.includes("aas paas") ||
    clean.includes("aaspaas") ||
    clean.includes("kaam") ||
    clean.includes("job") ||
    clean.includes("available") ||
    clean.includes("dikhao") ||
    clean.includes("काम") ||
    clean.includes("आस पास") ||
    clean.includes("उपलब्ध")
  ) {
    return "Aapke aas paas 3 available jobs hain.";
  }
  if (
    clean.includes("earning") ||
    clean.includes("payout") ||
    clean.includes("kamai") ||
    clean.includes("कमाई") ||
    clean.includes("रुपए") ||
    clean.includes("rupaye")
  ) {
    return "Aapki base inspection fee 199 rupaye directly aapke wallet me add hogi.";
  }
  if (
    clean.includes("gullak") ||
    clean.includes("cooperative") ||
    clean.includes("गुल्लक")
  ) {
    return "Aapka Gullak emergency aur health welfare pool active hai.";
  }
  return "Aapki request receive ho gayi hai.";
}

export default function VoiceAssistant() {
  const [state, setState] = useState("idle"); // 'idle' | 'recording' | 'transcribing' | 'transcribed' | 'speaking' | 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const [transcript, setTranscript] = useState("");
  const [sahayuResponse, setSahayuResponse] = useState("");
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const activeAudioRef = useRef(null);
  const timerIntervalRef = useRef(null);

  // Clean up audio and timer on unmount
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Stop any active audio playback
  const stopAudio = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
  };

  // Play audio from base64 or blob URL
  const playAudio = (sourceUrl) => {
    if (!sourceUrl) return;
    try {
      stopAudio();
      const audio = new Audio(sourceUrl);
      activeAudioRef.current = audio;
      setState("speaking");

      audio.onended = () => {
        setState("transcribed");
      };

      audio.onerror = (e) => {
        console.warn("[VoiceAssistant] Audio playback error:", e);
        setState("transcribed");
      };

      audio.play().catch((err) => {
        console.warn("[VoiceAssistant] Autoplay restricted or playback failed:", err);
        setState("transcribed");
      });
    } catch (err) {
      console.warn("[VoiceAssistant] Failed to instantiate audio:", err);
      setState("transcribed");
    }
  };

  // Start Voice Recording
  const startRecording = async () => {
    if (state === "recording" || state === "transcribing") return;

    stopAudio();
    setErrorMessage("");
    setTranscript("");
    setSahayuResponse("");
    setAudioUrl(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Microphone recording is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let options = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options = { mimeType: "audio/webm;codecs=opus" };
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options = { mimeType: "audio/webm" };
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options = { mimeType: "audio/mp4" };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Release mic hardware tracks immediately
        stream.getTracks().forEach((track) => track.stop());

        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/wav",
        });

        if (audioBlob.size === 0) {
          setState("error");
          setErrorMessage("No audio recorded. Please try again.");
          return;
        }

        await processAudio(audioBlob);
      };

      mediaRecorder.start(200); // 200ms slices
      setState("recording");

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 15) {
            // Safety timeout: max 15 seconds
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn("[VoiceAssistant] Mic access error:", err);
      setState("error");
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage("Microphone permission denied. Please allow microphone access in your browser.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setErrorMessage("No microphone detected. Please connect a microphone.");
      } else {
        setErrorMessage(err.message || "Unable to access microphone.");
      }
    }
  };

  // Stop Recording manually
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  // Process recorded audio through Bhashini ASR & TTS backend proxies
  const processAudio = async (audioBlob) => {
    setState("transcribing");
    try {
      // 1. ASR - Transcribe Hindi Audio
      const transcribeRes = await transcribeAudio(audioBlob);
      const recognizedText = transcribeRes?.text || transcribeRes?.transcript || "";

      if (!recognizedText || recognizedText.trim().length === 0) {
        throw new Error("Could not understand audio. Please speak clearly in Hindi.");
      }

      setTranscript(recognizedText);

      // 2. Generate Deterministic SAHAYU Response
      const replyText = getDeterministicResponse(recognizedText);
      setSahayuResponse(replyText);
      setState("transcribed");

      // 3. TTS - Synthesize Hindi Speech
      try {
        const ttsRes = await synthesizeSpeech(replyText, "hi");
        let playableSrc = null;

        if (ttsRes?.audio) {
          playableSrc = ttsRes.audio.startsWith("data:")
            ? ttsRes.audio
            : `data:audio/wav;base64,${ttsRes.audio}`;
        } else if (ttsRes?.audio_base64) {
          playableSrc = ttsRes.audio_base64.startsWith("data:")
            ? ttsRes.audio_base64
            : `data:audio/wav;base64,${ttsRes.audio_base64}`;
        } else if (ttsRes?.audioContent) {
          playableSrc = ttsRes.audioContent.startsWith("data:")
            ? ttsRes.audioContent
            : `data:audio/wav;base64,${ttsRes.audioContent}`;
        } else if (ttsRes?.audio_url) {
          playableSrc = ttsRes.audio_url;
        }

        if (playableSrc) {
          setAudioUrl(playableSrc);
          playAudio(playableSrc);
        }
      } catch (ttsErr) {
        console.warn("[VoiceAssistant] TTS backend unavailable:", ttsErr);
        // Fallback: transcript and response text are already rendered; do not crash
      }
    } catch (err) {
      console.warn("[VoiceAssistant] Transcription error:", err);
      setState("error");
      setErrorMessage(
        err.message && err.message.includes("understand")
          ? err.message
          : "Voice service temporarily unavailable."
      );
    }
  };

  const handleReset = () => {
    stopAudio();
    setState("idle");
    setErrorMessage("");
    setTranscript("");
    setSahayuResponse("");
    setAudioUrl(null);
  };

  return (
    <div className="voice-assistant-card">
      <div className="voice-card-header">
        <div className="voice-header-title">
          <span className="voice-icon-pill">🎙️</span>
          <div>
            <h3>SAHAYU Voice Assistant</h3>
            <p className="voice-subtitle">Speak naturally in Hindi</p>
          </div>
        </div>
        <div className="voice-badges">
          <span className="voice-lang-badge">हिन्दी · HINDI</span>
          <span className="voice-model-badge">Bhashini ASR + TTS</span>
        </div>
      </div>

      <div className="voice-card-body">
        {/* State: IDLE */}
        {state === "idle" && (
          <div className="voice-action-center">
            <button
              type="button"
              className="voice-record-btn idle-btn"
              onClick={startRecording}
            >
              <span className="mic-symbol">🎙️</span> Start Speaking
            </button>
            <p className="voice-hint">
              Tip: Say <em>"Mere aas paas ke available kaam dikhao."</em>
            </p>
          </div>
        )}

        {/* State: RECORDING */}
        {state === "recording" && (
          <div className="voice-action-center">
            <div className="recording-indicator">
              <span className="recording-dot"></span>
              <span className="recording-timer">00:{String(recordingSeconds).padStart(2, "0")}</span>
            </div>
            <button
              type="button"
              className="voice-record-btn recording-btn"
              onClick={stopRecording}
            >
              <span className="recording-pulse-icon">🔴</span> Listening... (Click to Stop)
            </button>
            <p className="voice-listening-hint">Listening to your Hindi voice query...</p>
          </div>
        )}

        {/* State: TRANSCRIBING */}
        {state === "transcribing" && (
          <div className="voice-action-center">
            <div className="voice-spinner-wrap">
              <div className="voice-spinner"></div>
              <strong>Processing with Bhashini...</strong>
            </div>
            <p className="voice-hint">Transcribing Hindi speech and synthesizing voice response</p>
          </div>
        )}

        {/* State: TRANSCRIBED or SPEAKING */}
        {(state === "transcribed" || state === "speaking") && (
          <div className="voice-dialogue-wrap">
            {/* User Transcript */}
            <div className="voice-bubble user-bubble">
              <div className="bubble-speaker">
                <span className="speaker-avatar">👤</span> You said:
              </div>
              <p className="bubble-text">"{transcript}"</p>
            </div>

            {/* Sahāyu Response */}
            <div className="voice-bubble sahayu-bubble">
              <div className="bubble-speaker">
                <span className="speaker-avatar">🤖</span> SAHAYU:
              </div>
              <p className="bubble-text">"{sahayuResponse}"</p>
            </div>

            {/* Action Bar */}
            <div className="voice-controls-bar">
              {state === "speaking" ? (
                <button
                  type="button"
                  className="voice-action-btn speaking-btn"
                  onClick={stopAudio}
                >
                  <span className="audio-wave-anim">🔊</span> Playing... (Click to Pause)
                </button>
              ) : (
                audioUrl && (
                  <button
                    type="button"
                    className="voice-action-btn play-btn"
                    onClick={() => playAudio(audioUrl)}
                  >
                    🔊 Play Response
                  </button>
                )
              )}

              <button
                type="button"
                className="voice-action-btn secondary-btn-clean"
                onClick={startRecording}
              >
                🎙️ Speak Again
              </button>
            </div>
          </div>
        )}

        {/* State: ERROR */}
        {state === "error" && (
          <div className="voice-error-box">
            <div className="voice-error-header">
              <span className="error-icon">⚠️</span>
              <strong>Voice Assistance Alert</strong>
            </div>
            <p className="error-desc">{errorMessage || "Voice service temporarily unavailable."}</p>
            <button
              type="button"
              className="voice-retry-btn"
              onClick={handleReset}
            >
              ↺ Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
