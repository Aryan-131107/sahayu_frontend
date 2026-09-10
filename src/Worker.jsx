import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  getWorker,
  getWorkers,
  updateWorkerAvailability,
  getBooking,
  getCustomerBookings,
  acceptBooking,
  verifyStartOtp,
  verifyEndOtp,
  getStoredVerification,
  getRateCardForBooking,
  getBookingQuotation,
  saveBookingQuotation,
  getBookingPayment,
  saveBookingPayment,
  getBookingWarranty,
  saveBookingWarranty,
  completeBooking,
} from "./api";
import WarrantyCountdown from "./WarrantyCountdown";
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
  const [verifyingStart, setVerifyingStart] = useState(false);
  const [verifyingEnd, setVerifyingEnd] = useState(false);
  const [isPaymentPending, setIsPaymentPending] = useState(false);
  const [payingDemo, setPayingDemo] = useState(false);
  const [jobMessage, setJobMessage] = useState("");
  const [jobError, setJobError] = useState("");
  const [shakeStart, setShakeStart] = useState(false);
  const [shakeEnd, setShakeEnd] = useState(false);
  const [consensusSuccess, setConsensusSuccess] = useState(null);

  // Quotation Builder State (On-Site Inspection)
  const [, setQuoteVersion] = useState(0);
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [quoteSuccessMsg, setQuoteSuccessMsg] = useState("");

  const quotation = activeJob?.booking_id ? getBookingQuotation(activeJob.booking_id) : null;
  const currentRateCard = useMemo(() => getRateCardForBooking(activeJob), [activeJob]);

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
    if ((activeJob.status || "").toUpperCase() !== "ASSIGNED") {
      try {
        const fresh = await getBooking(activeJob.booking_id);
        setActiveJob(fresh);
      } catch {
        // Handled
      }
      return;
    }

    setJobActionLoading(true);
    setJobError("");
    setJobMessage("");
    setConsensusSuccess(null);

    try {
      const updated = await acceptBooking(activeJob.booking_id);
      setActiveJob(updated);
      setJobMessage(`✓ Job #${activeJob.booking_id} accepted! Status updated to WORKER ARRIVED.`);
    } catch (err) {
      try {
        const fresh = await getBooking(activeJob.booking_id);
        setActiveJob(fresh);
      } catch {
        // Handled
      }
      if ((activeJob.status || "").toUpperCase() === "ASSIGNED") {
        setJobError(err.message || "Failed to accept booking.");
      }
    } finally {
      setJobActionLoading(false);
    }
  };

  const handleStartJob = async (e) => {
    if (e) e.preventDefault();
    if (!activeJob) return;

    const trimmed = enteredStartOtp.trim();
    if (!trimmed || !/^\d{4}$/.test(trimmed)) {
      setJobError("Please enter the 4-digit Start PIN (numbers only).");
      setShakeStart(true);
      setTimeout(() => setShakeStart(false), 600);
      return;
    }

    setVerifyingStart(true);
    setJobError("");
    setJobMessage("");
    setConsensusSuccess(null);

    try {
      const res = await verifyStartOtp({
        booking_id: activeJob.booking_id,
        otp: trimmed,
      });

      // ONLY transition state upon backend confirmation
      const freshBooking = await getBooking(activeJob.booking_id);
      setActiveJob(freshBooking);

      setConsensusSuccess({
        type: "START",
        txnId: res.transaction_id || `TXN-START-${String(activeJob.booking_id).padStart(6, "0")}`,
        timestamp: res.verification_timestamp || new Date().toISOString(),
        message: res.message || "Doorstep arrival verified. Work is now in progress.",
      });

      setEnteredStartOtp("");
    } catch (err) {
      const msg = err.message || "Invalid Handshake PIN.";
      setJobError(
        msg.includes("Invalid Handshake PIN")
          ? `✕ ${msg}`
          : `✕ Invalid Handshake PIN: ${msg}`
      );
      setShakeStart(true);
      setTimeout(() => setShakeStart(false), 600);
    } finally {
      setVerifyingStart(false);
    }
  };

  const calculatePayableTotal = () => {
    const base = 239;
    if (quotation && quotation.status === "APPROVED") {
      return base + (quotation.additional_amount || 0);
    }
    return base;
  };

  const handleCompleteJob = async (e) => {
    if (e) e.preventDefault();
    if (!activeJob) return;

    const trimmed = enteredEndOtp.trim();
    if (!trimmed || !/^\d{4}$/.test(trimmed)) {
      setJobError("Please enter the 4-digit Completion PIN (numbers only).");
      setShakeEnd(true);
      setTimeout(() => setShakeEnd(false), 600);
      return;
    }

    setVerifyingEnd(true);
    setJobError("");
    setJobMessage("");
    setConsensusSuccess(null);

    try {
      const res = await verifyEndOtp({
        booking_id: activeJob.booking_id,
        otp: trimmed,
      });

      // ONLY transition state upon backend confirmation
      const freshBooking = await getBooking(activeJob.booking_id).catch(() => null);
      if (freshBooking) {
        setActiveJob(freshBooking);
      } else {
        setActiveJob((prev) => ({
          ...(prev || {}),
          status: "PAYMENT_PENDING",
          end_otp_verified_at: new Date().toISOString(),
        }));
      }

      setIsPaymentPending(true);
      setConsensusSuccess({
        type: "END",
        txnId: res?.transaction_id || `TXN-SAHAYU-${String(activeJob.booking_id).padStart(6, "0")}`,
        timestamp: res?.completion_timestamp || new Date().toISOString(),
        message: res?.message || "Completion PIN verified. Ready for payment settlement.",
      });

      setEnteredEndOtp("");
    } catch (err) {
      const msg = err.message || "Invalid Completion PIN.";
      setJobError(
        msg.includes("Invalid")
          ? `✕ ${msg}`
          : `✕ Invalid Completion PIN: ${msg}`
      );
      setShakeEnd(true);
      setTimeout(() => setShakeEnd(false), 600);
    } finally {
      setVerifyingEnd(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!activeJob) return;
    setPayingDemo(true);
    setJobError("");

    try {
      const finalAmount = calculatePayableTotal();
      const paidAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString();

      const pData = {
        booking_id: activeJob.booking_id,
        amount: finalAmount,
        status: "PAID",
        paid_at: paidAt,
      };
      saveBookingPayment(activeJob.booking_id, pData);

      const wData = {
        started_at: paidAt,
        expires_at: expiresAt,
        active: true,
      };
      saveBookingWarranty(activeJob.booking_id, wData);

      try {
        await completeBooking(activeJob.booking_id);
      } catch (err) {
        console.debug("Backend complete sync note:", err);
      }

      const freshBooking = await getBooking(activeJob.booking_id).catch(() => null);
      if (freshBooking) {
        setActiveJob({
          ...freshBooking,
          status: "COMPLETED",
          payment_status: "PAID",
          warranty_started_at: paidAt,
          warranty_expires_at: expiresAt,
        });
      } else {
        setActiveJob((prev) => ({
          ...(prev || {}),
          status: "COMPLETED",
          payment_status: "PAID",
          warranty_started_at: paidAt,
          warranty_expires_at: expiresAt,
        }));
      }

      setIsPaymentPending(false);
      setJobMessage("✓ Payment received & 72-hour workmanship protection activated!");
    } catch (err) {
      setJobError(err.message || "Failed to process payment.");
    } finally {
      setPayingDemo(false);
    }
  };

  const handleToggleItemInQuote = (item) => {
    setSelectedItems((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) {
        return prev.filter((i) => i.id !== item.id);
      } else {
        return [...prev, { ...item, qty: 1 }];
      }
    });
  };

  const handleUpdateItemQty = (itemId, delta) => {
    setSelectedItems((prev) =>
      prev
        .map((i) => {
          if (i.id === itemId) {
            const newQty = Math.max(1, i.qty + delta);
            return { ...i, qty: newQty };
          }
          return i;
        })
        .filter((i) => i.qty > 0)
    );
  };

  const calculateAdditionalTotal = () => {
    return selectedItems.reduce((acc, item) => acc + item.price * (item.qty || 1), 0);
  };

  const handleSubmitQuotation = () => {
    if (!activeJob) return;
    if (selectedItems.length === 0) {
      alert("Please select at least one additional item/part to create a quotation.");
      return;
    }
    const extraTotal = calculateAdditionalTotal();
    const payload = {
      booking_id: activeJob.booking_id,
      items: selectedItems,
      additional_amount: extraTotal,
      total_with_base: 239 + extraTotal,
      status: "PENDING_APPROVAL",
      created_at: new Date().toISOString(),
    };
    saveBookingQuotation(activeJob.booking_id, payload);
    setQuoteVersion((v) => v + 1);
    setShowQuoteBuilder(false);
    setQuoteSuccessMsg("✓ Additional work quotation submitted to customer for live approval!");
    setTimeout(() => setQuoteSuccessMsg(""), 5000);
  };

  const handleCancelQuotation = () => {
    if (!activeJob) return;
    saveBookingQuotation(activeJob.booking_id, null);
    setQuoteVersion((v) => v + 1);
    setSelectedItems([]);
    setShowQuoteBuilder(false);
  };

  const formatTime = (isoString) => {
    if (!isoString) return new Date().toLocaleString("en-IN");
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoString;
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
            className="primary-btn"
            style={{ background: "#0284c7", borderColor: "#0284c7" }}
            onClick={() => navigate("/live-demo")}
          >
            ⚡ Live Demo
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

          {consensusSuccess && (
            <div className="consensus-success-banner" style={{ marginBottom: "20px" }}>
              <div className="consensus-icon">✓</div>
              <div className="consensus-body">
                <strong>Verified via Backend Consensus</strong>
                <p>Txn #{consensusSuccess.txnId} Committed</p>
                <small>{formatTime(consensusSuccess.timestamp)}</small>
              </div>
            </div>
          )}

          {jobMessage && <div className="admin-toast-success">{jobMessage}</div>}
          {jobError && <div className="admin-toast-error">{jobError}</div>}

          {activeJob ? (() => {
            const rawStatus = (activeJob.status || "").toUpperCase();
            const isPaid = activeJob.payment_status === "PAID" || rawStatus === "COMPLETED";
            const isPendingPayment = isPaymentPending || rawStatus === "PAYMENT_PENDING" || rawStatus === "WORK_COMPLETED";

            let normStatus = rawStatus;
            if (isPaid || rawStatus === "COMPLETED") {
              normStatus = "COMPLETED";
            } else if (isPendingPayment) {
              normStatus = "PAYMENT_PENDING";
            } else if (rawStatus === "IN_PROGRESS") {
              normStatus = "IN_PROGRESS";
            } else if (rawStatus === "ACCEPTED") {
              normStatus = "ACCEPTED";
            } else if (rawStatus === "ASSIGNED" || rawStatus === "PENDING") {
              normStatus = "ASSIGNED";
            } else if (rawStatus === "CANCELLED") {
              normStatus = "CANCELLED";
            }

            return (
            <div className="active-job-card">
              <div className="job-card-header">
                <div>
                  <span className="job-tag">ASSIGNED ORDER #{activeJob.booking_reference || `SH-00${activeJob.booking_id}`}</span>
                  <h3>{activeJob.service_name || primarySkill}</h3>
                  <p className="job-customer-info">
                    Customer: <strong>{activeJob.customer_name || "Community Customer"}</strong> · Location: <strong>{activeJob.address || "Civil Lines, Jabalpur"}</strong>
                  </p>
                </div>

                <div className="job-status-box">
                  <span className={`status-pill ${normStatus.toLowerCase()}`}>
                    ● {normStatus === "ACCEPTED" ? "WORKER ARRIVED" : normStatus === "IN_PROGRESS" ? "IN PROGRESS" : normStatus === "PAYMENT_PENDING" ? "PAYMENT PENDING" : normStatus}
                  </span>
                  <div className="job-payout-box">
                    <small>Your Payout:</small>
                    <strong>₹199 (100%)</strong>
                  </div>
                </div>
              </div>

              <div className="job-card-body">
                {/* Status: CANCELLED -> Notice */}
                {normStatus === "CANCELLED" && (
                  <div className="job-step-action-box" style={{ background: "#fef2f2", borderColor: "#f87171" }}>
                    <strong style={{ color: "#991b1b" }}>Booking is Cancelled</strong>
                    <p style={{ color: "#b91c1c", marginTop: "4px" }}>This booking order has been cancelled.</p>
                  </div>
                )}

                {/* Status: ASSIGNED -> Worker accepts job */}
                {normStatus === "ASSIGNED" && (
                  <div className="job-step-action-box">
                    <p>New service request in your area. Accept to dispatch and view customer location.</p>
                    <button
                      className="primary-btn"
                      onClick={handleAcceptJob}
                      disabled={jobActionLoading}
                    >
                      {jobActionLoading ? "⟳ Accepting Request..." : "Accept Service Request →"}
                    </button>
                  </div>
                )}

                {/* Status: ACCEPTED -> Worker arrives, requests Start OTP */}
                {normStatus === "ACCEPTED" && (
                  <div className="job-step-action-box">
                    <div className="otp-action-header">
                      <strong>🔑 Step 1: Enter Start PIN (Customer Code: {activeJob.start_otp || "4821"})</strong>
                      <p>Ask the customer for their 4-digit Start PIN upon arriving at their doorstep.</p>
                    </div>

                    <form onSubmit={handleStartJob} className={`otp-inline-form ${shakeStart ? "shake-anim" : ""}`}>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="Enter 4-digit Start PIN (e.g. 4821)"
                        value={enteredStartOtp}
                        onChange={(e) => setEnteredStartOtp(e.target.value.replace(/\D/g, ""))}
                        disabled={verifyingStart}
                        className="form-control otp-input"
                        autoComplete="off"
                        required
                      />
                      <button
                        type="submit"
                        className="primary-btn"
                        disabled={verifyingStart}
                      >
                        {verifyingStart ? "⟳ Verifying Start PIN..." : "Verify Start PIN"}
                      </button>
                    </form>
                  </div>
                )}

                {/* Status: IN_PROGRESS -> On-Site Inspection, Additional Quotation, and End OTP */}
                {normStatus === "IN_PROGRESS" && (
                  <div>
                    {quoteSuccessMsg && (
                      <div className="admin-toast-success" style={{ marginBottom: "14px" }}>
                        {quoteSuccessMsg}
                      </div>
                    )}

                    {/* On-Site Inspection & Quotation Card */}
                    <div className="quotation-panel-card" style={{ marginBottom: "20px" }}>
                      <div className="quotation-panel-header">
                        <div>
                          <span className="quote-badge">ON-SITE INSPECTION</span>
                          <h4>Add-on Service (Optional)</h4>
                          <p>
                            If parts replacement or extra labour is required beyond the ₹239 base inspection, select items from the cooperative rate card for customer approval.
                          </p>
                        </div>

                        {!quotation && !showQuoteBuilder && (
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => setShowQuoteBuilder(true)}
                          >
                            + Add Service / Material
                          </button>
                        )}
                      </div>

                      {/* Active Quotation Display */}
                      {quotation && (
                        <div className="active-quotation-summary">
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                            <strong>Quotation #{quotation.booking_id} Breakdown</strong>
                            <span
                              className={`status-badge ${
                                quotation.status === "APPROVED"
                                  ? "green"
                                  : quotation.status === "REJECTED"
                                  ? "red"
                                  : "yellow"
                              }`}
                            >
                              {quotation.status === "APPROVED"
                                ? "✓ APPROVED BY CUSTOMER"
                                : quotation.status === "REJECTED"
                                ? "✕ DECLINED (BASE WORK ONLY)"
                                : "⏳ AWAITING CUSTOMER APPROVAL"}
                            </span>
                          </div>

                          <div className="quote-items-table">
                            {quotation.items?.map((item, idx) => (
                              <div key={idx} className="quote-item-row">
                                <span>{item.name || item.title} × {item.qty}</span>
                                <strong>₹{item.price * item.qty}</strong>
                              </div>
                            ))}
                            <div className="quote-item-row" style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "6px" }}>
                              <span>Initial Inspection:</span>
                              <span>₹239</span>
                            </div>
                            {quotation.status === "APPROVED" && (
                              <div className="quote-item-row" style={{ color: "#059669", fontWeight: 600 }}>
                                <span>Approved Add-ons:</span>
                                <strong>+₹{quotation.additional_amount}</strong>
                              </div>
                            )}
                            <div className="quote-item-row quote-total-row">
                              <span>Final Bill:</span>
                              <strong style={{ color: "#059669", fontSize: "16px" }}>
                                ₹{quotation.status === "APPROVED" ? 239 + quotation.additional_amount : 239}
                              </strong>
                            </div>
                          </div>

                          {quotation.status === "PENDING_APPROVAL" && (
                            <div style={{ marginTop: "10px", display: "flex", gap: "10px", alignItems: "center" }}>
                              <small style={{ color: "#d97706" }}>
                                🔔 Waiting for customer to approve in their Sahāyu app...
                              </small>
                              <button
                                type="button"
                                className="text-btn"
                                style={{ color: "#ef4444", fontSize: "12px", marginLeft: "auto" }}
                                onClick={handleCancelQuotation}
                              >
                                Cancel Quote
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Interactive Rate Card Quotation Builder */}
                      {showQuoteBuilder && (
                        <div className="rate-card-builder-box">
                          <div style={{ marginBottom: "12px" }}>
                            <span className="quote-badge">RATE CARD: COOPERATIVE APPROVED RATES</span>
                            <h5 style={{ margin: "4px 0 2px", fontSize: "14px", color: "#0f172a" }}>
                              Current Service: {activeJob.service_name || currentRateCard.tradeTitle}
                            </h5>
                            <small style={{ color: "#64748b" }}>
                              Required Trade Skill: <strong>{currentRateCard.skillName}</strong>
                            </small>
                          </div>

                          <div className="rate-items-grid">
                            {currentRateCard.items.map((item) => {
                              const selected = selectedItems.find((i) => i.id === item.id);
                              return (
                                <div
                                  key={item.id}
                                  className={`rate-item-card ${selected ? "selected" : ""}`}
                                  onClick={() => handleToggleItemInQuote(item)}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <strong>{item.name || item.title}</strong>
                                    <span className="rate-price">₹{item.price}</span>
                                  </div>
                                  <small style={{ color: "#64748b" }}>{item.category}</small>

                                  {selected && (
                                    <div
                                      className="qty-selector"
                                      onClick={(e) => e.stopPropagation()}
                                      style={{ marginTop: "6px", display: "flex", alignItems: "center", gap: "8px" }}
                                    >
                                      <small>Qty:</small>
                                      <button
                                        type="button"
                                        className="qty-btn"
                                        onClick={() => handleUpdateItemQty(item.id, -1)}
                                      >
                                        -
                                      </button>
                                      <span>{selected.qty}</span>
                                      <button
                                        type="button"
                                        className="qty-btn"
                                        onClick={() => handleUpdateItemQty(item.id, 1)}
                                      >
                                        +
                                      </button>
                                      <button
                                        type="button"
                                        className="text-btn"
                                        style={{ color: "#ef4444", fontSize: "11px", marginLeft: "auto" }}
                                        onClick={() => handleToggleItemInQuote(item)}
                                      >
                                        ✕ Remove
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          <div className="quote-calc-footer">
                            <div>
                              <span>Additional Work Subtotal: </span>
                              <strong style={{ color: "#059669", fontSize: "16px" }}>
                                +₹{calculateAdditionalTotal()}
                              </strong>
                              <small style={{ display: "block", color: "#64748b" }}>
                                Total with ₹239 base: ₹{239 + calculateAdditionalTotal()}
                              </small>
                            </div>

                            <div style={{ display: "flex", gap: "8px" }}>
                              <button
                                type="button"
                                className="secondary-btn"
                                onClick={() => setShowQuoteBuilder(false)}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="primary-btn"
                                onClick={handleSubmitQuotation}
                                disabled={selectedItems.length === 0}
                              >
                                Submit Quote for Approval →
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Step 2: Completion PIN Handshake Form */}
                    <div className="job-step-action-box in-progress-box">
                      <div className="otp-action-header">
                        <strong>🔒 Step 2: Enter Completion PIN (Customer Code: {activeJob.end_otp || activeJob.completion_otp || "9134"})</strong>
                        <p>
                          Once all physical work is finished and verified by customer, enter their Completion PIN to validate completion.
                        </p>
                      </div>

                      <form onSubmit={handleCompleteJob} className={`otp-inline-form ${shakeEnd ? "shake-anim" : ""}`}>
                        <input
                          type="text"
                          maxLength={4}
                          placeholder="Enter 4-digit Completion PIN (e.g. 9134)"
                          value={enteredEndOtp}
                          onChange={(e) => setEnteredEndOtp(e.target.value.replace(/\D/g, ""))}
                          disabled={verifyingEnd}
                          className="form-control otp-input"
                          autoComplete="off"
                          required
                        />
                        <button
                          type="submit"
                          className="primary-btn"
                          disabled={verifyingEnd}
                        >
                          {verifyingEnd ? "⟳ Verifying Completion PIN..." : "Verify Completion PIN"}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {/* Status: PAYMENT_PENDING -> Payment Demo */}
                {normStatus === "PAYMENT_PENDING" && (
                  <div className="job-step-action-box payment-pending-box" style={{ background: "#f8fafc", border: "2px solid #059669", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <strong style={{ fontSize: "15px", color: "#0f172a" }}>💳 Payment Demo</strong>
                      <span className="status-badge yellow" style={{ fontSize: "11px", padding: "3px 8px" }}>
                        AWAITING PAYMENT
                      </span>
                    </div>

                    <p style={{ fontSize: "12px", color: "#475569", margin: "0 0 12px" }}>
                      Completion PIN verified! Confirm or simulate customer payment for the final amount.
                    </p>

                    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px", marginBottom: "14px", fontSize: "13px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#475569", marginBottom: "6px" }}>
                        <span>Initial Inspection / Booking</span>
                        <span>₹239</span>
                      </div>
                      {quotation && quotation.status === "APPROVED" && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#059669", fontWeight: 600, marginBottom: "6px" }}>
                          <span>Approved Add-ons</span>
                          <span>+₹{quotation.additional_amount}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, color: "#0f172a", borderTop: "1px solid #e2e8f0", paddingTop: "8px", marginTop: "4px", fontSize: "14px" }}>
                        <span>Final Amount</span>
                        <strong style={{ color: "#059669" }}>₹{calculatePayableTotal()}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="primary-btn full-btn"
                      style={{ width: "100%", padding: "10px 14px", background: "#059669", borderColor: "#059669", fontSize: "13px", fontWeight: 700 }}
                      onClick={handleSimulatePayment}
                      disabled={payingDemo}
                    >
                      {payingDemo ? "⟳ Processing Payment..." : `[ Simulate Payment ₹${calculatePayableTotal()} ]`}
                    </button>
                  </div>
                )}

                {/* Status: COMPLETED */}
                {normStatus === "COMPLETED" && (
                  <div>
                    <div className="job-step-action-box completed-box" style={{ marginBottom: "16px" }}>
                      <div className="completed-check-icon">✓</div>
                      <div>
                        <strong>Job Completed & ₹199 Labour Disbursed!</strong>
                        <p>Payment settled directly to your cooperative wallet with 0% platform fee deduction.</p>
                      </div>
                    </div>

                    <WarrantyCountdown
                      warrantyExpiresAt={activeJob.warranty_expires_at}
                      warrantyStartedAt={activeJob.warranty_started_at}
                      status={activeJob.status}
                    />
                  </div>
                )}
              </div>
            </div>
            );
          })() : (
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