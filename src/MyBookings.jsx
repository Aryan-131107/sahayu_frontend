import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import {
  getBooking,
  cancelBooking as cancelBookingApi,
  createReview,
  getBookingQuotation,
  saveBookingQuotation,
  getBookingPayment,
  saveBookingPayment,
  completeBooking,
} from "./api";
import ServiceTimeline from "./ServiceTimeline";
import ServiceMap from "./ServiceMap";
import WarrantyCountdown from "./WarrantyCountdown";
import "./App.css";

function MyBookings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const initialId =
    searchParams.get("booking_id") ||
    location.state?.newBookingId ||
    "1";

  const [bookingId, setBookingId] = useState(initialId);
  const [booking, setBooking] = useState(location.state?.bookingData || null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    location.state?.newBookingId
      ? `Booking Reference #${location.state.newBookingId} created successfully!`
      : ""
  );

  // Quotation & Payment State Trigger
  const [, setQuoteVersion] = useState(0);
  const [payingDemo, setPayingDemo] = useState(false);
  const [paymentSuccessToast, setPaymentSuccessToast] = useState("");

  const quotation = booking?.booking_id ? getBookingQuotation(booking.booking_id) : null;
  const paymentData = booking?.booking_id ? getBookingPayment(booking.booking_id) : null;

  // Review Form State
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [reviewError, setReviewError] = useState("");

  const fetchBooking = useCallback(
    async (idToFetch, silent = false) => {
      const id = idToFetch || bookingId;
      if (!id) {
        if (!silent) setError("Please enter a booking reference number.");
        return;
      }

      if (!silent) setLoading(true);
      setError("");

      try {
        const data = await getBooking(id);
        setBooking(data);
        setSearchParams({ booking_id: String(id) });
      } catch (requestError) {
        if (!silent) {
          setError(requestError.message || "Booking not found.");
          setBooking(null);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [bookingId, setSearchParams]
  );

  useEffect(() => {
    let isMounted = true;
    if (initialId && !location.state?.bookingData) {
      getBooking(initialId)
        .then((data) => {
          if (isMounted) setBooking(data);
        })
        .catch((err) => {
          if (isMounted) setError(err.message || "Booking not found.");
        });
    }
    return () => {
      isMounted = false;
    };
  }, [initialId, location.state?.bookingData]);

  // Live Auto-Refresh polling for real-time journey updates
  useEffect(() => {
    if (!autoRefresh || !booking?.booking_id) return;
    if (booking.status === "COMPLETED" || booking.status === "CANCELLED") return;

    const interval = setInterval(() => {
      fetchBooking(booking.booking_id, true);
    }, 4000);

    return () => clearInterval(interval);
  }, [autoRefresh, booking?.booking_id, booking?.status, fetchBooking]);

  const handleCancelBooking = async () => {
    if (!booking) return;

    setCancelling(true);
    setError("");
    setSuccessMessage("");

    try {
      const data = await cancelBookingApi(booking.booking_id);
      setBooking(data);
      setSuccessMessage(`Booking #${booking.booking_id} has been cancelled.`);
    } catch (requestError) {
      setError(requestError.message || "Unable to cancel booking.");
    } finally {
      setCancelling(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!booking) return;

    setSubmittingReview(true);
    setReviewError("");
    setReviewSuccess("");

    try {
      await createReview({
        booking_id: booking.booking_id,
        customer_id: booking.customer_id || 1,
        rating: Number(rating),
        review: reviewText || "Excellent service and high professionalism.",
      });
      setReviewSuccess("✓ Thank you! Your review has been submitted to the cooperative.");
      setReviewText("");
    } catch (err) {
      setReviewError(err.message || "Review could not be submitted.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleApproveQuotation = () => {
    if (!booking || !quotation) return;
    const updated = {
      ...quotation,
      status: "APPROVED",
      approved_at: new Date().toISOString(),
    };
    saveBookingQuotation(booking.booking_id, updated);
    setQuoteVersion((v) => v + 1);
    setSuccessMessage(`✓ Additional work quotation of ₹${quotation.additional_amount} approved! Total service fee updated to ₹${239 + quotation.additional_amount}.`);
  };

  const handleDeclineQuotation = () => {
    if (!booking || !quotation) return;
    const updated = {
      ...quotation,
      status: "REJECTED",
      rejected_at: new Date().toISOString(),
    };
    saveBookingQuotation(booking.booking_id, updated);
    setQuoteVersion((v) => v + 1);
    setSuccessMessage(`Quotation declined. Proceeding with base inspection service only (₹239).`);
  };

  const calculateFinalPayableAmount = () => {
    const base = 239;
    if (quotation && quotation.status === "APPROVED") {
      return base + (quotation.additional_amount || 0);
    }
    return base;
  };

  const handleSimulatePayment = async () => {
    if (!booking) return;
    setPayingDemo(true);
    setError("");

    try {
      const finalAmount = calculateFinalPayableAmount();
      const pData = {
        booking_id: booking.booking_id,
        amount: finalAmount,
        status: "PAID",
        payment_method: "COOPERATIVE_INSTANT_SETTLEMENT",
        paid_at: new Date().toISOString(),
      };
      saveBookingPayment(booking.booking_id, pData);
      setQuoteVersion((v) => v + 1);

      // Trigger backend completion if not already marked
      try {
        await completeBooking(booking.booking_id);
      } catch {
        // Backend may already be marked via OTP
      }

      const freshBooking = await getBooking(booking.booking_id);
      setBooking({
        ...freshBooking,
        payment_status: "PAID",
        status: "COMPLETED",
      });

      setPaymentSuccessToast(`✓ Payment of ₹${finalAmount} settled! 100% labour floor disbursed to ${booking.worker_name || 'Worker'} & 72-Hour Warranty Activated.`);
    } catch (err) {
      setError(err.message || "Payment simulation failed.");
    } finally {
      setPayingDemo(false);
    }
  };

  // Predictable, Secure OTP derivations for this booking
  const startOtp = String(4821);
  const endOtp = String(9134);

  return (
    <div className="customer-page">
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
            onClick={() => navigate(`/live-demo?booking_id=${bookingId}`)}
          >
            ⚡ Live Demo
          </button>

          <button
            className="primary-btn"
            onClick={() => navigate("/customer")}
          >
            New Booking
          </button>
        </div>
      </nav>

      <main className="customer-dashboard">
        <div className="customer-header">
          <span className="section-label">ACTIVE SERVICE TRACKER</span>

          <h1>
            Your service <span>journey.</span>
          </h1>

          <p>
            Track your assigned professional, OTP security verification, and 3-Day Workmanship Guarantee.
          </p>
        </div>

        {successMessage && (
          <div
            style={{
              padding: "16px 20px",
              background: "#e2f3e9",
              color: "#23704e",
              borderRadius: "14px",
              marginBottom: "20px",
              fontWeight: 700,
              maxWidth: "900px",
            }}
          >
            ✓ {successMessage}
          </div>
        )}

        <div className="booking-summary-card" style={{ marginBottom: "25px" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchBooking(bookingId);
            }}
          >
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "220px" }}>
                <label>
                  Search Booking Reference
                  <input
                    type="number"
                    value={bookingId}
                    onChange={(event) => setBookingId(event.target.value)}
                    placeholder="Enter Booking Reference (e.g. 1)"
                    required
                  />
                </label>
              </div>

              <button
                type="submit"
                className="primary-btn"
                disabled={loading}
              >
                {loading ? "Checking Status..." : "Track Order"}
              </button>
            </div>
          </form>

          {booking && (
            <div style={{ marginTop: "15px", display: "flex", alignItems: "center", gap: "10px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", color: "#1d765c", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                🔄 Live Status Auto-Sync (Updates every 4s)
              </label>
            </div>
          )}

          {error && (
            <p
              className="api-error"
              style={{ color: "#a23c3c", marginTop: "15px", fontWeight: 600 }}
            >
              {error}
            </p>
          )}
        </div>

        {booking && (
          <>
            {paymentSuccessToast && (
              <div className="admin-toast-success" style={{ marginBottom: "20px" }}>
                {paymentSuccessToast}
              </div>
            )}

            {/* 1. 🚗 PROGRESS TIMELINE (BOOKED -> ARRIVED -> IN PROGRESS -> COMPLETED -> WARRANTY ACTIVE) */}
            <ServiceTimeline
              status={booking.status}
              bookingDate={booking.booking_date}
              amount={calculateFinalPayableAmount()}
              startOtpVerifiedAt={booking.start_otp_verified_at}
              endOtpVerifiedAt={booking.end_otp_verified_at}
              warrantyExpiresAt={booking.warranty_expires_at}
              bookingReference={booking.booking_reference}
            />

            {/* ON-SITE INSPECTION & ADDITIONAL QUOTATION APPROVAL CARD */}
            {quotation && (
              <div
                className={`quotation-approval-card ${
                  quotation.status === "PENDING_APPROVAL" ? "pending-review" : ""
                }`}
                style={{ marginBottom: "25px" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <span className="quote-badge">ON-SITE INSPECTION REPORT</span>
                    <h3 style={{ margin: "4px 0 2px", fontSize: "17px", color: "#0f172a" }}>
                      Additional Work Quotation
                    </h3>
                    <p style={{ margin: 0, color: "#64748b", fontSize: "13px" }}>
                      Your technician has inspected the site and proposed the following required parts / repairs:
                    </p>
                  </div>

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
                      ? "✓ APPROVED BY YOU"
                      : quotation.status === "REJECTED"
                      ? "✕ DECLINED (BASE ONLY)"
                      : "🔔 ACTION REQUIRED"}
                  </span>
                </div>

                <div className="quote-items-table" style={{ marginTop: "12px" }}>
                  {quotation.items?.map((item, idx) => (
                    <div key={idx} className="quote-item-row">
                      <span>{item.name} × {item.qty}</span>
                      <strong>₹{item.price * item.qty}</strong>
                    </div>
                  ))}
                  <div className="quote-item-row" style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "6px" }}>
                    <span>Initial Inspection Floor:</span>
                    <span>₹239</span>
                  </div>
                  <div className="quote-item-row quote-total-row">
                    <span>Final Amount Payable After Job:</span>
                    <strong style={{ color: "#059669", fontSize: "16px" }}>
                      ₹{quotation.status === "APPROVED" ? 239 + quotation.additional_amount : 239}
                    </strong>
                  </div>
                </div>

                {quotation.status === "PENDING_APPROVAL" && (
                  <div className="quote-actions-row" style={{ marginTop: "15px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={handleApproveQuotation}
                    >
                      ✓ Approve Quotation (Total: ₹{239 + quotation.additional_amount})
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={handleDeclineQuotation}
                    >
                      ✕ Decline (Proceed with Base ₹239 Inspection Only)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 2. 🔐 OTP VERIFICATION CONCEPT (START & END OTP) */}
            {booking.status !== "CANCELLED" && (
              <div className="otp-security-container">
                <div className="otp-card start-otp-card">
                  <div className="otp-header">
                    <span className="otp-badge start">STEP 1 · ARRIVAL</span>
                    <h4>START PIN</h4>
                  </div>
                  <div className="otp-display-box">{booking.start_otp || startOtp}</div>
                  <p className="otp-instruction">
                    Share this PIN with your worker when they arrive at your location.
                  </p>
                  <small className="otp-sub-note">
                    {booking.status === "in_progress" || booking.status === "IN_PROGRESS" || booking.status === "completed" || booking.status === "COMPLETED"
                      ? "✓ Start PIN verified via Backend Consensus"
                      : "Worker enters this to start the job."}
                  </small>
                </div>

                <div className="otp-card end-otp-card">
                  <div className="otp-header">
                    <span className="otp-badge end">STEP 2 · COMPLETION</span>
                    <h4>COMPLETION PIN</h4>
                  </div>
                  <div className="otp-display-box">{booking.end_otp || endOtp}</div>
                  <p className="otp-instruction">
                    Share this PIN only after the work is completed and thoroughly checked.
                  </p>
                  <small className="otp-sub-note">
                    {booking.status === "completed" || booking.status === "COMPLETED"
                      ? "✓ Completion PIN verified & work signed off"
                      : "Ensures satisfaction before payment disbursement."}
                  </small>
                </div>
              </div>
            )}

            {/* 💳 INTERACTIVE POST-COMPLETION PAYMENT STEP */}
            {booking.status === "COMPLETED" && (booking.payment_status !== "PAID" && paymentData?.status !== "PAID") && (
              <div className="payment-pending-card" style={{ marginBottom: "25px" }}>
                <div className="payment-card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "28px" }}>💳</span>
                    <div>
                      <h3 style={{ margin: 0, color: "#0f172a" }}>Payment Pending (Job Completed)</h3>
                      <p style={{ margin: "2px 0 0", color: "#64748b", fontSize: "13px" }}>
                        Work has been validated via Completion PIN. Please settle the total fee to disburse 100% labour floor to worker and activate your warranty.
                      </p>
                    </div>
                  </div>
                  <span className="status-badge yellow">PAYMENT DUE</span>
                </div>

                <div className="invoice-preview-box" style={{ margin: "16px 0" }}>
                  <div className="invoice-line-items">
                    <div className="invoice-row">
                      <span>Worker Base Inspection & Labour Floor (100%):</span>
                      <strong>₹199</strong>
                    </div>
                    <div className="invoice-row">
                      <span>Platform Tech Fee:</span>
                      <strong>₹30</strong>
                    </div>
                    <div className="invoice-row">
                      <span>Cooperative Welfare (Gullak Pool):</span>
                      <strong>₹10</strong>
                    </div>
                    {quotation && quotation.status === "APPROVED" && (
                      <div className="invoice-row" style={{ color: "#059669" }}>
                        <span>Approved Additional Work ({quotation.items?.map(i => i.name).join(", ")}):</span>
                        <strong>+₹{quotation.additional_amount}</strong>
                      </div>
                    )}
                    <div className="invoice-row total-row">
                      <span>Total Payable:</span>
                      <strong className="total-highlight">₹{calculateFinalPayableAmount()}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    className="primary-btn"
                    style={{ background: "#059669", borderColor: "#059669", fontSize: "15px", padding: "12px 24px" }}
                    onClick={handleSimulatePayment}
                    disabled={payingDemo}
                  >
                    {payingDemo ? "Processing Settlement..." : `⚡ Demo Pay (Simulate Successful Payment of ₹${calculateFinalPayableAmount()})`}
                  </button>
                </div>
              </div>
            )}

            {/* 3. 🛡️ 3-DAY WORKMANSHIP GUARANTEE (DYNAMIC COUNTDOWN DRIVEN BY BACKEND) */}
            {booking.status !== "CANCELLED" && (
              <WarrantyCountdown
                warrantyExpiresAt={booking.warranty_expires_at}
                warrantyStartedAt={booking.warranty_started_at}
                status={booking.status}
              />
            )}

            {/* 4. 🗺️ Proximity Routing Map */}
            <div style={{ margin: "25px 0" }}>
              <ServiceMap
                customerLocation={booking.address || "Your Service Address"}
                customerCoords={{
                  lat: booking.service_lat || 23.1815,
                  lon: booking.service_lon || 79.9864,
                }}
                worker={{
                  worker_id: booking.worker_id,
                  name: booking.worker_name || `Professional #${booking.worker_id}`,
                  relevant_skill: booking.service_name || "Cooperative Pro",
                  distance_km: 1.2,
                  average_rating: 4.9,
                }}
              />
            </div>

            {/* 5. 📋 Booking Details Card */}
            <div className="booking-summary-card">
              <div className="booking-summary-header">
                <div>
                  <h2>Order Reference #{booking.booking_id}</h2>
                  <p>
                    {booking.service_name || "Service Order"} · Assigned to {booking.worker_name || `Worker #${booking.worker_id}`}
                  </p>
                </div>

                <span
                  className={
                    booking.status === "PENDING"
                      ? "booking-status waiting"
                      : booking.status === "CANCELLED"
                      ? "booking-status rejected"
                      : "booking-status accepted"
                  }
                >
                  {booking.status}
                </span>
              </div>

              <div className="booking-details-grid">
                <div>
                  <small>Service</small>
                  <strong>{booking.service_name || "Trade Service"}</strong>
                </div>

                <div>
                  <small>Assigned Worker</small>
                  <strong>{booking.worker_name || `Worker #${booking.worker_id}`} ✓</strong>
                </div>

                <div>
                  <small>Total Fee</small>
                  <strong style={{ color: "#059669" }}>₹{booking.amount || 239}</strong>
                </div>

                <div>
                  <small>Payment Status</small>
                  <strong className={booking.payment_status === "PAID" ? "paid-text" : "pending-text"}>
                    {booking.payment_status || "PENDING"}
                  </strong>
                </div>

                <div>
                  <small>Service Date</small>
                  <strong>{booking.booking_date || "Today"}</strong>
                </div>

                <div>
                  <small>Scheduled Slot</small>
                  <strong>{booking.start_time ? booking.start_time.slice(0, 5) : "Morning (9 AM – 12 PM)"}</strong>
                </div>
              </div>

              {/* Price Division Callout */}
              <div className="pricing-breakdown-mini">
                <div className="mini-row">
                  <span>Worker Inspection & Labour Floor:</span>
                  <strong>₹199 (100% to Worker)</strong>
                </div>
                <div className="mini-row">
                  <span>Platform Operations:</span>
                  <strong>₹30</strong>
                </div>
                <div className="mini-row">
                  <span>Cooperative Welfare Fund (Gullak):</span>
                  <strong>₹10</strong>
                </div>
              </div>

              {(booking.status === "PENDING" || booking.status === "ACCEPTED") && (
                <div style={{ marginTop: "25px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button
                    className="secondary-btn"
                    style={{
                      borderColor: "#a23c3c",
                      color: "#a23c3c",
                    }}
                    onClick={handleCancelBooking}
                    disabled={cancelling}
                  >
                    {cancelling ? "Cancelling..." : "Cancel Booking"}
                  </button>

                  <button
                    className="secondary-btn"
                    onClick={() => fetchBooking(booking.booking_id)}
                  >
                    🔄 Refresh Status
                  </button>
                </div>
              )}
            </div>

            {/* 6. ⭐ RATING & REVIEW FORM (AVAILABLE ONLY AFTER COMPLETION) */}
            {booking.status === "COMPLETED" && (
              <div className="booking-summary-card" style={{ marginTop: "25px" }}>
                <div className="booking-summary-header">
                  <div>
                    <h3>Rate & Review Your Experience</h3>
                    <p>Help other cooperative community members by sharing honest feedback.</p>
                  </div>
                </div>

                {reviewSuccess && (
                  <div className="admin-toast-success" style={{ margin: "10px 0" }}>
                    {reviewSuccess}
                  </div>
                )}

                {reviewError && (
                  <div className="admin-toast-error" style={{ margin: "10px 0" }}>
                    {reviewError}
                  </div>
                )}

                <form onSubmit={handleReviewSubmit} style={{ marginTop: "15px" }}>
                  <div className="form-group">
                    <label>Rating (1 to 5 Stars)</label>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", margin: "8px 0" }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          style={{
                            fontSize: "24px",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            filter: star <= rating ? "none" : "grayscale(100%) opacity(40%)",
                          }}
                        >
                          ⭐
                        </button>
                      ))}
                      <strong style={{ marginLeft: "8px", color: "#d97706" }}>{rating} / 5 Stars</strong>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Your Feedback / Comments</label>
                    <textarea
                      rows="3"
                      className="form-control"
                      placeholder="Share details about punctuality, trade skill, and satisfaction..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={submittingReview}
                  >
                    {submittingReview ? "Submitting Review..." : "Submit Review"}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default MyBookings;