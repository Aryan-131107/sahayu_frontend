import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { getWorker, getService, createBooking } from "./api";
import ServiceMap from "./ServiceMap";
import "./App.css";

function Booking() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const reqState = location.state || {};
  const workerId =
    reqState.worker_id ||
    Number(searchParams.get("worker_id")) ||
    11;
  const serviceId =
    reqState.service_id ||
    Number(searchParams.get("service_id")) ||
    1;
  const customerId = reqState.customer_id || 1;

  const [worker, setWorker] = useState(null);
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const serviceLat =
    reqState.service_lat !== undefined ? reqState.service_lat : 23.1815;
  const serviceLon =
    reqState.service_lon !== undefined ? reqState.service_lon : 79.9864;
  const bookingDate =
    reqState.date || new Date().toISOString().split("T")[0];
  const bookingTime = reqState.time || "Morning";
  const userLocation = reqState.location || "Civil Lines, Jabalpur";

  // Standard Sahāyu Pricing Structure
  const workerPayout = 199;
  const platformFee = 30;
  const gullakContribution = 10;
  const totalAmount = 239;

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getWorker(workerId).catch(() => null),
      getService(serviceId).catch(() => null),
    ])
      .then(([workerData, serviceData]) => {
        if (!isMounted) return;
        setWorker(workerData);
        setService(serviceData);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load booking details.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workerId, serviceId]);

  const handleConfirmAndPay = async () => {
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        customer_id: Number(customerId),
        worker_id: Number(workerId),
        service_id: Number(serviceId),
        service_lat: Number(serviceLat),
        service_lon: Number(serviceLon),
        amount: Number(totalAmount),
      };

      const result = await createBooking(payload);

      if (result && result.booking_id) {
        navigate(`/my-bookings?booking_id=${result.booking_id}`, {
          state: {
            newBookingId: result.booking_id,
            bookingData: result,
          },
        });
      } else {
        throw new Error("Booking created but no booking ID was returned.");
      }
    } catch (err) {
      setError(err.message || "Failed to confirm booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const serviceName =
    reqState.service_name ||
    service?.service ||
    service?.service_name ||
    "Cooperative Trade Service";
  const workerName =
    reqState.worker_name || worker?.name || "Verified Professional";

  return (
    <div className="customer-page">
      <nav className="worker-topbar">
        <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <span className="logo-icon">S</span>
          Sahāyu
        </div>

        <button
          className="secondary-btn"
          onClick={() => navigate("/workers")}
        >
          ← Back to Workers
        </button>
      </nav>

      <main className="customer-dashboard">
        <div className="customer-header">
          <span className="section-label">BOOKING CONFIRMATION</span>

          <h1>
            Confirm your <span>service order.</span>
          </h1>
          <p>Review booking itinerary, location route, and transparent pricing breakdown.</p>
        </div>

        {/* Interactive Service Proximity Map */}
        {worker && (
          <div style={{ marginBottom: "25px" }}>
            <ServiceMap
              customerLocation={userLocation}
              customerCoords={{ lat: serviceLat, lon: serviceLon }}
              worker={worker}
              allWorkers={[worker]}
            />
          </div>
        )}

        <div className="booking-summary-card">
          <div className="booking-summary-header">
            <div>
              <h2>Order Summary</h2>
              <p>Standard Sahāyu Fair Pricing Structure</p>
            </div>

            <span className="booking-status waiting">Pending Confirmation</span>
          </div>

          {error && (
            <div
              style={{
                padding: "16px",
                background: "#fce5e5",
                color: "#a23c3c",
                borderRadius: "12px",
                marginBottom: "20px",
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ padding: "30px 0", textAlign: "center" }}>
              <p style={{ color: "#1d765c" }}>Loading booking details...</p>
            </div>
          ) : (
            <div className="booking-details-grid">
              <div>
                <small>Service Requested</small>
                <strong>{serviceName}</strong>
              </div>

              <div>
                <small>Selected Professional</small>
                <strong>
                  {workerName} {worker?.is_verified && "✓"}
                </strong>
              </div>

              <div>
                <small>Date & Time Slot</small>
                <strong>{bookingDate} · {bookingTime}</strong>
              </div>

              <div>
                <small>Service Location</small>
                <strong>{userLocation}</strong>
              </div>

              <div>
                <small>Total Booking Fee</small>
                <strong style={{ color: "#059669", fontSize: "18px" }}>₹{totalAmount}</strong>
              </div>

              <div>
                <small>Protection Guarantee</small>
                <strong style={{ color: "#1d765c" }}>🛡️ 3-Day Workmanship Included</strong>
              </div>
            </div>
          )}

          {/* Transparent Itemized Price Box */}
          <div className="invoice-preview-box">
            <div className="invoice-preview-header">
              <h4>SAHAYU SERVICE PRICING BREAKDOWN</h4>
              <button
                type="button"
                className="view-invoice-link"
                onClick={() => setShowInvoiceModal(true)}
              >
                📄 View Itemized Invoice Modal
              </button>
            </div>

            <div className="invoice-line-items">
              <div className="invoice-row">
                <span>Worker Base Inspection & Labour Floor (100% Payout)</span>
                <strong>₹{workerPayout}</strong>
              </div>
              <div className="invoice-row">
                <span>Platform Operations & Technology Fee</span>
                <strong>₹{platformFee}</strong>
              </div>
              <div className="invoice-row">
                <span>Cooperative Welfare Fund (Gullak Mutual Pool)</span>
                <strong>₹{gullakContribution}</strong>
              </div>
              <div className="invoice-row total-row">
                <span>Total Amount to Pay</span>
                <strong className="total-highlight">₹{totalAmount}</strong>
              </div>
            </div>

            <div className="guarantee-badge-row">
              <span>✓ 100% of ₹199 goes directly to worker</span>
              <span>✓ 0% platform deduction from worker payout</span>
              <span>🛡️ 3-Day Workmanship Guarantee Included</span>
            </div>
          </div>

          <div className="booking-action-footer">
            <button
              className="primary-btn full-btn"
              onClick={handleConfirmAndPay}
              disabled={submitting || loading}
            >
              {submitting ? "Processing Order..." : `Confirm & Book for ₹${totalAmount}`}
            </button>
          </div>
        </div>
      </main>

      {/* TRANSPARENT INVOICE MODAL */}
      {showInvoiceModal && (
        <div className="admin-modal-overlay" onClick={() => setShowInvoiceModal(false)}>
          <div className="admin-modal-box invoice-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>SAHĀYU SERVICE INVOICE</h3>
              <button className="modal-close-btn" onClick={() => setShowInvoiceModal(false)}>✕</button>
            </div>

            <div className="modal-body invoice-modal-body">
              <div className="invoice-brand-row">
                <div className="logo">
                  <span className="logo-icon">S</span>
                  Sahāyu Cooperative
                </div>
                <span className="invoice-id-tag">ESTIMATE · PRE-PAYMENT</span>
              </div>

              <div className="invoice-recipient-info">
                <div>
                  <small>Service</small>
                  <strong>{serviceName}</strong>
                </div>
                <div>
                  <small>Assigned Pro</small>
                  <strong>{workerName}</strong>
                </div>
                <div>
                  <small>Location</small>
                  <span>{userLocation}</span>
                </div>
              </div>

              <div className="invoice-table-styled">
                <div className="inv-table-header">
                  <span>Item Description</span>
                  <span>Amount</span>
                </div>
                <div className="inv-table-row">
                  <div>
                    <strong>Worker Labour & Inspection Floor</strong>
                    <small>100% disbursed directly to {workerName}</small>
                  </div>
                  <span>₹199.00</span>
                </div>
                <div className="inv-table-row">
                  <div>
                    <strong>Platform Operations & Dispatch</strong>
                    <small>Real-time routing, server infrastructure & support</small>
                  </div>
                  <span>₹30.00</span>
                </div>
                <div className="inv-table-row">
                  <div>
                    <strong>Cooperative Welfare (Gullak Pool)</strong>
                    <small>Community emergency, disability & health protection</small>
                  </div>
                  <span>₹10.00</span>
                </div>
                <div className="inv-table-row inv-total-row">
                  <strong>TOTAL AMOUNT PAYABLE</strong>
                  <strong className="inv-total-val">₹239.00</strong>
                </div>
              </div>

              <div className="invoice-guarantee-box">
                <div className="guarantee-icon">🛡️</div>
                <div>
                  <strong>3-Day Workmanship Guarantee Included</strong>
                  <p>If the requested repair is unsatisfactory, Sahāyu provides free re-inspection within 3 days.</p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="primary-btn"
                onClick={() => {
                  setShowInvoiceModal(false);
                  handleConfirmAndPay();
                }}
                disabled={submitting}
              >
                {submitting ? "Confirming..." : `Confirm & Pay ₹${totalAmount}`}
              </button>
              <button
                className="secondary-btn"
                onClick={() => setShowInvoiceModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Booking;