import { useNavigate, useSearchParams } from "react-router-dom";
import "./App.css";

function Customer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const selectedService =
    searchParams.get("service") || "";

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/workers");
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
            onClick={() => navigate("/my-bookings")}
          >
            My Bookings
          </button>

        </div>

      </nav>


      <main className="customer-dashboard">

        <div className="customer-header">

          <span className="section-label">
            CUSTOMER
          </span>

          <h1>
            Find the right <span>worker.</span>
          </h1>

          <p>
            Tell us what you need and we'll help you find
            verified local professionals.
          </p>

        </div>


        <div className="request-layout">

          <form
            className="request-form"
            onSubmit={handleSubmit}
          >

            <h2>Request a Service</h2>


            <label>
              Service
            </label>

            <select
              defaultValue={selectedService}
              required
            >
              <option value="">
                Select a service
              </option>

              <option>Plumbing</option>
              <option>Electrical</option>
              <option>Cleaning</option>
              <option>Carpentry</option>
              <option>Gardening</option>
              <option>Care Services</option>
            </select>


            <label>
              Location
            </label>

            <input
              type="text"
              placeholder="Enter your location"
              required
            />


            <label>
              Preferred Date
            </label>

            <input
              type="date"
              required
            />


            <label>
              Preferred Time
            </label>

            <select required>
              <option value="">
                Select time
              </option>

              <option>Morning</option>
              <option>Afternoon</option>
              <option>Evening</option>
            </select>


            <label>
              Describe your requirement
            </label>

            <textarea
              rows="5"
              placeholder="Tell the worker what you need..."
            />


            <button
              type="submit"
              className="primary-btn full-btn"
            >
              Find Workers
            </button>

          </form>


          <div className="request-info">

            <div className="request-info-icon">
              🤝
            </div>

            <h2>
              Why choose Sahāyu?
            </h2>


            <div className="customer-benefit">
              <span>✓</span>
              <p>Verified local workers</p>
            </div>


            <div className="customer-benefit">
              <span>₹</span>
              <p>Transparent pricing</p>
            </div>


            <div className="customer-benefit">
              <span>⭐</span>
              <p>Community trusted professionals</p>
            </div>


            <div className="customer-benefit">
              <span>🔒</span>
              <p>Safe and reliable bookings</p>
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}

export default Customer;