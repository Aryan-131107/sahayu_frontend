import "./App.css";

function ServiceTimeline({ status = "PENDING", bookingDate = "", amount = 0 }) {
  const steps = [
    {
      id: 1,
      title: "Booking Requested",
      subtitle: "Service request placed and sent to cooperative network",
      icon: "📋",
      isCompleted: ["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(status),
      isActive: status === "PENDING",
    },
    {
      id: 2,
      title: "Worker Accepted",
      subtitle: "Verified professional accepted your service order",
      icon: "🤝",
      isCompleted: ["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(status),
      isActive: status === "ACCEPTED",
    },
    {
      id: 3,
      title: "Worker On The Way",
      subtitle: "Worker dispatched to your Jabalpur address with tools",
      icon: "🚗",
      isCompleted: ["IN_PROGRESS", "COMPLETED"].includes(status),
      isActive: status === "ACCEPTED" || status === "IN_PROGRESS",
    },
    {
      id: 4,
      title: "Worker Arrived & In Progress",
      subtitle: "Service execution and repair currently underway",
      icon: "🛠️",
      isCompleted: ["IN_PROGRESS", "COMPLETED"].includes(status),
      isActive: status === "IN_PROGRESS",
    },
    {
      id: 5,
      title: "Service Completed",
      subtitle: "Job completed, satisfaction verified, payment settled",
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
            <h3>Service Journey Terminated</h3>
            <p>This booking has been cancelled and is no longer active.</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate progress percent
  let progressPct = 15;
  if (status === "ACCEPTED") progressPct = 45;
  if (status === "IN_PROGRESS") progressPct = 80;
  if (status === "COMPLETED") progressPct = 100;

  return (
    <div className="service-timeline-card">
      <div className="timeline-header">
        <div>
          <span className="timeline-badge">🚗 LIVE SERVICE JOURNEY</span>
          <h2>Real-Time Booking Status</h2>
          <p>
            Track your service lifecycle from request to completion.
            {bookingDate ? ` Scheduled for ${bookingDate}.` : ""}
          </p>
        </div>

        <div className="timeline-status-pill-box">
          <span className={`status-pill ${status.toLowerCase()}`}>
            ● {status}
          </span>
          {amount > 0 && <span className="amount-pill">₹{amount}</span>}
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="timeline-progress-track">
        <div
          className="timeline-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Step Items */}
      <div className="timeline-steps-grid">
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
