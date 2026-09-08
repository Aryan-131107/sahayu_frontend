import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getBooking,
  getCustomerBookings,
  createBooking,
  acceptBooking,
  verifyStartOtp,
  verifyEndOtp,
  getWorkers,
} from "./api";
import ServiceTimeline from "./ServiceTimeline";
import WarrantyCountdown from "./WarrantyCountdown";
import "./App.css";

/**
 * Dual-Persona Presentation Mode (Live Consensus Demo)
 * LEFT: Customer Device (Sahāyu App)
 * RIGHT: Technician Terminal (Worker Portal)
 * Authoritatively driven by FastAPI backend with real-time polling synchronization.
 */
export default function PresentationMode() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [bookingId, setBookingId] = useState(
    () => searchParams.get("booking_id") || "63"
  );
  const [booking, setBooking] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [error, setError] = useState("");
  const [pollActive, setPollActive] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  // Worker OTP Action States
  const [enteredStartOtp, setEnteredStartOtp] = useState("");
  const [enteredEndOtp, setEnteredEndOtp] = useState("");
  const [verifyingStart, setVerifyingStart] = useState(false);
  const [verifyingEnd, setVerifyingEnd] = useState(false);
  const [acceptingJob, setAcceptingJob] = useState(false);

  // Success Consensus State
  const [startSuccessData, setStartSuccessData] = useState(null);
  const [endSuccessData, setEndSuccessData] = useState(null);

  // OTP Error & Shake states
  const [otpError, setOtpError] = useState("");
  const [shakeStart, setShakeStart] = useState(false);
  const [shakeEnd, setShakeEnd] = useState(false);

  // Polling ref to prevent concurrent fetches
  const isFetchingRef = useRef(false);

  // Fetch Booking authoritative state
  const fetchAuthoritativeBooking = useCallback(
    async (id, isBackground = false) => {
      if (!id) return;
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const data = await getBooking(id);
        setBooking(data);
        setError("");
        setLastSyncTime(new Date());

        // Update search params without pushing history
        setSearchParams({ booking_id: String(id) }, { replace: true });
      } catch (err) {
        if (!isBackground) {
          setError(err.message || `Booking #${id} not found on backend.`);
        }
      } finally {
        if (!isBackground) setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [setSearchParams]
  );

  // Load bookings list for selector
  const loadAvailableBookings = useCallback(async () => {
    try {
      const list = await getCustomerBookings(1);
      if (Array.isArray(list) && list.length > 0) {
        setAllBookings(list);
      }
    } catch {
      // Ignore background error
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getCustomerBookings(1).catch(() => []),
      getBooking(bookingId).catch(() => null),
    ])
      .then(([list, data]) => {
        if (!isMounted) return;
        if (Array.isArray(list) && list.length > 0) {
          setAllBookings(list);
        }
        if (data) {
          setBooking(data);
          setError("");
          setLastSyncTime(new Date());
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || `Booking #${bookingId} not found on backend.`);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [bookingId]);

  // Real-time Polling: Polls every 2.5s for synchronized dual-persona views
  useEffect(() => {
    if (!pollActive || !bookingId) return;

    const interval = setInterval(() => {
      fetchAuthoritativeBooking(bookingId, true);
    }, 2500);

    return () => clearInterval(interval);
  }, [pollActive, bookingId, fetchAuthoritativeBooking]);

  // Create a Fresh 1-Click Test Booking for Live Demonstration
  const handleCreateDemoBooking = async () => {
    setCreatingDemo(true);
    setError("");
    setOtpError("");
    setStartSuccessData(null);
    setEndSuccessData(null);

    try {
      const workers = await getWorkers(false).catch(() => []);
      const workerId = workers.length > 0 ? workers[0].worker_id : 11;

      const newBooking = await createBooking({
        customer_id: 1,
        worker_id: workerId,
        service_id: 1,
        service_lat: 23.1815,
        service_lon: 79.9864,
        amount: 239,
      });

      if (newBooking && newBooking.booking_id) {
        setBookingId(String(newBooking.booking_id));
        setBooking(newBooking);
        loadAvailableBookings();
      }
    } catch (err) {
      setError(err.message || "Failed to create demo booking.");
    } finally {
      setCreatingDemo(false);
    }
  };

  // Technician accepts service request
  const handleAcceptJob = async () => {
    if (!booking) return;
    setAcceptingJob(true);
    setOtpError("");
    setError("");

    try {
      const updated = await acceptBooking(booking.booking_id);
      // ONLY update after backend confirms
      setBooking(updated);
      await fetchAuthoritativeBooking(booking.booking_id, true);
    } catch (err) {
      setOtpError(err.message || "Failed to accept booking.");
    } finally {
      setAcceptingJob(false);
    }
  };

  // Technician verifies Start OTP Handshake
  const handleVerifyStartPin = async (e) => {
    if (e) e.preventDefault();
    if (!booking) return;

    const trimmed = enteredStartOtp.trim();
    if (!trimmed) {
      setOtpError("Please enter the 4-digit Start PIN.");
      triggerShake("start");
      return;
    }

    if (!/^\d{4}$/.test(trimmed)) {
      setOtpError("Invalid format. Handshake PIN must be exactly 4 digits.");
      triggerShake("start");
      return;
    }

    setVerifyingStart(true);
    setOtpError("");

    try {
      const res = await verifyStartOtp({
        booking_id: booking.booking_id,
        otp: trimmed,
      });

      // Backend Success Confirmed!
      setStartSuccessData({
        txnId: res.transaction_id || `TXN-START-${String(booking.booking_id).padStart(6, "0")}`,
        timestamp: res.verification_timestamp || new Date().toISOString(),
        message: res.message || "Doorstep arrival verified. Work is now in progress.",
      });

      setEnteredStartOtp("");
      // Refetch authoritative booking state
      await fetchAuthoritativeBooking(booking.booking_id, true);
    } catch (err) {
      // Backend Rejection (e.g. 400 Bad Request, Attempt X of 3 recorded)
      const msg = err.message || "Invalid Handshake PIN.";
      setOtpError(
        msg.includes("Invalid Handshake PIN")
          ? `✕ ${msg}`
          : `✕ Invalid Handshake PIN: ${msg}`
      );
      triggerShake("start");
    } finally {
      setVerifyingStart(false);
    }
  };

  // Technician verifies End OTP Handshake & Settlement
  const handleVerifyEndPin = async (e) => {
    if (e) e.preventDefault();
    if (!booking) return;

    const trimmed = enteredEndOtp.trim();
    if (!trimmed) {
      setOtpError("Please enter the 4-digit Completion PIN.");
      triggerShake("end");
      return;
    }

    if (!/^\d{4}$/.test(trimmed)) {
      setOtpError("Invalid format. Handshake PIN must be exactly 4 digits.");
      triggerShake("end");
      return;
    }

    setVerifyingEnd(true);
    setOtpError("");

    try {
      const res = await verifyEndOtp({
        booking_id: booking.booking_id,
        otp: trimmed,
      });

      // Backend Success Confirmed!
      setEndSuccessData({
        txnId: res.transaction_id || `TXN-SAHAYU-${String(booking.booking_id).padStart(6, "0")}`,
        timestamp: res.completion_timestamp || new Date().toISOString(),
        message: res.message || "Job completed successfully. Payment settled, Gullak credited, and 72-hour warranty activated.",
        settlement: res.settlement_summary,
      });

      setEnteredEndOtp("");
      // Refetch authoritative booking state
      await fetchAuthoritativeBooking(booking.booking_id, true);
    } catch (err) {
      // Backend Rejection
      const msg = err.message || "Invalid Completion PIN.";
      setOtpError(
        msg.includes("Invalid")
          ? `✕ ${msg}`
          : `✕ Invalid Completion PIN: ${msg}`
      );
      triggerShake("end");
    } finally {
      setVerifyingEnd(false);
    }
  };

  const triggerShake = (type) => {
    if (type === "start") {
      setShakeStart(true);
      setTimeout(() => setShakeStart(false), 600);
    } else {
      setShakeEnd(true);
      setTimeout(() => setShakeEnd(false), 600);
    }
  };

  const normStatus = String(booking?.status || "PENDING").toUpperCase();
  const startOtpCode = booking?.start_otp || "4821";
  const endOtpCode = booking?.end_otp || "9134";

  // Format timestamp safely for consensus banner
  const formatConsensusTime = (isoString) => {
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

  return (
    <div className="presentation-page">
      {/* Top Navbar */}
      <header className="presentation-topbar">
        <div className="topbar-left">
          <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            <span className="logo-icon">S</span>
            Sahāyu
          </div>
          <span className="presentation-badge">⚡ DUAL-PERSONA LIVE CONSENSUS DEMO</span>
        </div>

        <div className="topbar-center">
          <div className="booking-selector-wrap">
            <label>Active Order Reference:</label>
            <select
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="demo-booking-select"
            >
              {allBookings.map((b) => (
                <option key={b.booking_id} value={b.booking_id}>
                  #{b.booking_reference || `SH-00${b.booking_id}`} · {b.service_name || "Service"} ({b.status})
                </option>
              ))}
              {!allBookings.some((b) => String(b.booking_id) === String(bookingId)) && (
                <option value={bookingId}>
                  #{booking?.booking_reference || `SH-00${bookingId}`} (Current)
                </option>
              )}
            </select>
          </div>

          <button
            className="secondary-btn mini-demo-btn"
            onClick={handleCreateDemoBooking}
            disabled={creatingDemo}
          >
            {creatingDemo ? "Creating..." : "+ 1-Click New Demo Booking"}
          </button>
        </div>

        <div className="topbar-right">
          <div className="sync-status-indicator">
            <span className={`sync-dot ${pollActive ? "active" : "paused"}`}></span>
            <small>
              {pollActive ? "Backend Auto-Sync (2.5s)" : "Sync Paused"} · {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </small>
          </div>

          <button
            className="text-btn"
            style={{ color: "#94a3b8", fontSize: "12px" }}
            onClick={() => setPollActive(!pollActive)}
          >
            {pollActive ? "Pause" : "Resume"}
          </button>

          <button
            className="secondary-btn"
            onClick={() => fetchAuthoritativeBooking(bookingId)}
          >
            🔄 Sync Now
          </button>

          <button className="primary-btn" onClick={() => navigate("/")}>
            Exit Demo
          </button>
        </div>
      </header>

      {/* Global State Banner */}
      <div className="demo-state-ribbon">
        <div className="ribbon-item">
          <span className="ribbon-lbl">BACKEND STATUS:</span>
          <strong className={`status-pill ${normStatus.toLowerCase()}`}>
            ● {normStatus === "ACCEPTED" ? "ARRIVED" : normStatus}
          </strong>
        </div>

        <div className="ribbon-item">
          <span className="ribbon-lbl">ORDER REF:</span>
          <strong>#{booking?.booking_reference || `SH-00${bookingId}`}</strong>
        </div>

        <div className="ribbon-item">
          <span className="ribbon-lbl">WAGE SETTLEMENT:</span>
          <strong style={{ color: "#059669" }}>₹199.00 (100% Floor to Worker)</strong>
        </div>

        <div className="ribbon-item">
          <span className="ribbon-lbl">GULLAK FUND:</span>
          <strong style={{ color: "#d97706" }}>+₹10.00 Welfare Contribution</strong>
        </div>

        <div className="ribbon-item">
          <span className="ribbon-lbl">WARRANTY:</span>
          <strong style={{ color: normStatus === "COMPLETED" ? "#0284c7" : "#64748b" }}>
            {normStatus === "COMPLETED" ? "🛡️ Active 72-Hour Window" : "Pending Handshake"}
          </strong>
        </div>
      </div>

      {/* Main Split Screen Presentation */}
      <main className="presentation-container">
        {loading && !booking ? (
          <div className="admin-loading-state" style={{ minHeight: "400px" }}>
            <div className="loading-spinner"></div>
            <p>Synchronizing booking state from backend...</p>
          </div>
        ) : error && !booking ? (
          <div className="admin-error-card" style={{ maxWidth: "600px", margin: "40px auto" }}>
            <h3>Backend State Error</h3>
            <p>{error}</p>
            <button className="primary-btn" onClick={handleCreateDemoBooking}>
              Create New Demo Order →
            </button>
          </div>
        ) : (
          <div className="dual-device-grid">
            {/* =========================================================================
                LEFT DEVICE: CUSTOMER SCREEN (Sahāyu Consumer App)
                ========================================================================= */}
            <section className="device-frame customer-frame">
              <div className="device-header">
                <div className="device-persona-badge customer-tag">
                  📱 CUSTOMER SCREEN · SAHĀYU APP
                </div>
                <span className="device-network-pill">🟢 Online</span>
              </div>

              <div className="device-content">
                {/* Booking Order Header */}
                <div className="device-order-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <small style={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                        ORDER #{booking?.booking_reference || `SH-00${bookingId}`}
                      </small>
                      <h3 style={{ margin: "2px 0 0", fontSize: "17px", color: "#0f172a" }}>
                        {booking?.service_name || "Trade Service"}
                      </h3>
                    </div>
                    <span className={`status-pill ${normStatus.toLowerCase()}`}>
                      ● {normStatus === "ACCEPTED" ? "ARRIVED" : normStatus}
                    </span>
                  </div>

                  <p style={{ fontSize: "12px", color: "#64748b", margin: "6px 0 0" }}>
                    📍 {booking?.address || "Civil Lines, Jabalpur"} · Scheduled for Today
                  </p>
                </div>

                {/* Assigned Technician Profile Card */}
                <div className="device-assigned-worker-card">
                  <div className="worker-avatar-small">👨‍🔧</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                        {booking?.worker_name || "Arvind Gupta"}
                      </strong>
                      <span className="society-member-tag" style={{ margin: 0 }}>
                        Member #{100 + (booking?.worker_id || 11)}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                      <span className="trust-badge-green mini">✓ e-Shram Validated</span>
                      <span className="trust-badge-blue mini">ITI Certified</span>
                    </div>
                  </div>
                </div>

                {/* OTP Display Cards (Customer Perspective) */}
                <div className="customer-handshake-box">
                  <div className="handshake-section-title">
                    <span>🔐 SECURITY HANDSHAKE CODES</span>
                    <small>Provide codes to your professional at doorstep</small>
                  </div>

                  {/* Step 1: Start PIN Card */}
                  <div
                    className={`customer-pin-card ${
                      normStatus === "IN_PROGRESS" || normStatus === "COMPLETED"
                        ? "verified-step"
                        : normStatus === "ACCEPTED"
                        ? "active-step"
                        : ""
                    }`}
                  >
                    <div className="pin-card-header">
                      <span className="pin-step-lbl">STEP 1 · DOORSTEP ARRIVAL</span>
                      {normStatus === "IN_PROGRESS" || normStatus === "COMPLETED" ? (
                        <span className="pin-verified-tag">✓ START VERIFIED</span>
                      ) : (
                        <span className="pin-pending-tag">SHARE AT DOORSTEP</span>
                      )}
                    </div>

                    <div className="pin-number-display">{startOtpCode}</div>

                    <p className="pin-instruction">
                      {normStatus === "IN_PROGRESS" || normStatus === "COMPLETED"
                        ? "✓ Verified via Backend Consensus. Doorstep arrival authenticated."
                        : "Share this 4-digit PIN with technician when they arrive at your location."}
                    </p>
                  </div>

                  {/* Step 2: Completion PIN Card */}
                  <div
                    className={`customer-pin-card ${
                      normStatus === "COMPLETED"
                        ? "verified-step"
                        : normStatus === "IN_PROGRESS"
                        ? "active-step"
                        : ""
                    }`}
                  >
                    <div className="pin-card-header">
                      <span className="pin-step-lbl">STEP 2 · SERVICE COMPLETION</span>
                      {normStatus === "COMPLETED" ? (
                        <span className="pin-verified-tag">✓ JOB COMPLETED</span>
                      ) : (
                        <span className="pin-pending-tag">PROTECTED PIN</span>
                      )}
                    </div>

                    <div className="pin-number-display">{endOtpCode}</div>

                    <p className="pin-instruction">
                      {normStatus === "COMPLETED"
                        ? "✓ Verified via Backend Consensus. ₹199 labour payout committed."
                        : "Share this PIN ONLY after the repair work has been fully inspected and completed."}
                    </p>
                  </div>
                </div>

                {/* 3-Day Dynamic Warranty Countdown Component */}
                <div style={{ marginTop: "16px" }}>
                  <WarrantyCountdown
                    warrantyExpiresAt={booking?.warranty_expires_at}
                    warrantyStartedAt={booking?.warranty_started_at}
                    status={normStatus}
                    compact={true}
                  />
                </div>

                {/* Live Progress Timeline */}
                <div style={{ marginTop: "16px" }}>
                  <ServiceTimeline
                    status={normStatus}
                    bookingDate={booking?.booking_date}
                    amount={booking?.amount || 239}
                    startOtpVerifiedAt={booking?.start_otp_verified_at}
                    endOtpVerifiedAt={booking?.end_otp_verified_at}
                    warrantyExpiresAt={booking?.warranty_expires_at}
                    bookingReference={booking?.booking_reference}
                  />
                </div>
              </div>
            </section>

            {/* =========================================================================
                RIGHT DEVICE: TECHNICIAN DEVICE (Worker Handshake Terminal)
                ========================================================================= */}
            <section className="device-frame technician-frame">
              <div className="device-header">
                <div className="device-persona-badge technician-tag">
                  🛠️ TECHNICIAN DEVICE · WORKER PORTAL
                </div>
                <span className="device-network-pill">🟢 Authenticated</span>
              </div>

              <div className="device-content">
                {/* Technician Profile Banner */}
                <div className="device-order-card" style={{ borderLeft: "4px solid #0284c7" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <small style={{ color: "#0284c7", fontWeight: 700 }}>
                        ON-DUTY COOPERATIVE TECHNICIAN
                      </small>
                      <h3 style={{ margin: "2px 0 0", fontSize: "16px", color: "#0f172a" }}>
                        {booking?.worker_name || "Arvind Gupta"} (Member #{100 + (booking?.worker_id || 11)})
                      </h3>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                        Fair Labour Floor:
                      </span>
                      <strong style={{ color: "#059669", fontSize: "15px" }}>₹199 (100%)</strong>
                    </div>
                  </div>
                </div>

                {/* Consensus Success Banner (Section 3 Requirement) */}
                {startSuccessData && (
                  <div className="consensus-success-banner">
                    <div className="consensus-icon">✓</div>
                    <div className="consensus-body">
                      <strong>Verified via Backend Consensus</strong>
                      <p>Txn #{startSuccessData.txnId} Committed</p>
                      <small>{formatConsensusTime(startSuccessData.timestamp)}</small>
                    </div>
                  </div>
                )}

                {endSuccessData && (
                  <div className="consensus-success-banner settlement-banner">
                    <div className="consensus-icon">✓</div>
                    <div className="consensus-body">
                      <strong>Verified via Backend Consensus</strong>
                      <p>Txn #{endSuccessData.txnId} Committed · 100% Payout Settled</p>
                      <small>{formatConsensusTime(endSuccessData.timestamp)}</small>
                    </div>
                  </div>
                )}

                {/* Handshake Action Terminal */}
                <div className="technician-terminal-box">
                  <div className="terminal-header">
                    <span>⚡ HANDSHAKE ACTION CONSOLE</span>
                    <small>Authoritative Backend Verification</small>
                  </div>

                  {/* ERROR DISPLAY WITH SHAKE (Section 4 Requirement) */}
                  {otpError && (
                    <div className="terminal-error-alert">
                      {otpError}
                    </div>
                  )}

                  {/* STATE 1: PENDING -> Accept Booking */}
                  {normStatus === "PENDING" && (
                    <div className="terminal-step-box">
                      <h4>New Service Order Assigned</h4>
                      <p>
                        Customer requested <strong>{booking?.service_name || "Trade Service"}</strong>. Accept to proceed with dispatch.
                      </p>
                      <button
                        type="button"
                        className="primary-btn full-btn"
                        onClick={handleAcceptJob}
                        disabled={acceptingJob}
                      >
                        {acceptingJob ? "⟳ Accepting Service Request..." : "Accept Service Request →"}
                      </button>
                    </div>
                  )}

                  {/* STATE 2: ACCEPTED / ARRIVED -> Enter Start PIN */}
                  {normStatus === "ACCEPTED" && (
                    <div className="terminal-step-box">
                      <div className="terminal-step-title">
                        <span className="step-num">1</span>
                        <div>
                          <h4>Step 1: Doorstep Handshake Verification</h4>
                          <p>Ask customer for their 4-digit Start PIN (Code: {startOtpCode}) to confirm arrival.</p>
                        </div>
                      </div>

                      <form
                        onSubmit={handleVerifyStartPin}
                        className={`terminal-form ${shakeStart ? "shake-anim" : ""}`}
                      >
                        <div className="form-group">
                          <label>Enter Customer's Start PIN:</label>
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="e.g. 4821"
                            value={enteredStartOtp}
                            onChange={(e) => setEnteredStartOtp(e.target.value.replace(/\D/g, ""))}
                            disabled={verifyingStart || booking?.is_start_otp_locked}
                            className="terminal-otp-input"
                            autoComplete="off"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          className="primary-btn full-btn"
                          disabled={verifyingStart || booking?.is_start_otp_locked}
                        >
                          {verifyingStart ? "⟳ Verifying Start PIN..." : "Verify Start PIN"}
                        </button>
                      </form>

                      {booking?.is_start_otp_locked && (
                        <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "8px", fontWeight: 700 }}>
                          ✕ Maximum verification attempts reached. Start PIN locked.
                        </p>
                      )}
                    </div>
                  )}

                  {/* STATE 3: IN_PROGRESS -> Enter Completion PIN */}
                  {normStatus === "IN_PROGRESS" && (
                    <div className="terminal-step-box active-work">
                      <div className="terminal-step-title">
                        <span className="step-num">2</span>
                        <div>
                          <h4>Step 2: Service Completion Handshake</h4>
                          <p>Once repair is completed & tested, enter customer's Completion PIN (Code: {endOtpCode}).</p>
                        </div>
                      </div>

                      <form
                        onSubmit={handleVerifyEndPin}
                        className={`terminal-form ${shakeEnd ? "shake-anim" : ""}`}
                      >
                        <div className="form-group">
                          <label>Enter Customer's Completion PIN:</label>
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="e.g. 9134"
                            value={enteredEndOtp}
                            onChange={(e) => setEnteredEndOtp(e.target.value.replace(/\D/g, ""))}
                            disabled={verifyingEnd || booking?.is_end_otp_locked}
                            className="terminal-otp-input"
                            autoComplete="off"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          className="primary-btn full-btn"
                          disabled={verifyingEnd || booking?.is_end_otp_locked}
                        >
                          {verifyingEnd ? "⟳ Verifying Completion PIN..." : "Verify Completion PIN"}
                        </button>
                      </form>

                      {booking?.is_end_otp_locked && (
                        <p style={{ color: "#ef4444", fontSize: "12px", marginTop: "8px", fontWeight: 700 }}>
                          ✕ Maximum verification attempts reached. Completion PIN locked.
                        </p>
                      )}
                    </div>
                  )}

                  {/* STATE 4: COMPLETED -> Wage Settlement Summary */}
                  {normStatus === "COMPLETED" && (
                    <div className="terminal-step-box completed-terminal">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                        <span style={{ fontSize: "24px" }}>🎉</span>
                        <div>
                          <h4 style={{ margin: 0, color: "#065f46" }}>Service Completed & Settled</h4>
                          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#047857" }}>
                            Consensus handshake confirmed by FastAPI backend.
                          </p>
                        </div>
                      </div>

                      {/* Transparent Cooperative Settlement Breakdown */}
                      <div className="technician-payout-card">
                        <div className="payout-row highlight">
                          <span>Worker Labour Floor (100%):</span>
                          <strong style={{ color: "#059669" }}>₹199.00</strong>
                        </div>
                        <div className="payout-row">
                          <span>Platform Tech Infrastructure:</span>
                          <span>₹30.00</span>
                        </div>
                        <div className="payout-row">
                          <span>Cooperative Gullak Sinking Fund:</span>
                          <strong style={{ color: "#d97706" }}>+₹10.00</strong>
                        </div>
                        <div className="payout-divider"></div>
                        <div className="payout-row total">
                          <span>Total Customer Billing:</span>
                          <strong>₹239.00</strong>
                        </div>
                      </div>

                      <div style={{ marginTop: "14px", textAlign: "center" }}>
                        <span className="guarantee-status-tag active" style={{ display: "inline-block" }}>
                          🛡️ 3-Day Workmanship Guarantee Active
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Technician Warranty Card */}
                {normStatus === "COMPLETED" && (
                  <div style={{ marginTop: "16px" }}>
                    <WarrantyCountdown
                      warrantyExpiresAt={booking?.warranty_expires_at}
                      warrantyStartedAt={booking?.warranty_started_at}
                      status={normStatus}
                      compact={true}
                    />
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
