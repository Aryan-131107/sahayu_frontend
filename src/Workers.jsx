import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { getRecommendedWorkers, getStoredVerification } from "./api";
import ServiceMap from "./ServiceMap";
import "./App.css";

function getSkillIcon(skillName = "") {
  const name = skillName.toLowerCase();
  if (name.includes("electr")) return "⚡";
  if (name.includes("plumb")) return "🔧";
  if (name.includes("clean")) return "🧹";
  if (name.includes("carpen")) return "🪚";
  if (name.includes("garden")) return "🌱";
  if (name.includes("care")) return "❤️";
  if (name.includes("paint")) return "🎨";
  if (name.includes("mason")) return "🧱";
  if (name.includes("pest")) return "🐜";
  if (name.includes("ac ") || name.includes("air")) return "❄️";
  if (name.includes("appliance")) return "⚙️";
  return "🛠️";
}

function Workers() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const reqState = location.state || {};
  const serviceId =
    reqState.service_id ||
    Number(searchParams.get("service_id")) ||
    1;
  const latitude =
    reqState.latitude !== undefined
      ? reqState.latitude
      : Number(searchParams.get("latitude")) || 23.1815;
  const longitude =
    reqState.longitude !== undefined
      ? reqState.longitude
      : Number(searchParams.get("longitude")) || 79.9864;
  const topN = Number(searchParams.get("top_n")) || 10;
  const userLocationText = reqState.location || "Civil Lines, Jabalpur";

  const [recommendations, setRecommendations] = useState([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    getRecommendedWorkers({
      service_id: serviceId,
      latitude: latitude,
      longitude: longitude,
      top_n: topN,
    })
      .then((data) => {
        if (!isMounted) return;
        // Rule 6: Use recommendations array from response
        const list = Array.isArray(data?.recommendations)
          ? data.recommendations
          : Array.isArray(data)
          ? data
          : [];
        setRecommendations(list);
        if (list.length > 0) {
          setSelectedWorkerId(list[0].worker_id);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load recommended workers.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [serviceId, latitude, longitude, topN]);

  const handleBookWorker = (worker) => {
    const bookingAmount =
      worker.hourly_rate || reqState.base_price || 350;

    navigate(`/booking?worker_id=${worker.worker_id}&service_id=${serviceId}`, {
      state: {
        worker_id: worker.worker_id,
        worker_name: worker.name,
        service_id: serviceId,
        service_name: reqState.service_name || worker.relevant_skill || "Service",
        amount: bookingAmount,
        service_lat: latitude,
        service_lon: longitude,
        location: userLocationText,
        date: reqState.preferred_date || new Date().toISOString().split("T")[0],
        time: reqState.preferred_time || "Morning",
        requirement: reqState.requirement || "",
        customer_id: reqState.customer_id || 1,
      },
    });
  };

  const selectedWorkerObj =
    recommendations.find((w) => w.worker_id === selectedWorkerId) ||
    (recommendations.length > 0 ? recommendations[0] : null);

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
        <button className="back-link" onClick={() => navigate("/customer")}>
          ← Back to Request
        </button>

        <div className="workers-heading">
          <span className="section-label">RECOMMENDED WORKERS</span>

          <h1>
            Choose your <span>worker.</span>
          </h1>

          <p>
            Ranked by AI recommendation matching your location, rating,
            and skill requirements.
          </p>
        </div>

        {/* 1. 🗺️ Interactive Service Map */}
        {!loading && !error && recommendations.length > 0 && (
          <ServiceMap
            customerLocation={userLocationText}
            customerCoords={{ lat: latitude, lon: longitude }}
            worker={selectedWorkerObj}
            allWorkers={recommendations}
            onSelectWorker={(w) => setSelectedWorkerId(w.worker_id)}
          />
        )}

        {loading && (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              background: "white",
              borderRadius: "18px",
              border: "1px solid #dfe9e4",
            }}
          >
            <p style={{ fontSize: "16px", color: "#1d765c" }}>
              Finding the best cooperative workers near you...
            </p>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "25px",
              background: "#fce5e5",
              color: "#a23c3c",
              borderRadius: "16px",
              marginBottom: "20px",
            }}
          >
            <strong>Error loading recommendations:</strong> {error}
            <div style={{ marginTop: "10px" }}>
              <button
                className="secondary-btn"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && recommendations.length === 0 && (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              background: "white",
              borderRadius: "18px",
              border: "1px solid #dfe9e4",
            }}
          >
            <h3>No workers available for this service right now</h3>
            <p style={{ color: "#687a73", marginTop: "8px" }}>
              Please try selecting a different service or check back shortly.
            </p>
            <button
              className="primary-btn"
              style={{ marginTop: "16px" }}
              onClick={() => navigate("/customer")}
            >
              Choose Another Service
            </button>
          </div>
        )}

        {/* 3. ✨ Smart Matching Worker Cards */}
        <div className="workers-list">
          {!loading &&
            recommendations.map((worker, index) => {
              const isBestMatch = index === 0;
              const isSelected = worker.worker_id === selectedWorkerId;

              const ratingDisplay =
                worker.average_rating !== null && worker.average_rating !== undefined
                  ? Number(worker.average_rating).toFixed(1)
                  : "4.9";

              const distanceKm =
                worker.distance_km !== null && worker.distance_km !== undefined
                  ? Number(worker.distance_km).toFixed(1)
                  : "0.5";

              const matchScorePct =
                worker.matching_score !== undefined
                  ? Math.round(worker.matching_score)
                  : worker.recommendation_score !== undefined
                  ? Math.round(worker.recommendation_score * 100)
                  : 90;

              const priceDisplay = worker.hourly_rate
                ? `₹${worker.hourly_rate}/hr`
                : reqState.base_price
                ? `₹${reqState.base_price}`
                : "₹350/hr";

              return (
                <div
                  className={`worker-result-card smart-worker-card ${
                    isBestMatch ? "best-match-card" : ""
                  } ${isSelected ? "selected-worker-card" : ""}`}
                  key={worker.worker_id}
                  onClick={() => setSelectedWorkerId(worker.worker_id)}
                >
                  {/* Best Match Badge */}
                  {isBestMatch && (
                    <div className="best-match-ribbon">
                      🏆 BEST MATCH · TOP RANKED
                    </div>
                  )}

                  <div className="worker-avatar-wrapper">
                    <div className="worker-avatar">
                      {getSkillIcon(worker.relevant_skill || "")}
                    </div>
                    <span
                      className={`avatar-status-dot ${
                        worker.is_available !== false ? "available" : "busy"
                      }`}
                      title={
                        worker.is_available !== false
                          ? "Available Now"
                          : "Busy / Offline"
                      }
                    />
                  </div>

                  <div className="worker-info-main">
                    <div className="worker-name-row">
                      <h2>{worker.name}</h2>

                      {(worker.is_verified || getStoredVerification(worker.worker_id)?.status === "VERIFIED") && (
                        <span className="verified-badge">✓ VERIFIED WORKER</span>
                      )}

                      {worker.is_available !== false ? (
                        <span className="availability-pill online">
                          🟢 Available Now
                        </span>
                      ) : (
                        <span className="availability-pill offline">
                          🟡 Busy
                        </span>
                      )}

                      <span className="smart-score-badge">
                        ✨ {matchScorePct}% Match
                      </span>
                    </div>

                    <p className="worker-skill">
                      <strong>{worker.relevant_skill || "Service Pro"}</strong>
                      {worker.experience_years
                        ? ` · ${worker.experience_years} years experience`
                        : ""}
                    </p>

                    <div className="worker-meta">
                      <span className="meta-rating">
                        ⭐ <strong>{ratingDisplay}</strong>
                        <small>({worker.total_reviews ?? 4} reviews)</small>
                      </span>

                      <span className="meta-distance">
                        📍 <strong>{distanceKm} km away</strong>
                      </span>

                      <span className="meta-speed">
                        ⚡ Rapid arrival (~{Math.max(3, Math.round(Number(distanceKm) * 4))} mins)
                      </span>
                    </div>

                    {/* Reasons / Smart Breakdown highlights */}
                    {Array.isArray(worker.reasons) && worker.reasons.length > 0 && (
                      <div className="worker-reasons-list">
                        {worker.reasons.slice(0, 3).map((reason, rIdx) => (
                          <span key={rIdx} className="reason-tag">
                            ✓ {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="worker-price">
                    <small>Starting from</small>
                    <strong>{priceDisplay}</strong>

                    <button
                      className="primary-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookWorker(worker);
                      }}
                    >
                      Book Worker
                    </button>

                    <button
                      className="secondary-btn view-map-mini-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWorkerId(worker.worker_id);
                        window.scrollTo({ top: 120, behavior: "smooth" });
                      }}
                    >
                      🗺️ View on Map
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        <div className="worker-trust-box">
          <span>🤝</span>
          <div>
            <h3>Community-powered trust</h3>
            <p>
              Every worker on Sahāyu is part of our cooperative network and
              rated by members of your local community.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Workers;