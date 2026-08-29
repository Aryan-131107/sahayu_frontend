import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

function WorkerProfile() {
  const navigate = useNavigate();
  const [active, setActive] = useState(true);

  return (
    <div className="worker-page">

      <nav className="worker-topbar">

        <div className="logo">
          <span className="logo-icon">S</span>
          Sahāyu
        </div>

        <button
          className="secondary-btn"
          onClick={() => navigate("/worker")}
        >
          ← Dashboard
        </button>

      </nav>


      <main className="worker-dashboard">

        <div className="worker-welcome">

          <span className="section-label">
            WORKER PROFILE
          </span>

          <h1>
            Your professional <span>profile.</span>
          </h1>

        </div>


        <div className="profile-form-card">

          <div>

            <div className="form-row">

              <div className="form-group">

                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  defaultValue="Rajesh Kumar"
                />

              </div>


              <div className="form-group">

                <label>
                  Phone
                </label>

                <input
                  type="text"
                  defaultValue="+91 98765 43210"
                />

              </div>

            </div>


            <div className="form-group">

              <label>
                Primary Skill
              </label>

              <select defaultValue="Plumbing">
                <option>Plumbing</option>
                <option>Electrical</option>
                <option>Cleaning</option>
                <option>Carpentry</option>
                <option>Gardening</option>
                <option>Care Services</option>
              </select>

            </div>


            <div className="form-group">

              <label>
                Experience
              </label>

              <input
                type="text"
                defaultValue="5 years"
              />

            </div>


            <div className="form-group">

              <label>
                About You
              </label>

              <textarea
                rows="5"
                defaultValue="Experienced local professional providing reliable household services."
              />

            </div>


            <div className="availability-row">

              <div>
                <strong>
                  Available for work
                </strong>

                <p>
                  Customers can see you when you're available.
                </p>
              </div>

              <button
                className={
                  active
                    ? "availability-toggle active"
                    : "availability-toggle"
                }
                onClick={() => setActive(!active)}
              >
                <span />
              </button>

            </div>


            <button
              className="primary-btn profile-save-btn"
              onClick={() => navigate("/worker")}
            >
              Save Profile
            </button>

          </div>


          <div className="profile-side">

            <div className="profile-icon">
              🛠️
            </div>

            <h2>
              Build trust
            </h2>

            <p>
              A complete profile helps customers understand
              your experience and choose you with confidence.
            </p>


            <div className="profile-tip">
              ✓ Verified workers get more visibility
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}

export default WorkerProfile;