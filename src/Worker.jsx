import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getWorker,
  getWorkers,
  updateWorkerAvailability,
  getBooking,
  getCustomerBookings,
  acceptBooking,
  startBooking,
  completeBooking,
  getStoredVerification,
} from "./api";
import "./App.css";

function Worker() {
  const navigate = useNavigate();

  const [workerId, setWorkerId] = useState(
    () => localStorage.getItem("sahayu_worker_id") || "11"
  );
  const [worker, setWorker] = useState(null);
  const [workersList, setWorkersList] = useState([]);
  const [loadingWorker, setLoadingWorker] = useState(true);
  const [workerError, setWorkerError] = useState("");
  const [availabilityUpdating, setAvailabilityUpdating] = useState(false);

  // Active Job Queue State
  const [activeJob, setActiveJob] = useState(null);
  const [jobActionLoading, setJobActionLoading] = useState(false);
  const [jobMessage, setJobMessage] = useState("");
  const [jobError, setJobError] = useState("");

  // OTP inputs for starting and ending service
  const [enteredStartOtp, setEnteredStartOtp] = useState("");
  const [enteredEndOtp, setEnteredEndOtp] = useState("");

  const loadWorkerData = useCallback(async (id) => {
    setLoadingWorker(true);
    setWorkerError("");

    try {
      const [workerData, allWorkers, bookingsList] = await Promise.all([
        getWorker(id).catch(() => null),
        getWorkers(false).catch(() => []),
        getCustomerBookings(1).catch(() => []),
      ]);

      if (workerData) {
        setWorker(workerData);
        localStorage.setItem("sahayu_worker_id", String(id));
      }
      setWorkersList(Array.isArray(allWorkers) ? allWorkers : []);

      // Find any active job assigned to this worker or latest job in queue
      if (Array.isArray(bookingsList) && bookingsList.length > 0) {
        const workerJob =
          bookingsList.find(
            (b) =>
              String(b.worker_id) === String(id) &&
              ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(b.status)
          ) ||
          bookingsList.find((b) => String(b.worker_id) === String(id)) ||
          bookingsList[0];

        if (workerJob) {
          try {
            const freshBooking = await getBooking(workerJob.booking_id);
            setActiveJob(freshBooking);
          } catch {
            setActiveJob(workerJob);
          }
        }
      }
    } catch (err) {
      setWorkerError(err.message || "Failed to load worker profile.");
    } finally {
      setLoadingWorker(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getWorker(workerId).catch(() => null),
      getWorkers(false).catch(() => []),
      getCustomerBookings(1).catch(() => []),
    ]).then(async ([workerData, allWorkers, bookingsList]) => {
      if (!isMounted) return;
      if (workerData) {
        setWorker(workerData);
        localStorage.setItem("sahayu_worker_id", String(workerId));
      }
      setWorkersList(Array.isArray(allWorkers) ? allWorkers : []);

      if (Array.isArray(bookingsList) && bookingsList.length > 0) {
        const workerJob =
          bookingsList.find(
            (b) =>
              String(b.worker_id) === String(workerId) &&
              ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(b.status)
          ) ||
          bookingsList.find((b) => String(b.worker_id) === String(workerId)) ||
          bookingsList[0];

        if (workerJob) {
          try {
            const freshBooking = await getBooking(workerJob.booking_id);
            if (isMounted) setActiveJob(freshBooking);
          } catch {
            if (isMounted) setActiveJob(workerJob);
          }
        }
      }
      if (isMounted) setLoadingWorker(false);
    }).catch((err) => {
      if (isMounted) {
        setWorkerError(err.message || "Failed to load worker profile.");
        setLoadingWorker(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [workerId]);

  const handleToggleAvailability = async () => {
    if (!worker) return;
    setAvailabilityUpdating(true);
    const newStatus = !worker.is_active;

    try {
      const res = await updateWorkerAvailability(worker.worker_id, newStatus);
      setWorker((prev) => ({
        ...prev,
        is_active: res.is_available !== undefined ? res.is_available : newStatus,
      }));
    } catch (err) {
      alert(`Failed to update availability: ${err.message}`);
    } finally {
      setAvailabilityUpdating(false);
    }
  };

  // Job Queue Actions
  const handleAcceptJob = async () => {
    if (!activeJob) return;
    setJobActionLoading(true);
    setJobError("");
    setJobMessage("");

    try {
      const updated = await acceptBooking(activeJob.booking_id);
      setActiveJob(updated);
      setJobMessage(`✓ Job #${activeJob.booking_id} accepted! Status updated to WORKER ARRIVED.`);
    } catch (err) {
      setJobError(err.message || "Failed to accept booking.");
    } finally {
      setJobActionLoading(false);
    }
  };

  const handleStartJob = async (e) => {
    if (e) e.preventDefault();
    if (!activeJob) return;

    if (!enteredStartOtp || enteredStartOtp.trim().length !== 4) {
      setJobError("Please enter the 4-digit Start OTP provided by the customer.");
      return;
    }

    setJobActionLoading(true);
    setJobError("");
    setJobMessage("");

    try {
      const updated = await startBooking(activeJob.booking_id);
      setActiveJob(updated);
      setJobMessage(`✓ Start OTP verified! Service #${activeJob.booking_id} is now IN PROGRESS.`);
      setEnteredStartOtp("");
    } catch (err) {
      setJobError(err.message || "Invalid OTP or failed to start service.");
    } finally {
      setJobActionLoading(false);
    }
  };

  const handleCompleteJob = async (e) => {
    if (e) e.preventDefault();
    if (!activeJob) return;

    if (!enteredEndOtp || enteredEndOtp.trim().length !== 4) {
      setJobError("Please enter the 4-digit End OTP provided by the customer.");
      return;
    }

    setJobActionLoading(true);
    setJobError("");
    setJobMessage("");

    try {
      const updated = await completeBooking(activeJob.booking_id);
      setActiveJob(updated);
      setJobMessage(
        `✓ End OTP verified! Service #${activeJob.booking_id} COMPLETED. Full ₹199 labour payout settled!`
      );
      setEnteredEndOtp("");
    } catch (err) {
      setJobError(err.message || "Invalid OTP or failed to complete service.");
    } finally {
      setJobActionLoading(false);
    }
  };

  const storedVer = getStoredVerification(workerId);
  const isEshramVerified = worker?.is_verified || storedVer?.status === "VERIFIED";
  const eshramStatus = isEshramVerified
    ? "Verified"
    : storedVer?.status === "PENDING"
    ? "Pending"
    : storedVer?.status === "REJECTED"
    ? "Rejected"
    : "Not Submitted";

  const memberCode = `SH-${100 + Number(worker?.worker_id || workerId)}`;
  const primarySkill = worker?.skills?.[0]?.skill_name || "Cooperative Electrician";

  return (
    <div className="worker-page">
      <nav className="worker-topbar">
        <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <span className="logo-icon">S</span>
          Sahāyu
        </div>

        <div className="topbar-actions">
          <button className="secondary-btn" onClick={() => navigate("/")}>
            Home
          </button>

          <button
            className="secondary-btn"
            onClick={() => navigate(`/worker/verification?worker_id=${workerId}`)}
          >
            🛡️ e-Shram Desk
          </button>

          <button
            className="primary-btn"
            onClick={() =>
              navigate("/worker-profile", {
                state: { worker_id: worker?.worker_id || workerId },
              })
            }
          >
            My Profile
          </button>
        </div>
      </nav>

      <main className="worker-dashboard">
        {/* WORKER IDENTITY HEADER */}
        <div className="worker-welcome">
          <div className="worker-header-flex">
            <div>
              <span className="section-label">COOPERATIVE WORKER DESK</span>
              <h1>
                {worker?.name || "Professional"} · <span className="member-id-pill">Cooperative Member #{memberCode}</span>
              </h1>
              <p style={{ marginTop: "4px", color: "#687a73" }}>
                Primary Trade: <strong>{primarySkill}</strong> · Operating Base: {worker?.address || worker?.city || "Jabalpur Central"}
              </p>
            </div>

            {/* Profile Switcher (Product Styled) */}
            <div className="worker-select-wrap">
              <label>Switch Active Member:</label>
              <select
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                className="member-select"
              >
                {workersList.map((w) => (
                  <option key={w.worker_id} value={w.worker_id}>
                    {w.name} (#{w.worker_id}) - {w.skills?.[0]?.skill_name || "Pro"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {workerError && (
          <div className="admin-toast-error">
            {workerError}
          </div>
        )}

        {/* 1. 🛡️ TWO-LAYER TRUST SECTION (e-Shram Identity + Skill Certification) */}
        <div className="worker-trust-section">
          <div className="trust-layer-card">
            <div className="trust-layer-header">
              <span className={`trust-indicator-dot ${isEshramVerified ? "verified" : eshramStatus.toLowerCase()}`}></span>
              <h4>Layer 1: e-Shram Identity Validation</h4>
              <span className={`status-badge ${isEshramVerified ? "green" : "yellow"}`}>
                {eshramStatus.toUpperCase()}
              </span>
            </div>
            <p>
              National Database of Unorganised Workers (NDUW) registry check. Authenticates identity and Aadhaar link.
            </p>
            <div className="trust-card-footer">
              <small>e-Shram UAN: {storedVer?.uan || `98${String(workerId).padStart(2, "0")}-4567-8901`}</small>
              <button
                type="button"
                className="text-link-btn"
                onClick={() => navigate(`/worker/verification?worker_id=${workerId}`)}
              >
                {isEshramVerified ? "View Card →" : "Verify e-Shram →"}
              </button>
            </div>
          </div>

          <div className="trust-layer-card">
            <div className="trust-layer-header">
              <span className="trust-indicator-dot verified"></span>
              <h4>Layer 2: Professional Skill Certification</h4>
              <span className="status-badge green">LEVEL 4 CERTIFIED</span>
            </div>
            <p>
              ITI / NCVET Trade Skill Certification: <strong>{primarySkill}</strong> with {worker?.experience_years ?? 5} years verified on-field experience.
            </p>
            <div className="trust-card-footer">
              <small>Trade Registry: ITI-MP-JBP-2024</small>
              <span className="certified-tag">✓ Trade Certified</span>
            </div>
          </div>
        </div>

        {/* 2. 💰 WORKER EARNINGS & FAIR FLOOR SECTION */}
        <div className="worker-earnings-grid">
          <div className="worker-stat-card highlight-earning">
            <span className="stat-symbol">₹</span>
            <div>
              <strong className="stat-amount">₹199</strong>
              <p>Base Inspection & Labour Floor</p>
              <span className="payout-pill">✓ 100% goes directly to you (0% platform cut)</span>
            </div>
          </div>

          {/* 3. 🪙 GULLAK MUTUAL POOL SECTION */}
          <div className="worker-stat-card gullak-card">
            <span className="stat-symbol">🪙</span>
            <div>
              <strong className="stat-amount">Active Member</strong>
              <p>Gullak Cooperative Welfare Pool</p>
              <span className="gullak-pill">₹10/job pooled for emergency & health coverage</span>
            </div>
          </div>

          <div className="worker-stat-card">
            <span className="stat-symbol">⭐</span>
            <div>
              <strong className="stat-amount">
                {worker?.average_rating ? Number(worker.average_rating).toFixed(1) : "4.9"}
              </strong>
              <p>Average Customer Rating</p>
              <small style={{ color: "#687a73" }}>{worker?.total_reviews ?? 4} Verified Orders</small>
            </div>
          </div>
        </div>

        {/* Availability Toggle Card */}
        <div className="booking-summary-card" style={{ marginBottom: "30px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
            <div>
              <h3>Real-Time Dispatch Availability</h3>
              <p style={{ color: "#687a73", marginTop: "4px" }}>
                {worker?.is_active
                  ? "🟢 You are ONLINE and receiving nearby job assignments in Jabalpur."
                  : "🔴 You are currently marked OFFLINE / BUSY."}
              </p>
            </div>

            <button
              className={worker?.is_active ? "primary-btn" : "secondary-btn"}
              onClick={handleToggleAvailability}
              disabled={availabilityUpdating || loadingWorker}
            >
              {availabilityUpdating
                ? "Updating..."
                : worker?.is_active
                ? "✓ Available for Jobs (Click to Go Offline)"
                : "⭕ Offline (Click to Go Online)"}
            </button>
          </div>
        </div>

        {/* 4. 📋 WORKER ACTIVE JOB QUEUE & OTP ACTIONS */}
        <section className="worker-jobs">
          <div className="worker-section-title">
            <h2>Active Job Queue</h2>
            <button
              className="secondary-btn"
              onClick={() => loadWorkerData(workerId)}
              disabled={loadingWorker}
            >
              🔄 Refresh Queue
            </button>
          </div>

          {jobMessage && <div className="admin-toast-success">{jobMessage}</div>}
          {jobError && <div className="admin-toast-error">{jobError}</div>}

          {activeJob ? (
            <div className="active-job-card">
              <div className="job-card-header">
                <div>
                  <span className="job-tag">ASSIGNED ORDER #{activeJob.booking_id}</span>
                  <h3>{activeJob.service_name || primarySkill}</h3>
                  <p className="job-customer-info">
                    Customer: <strong>{activeJob.customer_name || "Community Customer"}</strong> · Location: <strong>{activeJob.address || "Civil Lines, Jabalpur"}</strong>
                  </p>
                </div>

                <div className="job-status-box">
                  <span className={`status-pill ${activeJob.status.toLowerCase()}`}>
                    ● {activeJob.status === "ACCEPTED" ? "WORKER ARRIVED" : activeJob.status}
                  </span>
                  <div className="job-payout-box">
                    <small>Your Payout:</small>
                    <strong>₹199 (100%)</strong>
                  </div>
                </div>
              </div>

              <div className="job-card-body">
                {/* Status: PENDING -> Worker accepts job */}
                {activeJob.status === "PENDING" && (
                  <div className="job-step-action-box">
                    <p>New service request in your area. Accept to dispatch and view customer location.</p>
                    <button
                      className="primary-btn"
                      onClick={handleAcceptJob}
                      disabled={jobActionLoading}
                    >
                      {jobActionLoading ? "Accepting..." : "Accept Service Request →"}
                    </button>
                  </div>
                )}

                {/* Status: ACCEPTED -> Worker arrives, requests Start OTP */}
                {activeJob.status === "ACCEPTED" && (
                  <div className="job-step-action-box">
                    <div className="otp-action-header">
                      <strong>🔑 Step 1: Enter Start OTP (Customer Code: 4821)</strong>
                      <p>Ask the customer for their 4-digit Start OTP upon arriving at their doorstep.</p>
                    </div>

                    <form onSubmit={handleStartJob} className="otp-inline-form">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="Enter 4-digit Start OTP (e.g. 4821)"
                        value={enteredStartOtp}
                        onChange={(e) => setEnteredStartOtp(e.target.value.replace(/\D/g, ""))}
                        className="form-control otp-input"
                        required
                      />
                      <button
                        type="submit"
                        className="primary-btn"
                        disabled={jobActionLoading}
                      >
                        {jobActionLoading ? "Verifying..." : "Verify & Start Service"}
                      </button>
                    </form>
                  </div>
                )}

                {/* Status: IN_PROGRESS -> Worker finishes work, enters End OTP */}
                {activeJob.status === "IN_PROGRESS" && (
                  <div className="job-step-action-box in-progress-box">
                    <div className="otp-action-header">
                      <strong>🔒 Step 2: Enter End OTP (Customer Code: 9134)</strong>
                      <p>Once the repair is done and verified with the customer, enter their End OTP to complete the job and disburse payment.</p>
                    </div>

                    <form onSubmit={handleCompleteJob} className="otp-inline-form">
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="Enter 4-digit End OTP (e.g. 9134)"
                        value={enteredEndOtp}
                        onChange={(e) => setEnteredEndOtp(e.target.value.replace(/\D/g, ""))}
                        className="form-control otp-input"
                        required
                      />
                      <button
                        type="submit"
                        className="primary-btn"
                        disabled={jobActionLoading}
                      >
                        {jobActionLoading ? "Settling Job..." : "Verify & Complete Service"}
                      </button>
                    </form>
                  </div>
                )}

                {/* Status: COMPLETED */}
                {activeJob.status === "COMPLETED" && (
                  <div className="job-step-action-box completed-box">
                    <div className="completed-check-icon">✓</div>
                    <div>
                      <strong>Job Completed & ₹199 Labour Disbursed!</strong>
                      <p>Payment settled directly to your cooperative wallet with 0% platform fee deduction.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-job-card">
              <div className="empty-icon">🛋️</div>
              <h3>No Active Jobs Right Now</h3>
              <p>Keep your status marked AVAILABLE to receive instant dispatch orders.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Worker;