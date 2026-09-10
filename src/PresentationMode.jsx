import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getBooking,
  getCustomerBookings,
  createBooking,
  createDemoBooking,
  acceptBooking,
  resetDemo,
  cycleDemoScenario,
  DEMO_SCENARIOS,
  verifyStartOtp,
  verifyEndOtp,
  getWorkers,
  getRateCardForBooking,
  getBookingQuotation,
  saveBookingQuotation,
  getBookingPayment,
  saveBookingPayment,
  getBookingWarranty,
  saveBookingWarranty,
  clearDemoBookingState,
  completeBooking,
} from "./api";
import ServiceTimeline from "./ServiceTimeline";
import WarrantyCountdown from "./WarrantyCountdown";
import "./App.css";

/**
 * Real-Time Demo (Judge-Ready Presentation)
 * LEFT: Customer Device (Sahāyu App)
 * RIGHT: Technician Terminal (Worker Portal)
 */
export default function PresentationMode() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 5 Canonical Demo Scenarios Circular Rotation
  const [scenarioIndex, setScenarioIndex] = useState(() => {
    const pId = searchParams.get("booking_id");
    const foundIdx = DEMO_SCENARIOS.findIndex(
      (s) => String(s.booking_id) === String(pId) || String(s.id) === String(pId)
    );
    return foundIdx >= 0 ? foundIdx : 0;
  });

  const [bookingId, setBookingId] = useState(
    () => String(DEMO_SCENARIOS[scenarioIndex]?.booking_id || "63")
  );
  const [booking, setBooking] = useState(
    () => DEMO_SCENARIOS[scenarioIndex] || DEMO_SCENARIOS[0]
  );
  const [loading, setLoading] = useState(false);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [error, setError] = useState("");

  // Worker OTP Action States
  const [enteredStartOtp, setEnteredStartOtp] = useState("");
  const [enteredEndOtp, setEnteredEndOtp] = useState("");
  const [verifyingStart, setVerifyingStart] = useState(false);
  const [verifyingEnd, setVerifyingEnd] = useState(false);
  const [acceptingJob, setAcceptingJob] = useState(false);

  // Quotation & Rate Card State
  const [, setQuoteVersion] = useState(0);
  const [selectedQuoteItems, setSelectedQuoteItems] = useState([]);

  // Payment & Settlement State
  const [isPaymentPending, setIsPaymentPending] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("UPI");
  const [payingDemo, setPayingDemo] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  // Demo Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);

  // OTP Error & Shake states
  const [otpError, setOtpError] = useState("");
  const [shakeStart, setShakeStart] = useState(false);
  const [shakeEnd, setShakeEnd] = useState(false);

  // Polling ref to prevent concurrent fetches
  const isFetchingRef = useRef(false);

  const quotation = bookingId ? getBookingQuotation(bookingId) : null;
  const paymentData = bookingId ? getBookingPayment(bookingId) : null;
  const storedWarranty = bookingId ? getBookingWarranty(bookingId) : null;

  // Rate Card dynamically scoped strictly to active scenario/trade
  const currentRateCard = useMemo(() => {
    return getRateCardForBooking(booking);
  }, [booking]);

  // Fetch Booking authoritative state
  const fetchAuthoritativeBooking = useCallback(
    async (id, isBackground = false) => {
      if (!id) return;
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      try {
        const data = await getBooking(id);
        if (data && data.booking_id) {
          setBooking((prev) => ({
            ...(prev || {}),
            ...data,
            start_otp: data.start_otp || prev?.start_otp || "4821",
            end_otp: data.end_otp || prev?.end_otp || "9134",
            completion_otp: data.completion_otp || prev?.completion_otp || "9134",
          }));
          setError("");
        }
      } catch (err) {
        if (!isBackground) {
          // If custom ID is not in backend yet, maintain scenario integrity
          console.debug(`Authoritative fetch note for #${id}:`, err);
        }
      } finally {
        if (!isBackground) setLoading(false);
        isFetchingRef.current = false;
      }
    },
    []
  );

  // Button Handler for "+ New Demo Booking" (Circular Scenario State Rotation)
  const handleCreateNewDemoBooking = async () => {
    setCreatingDemo(true);
    const nextIndex = (scenarioIndex + 1) % DEMO_SCENARIOS.length;
    setScenarioIndex(nextIndex);

    const activeScenario = DEMO_SCENARIOS[nextIndex];
    const id = String(activeScenario.booking_id);

    // Reset state values
    clearDemoBookingState(id);
    setBookingId(id);
    setBooking({
      ...activeScenario,
      status: "ASSIGNED",
      start_otp: "4821",
      completion_otp: "9134",
      end_otp: "9134",
      start_otp_verified_at: null,
      end_otp_verified_at: null,
      warranty_started_at: null,
      warranty_expires_at: null,
      payment_status: "PENDING",
    });

    setEnteredStartOtp("");
    setEnteredEndOtp("");
    setSelectedQuoteItems([]);
    setIsPaymentPending(false);
    setPaymentSuccessData(null);
    setError("");
    setOtpError("");
    setSearchParams({ booking_id: id }, { replace: true });
    setQuoteVersion((v) => v + 1);

    // Trigger backend sync POST /api/demo/cycle-scenario to ensure backend parity
    try {
      await cycleDemoScenario(nextIndex);
    } catch {
      // Backend parity handled
    } finally {
      setCreatingDemo(false);
    }
  };

  const handleCreateDemoBooking = handleCreateNewDemoBooking;

  // Button Handler for "Reset Demo" (Resets CURRENT active scenario back to 'ASSIGNED' without switching trade)
  const handleConfirmResetDemo = async () => {
    const currentScenario = DEMO_SCENARIOS[scenarioIndex] || DEMO_SCENARIOS[0];
    const id = String(booking?.booking_id || currentScenario.booking_id);

    setError("");
    setOtpError("");
    setEnteredStartOtp("");
    setEnteredEndOtp("");
    setSelectedQuoteItems([]);
    setIsPaymentPending(false);
    setPaymentSuccessData(null);
    setShowResetModal(false);
    setQuoteVersion((v) => v + 1);

    clearDemoBookingState(id);

    setBooking({
      ...currentScenario,
      status: "ASSIGNED",
      start_otp: "4821",
      completion_otp: "9134",
      end_otp: "9134",
      start_otp_verified_at: null,
      end_otp_verified_at: null,
      warranty_started_at: null,
      warranty_expires_at: null,
      payment_status: "PENDING",
    });

    try {
      await resetDemo(id);
      await cycleDemoScenario(scenarioIndex);
    } catch {
      // Handled
    }
  };

  // Technician accepts service request
  const handleAcceptJob = async () => {
    if (!booking) return;
    const currentStatus = (booking.status || "").toUpperCase();
    if (currentStatus === "CANCELLED") {
      setOtpError("Booking is Cancelled. Click 'Reset Demo' above to re-initialize.");
      return;
    }

    setAcceptingJob(true);
    setOtpError("");
    setError("");

    try {
      const updated = await acceptBooking(booking.booking_id);
      setBooking(updated);
      await fetchAuthoritativeBooking(booking.booking_id, true);
    } catch (err) {
      setOtpError(err.message || "Failed to accept booking.");
    } finally {
      setAcceptingJob(false);
    }
  };

  // Technician verifies Start PIN
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
      setOtpError("Invalid format. Start PIN must be exactly 4 digits.");
      triggerShake("start");
      return;
    }

    setVerifyingStart(true);
    setOtpError("");

    try {
      await verifyStartOtp({
        booking_id: booking.booking_id,
        otp: trimmed,
      });

      setEnteredStartOtp("");
      await fetchAuthoritativeBooking(booking.booking_id, true);
    } catch (err) {
      const msg = err.message || "Invalid Start PIN.";
      setOtpError(
        msg.includes("Invalid Start PIN")
          ? `✕ ${msg}`
          : `✕ Invalid Start PIN: ${msg}`
      );
      triggerShake("start");
    } finally {
      setVerifyingStart(false);
    }
  };

  // Technician verifies Completion PIN & transitions to PAYMENT_PENDING
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
      setOtpError("Invalid format. Completion PIN must be exactly 4 digits.");
      triggerShake("end");
      return;
    }

    setVerifyingEnd(true);
    setOtpError("");

    try {
      await verifyEndOtp({
        booking_id: booking.booking_id,
        otp: trimmed,
      });

      setEnteredEndOtp("");
      setIsPaymentPending(true);
      await fetchAuthoritativeBooking(booking.booking_id, true);
    } catch (err) {
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

  // Rate Card item selection controls
  const handleAddQuoteItem = (item) => {
    setSelectedQuoteItems((prev) => {
      const exists = prev.find((i) => i.id === item.id);
      if (exists) {
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      } else {
        return [...prev, { ...item, qty: 1 }];
      }
    });
  };

  const handleRemoveQuoteItem = (itemId) => {
    setSelectedQuoteItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleUpdateQuoteQty = (itemId, delta) => {
    setSelectedQuoteItems((prev) =>
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

  const calculateQuoteAdditional = () => {
    return selectedQuoteItems.reduce((acc, i) => acc + i.price * (i.qty || 1), 0);
  };

  const handleSubmitQuote = () => {
    if (!booking) return;
    const extraTotal = calculateQuoteAdditional();
    if (extraTotal === 0) return;
    const payload = {
      booking_id: booking.booking_id,
      items: selectedQuoteItems,
      additional_amount: extraTotal,
      total_with_base: 239 + extraTotal,
      status: "QUOTE_PENDING",
      trade_category: currentRateCard.category,
      created_at: new Date().toISOString(),
    };
    saveBookingQuotation(booking.booking_id, payload);
    setQuoteVersion((v) => v + 1);
  };

  const handleCustomerApproveQuote = () => {
    if (!booking || !quotation) return;
    const updated = {
      ...quotation,
      status: "APPROVED",
      approved_at: new Date().toISOString(),
    };
    saveBookingQuotation(booking.booking_id, updated);
    setQuoteVersion((v) => v + 1);
  };

  const handleCustomerDeclineQuote = () => {
    if (!booking || !quotation) return;
    const updated = {
      ...quotation,
      status: "REJECTED",
      rejected_at: new Date().toISOString(),
    };
    saveBookingQuotation(booking.booking_id, updated);
    setQuoteVersion((v) => v + 1);
  };

  const calculatePayableTotal = () => {
    const base = 239;
    if (quotation && quotation.status === "APPROVED") {
      return base + (quotation.additional_amount || 0);
    }
    return base;
  };

  // Payment Execution (Demo Pay)
  const handleCustomerExecutePayment = async () => {
    if (!booking) return;
    setPayingDemo(true);

    try {
      const finalAmount = calculatePayableTotal();
      const paidAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString();

      const pData = {
        booking_id: booking.booking_id,
        amount: finalAmount,
        status: "PAID",
        payment_method: selectedPaymentMethod,
        paid_at: paidAt,
      };
      saveBookingPayment(booking.booking_id, pData);

      const wData = {
        started_at: paidAt,
        expires_at: expiresAt,
        active: true,
      };
      saveBookingWarranty(booking.booking_id, wData);

      setQuoteVersion((v) => v + 1);

      try {
        await completeBooking(booking.booking_id);
      } catch (err) {
        console.debug("Backend complete sync:", err);
      }

      setBooking((prev) => ({
        ...prev,
        status: "COMPLETED",
        payment_status: "PAID",
        warranty_started_at: paidAt,
        warranty_expires_at: expiresAt,
      }));

      setPaymentSuccessData({
        amount: finalAmount,
        paidAt: paidAt,
      });

      setIsPaymentPending(false);
      await fetchAuthoritativeBooking(booking.booking_id, true);
    } finally {
      setPayingDemo(false);
    }
  };

  const isPaid = paymentData?.status === "PAID" || booking?.payment_status === "PAID";
  const isEndVerified = Boolean(booking?.end_otp_verified_at || isPaymentPending);

  const rawStatus = (booking?.status || "").toUpperCase();
  let normStatus = rawStatus || "PENDING";
  if (isPaid || rawStatus === "COMPLETED") {
    normStatus = "COMPLETED";
  } else if (isEndVerified) {
    normStatus = "PAYMENT_PENDING";
  } else if (rawStatus === "IN_PROGRESS") {
    normStatus = "IN_PROGRESS";
  } else if (rawStatus === "ACCEPTED") {
    normStatus = "ACCEPTED";
  } else if (rawStatus === "ASSIGNED") {
    normStatus = "ASSIGNED";
  } else if (rawStatus === "CANCELLED") {
    normStatus = "CANCELLED";
  }

  const startOtpCode = booking?.start_otp || "4821";
  const endOtpCode = booking?.end_otp || booking?.completion_otp || "9134";

  // Effective Warranty Expiry timestamp (persisted)
  const effectiveWarrantyExpiresAt =
    storedWarranty?.expires_at || booking?.warranty_expires_at || null;
  const effectiveWarrantyStartedAt =
    storedWarranty?.started_at || booking?.warranty_started_at || null;

  return (
    <div className="presentation-page">
      {/* Top Header */}
      <header className="presentation-topbar">
        <div className="topbar-left">
          <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            <span className="logo-icon">S</span>
            Sahāyu
          </div>
          <span className="presentation-badge">⚡ REAL-TIME DEMO</span>
        </div>

        <div className="topbar-right">
          <button
            className="secondary-btn mini-demo-btn"
            style={{ color: "#f87171", borderColor: "#7f1d1d" }}
            onClick={() => setShowResetModal(true)}
          >
            ↻ Reset Demo
          </button>

          <button
            className="secondary-btn mini-demo-btn"
            onClick={handleCreateNewDemoBooking}
            disabled={creatingDemo}
          >
            {creatingDemo ? "Rotating..." : "+ New Demo Booking"}
          </button>
        </div>
      </header>

      {/* Global Status Ribbon */}
      <div className="demo-state-ribbon">
        <div className="ribbon-item">
          <span className="ribbon-lbl">ORDER</span>
          <strong>#{booking?.booking_reference || `SH-00${bookingId}`}</strong>
        </div>

        <div className="ribbon-item">
          <span className="ribbon-lbl">STATUS:</span>
          <strong className={`status-pill ${normStatus.toLowerCase()}`}>
            ● {normStatus === "ACCEPTED" ? "ARRIVED" : normStatus === "IN_PROGRESS" ? "IN PROGRESS" : normStatus === "PAYMENT_PENDING" ? "PAYMENT PENDING" : normStatus === "CANCELLED" ? "CANCELLED" : normStatus === "ASSIGNED" ? "ASSIGNED" : normStatus}
          </strong>
        </div>

        <div className="ribbon-item">
          <span className="ribbon-lbl">WORKER PAYOUT:</span>
          <strong style={{ color: "#059669" }}>
            ₹{199 + (quotation && quotation.status === "APPROVED" ? quotation.additional_amount : 0)}
          </strong>
        </div>

        <div className="ribbon-item">
          <span className="ribbon-lbl">GULLAK:</span>
          <strong style={{ color: "#d97706" }}>₹10</strong>
        </div>

        <div className="ribbon-item">
          <span className="ribbon-lbl">PROTECTION:</span>
          <strong style={{ color: isPaid ? "#0284c7" : "#94a3b8" }}>
            {isPaid ? "ACTIVE" : "PENDING"}
          </strong>
        </div>
      </div>

      {/* Main Split Screen Presentation */}
      <main className="presentation-container">
        {loading && !booking ? (
          <div className="admin-loading-state" style={{ minHeight: "400px" }}>
            <div className="loading-spinner"></div>
            <p>Loading booking details...</p>
          </div>
        ) : error && !booking ? (
          <div className="admin-error-card" style={{ maxWidth: "600px", margin: "40px auto" }}>
            <h3>Booking Not Found</h3>
            <p>{error}</p>
            <button className="primary-btn" onClick={handleCreateDemoBooking}>
              Create New Demo Order →
            </button>
          </div>
        ) : (
          <div className="dual-device-grid">
            {/* =========================================================================
                LEFT DEVICE: CUSTOMER SCREEN (Sahāyu App)
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
                        {booking?.service_name || currentRateCard.tradeTitle}
                      </h3>
                    </div>
                    <span className={`status-pill ${normStatus.toLowerCase()}`}>
                      ● {normStatus === "ACCEPTED" ? "ARRIVED" : normStatus === "IN_PROGRESS" ? "IN PROGRESS" : normStatus === "PAYMENT_PENDING" ? "PAYMENT PENDING" : normStatus === "CANCELLED" ? "CANCELLED" : normStatus === "ASSIGNED" ? "ASSIGNED" : normStatus}
                    </span>
                  </div>

                  {normStatus === "CANCELLED" && (
                    <div style={{ background: "#fef2f2", border: "1px solid #f87171", borderRadius: "8px", padding: "8px 10px", margin: "8px 0 4px", color: "#991b1b", fontSize: "12px" }}>
                      ⚠️ Booking is Cancelled. Click 'Reset Demo' above to re-initialize.
                    </div>
                  )}

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

                {/* 10. CUSTOMER APPROVAL: Prominent Card when quotation is pending */}
                {quotation && (
                  <div
                    className={`quotation-approval-card mini ${
                      quotation.status === "QUOTE_PENDING" || quotation.status === "PENDING_APPROVAL" ? "pending-review" : ""
                    }`}
                    style={{ marginBottom: "14px" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="quote-badge" style={{ background: "#fef3c7", color: "#b45309", fontWeight: 800 }}>
                        🔔 ADDITIONAL WORK APPROVAL
                      </span>
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
                          ? "✓ APPROVED"
                          : quotation.status === "REJECTED"
                          ? "REJECTED"
                          : "ACTION REQUIRED"}
                      </span>
                    </div>

                    <p style={{ margin: "4px 0 8px", fontSize: "12px", color: "#475569" }}>
                      Your technician has requested additional work.
                    </p>

                    <div style={{ marginTop: "6px" }}>
                      <div className="quote-items-table">
                        {quotation.items?.map((item, idx) => (
                          <div key={idx} className="quote-item-row" style={{ fontSize: "12px" }}>
                            <span>
                              {item.title || item.name} × {item.qty}
                            </span>
                            <strong>+₹{item.price * item.qty}</strong>
                          </div>
                        ))}
                      </div>

                      <div
                        style={{
                          borderTop: "1px dashed #cbd5e1",
                          marginTop: "6px",
                          paddingTop: "6px",
                          fontSize: "12px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                          <span>Additional Work:</span>
                          <strong style={{ color: "#059669" }}>+₹{quotation.additional_amount}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                          <span>Current Booking Base:</span>
                          <span>₹239</span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "13px",
                            fontWeight: 800,
                            color: "#0f172a",
                            marginTop: "4px",
                          }}
                        >
                          <span>Projected Final Amount:</span>
                          <span style={{ color: "#059669" }}>
                            ₹{quotation.status === "APPROVED" ? 239 + quotation.additional_amount : 239}
                          </span>
                        </div>
                      </div>
                    </div>

                    {(quotation.status === "QUOTE_PENDING" || quotation.status === "PENDING_APPROVAL") && (
                      <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ flex: 1, padding: "8px 10px", fontSize: "12px" }}
                          onClick={handleCustomerDeclineQuote}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          className="primary-btn"
                          style={{ flex: 1, padding: "8px 10px", fontSize: "12px", background: "#059669", borderColor: "#059669" }}
                          onClick={handleCustomerApproveQuote}
                        >
                          ✓ Approve
                        </button>
                      </div>
                    )}

                    {quotation.status === "APPROVED" && (
                      <div style={{ marginTop: "8px", fontSize: "12px", color: "#059669", fontWeight: 700 }}>
                        ✓ ADDITIONAL WORK APPROVED
                      </div>
                    )}

                    {quotation.status === "REJECTED" && (
                      <div style={{ marginTop: "8px", fontSize: "12px", color: "#b91c1c" }}>
                        Additional work rejected. Original booking amount remains applicable.
                      </div>
                    )}
                  </div>
                )}

                {/* Handshake Security Codes Display */}
                <div className="customer-handshake-box">
                  <div className="handshake-section-title">
                    <span>🔐 SECURITY HANDSHAKE CODES</span>
                    <small>Share codes with technician at your doorstep</small>
                  </div>

                  {/* Step 1: Start PIN Card */}
                  <div
                    className={`customer-pin-card ${
                      normStatus === "IN_PROGRESS" || normStatus === "PAYMENT_PENDING" || normStatus === "COMPLETED"
                        ? "verified-step"
                        : normStatus === "ACCEPTED"
                        ? "active-step"
                        : ""
                    }`}
                  >
                    <div className="pin-card-header">
                      <span className="pin-step-lbl">STEP 1 · DOORSTEP ARRIVAL</span>
                      {normStatus === "IN_PROGRESS" || normStatus === "PAYMENT_PENDING" || normStatus === "COMPLETED" ? (
                        <span className="pin-verified-tag">✓ START PIN VERIFIED</span>
                      ) : (
                        <span className="pin-pending-tag">SHARE AT DOORSTEP</span>
                      )}
                    </div>

                    <div className="pin-number-display">{startOtpCode}</div>

                    <p className="pin-instruction">
                      {normStatus === "IN_PROGRESS" || normStatus === "PAYMENT_PENDING" || normStatus === "COMPLETED"
                        ? "Doorstep arrival verified. Service in progress."
                        : "Share this 4-digit PIN with technician when they arrive."}
                    </p>
                  </div>

                  {/* Step 2: Completion PIN Card */}
                  <div
                    className={`customer-pin-card ${
                      normStatus === "COMPLETED" || normStatus === "PAYMENT_PENDING"
                        ? "verified-step"
                        : normStatus === "IN_PROGRESS"
                        ? "active-step"
                        : ""
                    }`}
                  >
                    <div className="pin-card-header">
                      <span className="pin-step-lbl">STEP 2 · SERVICE COMPLETION</span>
                      {normStatus === "COMPLETED" || normStatus === "PAYMENT_PENDING" ? (
                        <span className="pin-verified-tag">✓ JOB COMPLETED</span>
                      ) : (
                        <span className="pin-pending-tag">PROTECTED PIN</span>
                      )}
                    </div>

                    <div className="pin-number-display">{endOtpCode}</div>

                    <p className="pin-instruction">
                      {normStatus === "COMPLETED" || normStatus === "PAYMENT_PENDING"
                        ? "Work completed and verified."
                        : "Share this PIN ONLY after the repair work has been fully inspected and completed."}
                    </p>
                  </div>
                </div>

                {/* 4. PAYMENT UI: Prominently displayed when status is PAYMENT_PENDING */}
                {(normStatus === "PAYMENT_PENDING" || (normStatus === "COMPLETED" && !isPaid)) && (
                  <div className="payment-pending-card mini" style={{ margin: "14px 0", border: "2px solid #059669" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "14px", color: "#0f172a" }}>PAYMENT REQUIRED</strong>
                      <span className="status-badge yellow mini">₹{calculatePayableTotal()}</span>
                    </div>

                    <div style={{ margin: "10px 0", fontSize: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                        <span>Initial Inspection & Labour</span>
                        <span>₹199</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                        <span>Platform Operations</span>
                        <span>₹30</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                        <span>Gullak Welfare</span>
                        <span>₹10</span>
                      </div>
                      {quotation && quotation.status === "APPROVED" && (
                        <div style={{ display: "flex", justifyContent: "space-between", color: "#059669", fontWeight: 600 }}>
                          <span>Additional Work / Parts</span>
                          <span>+₹{quotation.additional_amount}</span>
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontWeight: 800,
                          color: "#0f172a",
                          borderTop: "1px solid #e2e8f0",
                          paddingTop: "6px",
                          marginTop: "6px",
                          fontSize: "13px",
                        }}
                      >
                        <span>Amount Payable</span>
                        <strong style={{ color: "#059669" }}>₹{calculatePayableTotal()}</strong>
                      </div>
                    </div>

                    {/* Selectable Payment Method Pills */}
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {["UPI", "Card", "Net Banking"].map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setSelectedPaymentMethod(method)}
                            style={{
                              flex: 1,
                              padding: "6px 8px",
                              fontSize: "11px",
                              fontWeight: 700,
                              borderRadius: "6px",
                              border: selectedPaymentMethod === method ? "2px solid #059669" : "1px solid #cbd5e1",
                              background: selectedPaymentMethod === method ? "#ecfdf5" : "#ffffff",
                              color: selectedPaymentMethod === method ? "#059669" : "#475569",
                              cursor: "pointer",
                            }}
                          >
                            {method === "UPI" ? "📱 UPI" : method === "Card" ? "💳 Card" : "🏦 Net Banking"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="primary-btn full-btn"
                      style={{
                        background: "#059669",
                        borderColor: "#059669",
                        padding: "10px 14px",
                        fontSize: "13px",
                        fontWeight: 800,
                      }}
                      onClick={handleCustomerExecutePayment}
                      disabled={payingDemo}
                    >
                      {payingDemo ? "Processing..." : `💳 Demo Pay ₹${calculatePayableTotal()}`}
                    </button>
                    <p style={{ textAlign: "center", fontSize: "11px", color: "#64748b", margin: "6px 0 0" }}>
                      Demo payment — no real money charged
                    </p>
                  </div>
                )}

                {/* 5. PAYMENT SUCCESS UI */}
                {isPaid && (
                  <div
                    style={{
                      background: "#ecfdf5",
                      border: "1.5px solid #10b981",
                      borderRadius: "10px",
                      padding: "12px 14px",
                      margin: "14px 0",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "18px", color: "#059669" }}>✓</span>
                      <strong style={{ color: "#065f46", fontSize: "14px" }}>PAYMENT SUCCESSFUL</strong>
                    </div>
                    <div style={{ marginTop: "4px", fontSize: "13px", fontWeight: 700, color: "#059669" }}>
                      ₹{paymentSuccessData?.amount || calculatePayableTotal()} Paid
                    </div>
                    <ul style={{ margin: "6px 0 0", paddingLeft: "18px", fontSize: "12px", color: "#047857" }}>
                      <li>Worker settlement recorded</li>
                      <li>Gullak contribution recorded</li>
                    </ul>
                  </div>
                )}

                {/* 6. 3-Day Workmanship Protection Component */}
                <div style={{ marginTop: "16px" }}>
                  <WarrantyCountdown
                    warrantyExpiresAt={effectiveWarrantyExpiresAt}
                    warrantyStartedAt={effectiveWarrantyStartedAt}
                    status={isPaid ? "COMPLETED" : "PENDING"}
                    compact={true}
                  />
                </div>

                {/* Progress Timeline */}
                <div style={{ marginTop: "16px" }}>
                  <ServiceTimeline
                    status={normStatus}
                    bookingDate={booking?.booking_date}
                    amount={calculatePayableTotal()}
                    startOtpVerifiedAt={booking?.start_otp_verified_at}
                    endOtpVerifiedAt={booking?.end_otp_verified_at}
                    warrantyExpiresAt={effectiveWarrantyExpiresAt}
                    bookingReference={booking?.booking_reference}
                  />
                </div>
              </div>
            </section>

            {/* =========================================================================
                RIGHT DEVICE: TECHNICIAN DEVICE (Worker Portal)
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
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                        Trade Skill: <strong>{currentRateCard.skillName}</strong>
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                        Fair Labour Floor:
                      </span>
                      <strong style={{ color: "#059669", fontSize: "15px" }}>₹199 (100%)</strong>
                    </div>
                  </div>
                </div>

                {/* Technician Actions & Verification */}
                <div className="technician-terminal-box">
                  <div className="terminal-header">
                    <span>⚡ JOB ACTIONS & VERIFICATION</span>
                    <small>Live Job Status</small>
                  </div>

                  {/* ERROR DISPLAY WITH SHAKE & DISMISS BUTTON */}
                  {otpError && (
                    <div className="terminal-error-alert" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{otpError}</span>
                      <button
                        type="button"
                        onClick={() => setOtpError("")}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#b91c1c",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "14px",
                          marginLeft: "8px",
                          lineHeight: 1,
                        }}
                        title="Dismiss error"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* CANCELLED STATE NOTICE */}
                  {normStatus === "CANCELLED" && (
                    <div className="terminal-step-box" style={{ background: "#fef2f2", borderColor: "#f87171" }}>
                      <h4 style={{ margin: 0, color: "#991b1b" }}>Booking is Cancelled</h4>
                      <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#b91c1c" }}>
                        Booking is Cancelled. Click 'Reset Demo' above to re-initialize.
                      </p>
                    </div>
                  )}

                  {/* STATE 1: PENDING / ASSIGNED -> Accept Booking */}
                  {(normStatus === "PENDING" || normStatus === "ASSIGNED") && (
                    <div className="terminal-step-box">
                      <h4>New Service Order Assigned</h4>
                      <p>
                        Customer requested <strong>{booking?.service_name || currentRateCard.tradeTitle}</strong>. Accept to proceed with dispatch.
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
                          <h4>Step 1: Doorstep Arrival Verification</h4>
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

                  {/* STATE 3: IN_PROGRESS -> Trade Rate Card Quotation Builder & Completion PIN */}
                  {normStatus === "IN_PROGRESS" && (
                    <div>
                      {/* Active Job Execution Status Badge */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          background: "#ecfdf5",
                          border: "1px solid #10b981",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          marginBottom: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ color: "#059669", fontWeight: 800 }}>✓</span>
                          <strong style={{ fontSize: "12px", color: "#065f46" }}>
                            START PIN VERIFIED · JOB IN PROGRESS
                          </strong>
                        </div>
                        <span className="live-pill" style={{ fontSize: "10px", padding: "2px 6px" }}>
                          ACTIVE
                        </span>
                      </div>

                      {/* 7 & 8. ON-SITE INSPECTION & ADDITIONAL WORK RATE CARD */}
                      <div className="terminal-step-box" style={{ marginBottom: "14px" }}>
                        <div style={{ marginBottom: "8px" }}>
                          <span className="quote-badge">ON-SITE INSPECTION & ADDITIONAL WORK</span>
                          <h4 style={{ margin: "4px 0 2px", fontSize: "14px", color: "#0f172a" }}>
                            Service: {booking?.service_name || currentRateCard.tradeTitle}
                          </h4>
                          <p style={{ margin: "2px 0 8px", fontSize: "11px", color: "#64748b" }}>
                            Skill: <strong>{currentRateCard.skillName}</strong>
                          </p>
                        </div>

                        {/* Available Rate Card Items */}
                        <div className="rate-card-builder-box mini" style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                          <small style={{ fontWeight: 700, display: "block", marginBottom: "6px", color: "#334155" }}>
                            Select Additional Work:
                          </small>

                          {currentRateCard.items.length === 0 ? (
                            <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0" }}>
                              No additional rate-card items available for this service.
                            </p>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                              {currentRateCard.items.map((item) => {
                                const selected = selectedQuoteItems.find((i) => i.id === item.id);
                                return (
                                  <div
                                    key={item.id}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      padding: "6px 10px",
                                      borderRadius: "6px",
                                      border: selected ? "1.5px solid #059669" : "1px solid #cbd5e1",
                                      background: selected ? "#ecfdf5" : "#ffffff",
                                    }}
                                  >
                                    <div style={{ flex: 1, marginRight: "8px" }}>
                                      <div style={{ fontSize: "12px", fontWeight: 600, color: "#0f172a" }}>{item.title || item.name}</div>
                                      <strong style={{ fontSize: "11px", color: "#059669" }}>+₹{item.price}</strong>
                                    </div>

                                    <button
                                      type="button"
                                      className="secondary-btn mini-demo-btn"
                                      style={{ padding: "4px 8px", fontSize: "11px" }}
                                      onClick={() => handleAddQuoteItem(item)}
                                    >
                                      + Add
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* 9. SELECTED ADDITIONAL WORK TABLE WITH REMOVE CONTROLS */}
                          {selectedQuoteItems.length > 0 && (
                            <div style={{ marginTop: "12px", borderTop: "1px solid #cbd5e1", paddingTop: "8px" }}>
                              <small style={{ fontWeight: 700, color: "#0f172a", display: "block", marginBottom: "4px" }}>
                                Selected Additional Work:
                              </small>
                              <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr style={{ color: "#64748b", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                                    <th style={{ padding: "4px 2px" }}>Item</th>
                                    <th style={{ padding: "4px 2px" }}>Price</th>
                                    <th style={{ padding: "4px 2px", textAlign: "center" }}>Qty</th>
                                    <th style={{ padding: "4px 2px", textAlign: "right" }}>Total</th>
                                    <th style={{ padding: "4px 2px", textAlign: "center" }}>Remove</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedQuoteItems.map((item) => (
                                    <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                      <td style={{ padding: "4px 2px", fontWeight: 600 }}>{item.title || item.name}</td>
                                      <td style={{ padding: "4px 2px" }}>₹{item.price}</td>
                                      <td style={{ padding: "4px 2px", textAlign: "center" }}>
                                        <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                          <button
                                            type="button"
                                            className="qty-btn"
                                            onClick={() => handleUpdateQuoteQty(item.id, -1)}
                                          >
                                            -
                                          </button>
                                          <span>{item.qty}</span>
                                          <button
                                            type="button"
                                            className="qty-btn"
                                            onClick={() => handleUpdateQuoteQty(item.id, 1)}
                                          >
                                            +
                                          </button>
                                        </div>
                                      </td>
                                      <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 700, color: "#059669" }}>
                                        ₹{item.price * item.qty}
                                      </td>
                                      <td style={{ padding: "4px 2px", textAlign: "center" }}>
                                        <button
                                          type="button"
                                          className="text-btn"
                                          style={{ color: "#ef4444", fontSize: "11px" }}
                                          onClick={() => handleRemoveQuoteItem(item.id)}
                                        >
                                          [Remove]
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>

                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "12px" }}>
                                <div>
                                  <span style={{ color: "#64748b" }}>Additional Total: </span>
                                  <strong style={{ color: "#059669" }}>₹{calculateQuoteAdditional()}</strong>
                                </div>
                                <button
                                  type="button"
                                  className="primary-btn mini-demo-btn"
                                  style={{ background: "#0284c7", borderColor: "#0284c7" }}
                                  onClick={handleSubmitQuote}
                                >
                                  Send for Customer Approval
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 11. APPROVAL STATES */}
                          {quotation && (
                            <div
                              style={{
                                marginTop: "10px",
                                padding: "8px",
                                borderRadius: "6px",
                                background:
                                  quotation.status === "APPROVED"
                                    ? "#ecfdf5"
                                    : quotation.status === "REJECTED"
                                    ? "#fef2f2"
                                    : "#fffbeb",
                                border:
                                  quotation.status === "APPROVED"
                                    ? "1px solid #10b981"
                                    : quotation.status === "REJECTED"
                                    ? "1px solid #f87171"
                                    : "1px solid #f59e0b",
                              }}
                            >
                              <div style={{ fontSize: "12px" }}>
                                <strong>
                                  {quotation.status === "APPROVED"
                                    ? `✓ ADDITIONAL WORK APPROVED (+₹${quotation.additional_amount})`
                                    : quotation.status === "REJECTED"
                                    ? "Additional work rejected. Original booking amount remains applicable."
                                    : "⏳ Quotation Pending Customer Approval"}
                                </strong>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Step 2: Completion PIN Handshake Form */}
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
                    </div>
                  )}

                  {/* STATE 4: PAYMENT_PENDING -> Awaiting Customer Settlement */}
                  {normStatus === "PAYMENT_PENDING" && (
                    <div className="terminal-step-box" style={{ background: "#fffbeb", borderColor: "#f59e0b" }}>
                      <h4 style={{ margin: 0, color: "#b45309" }}>Job Completed — Payment Pending</h4>
                      <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#92400e" }}>
                        Completion PIN verified. Waiting for customer to complete payment of ₹{calculatePayableTotal()} on their screen.
                      </p>
                    </div>
                  )}

                  {/* STATE 5: COMPLETED -> Transparent Settlement */}
                  {normStatus === "COMPLETED" && (
                    <div className="terminal-step-box completed-terminal">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                        <span style={{ fontSize: "24px" }}>🎉</span>
                        <div>
                          <h4 style={{ margin: 0, color: "#065f46" }}>Service Completed & Settled</h4>
                          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#047857" }}>
                            Payout disbursed directly to worker's cooperative account.
                          </p>
                        </div>
                      </div>

                      {/* Transparent Settlement Breakdown */}
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
                        {quotation && quotation.status === "APPROVED" && (
                          <div className="payout-row" style={{ color: "#059669" }}>
                            <span>Approved Additional Labour / Parts:</span>
                            <strong>+₹{quotation.additional_amount}.00</strong>
                          </div>
                        )}
                        <div className="payout-divider"></div>
                        <div className="payout-row total">
                          <span>Total Customer Billing:</span>
                          <strong>₹{calculatePayableTotal()}.00</strong>
                        </div>
                      </div>

                      <div style={{ marginTop: "14px", textAlign: "center" }}>
                        <span className="guarantee-status-tag active" style={{ display: "inline-block" }}>
                          🛡️ 3-Day Workmanship Protection ACTIVE
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Technician Warranty Card */}
                {normStatus === "COMPLETED" && (
                  <div style={{ marginTop: "16px" }}>
                    <WarrantyCountdown
                      warrantyExpiresAt={effectiveWarrantyExpiresAt}
                      warrantyStartedAt={effectiveWarrantyStartedAt}
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

      {/* 12. Reset Demo Confirmation Modal */}
      {showResetModal && (
        <div className="tracker-modal-overlay">
          <div className="tracker-modal-content" style={{ maxWidth: "440px" }}>
            <div className="tracker-header">
              <div>
                <span className="live-pill" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                  RESET CONFIRMATION
                </span>
                <h2 style={{ margin: "4px 0 0", fontSize: "18px" }}>
                  Reset this demo booking to the starting state?
                </h2>
                <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#64748b" }}>
                  This will return this demo booking to the starting state, clear quotations, reset payments, and restart the live demo flow.
                </p>
              </div>
              <button className="tracker-close-btn" onClick={() => setShowResetModal(false)}>
                ✕
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1 }}
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                style={{ flex: 1, background: "#ef4444", borderColor: "#ef4444" }}
                onClick={handleConfirmResetDemo}
              >
                Reset Demo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


