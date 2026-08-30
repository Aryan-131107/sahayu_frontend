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
  const [preferredDate, setPreferredDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [preferredTime, setPreferredTime] = useState("Morning");
  const [requirement, setRequirement] = useState("");
  const [customerId, setCustomerId] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
          base_price: serviceObj?.base_price || 350,
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
        <div className="logo">
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
          <span className="section-label">CUSTOMER</span>

          <h1>
            Find the right <span>worker.</span>
          </h1>

          <p>
            Tell us what you need and we'll help you find verified local
            professionals.
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

            <label htmlFor="service-select">Service</label>
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
                <option value="">Select a service</option>
                {services.map((service) => (
                  <option key={service.service_id} value={service.service_id}>
                    {service.service || service.service_name} (₹
                    {service.base_price})
                    {service.category ? ` - ${service.category}` : ""}
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
                }}
              >
                {selectedServiceObj.description} · Base Price: ₹
                {selectedServiceObj.base_price}
              </small>
            )}

            <label>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter your location (e.g. Civil Lines, Jabalpur)"
              required
            />

            <label>Preferred Date</label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              required
            />

            <label>Preferred Time</label>
            <select
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              required
            >
              <option value="Morning">Morning (9:00 AM - 12:00 PM)</option>
              <option value="Afternoon">Afternoon (12:00 PM - 4:00 PM)</option>
              <option value="Evening">Evening (4:00 PM - 8:00 PM)</option>
            </select>

            <label>Describe your requirement</label>
            <textarea
              rows="4"
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="Tell the worker what you need..."
            />

            <div style={{ marginTop: "12px" }}>
              <button
                type="button"
                className="back-link"
                style={{ fontSize: "12px", margin: 0, padding: 0 }}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? "▼ Hide Coordinates & Customer ID" : "▶ Set Coordinates & Customer ID (Prototype Options)"}
              </button>

              {showAdvanced && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "10px",
                    marginTop: "10px",
                    padding: "12px",
                    background: "#f4f8f6",
                    borderRadius: "10px",
                  }}
                >
                  <div>
                    <small>Latitude</small>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <small>Longitude</small>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <small>Customer ID</small>
                    <input
                      type="number"
                      value={customerId}
                      onChange={(e) => setCustomerId(parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="primary-btn full-btn"
              disabled={loadingServices}
            >
              Find Workers
            </button>
          </form>

          <div className="request-info">
            <div className="request-info-icon">🤝</div>

            <h2>Why choose Sahāyu?</h2>

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