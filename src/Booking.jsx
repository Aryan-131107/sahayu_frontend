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

  const serviceLat =
    reqState.service_lat !== undefined ? reqState.service_lat : 23.1815;
  const serviceLon =
    reqState.service_lon !== undefined ? reqState.service_lon : 79.9864;
  const bookingDate =
    reqState.date || new Date().toISOString().split("T")[0];
  const bookingTime = reqState.time || "Morning";
  const userLocation = reqState.location || "Civil Lines, Jabalpur";

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

  const calculatedAmount =
    reqState.amount ||
    worker?.hourly_rate ||
    service?.base_price ||
    350;

  const confirmBooking = async () => {
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        customer_id: Number(customerId),
        worker_id: Number(workerId),
        service_id: Number(serviceId),
        service_lat: Number(serviceLat),
        service_lon: Number(serviceLon),
        amount: Number(calculatedAmount),
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
    "Service";
  const workerName =
    reqState.worker_name || worker?.name || `Worker #${workerId}`;

  return (
    <div className="customer-page">
      <nav className="worker-topbar">
        <div className="logo">
          <span className="logo-icon">S</span>
          Sahāyu
        </div>

        <button
          className="secondary-btn"
          onClick={() => navigate("/workers")}
        >
          ← Back
        </button>
      </nav>

      <main className="customer-dashboard">
        <div className="customer-header">
          <span className="section-label">BOOKING</span>

          <h1>
            Confirm your <span>booking.</span>
          </h1>
          <p>Review the details and location routing before confirming.</p>
        </div>

        {/* 1. 🗺️ Interactive Service Map */}
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
              <h2>Service Request</h2>
              <p>Review the details before confirming.</p>
            </div>

            <span className="booking-status waiting">Pending</span>
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
              <p style={{ color: "#1d765c" }}>Loading worker and service details...</p>
            </div>
          ) : (
            <div className="booking-details-grid">
              <div>
                <small>Service</small>
                <strong>{serviceName}</strong>
              </div>

              <div>
                <small>Worker</small>
                <strong>
                  {workerName} {worker?.is_verified && "✓"}
                </strong>
              </div>

              <div>
                <small>Date</small>
                <strong>{bookingDate}</strong>
              </div>

              <div>
                <small>Time</small>
                <strong>{bookingTime}</strong>
              </div>

              <div>
                <small>Location</small>
                <strong>{userLocation}</strong>
              </div>

              <div>
                <small>Estimated Price</small>
                <strong>₹{calculatedAmount}</strong>
              </div>
            </div>
          )}

          <div className="booking-note">
            💡 <strong>Cooperative Assurance:</strong> Fair wages directly to
            the worker. Final payment of ₹{calculatedAmount} will be recorded
            upon service completion.
          </div>

          <button
            className="primary-btn full-btn"
            onClick={confirmBooking}
            disabled={submitting || loading}
          >
            {submitting ? "Confirming Booking..." : "Confirm Booking"}
          </button>
        </div>
      </main>
    </div>
  );
}

export default Booking;