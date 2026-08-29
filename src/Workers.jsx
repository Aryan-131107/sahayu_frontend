import { useNavigate } from "react-router-dom";
import "./App.css";

const workers = [
  {
    name: "Rajesh Kumar",
    skill: "Plumbing Specialist",
    rating: "4.9",
    jobs: "128 jobs",
    price: "₹350/hr",
    icon: "🔧",
  },
  {
    name: "Amit Sharma",
    skill: "Electrical Technician",
    rating: "4.8",
    jobs: "96 jobs",
    price: "₹400/hr",
    icon: "⚡",
  },
  {
    name: "Sunita Verma",
    skill: "Home Cleaning Expert",
    rating: "4.9",
    jobs: "154 jobs",
    price: "₹300/hr",
    icon: "🧹",
  },
  {
    name: "Mohan Patel",
    skill: "Carpentry Specialist",
    rating: "4.7",
    jobs: "82 jobs",
    price: "₹450/hr",
    icon: "🪚",
  },
];

function Workers() {
  const navigate = useNavigate();

  return (
    <div className="workers-page">

      <nav className="worker-topbar">

        <div className="logo">
          <span className="logo-icon">S</span>
          Sahāyu
        </div>

        <div className="topbar-actions">

          <button
            className="secondary-btn"
            onClick={() => navigate("/customer")}
          >
            New Request
          </button>

          <button
            className="primary-btn"
            onClick={() => navigate("/my-bookings")}
          >
            My Bookings
          </button>

        </div>

      </nav>


      <main className="workers-container">

        <button
          className="back-link"
          onClick={() => navigate("/customer")}
        >
          ← Back to Request
        </button>


        <div className="workers-heading">

          <span className="section-label">
            VERIFIED WORKERS
          </span>

          <h1>
            Choose your <span>worker.</span>
          </h1>

          <p>
            Skilled professionals from your local
            cooperative community.
          </p>

        </div>


        <div className="workers-list">

          {workers.map((worker, index) => (

            <div
              className="worker-result-card"
              key={index}
            >

              <div className="worker-avatar">
                {worker.icon}
              </div>


              <div>

                <div className="worker-name-row">

                  <h2>{worker.name}</h2>

                  <span className="verified-badge">
                    ✓ VERIFIED
                  </span>

                </div>

                <p className="worker-skill">
                  {worker.skill}
                </p>

                <div className="worker-meta">
                  <span>⭐ {worker.rating}</span>
                  <span>{worker.jobs}</span>
                  <span>📍 Nearby</span>
                </div>

              </div>


              <div className="worker-price">

                <small>Starting from</small>

                <strong>
                  {worker.price}
                </strong>

                <button
                  className="primary-btn"
                  onClick={() =>
                    navigate("/booking")
                  }
                >
                  Book Worker
                </button>

              </div>

            </div>

          ))}

        </div>


        <div className="worker-trust-box">

          <span>🤝</span>

          <div>
            <h3>
              Community-powered trust
            </h3>

            <p>
              Every worker on Sahāyu is part of our
              cooperative network.
            </p>
          </div>

        </div>

      </main>

    </div>
  );
}

export default Workers;