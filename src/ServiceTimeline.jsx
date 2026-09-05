import "./App.css";

function ServiceTimeline({ status = "PENDING", bookingDate = "", amount = 239 }) {
  const steps = [
    {
      id: 1,
      name: "BOOKED",
      title: "Booking Requested",
      subtitle: "Service request placed and broadcast to nearby cooperative workers",
      icon: "📋",
      isCompleted: ["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(status),
      isActive: status === "PENDING",
    },
    {
      id: 2,
      name: "WORKER ARRIVED",
      title: "Worker Accepted & Dispatched",
      subtitle: "Verified worker arrived at location and requested Start OTP",
      icon: "👨‍🔧",
      isCompleted: ["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(status),
      isActive: status === "ACCEPTED",
    },
    {
      id: 3,
      name: "IN PROGRESS",
      title: "Service In Progress",
      subtitle: "Repair & inspection currently underway with quality checks",
      icon: "🛠️",
      isCompleted: ["IN_PROGRESS", "COMPLETED"].includes(status),
      isActive: status === "IN_PROGRESS",
    },
    {
      id: 4,
      name: "COMPLETED",
      title: "Service Completed",
      subtitle: "Job verified with End OTP, fair payout settled & 3-Day Guarantee active",
      icon: "⭐",
      isCompleted: status === "COMPLETED",
      isActive: status === "COMPLETED",
    },
  ];

  if (status === "CANCELLED") {
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

  // Calculate progress percentage for 4 steps
  let progressPct = 20;
  if (status === "ACCEPTED") progressPct = 50;
  if (status === "IN_PROGRESS") progressPct = 80;
  if (status === "COMPLETED") progressPct = 100;

  return (
    <div className="service-timeline-card">
      <div className="timeline-header">
        <div>
          <span className="timeline-badge">🚗 LIVE SERVICE STATUS</span>
          <h2>Service Progress Tracker</h2>
          <p>
            Real-time status updates synchronized with your assigned professional.
            {bookingDate ? ` Order Date: ${bookingDate}.` : ""}
          </p>
        </div>

        <div className="timeline-status-pill-box">
          <span className={`status-pill ${status.toLowerCase()}`}>
            ● {status === "ACCEPTED" ? "WORKER ARRIVED" : status}
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

      {/* 4 Step Items: BOOKED -> WORKER ARRIVED -> IN PROGRESS -> COMPLETED */}
      <div className="timeline-steps-grid four-steps">
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ServiceTimeline;
