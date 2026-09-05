import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getServices } from "./api";
import "./App.css";

function Customer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState("");

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [location, setLocation] = useState("Civil Lines, Jabalpur");
  const [latitude, setLatitude] = useState(23.1815);
  const [longitude, setLongitude] = useState(79.9864);
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [gpsStatus, setGpsStatus] = useState("");

  const [preferredDate, setPreferredDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  // Three quick options: "Morning", "Afternoon", "Evening"
  const [preferredTime, setPreferredTime] = useState("Morning");
  const [requirement, setRequirement] = useState("");
  const customerId = 1;

  useEffect(() => {
    let isMounted = true;

    getServices()
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : [];
        setServices(list);

        const paramServiceId = searchParams.get("service_id");
        const paramServiceName = searchParams.get("service");

        if (paramServiceId && list.some((s) => String(s.service_id) === String(paramServiceId))) {
          setSelectedServiceId(paramServiceId);
        } else if (paramServiceName) {
          const match = list.find((s) => {
            const name = (s.service || s.service_name || "").toLowerCase();
            const cat = (s.category || "").toLowerCase();
            const skill = (s.skill?.skill_name || "").toLowerCase();
            const target = paramServiceName.toLowerCase();
            return name.includes(target) || cat.includes(target) || skill.includes(target);
          });
          if (match) {
            setSelectedServiceId(String(match.service_id));
          } else if (list.length > 0) {
            setSelectedServiceId(String(list[0].service_id));
          }
        } else if (list.length > 0) {
          setSelectedServiceId(String(list[0].service_id));
        }
      })
      .catch((err) => {
        if (isMounted) {
          setServicesError(err.message || "Failed to load services");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingServices(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  // GPS Auto detection handler
  const handleGpsAuto = () => {
    setGpsDetecting(true);
    setGpsStatus("Detecting current coordinates...");

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(Number(position.coords.latitude.toFixed(4)));
          setLongitude(Number(position.coords.longitude.toFixed(4)));
          setLocation("Detected Location (Jabalpur Central)");
          setGpsStatus("✓ GPS Coordinates Locked");
          setGpsDetecting(false);
        },
        () => {
          // Graceful simulated default for desktop / permission-denied browsers
          setLatitude(23.1815);
          setLongitude(79.9864);
          setLocation("Civil Lines, Jabalpur");
          setGpsStatus("✓ Auto-set to Jabalpur Center (23.1815° N, 79.9864° E)");
          setGpsDetecting(false);
        },
        { timeout: 4000 }
      );
    } else {
      setLatitude(23.1815);
      setLongitude(79.9864);
      setLocation("Civil Lines, Jabalpur");
      setGpsStatus("✓ Auto-set to Jabalpur Zone");
      setGpsDetecting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedServiceId) {
      alert("Please select a service");
      return;
    }

    const serviceObj = services.find(
      (s) => String(s.service_id) === String(selectedServiceId)
    );

    navigate(
      `/workers?service_id=${selectedServiceId}&latitude=${latitude}&longitude=${longitude}`,
      {
        state: {
          service_id: Number(selectedServiceId),
          service_name:
            serviceObj?.service || serviceObj?.service_name || "Service",
          base_price: 239,
          amount: 239,
          latitude: Number(latitude),
          longitude: Number(longitude),
          location,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          requirement,
          customer_id: Number(customerId) || 1,
        },
      }
    );
  };

  const selectedServiceObj = services.find(
    (s) => String(s.service_id) === String(selectedServiceId)
  );

  return (
    <div className="customer-page">
      <nav className="worker-topbar">
        <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <span className="logo-icon">S</span>
          Sahāyu
        </div>

        <div className="topbar-actions">
          <button className="secondary-btn" onClick={() => navigate("/")}>
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
          <span className="section-label">BOOK A SERVICE</span>

          <h1>
            Find the right <span>cooperative professional.</span>
          </h1>

          <p>
            Standard transparent pricing of ₹239 with 100% fair inspection floor directly to your local worker.
          </p>
        </div>

        <div className="request-layout">
          <form className="request-form" onSubmit={handleSubmit}>
            <h2>Request a Service</h2>

            {servicesError && (
              <p
                className="api-error"
                style={{ color: "#d9534f", marginBottom: "15px" }}
              >
                {servicesError}
              </p>
            )}

            {/* Service Selection */}
            <label htmlFor="service-select">Select Service</label>
            {loadingServices ? (
              <p style={{ color: "#666", padding: "10px 0" }}>
                Loading available services...
              </p>
            ) : (
              <select
                id="service-select"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                required
              >
                <option value="">Select a service category</option>
                {services.map((service) => (
                  <option key={service.service_id} value={service.service_id}>
                    {service.service || service.service_name}
                    {service.category ? ` (${service.category})` : ""}
                  </option>
                ))}
              </select>
            )}

            {selectedServiceObj && (
              <small
                style={{
                  display: "block",
                  color: "#1d765c",
                  marginTop: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {selectedServiceObj.description} · Standard Inspection & Service Floor: ₹239
              </small>
            )}

            {/* Location with GPS Auto Button */}
            <div style={{ marginTop: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ margin: 0 }}>Service Location</label>
                <button
                  type="button"
                  className="gps-auto-btn"
                  onClick={handleGpsAuto}
                  disabled={gpsDetecting}
                >
                  📍 {gpsDetecting ? "Detecting..." : "GPS Auto"}
                </button>
              </div>

              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter your address or locality"
                required
              />

              {gpsStatus && (
                <small style={{ display: "block", color: "#059669", marginTop: "4px", fontSize: "12px", fontWeight: 600 }}>
                  {gpsStatus}
                </small>
              )}
            </div>

            {/* Preferred Date */}
            <label style={{ marginTop: "16px" }}>Preferred Date</label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              required
            />

            {/* Preferred Time: Three Quick Options */}
            <label style={{ marginTop: "16px" }}>Preferred Time Slot</label>
            <div className="time-slots-grid">
              <div
                className={`time-slot-card ${preferredTime === "Morning" ? "selected" : ""}`}
                onClick={() => setPreferredTime("Morning")}
              >
                <span className="slot-icon">🌅</span>
                <div>
                  <strong>Morning</strong>
                  <small>9 AM – 12 PM</small>
                </div>
              </div>

              <div
                className={`time-slot-card ${preferredTime === "Afternoon" ? "selected" : ""}`}
                onClick={() => setPreferredTime("Afternoon")}
              >
                <span className="slot-icon">☀️</span>
                <div>
                  <strong>Afternoon</strong>
                  <small>12 PM – 4 PM</small>
                </div>
              </div>

              <div
                className={`time-slot-card ${preferredTime === "Evening" ? "selected" : ""}`}
                onClick={() => setPreferredTime("Evening")}
              >
                <span className="slot-icon">🌙</span>
                <div>
                  <strong>Evening</strong>
                  <small>4 PM – 8 PM</small>
                </div>
              </div>
            </div>

            {/* Requirement Description */}
            <label style={{ marginTop: "16px" }}>Requirement Details</label>
            <textarea
              rows="3"
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="E.g., Fan regulator replacement, leaking tap under washbasin..."
            />

            {/* Transparent Pricing Pill */}
            <div className="pricing-callout-card">
              <div className="pricing-callout-header">
                <strong>Standard Booking Total: ₹239</strong>
                <span className="fair-wage-tag">100% Fair Floor</span>
              </div>
              <p>
                ₹199 goes 100% directly to worker · ₹30 platform operations · ₹10 cooperative welfare pool (Gullak)
              </p>
            </div>

            <button
              type="submit"
              className="primary-btn full-btn"
              disabled={loadingServices}
              style={{ marginTop: "16px" }}
            >
              Find Available Workers →
            </button>
          </form>

          {/* Right Information Panel */}
          <div className="request-info">
            <div className="request-info-icon">🤝</div>

            <h2>Why Sahāyu Cooperative?</h2>

            <div className="customer-benefit">
              <span>✓</span>
              <div>
                <strong>100% Worker Payout</strong>
                <p>₹199 full inspection floor goes directly to the worker with 0% platform deduction.</p>
              </div>
            </div>

            <div className="customer-benefit">
              <span>🛡️</span>
              <div>
                <strong>3-Day Workmanship Guarantee</strong>
                <p>Included with every completed job for complete peace of mind.</p>
              </div>
            </div>

            <div className="customer-benefit">
              <span>🪙</span>
              <div>
                <strong>Gullak Welfare Fund</strong>
                <p>₹10 from every booking supports member emergency health and welfare.</p>
              </div>
            </div>

            <div className="customer-benefit">
              <span>🔒</span>
              <div>
                <strong>Two-Step OTP Security</strong>
                <p>Secure Start and End OTP validation prevents premature closure.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Customer;