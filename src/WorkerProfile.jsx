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
      await updateWorkerAvailability(workerId, active);
      setMessage("✓ Worker availability updated successfully in backend!");
      setTimeout(() => {
        navigate("/worker");
      }, 1000);
    } catch (err) {
      setError(err.message || "Failed to update availability.");
    } finally {
      setSaving(false);
    }
  };

  const storedVer = getStoredVerification(workerId);
  const isVerified = worker?.is_verified || storedVer?.status === "VERIFIED";
  const memberCode = `SH-${100 + Number(workerId)}`;

  return (
    <div className="worker-page">
      <nav className="worker-topbar">
        <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
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
              <span className="section-label">MEMBER CREDENTIALS</span>
              <h1>
                {name || "Professional"} · <span className="member-id-pill">Cooperative Member #{memberCode}</span>
              </h1>
              <p style={{ marginTop: "4px", color: "#687a73" }}>
                Cooperative Verified Profile · Operating in Jabalpur Central Region
              </p>
            </div>

            {isVerified ? (
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
                <span>✓</span> Verified Member (e-Shram Validated)
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
        </div>

        {message && <div className="admin-toast-success">{message}</div>}
        {error && <div className="admin-toast-error">{error}</div>}

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
                  <strong>Dispatch Availability</strong>
                  <p>
                    Customers can discover and book your services when marked online.
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
                Note: Profile details are synchronized from the cooperative registry. Availability updates directly via backend PATCH endpoint.
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

              <h2>Fair Payout & Trust</h2>

              <div className="pricing-breakdown-mini" style={{ margin: "16px 0", background: "white", padding: "14px", borderRadius: "12px" }}>
                <div className="mini-row">
                  <span>Labour & Inspection Floor:</span>
                  <strong style={{ color: "#059669" }}>₹199 (100% to you)</strong>
                </div>
                <div className="mini-row">
                  <span>Platform Fee Cut:</span>
                  <strong>0% deduction</strong>
                </div>
                <div className="mini-row">
                  <span>Gullak Welfare Fund:</span>
                  <strong>₹10 pooled per order</strong>
                </div>
              </div>

              <div
                className="profile-tip"
                style={{
                  background: isVerified ? "#ecfdf5" : "#fffbeb",
                  borderColor: isVerified ? "#10b981" : "#f59e0b",
                  color: isVerified ? "#065f46" : "#92400e",
                  cursor: "pointer",
                }}
                onClick={() => navigate(`/worker/verification?worker_id=${workerId}`)}
              >
                {isVerified
                  ? "✓ e-Shram National Registry Validated · Click to view digital card"
                  : "🛡️ e-Shram Verification Pending · Click to complete demo check"}
              </div>

              {worker?.average_rating !== undefined && worker?.average_rating !== null && (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "12px",
                    background: "white",
                    borderRadius: "12px",
                    color: "#17352d",
                    border: "1px solid #e3ebe7",
                  }}
                >
                  <strong>Customer Rating:</strong> ⭐{" "}
                  {Number(worker.average_rating).toFixed(1)} / 5.0 ({worker.total_reviews ?? 4} completed orders)
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