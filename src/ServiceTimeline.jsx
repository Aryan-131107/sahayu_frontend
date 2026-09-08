import "./App.css";

/**
 * Service Timeline Component
 * Visually communicates backend-driven booking transitions:
 * BOOKED -> ARRIVED -> IN_PROGRESS -> COMPLETED -> WARRANTY ACTIVE
 */
function ServiceTimeline({
  status = "PENDING",
  bookingDate = "",
  amount = 239,
  startOtpVerifiedAt = null,
  endOtpVerifiedAt = null,
  warrantyExpiresAt = null,
  bookingReference = "",
}) {
  const normStatus = String(status || "").toUpperCase();

  const isBooked = ["PENDING", "BOOKED", "ACCEPTED", "ARRIVED", "IN_PROGRESS", "COMPLETED"].includes(normStatus);
  const isArrived = ["ACCEPTED", "ARRIVED", "IN_PROGRESS", "COMPLETED"].includes(normStatus);
  const isInProgress = ["IN_PROGRESS", "COMPLETED"].includes(normStatus);
  const isCompleted = normStatus === "COMPLETED";

  const steps = [
    {
      id: 1,
      name: "BOOKED",
      title: "Booking Confirmed",
      subtitle: "Service request placed and broadcast to nearby cooperative workers",
      icon: "📋",
      isCompleted: isBooked && normStatus !== "PENDING" && normStatus !== "BOOKED",
      isActive: normStatus === "PENDING" || normStatus === "BOOKED",
      meta: bookingDate ? `Order Date: ${bookingDate}` : null,
    },
    {
      id: 2,
      name: "ARRIVED",
      title: "Technician Arrived",
      subtitle: "Technician arrived at doorstep · Awaiting Start PIN",
      icon: "👨‍🔧",
      isCompleted: isArrived && normStatus !== "ACCEPTED" && normStatus !== "ARRIVED",
      isActive: normStatus === "ACCEPTED" || normStatus === "ARRIVED",
      meta: isArrived && !isInProgress ? "Doorstep Handshake Pending" : null,
    },
    {
      id: 3,
      name: "IN_PROGRESS",
      title: "Job In Progress",
      subtitle: "✓ Start PIN Verified · Service & quality inspection underway",
      icon: "🛠️",
      isCompleted: isCompleted,
      isActive: normStatus === "IN_PROGRESS",
      meta: startOtpVerifiedAt ? `Verified: ${new Date(startOtpVerifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : null,
    },
    {
      id: 4,
      name: "COMPLETED",
      title: "Settlement Committed",
      subtitle: "✓ Completion PIN Verified · ₹199 labour payout settled to worker wallet",
      icon: "🤝",
      isCompleted: isCompleted,
      isActive: false,
      meta: endOtpVerifiedAt ? `Verified: ${new Date(endOtpVerifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : null,
    },
    {
      id: 5,
      name: "WARRANTY ACTIVE",
      title: "3-Day Guarantee",
      subtitle: "72-hr Workmanship Guarantee active · Free re-service protection",
      icon: "🛡️",
      isCompleted: isCompleted,
      isActive: isCompleted,
      meta: isCompleted
        ? warrantyExpiresAt
          ? `Active until ${new Date(warrantyExpiresAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}`
          : "Active 72-Hour Window"
        : "Activates on End PIN",
    },
  ];

  if (normStatus === "CANCELLED") {
    return (
      <div className="service-timeline-card cancelled">
        <div className="timeline-header">
          <div>
            <span className="timeline-badge error">✕ BOOKING CANCELLED</span>
            <h3>Service Order Terminated</h3>
            <p>This booking has been cancelled and is no longer active.</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate progress percentage for 5 steps
  let progressPct = 15;
  if (normStatus === "ACCEPTED" || normStatus === "ARRIVED") progressPct = 35;
  if (normStatus === "IN_PROGRESS") progressPct = 65;
  if (normStatus === "COMPLETED") progressPct = 100;

  return (
    <div className="service-timeline-card">
      <div className="timeline-header">
        <div>
          <span className="timeline-badge">🚗 LIVE BACKEND CONSENSUS TIMELINE</span>
          <h2>Service Progress Tracker</h2>
          <p>
            Real-time status transitions verified via cooperative handshake protocol.
            {bookingReference ? ` Ref: #${bookingReference}.` : ""}
          </p>
        </div>

        <div className="timeline-status-pill-box">
          <span className={`status-pill ${normStatus.toLowerCase()}`}>
            ● {normStatus === "ACCEPTED" ? "ARRIVED" : normStatus}
          </span>
          <span className="amount-pill">₹{amount || 239}</span>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="timeline-progress-track">
        <div
          className="timeline-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* 5 Step Items: BOOKED -> ARRIVED -> IN_PROGRESS -> COMPLETED -> WARRANTY ACTIVE */}
      <div className="timeline-steps-grid five-steps">
        {steps.map((step) => {
          let stepClass = "timeline-step-item";
          if (step.isCompleted) stepClass += " completed";
          if (step.isActive) stepClass += " current";

          return (
            <div key={step.id} className={stepClass}>
              <div className="timeline-node">
                {step.isCompleted ? (
                  <span className="node-check">✓</span>
                ) : step.isActive ? (
                  <span className="node-pulse">●</span>
                ) : (
                  <span className="node-pending">○</span>
                )}
              </div>

              <div className="timeline-step-text">
                <span className="step-tag-name">{step.name}</span>
                <div className="step-title-row">
                  <span className="step-icon">{step.icon}</span>
                  <h4>{step.title}</h4>
                </div>
                <p>{step.subtitle}</p>
                {step.meta && (
                  <span className="step-meta-note">{step.meta}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ServiceTimeline;
