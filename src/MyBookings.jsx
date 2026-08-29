import { useNavigate } from "react-router-dom";
import "./App.css";

function MyBookings() {
  const navigate = useNavigate();

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

          <span className="section-label">
            MY BOOKINGS
          </span>

          <h1>
            Your <span>bookings.</span>
          </h1>

          <p>
            Track your service requests and bookings.
          </p>

        </div>


        <div className="booking-summary-card">

          <div className="booking-summary-header">

            <div>
              <h2>Plumbing Service</h2>
              <p>
                Rajesh Kumar · 28 August 2026
              </p>
            </div>

            <span className="booking-status accepted">
              Confirmed
            </span>

          </div>


          <div className="booking-details-grid">

            <div>
              <small>Worker</small>
              <strong>Rajesh Kumar</strong>
            </div>

            <div>
              <small>Time</small>
              <strong>10:00 AM</strong>
            </div>

            <div>
              <small>Location</small>
              <strong>Your Location</strong>
            </div>

            <div>
              <small>Price</small>
              <strong>₹350/hr</strong>
            </div>

          </div>


          <div className="booking-note">
            ✓ Your booking has been successfully placed.
          </div>


          <button
            className="secondary-btn"
            onClick={() => navigate("/customer")}
          >
            Book Another Service
          </button>

        </div>

      </main>

    </div>
  );
}

export default MyBookings;