import { useNavigate } from "react-router-dom";
import "./App.css";

function Booking() {
  const navigate = useNavigate();

  const confirmBooking = () => {
    navigate("/my-bookings");
  };

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

          <span className="section-label">
            BOOKING
          </span>

          <h1>
            Confirm your <span>booking.</span>
          </h1>

        </div>


        <div className="booking-summary-card">

          <div className="booking-summary-header">

            <div>
              <h2>Service Request</h2>
              <p>
                Review the details before confirming.
              </p>
            </div>

            <span className="booking-status waiting">
              Pending
            </span>

          </div>


          <div className="booking-details-grid">

            <div>
              <small>Service</small>
              <strong>Plumbing</strong>
            </div>

            <div>
              <small>Worker</small>
              <strong>Rajesh Kumar</strong>
            </div>

            <div>
              <small>Date</small>
              <strong>28 August 2026</strong>
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
              <small>Estimated Price</small>
              <strong>₹350/hr</strong>
            </div>

          </div>


          <div className="booking-note">
            💡 Final pricing will be confirmed with the
            worker before the service begins.
          </div>


          <button
            className="primary-btn full-btn"
            onClick={confirmBooking}
          >
            Confirm Booking
          </button>

        </div>

      </main>

    </div>
  );
}

export default Booking;