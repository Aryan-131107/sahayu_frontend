import { useState, useEffect } from "react";
import "./App.css";

/**
 * Real-Time 3-Day Workmanship Guarantee Countdown
 * Authoritatively driven by backend `warranty_expires_at` ISO 8601 timestamp.
 */
function calculateTimeLeft(expiresAt) {
  if (!expiresAt) {
    return {
      totalMs: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      hasTimestamp: false,
    };
  }

  const expiryTime = new Date(expiresAt).getTime();
  if (isNaN(expiryTime)) {
    return {
      totalMs: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      hasTimestamp: false,
    };
  }

  const now = Date.now();
  const diff = expiryTime - now;

  if (diff <= 0) {
    return {
      totalMs: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      hasTimestamp: true,
    };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    totalMs: diff,
    hours,
    minutes,
    seconds,
    isExpired: false,
    hasTimestamp: true,
  };
}

export default function WarrantyCountdown({
  warrantyExpiresAt,
  status = "COMPLETED",
  compact = false,
}) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(warrantyExpiresAt));

  useEffect(() => {
    if (!warrantyExpiresAt) return;

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(warrantyExpiresAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [warrantyExpiresAt]);

  const pad = (num) => String(num).padStart(2, "0");

  const formattedExpiryDate = warrantyExpiresAt
    ? new Date(warrantyExpiresAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "72 Hours Post-Completion";

  // If status is not completed, show pending guarantee badge
  if (status !== "COMPLETED" && status !== "completed") {
    return (
      <div className={`warranty-card pending-warranty ${compact ? "compact" : ""}`}>
        <div className="warranty-icon-badge">🛡️</div>
        <div className="warranty-info">
          <h4>72-Hour Workmanship Guarantee</h4>
          <p>
            Cooperative Protection: Automatically activates upon completion & payment settlement.
          </p>
        </div>
        <span className="guarantee-status-tag pending">ACTIVATES ON COMPLETION & PAYMENT SETTLEMENT</span>
      </div>
    );
  }

  // If expired
  if (timeLeft.isExpired) {
    return (
      <div className={`warranty-card expired-warranty ${compact ? "compact" : ""}`}>
        <div className="warranty-icon-badge" style={{ background: "#f1f5f9", color: "#64748b" }}>
          🛡️
        </div>
        <div className="warranty-info">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, color: "#475569" }}>Workmanship Guarantee Expired</h3>
            <span className="guarantee-status-tag expired">EXPIRED</span>
          </div>
          <p style={{ margin: "4px 0 8px", color: "#64748b" }}>
            72-hour protection window concluded on {formattedExpiryDate}.
          </p>
          <div className="warranty-timer-box expired">
            <span className="timer-unit">
              <strong>00</strong> <small>hrs</small>
            </span>
            <span className="timer-sep">:</span>
            <span className="timer-unit">
              <strong>00</strong> <small>mins</small>
            </span>
            <span className="timer-sep">:</span>
            <span className="timer-unit">
              <strong>00</strong> <small>secs</small>
            </span>
            <span className="timer-label">00 hrs : 00 mins : 00 secs</span>
          </div>
        </div>
      </div>
    );
  }

  // Active Warranty with real continuous countdown
  return (
    <div className={`warranty-card active-warranty ${compact ? "compact" : ""}`}>
      <div className="warranty-icon-badge">🛡️</div>
      <div className="warranty-info">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>3-Day Workmanship Guarantee</h3>
          <span className="guarantee-status-tag active">ACTIVE GUARANTEE</span>
        </div>
        <p style={{ margin: "4px 0 10px" }}>
          Active protection valid until <strong>{formattedExpiryDate}</strong>. Cooperative covers free re-inspection and resolution.
        </p>

        {/* Live Dynamic Countdown Timer */}
        <div className="warranty-timer-container">
          <div className="warranty-timer-box">
            <div className="timer-pill">
              <span className="timer-val">{pad(timeLeft.hours)}</span>
              <span className="timer-lbl">hrs</span>
            </div>
            <span className="timer-colon">:</span>
            <div className="timer-pill">
              <span className="timer-val">{pad(timeLeft.minutes)}</span>
              <span className="timer-lbl">mins</span>
            </div>
            <span className="timer-colon">:</span>
            <div className="timer-pill">
              <span className="timer-val">{pad(timeLeft.seconds)}</span>
              <span className="timer-lbl">secs</span>
            </div>
            <span className="timer-status-note">remaining</span>
          </div>

          <div className="timer-plain-string">
            {pad(timeLeft.hours)} hrs : {pad(timeLeft.minutes)} mins : {pad(timeLeft.seconds)} secs remaining
          </div>
        </div>
      </div>
    </div>
  );
}
