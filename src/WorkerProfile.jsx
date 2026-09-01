import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getWorker, updateWorkerAvailability, getStoredVerification } from "./api";
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <span className="section-label">WORKER PROFILE</span>
              <h1>
                Your professional <span>profile.</span>
              </h1>
            </div>

            {worker?.is_verified || getStoredVerification(workerId)?.status === "VERIFIED" ? (
              <div
                style={{
                  background: "#d1fae5",
                  color: "#065f46",
                  padding: "8px 18px",
                  borderRadius: "999px",
                  fontWeight: 700,
                  fontSize: "14px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "1px solid #a7f3d0",
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/worker/verification?worker_id=${workerId}`)}
              >
                <span>✓</span> Verified Worker (e-Shram Validated)
              </div>
            ) : (
              <button
                className="secondary-btn"
                style={{
                  background: "#fef3c7",
                  borderColor: "#fde68a",
                  color: "#92400e",
                  fontWeight: 700,
                  fontSize: "13px",
                  padding: "8px 16px",
                }}
                onClick={() => navigate(`/worker/verification?worker_id=${workerId}`)}
              >
                🛡️ Verify with e-Shram (Demo) →
              </button>
            )}
          </div>
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

              <div
                className="profile-tip"
                style={{
                  background: worker?.is_verified || getStoredVerification(workerId)?.status === "VERIFIED" ? "#ecfdf5" : "#fffbeb",
                  borderColor: worker?.is_verified || getStoredVerification(workerId)?.status === "VERIFIED" ? "#10b981" : "#f59e0b",
                  color: worker?.is_verified || getStoredVerification(workerId)?.status === "VERIFIED" ? "#065f46" : "#92400e",
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/worker/verification?worker_id=${workerId}`)}
              >
                {worker?.is_verified || getStoredVerification(workerId)?.status === "VERIFIED"
                  ? "✓ Verified Worker Badge Active · Click to view e-Shram Card"
                  : "🛡️ e-Shram Verification Pending · Click to Verify (Demo)"}
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