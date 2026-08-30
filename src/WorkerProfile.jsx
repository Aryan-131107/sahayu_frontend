import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getWorker, updateWorkerAvailability } from "./api";
import "./App.css";

function WorkerProfile() {
  const navigate = useNavigate();
  const location = useLocation();

  const workerId =
    location.state?.worker_id ||
    localStorage.getItem("sahayu_worker_id") ||
    "11";

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [skill, setSkill] = useState("");
  const [experience, setExperience] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    let isMounted = true;

    getWorker(workerId)
      .then((data) => {
        if (!isMounted) return;
        setWorker(data);
        setName(data.name || "");
        setPhone(data.phone || "");
        setEmail(data.email || "");
        setSkill(data.skills?.[0]?.skill_name || "Electrician");
        setExperience(
          data.experience_years ? `${data.experience_years} years` : "5 years"
        );
        setAddress(data.address || data.city || "Jabalpur");
        setActive(data.is_active !== undefined ? data.is_active : true);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load worker profile");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workerId]);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      // Backend has PATCH /workers/{worker_id}/availability
      await updateWorkerAvailability(workerId, active);
      setMessage("✓ Worker availability updated successfully in backend!");
      setTimeout(() => {
        navigate("/worker");
      }, 1200);
    } catch (err) {
      setError(err.message || "Failed to update availability.");
    } finally {
      setSaving(false);
    }
  };

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
          <span className="section-label">WORKER PROFILE</span>

          <h1>
            Your professional <span>profile.</span>
          </h1>
          <p>
            Connected to Worker ID #{workerId} in Sahāyu Cooperative Database.
          </p>
        </div>

        {message && (
          <div
            style={{
              padding: "16px",
              background: "#e2f3e9",
              color: "#23704e",
              borderRadius: "14px",
              marginBottom: "20px",
              fontWeight: 700,
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "16px",
              background: "#fce5e5",
              color: "#a23c3c",
              borderRadius: "14px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            style={{
              padding: "40px",
              background: "white",
              borderRadius: "20px",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#1d765c" }}>Loading worker profile from backend...</p>
          </div>
        ) : (
          <div className="profile-form-card">
            <div>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label>Primary Skill</label>
                  <input
                    type="text"
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                    disabled
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Experience</label>
                  <input
                    type="text"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label>Address / City</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled
                  />
                </div>
              </div>

              <div className="availability-row">
                <div>
                  <strong>Available for work</strong>
                  <p>
                    Customers can see and book you when you're available.
                  </p>
                </div>

                <button
                  type="button"
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

              <small
                style={{
                  display: "block",
                  color: "#6d7e77",
                  marginTop: "12px",
                  fontSize: "12px",
                }}
              >
                Note: Profile details are synchronized from the cooperative
                registry. Availability updates directly via backend PATCH
                endpoint.
              </small>

              <button
                type="button"
                className="primary-btn profile-save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Updating Availability..." : "Save Availability"}
              </button>
            </div>

            <div className="profile-side">
              <div className="profile-icon">🛠️</div>

              <h2>Build trust</h2>

              <p>
                A complete profile helps customers understand your experience and
                choose you with confidence.
              </p>

              <div className="profile-tip">
                {worker?.is_verified
                  ? "✓ Verified Worker Badge Active"
                  : "✓ Connect with cooperative admin for verification"}
              </div>

              {worker?.average_rating !== undefined &&
                worker?.average_rating !== null && (
                  <div
                    style={{
                      marginTop: "16px",
                      padding: "12px",
                      background: "white",
                      borderRadius: "12px",
                      color: "#17352d",
                    }}
                  >
                    <strong>Rating:</strong> ⭐{" "}
                    {Number(worker.average_rating).toFixed(1)} / 5.0 (
                    {worker.total_reviews ?? 0} reviews)
                  </div>
                )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default WorkerProfile;