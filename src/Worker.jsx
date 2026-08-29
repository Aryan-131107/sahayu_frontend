import { useNavigate } from "react-router-dom";
import "./App.css";

function Worker() {
  const navigate = useNavigate();

  return (
    <div className="worker-page">

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
            onClick={() =>
              navigate("/worker-profile")
            }
          >
            My Profile
          </button>

        </div>

      </nav>


      <main className="worker-dashboard">

        <div className="worker-welcome">

          <span className="section-label">
            WORKER DASHBOARD
          </span>

          <h1>
            Welcome back, <span>Worker.</span>
          </h1>

          <p>
            Manage your services, requests and earnings
            from one place.
          </p>

        </div>


        <div className="worker-stats">

          <div className="worker-stat-card">
            <span>💼</span>

            <div>
              <strong>12</strong>
              <p>Active Jobs</p>
            </div>
          </div>


          <div className="worker-stat-card">
            <span>₹</span>

            <div>
              <strong>₹8,450</strong>
              <p>This Month</p>
            </div>
          </div>


          <div className="worker-stat-card">
            <span>⭐</span>

            <div>
              <strong>4.9</strong>
              <p>Your Rating</p>
            </div>
          </div>

        </div>


        <section className="worker-jobs">

          <div className="worker-section-title">
            <h2>Recent Requests</h2>

            <button
              className="secondary-btn"
              onClick={() =>
                navigate("/worker-profile")
              }
            >
              Edit Profile
            </button>
          </div>


          <div className="job-grid">

            <div className="job-card">

              <div className="job-icon">
                🔧
              </div>

              <div className="job-details">

                <span className="job-type">
                  PLUMBING
                </span>

                <h3>
                  Kitchen Pipe Repair
                </h3>

                <p>
                  📍 Nearby · Today
                </p>

                <strong>
                  ₹500 estimated
                </strong>

              </div>

              <button
                className="job-btn"
                onClick={() =>
                  navigate("/booking")
                }
              >
                View
              </button>

            </div>


            <div className="job-card">

              <div className="job-icon">
                ⚡
              </div>

              <div className="job-details">

                <span className="job-type">
                  ELECTRICAL
                </span>

                <h3>
                  Fan Installation
                </h3>

                <p>
                  📍 2.4 km · Tomorrow
                </p>

                <strong>
                  ₹400 estimated
                </strong>

              </div>

              <button
                className="job-btn"
                onClick={() =>
                  navigate("/booking")
                }
              >
                View
              </button>

            </div>

          </div>

        </section>


        <div className="worker-profile-card">

          <div>
            <h2>
              Grow with Sahāyu
            </h2>

            <p>
              Build your reputation and connect with
              more customers in your community.
            </p>
          </div>

          <button
            className="primary-btn"
            onClick={() =>
              navigate("/worker-profile")
            }
          >
            Manage Profile
          </button>

        </div>

      </main>

    </div>
  );
}

export default Worker;