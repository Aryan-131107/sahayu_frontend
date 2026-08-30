import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL;

function MyBookings() {
  const navigate = useNavigate();

  const [bookingId, setBookingId] = useState("");
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getBooking = async () => {
    if (!bookingId) {
      setError("Please enter a booking ID.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/bookings/${bookingId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Booking not found.");
      }

      setBooking(data);
    } catch (requestError) {
      setError(requestError.message);
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  const cancelBooking = async () => {
    if (!booking) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/bookings/${booking.booking_id}/cancel`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to cancel booking.");
      }

      setBooking(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
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
          <button
            className="secondary-btn"
            onClick={() => navigate("/")}
          >
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
          <span className="section-label">MY BOOKINGS</span>

          <h1>
            Your <span>bookings.</span>
          </h1>

          <p>Enter your booking ID to check its current status.</p>
        </div>

        <div className="booking-summary-card">
          <label>
            Booking ID
            <input
              type="number"
              value={bookingId}
              onChange={(event) => setBookingId(event.target.value)}
              placeholder="Example: 101"
            />
          </label>

          <button
            className="primary-btn"
            onClick={getBooking}
            disabled={loading}
          >
            {loading ? "Loading..." : "Check Booking"}
          </button>

          {error && (
            <p className="api-error">
              {error}
            </p>
          )}
        </div>

        {booking && (
          <div className="booking-summary-card">
            <div className="booking-summary-header">
              <div>
                <h2>Booking #{booking.booking_id}</h2>

                <p>
                  Service #{booking.service_id} · {booking.booking_date}
                </p>
              </div>

              <span className="booking-status accepted">
                {booking.status}
              </span>
            </div>

            <div className="booking-details-grid">
              <div>
                <small>Worker ID</small>
                <strong>{booking.worker_id}</strong>
              </div>

              <div>
                <small>Amount</small>
                <strong>₹{booking.amount}</strong>
              </div>

              <div>
                <small>Payment Status</small>
                <strong>{booking.payment_status}</strong>
              </div>

              <div>
                <small>Location</small>
                <strong>
                  {booking.service_lat ?? "—"},
                  {" "}
                  {booking.service_lon ?? "—"}
                </strong>
              </div>
            </div>

            {(booking.status === "PENDING" ||
              booking.status === "ACCEPTED") && (
              <button
                className="secondary-btn"
                onClick={cancelBooking}
                disabled={loading}
              >
                {loading ? "Cancelling..." : "Cancel Booking"}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default MyBookings;