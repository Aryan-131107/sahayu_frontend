import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { getBooking, cancelBooking as cancelBookingApi } from "./api";
import ServiceTimeline from "./ServiceTimeline";
import ServiceMap from "./ServiceMap";
import "./App.css";

function MyBookings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const initialId =
    searchParams.get("booking_id") ||
    location.state?.newBookingId ||
    "";

  const [bookingId, setBookingId] = useState(initialId);
  const [booking, setBooking] = useState(location.state?.bookingData || null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState(
    location.state?.newBookingId
      ? `Booking #${location.state.newBookingId} created successfully!`
      : ""
  );

  const fetchBooking = useCallback(
    async (idToFetch, silent = false) => {
      const id = idToFetch || bookingId;
      if (!id) {
        if (!silent) setError("Please enter a booking ID.");
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

  return (
    <div className="customer-page">
      <nav className="worker-topbar">
        <div className="logo">
          <span className="logo-icon">S</span>
          Sahāyu
        </div>

        <div className="topbar-actions">
          <button className="secondary-btn" onClick={() => navigate("/")}>
            Home
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
          <span className="section-label">MY BOOKINGS & SERVICE JOURNEY</span>

          <h1>
            Track your <span>service journey.</span>
          </h1>

          <p>
            Real-time live progress timeline connected directly to cooperative
            worker updates.
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
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label>
                  Booking ID
                  <input
                    type="number"
                    value={bookingId}
                    onChange={(event) => setBookingId(event.target.value)}
                    placeholder="Enter booking ID (e.g. 101)"
                    required
                  />
                </label>
              </div>

              <button
                type="submit"
                className="primary-btn"
                disabled={loading}
              >
                {loading ? "Checking Status..." : "Track Booking"}
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
                🔄 Live Status Auto-Sync (4s polling)
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
            {/* 2. 🚗 SERVICE JOURNEY / VISUAL PROGRESS TIMELINE */}
            <ServiceTimeline
              status={booking.status}
              bookingDate={booking.booking_date}
              amount={booking.amount}
            />

            {/* 1. 🗺️ Interactive Proximity Map for Booking */}
            <div style={{ margin: "25px 0" }}>
              <ServiceMap
                customerLocation="Your Registered Location"
                customerCoords={{
                  lat: booking.service_lat || 23.1815,
                  lon: booking.service_lon || 79.9864,
                }}
                worker={{
                  worker_id: booking.worker_id,
                  name: `Worker #${booking.worker_id}`,
                  relevant_skill: `Service #${booking.service_id}`,
                  distance_km: 1.2,
                  average_rating: 4.9,
                }}
              />
            </div>

            {/* Booking Details Card */}
            <div className="booking-summary-card">
              <div className="booking-summary-header">
                <div>
                  <h2>Booking Reference #{booking.booking_id}</h2>
                  <p>
                    Service #{booking.service_id} · Assigned to Worker #{booking.worker_id}
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
                  <small>Customer ID</small>
                  <strong>{booking.customer_id}</strong>
                </div>

                <div>
                  <small>Worker ID</small>
                  <strong>{booking.worker_id}</strong>
                </div>

                <div>
                  <small>Total Amount</small>
                  <strong>₹{booking.amount}</strong>
                </div>

                <div>
                  <small>Payment Status</small>
                  <strong>{booking.payment_status}</strong>
                </div>

                <div>
                  <small>Service Coordinates</small>
                  <strong>
                    {booking.service_lat !== undefined && booking.service_lat !== null
                      ? `${booking.service_lat}, ${booking.service_lon}`
                      : "Jabalpur Zone"}
                  </strong>
                </div>

                <div>
                  <small>Booking Date</small>
                  <strong>{booking.booking_date}</strong>
                </div>
              </div>

              {(booking.status === "PENDING" ||
                booking.status === "ACCEPTED") && (
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
          </>
        )}
      </main>
    </div>
  );
}

export default MyBookings;