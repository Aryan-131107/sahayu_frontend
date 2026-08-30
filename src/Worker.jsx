import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getWorker,
  updateWorkerAvailability,
  getBooking,
  acceptBooking,
  startBooking,
  completeBooking,
  cancelBooking,
} from "./api";
import "./App.css";

function Worker() {
  const navigate = useNavigate();

  const [workerId, setWorkerId] = useState(
    () => localStorage.getItem("sahayu_worker_id") || "11"
  );
  const [worker, setWorker] = useState(null);
  const [loadingWorker, setLoadingWorker] = useState(true);
  const [workerError, setWorkerError] = useState("");
  const [availabilityUpdating, setAvailabilityUpdating] = useState(false);

  // Booking management on worker dashboard
  const [lookupBookingId, setLookupBookingId] = useState("");
  const [activeBooking, setActiveBooking] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [bookingActionLoading, setBookingActionLoading] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingError, setBookingError] = useState("");

  const loadWorker = useCallback((id) => {
    setLoadingWorker(true);
    setWorkerError("");
    getWorker(id)
      .then((data) => {
        setWorker(data);
        localStorage.setItem("sahayu_worker_id", String(id));
      })
      .catch((err) => {
        setWorkerError(err.message || "Failed to load worker details");
      })
      .finally(() => {
        setLoadingWorker(false);
      });
  }, []);

  useEffect(() => {
    let isMounted = true;
    getWorker(workerId)
      .then((data) => {
        if (!isMounted) return;
        setWorker(data);
        localStorage.setItem("sahayu_worker_id", String(workerId));
      })
      .catch((err) => {
        if (!isMounted) return;
        setWorkerError(err.message || "Failed to load worker details");
      })
      .finally(() => {
        if (isMounted) setLoadingWorker(false);
      });

    return () => {
      isMounted = false;
    };
  }, [workerId]);

  const handleToggleAvailability = async () => {
    if (!worker) return;
    setAvailabilityUpdating(true);
    const newStatus = !worker.is_active;

    try {
      const res = await updateWorkerAvailability(worker.worker_id, newStatus);
      setWorker((prev) => ({
        ...prev,
        is_active: res.is_available !== undefined ? res.is_available : newStatus,
      }));
    } catch (err) {
      alert(`Failed to update availability: ${err.message}`);
    } finally {
      setAvailabilityUpdating(false);
    }
  };

  const handleLookupBooking = async (e) => {
    if (e) e.preventDefault();
    if (!lookupBookingId) return;

    setLoadingBooking(true);
    setBookingError("");
    setBookingMessage("");

    try {
      const data = await getBooking(lookupBookingId);
      setActiveBooking(data);
    } catch (err) {
      setBookingError(err.message || "Booking not found");
      setActiveBooking(null);
    } finally {
      setLoadingBooking(false);
    }
  };

  const handleAcceptBooking = async (id) => {
    setBookingActionLoading(true);
    setBookingError("");
    try {
      const updated = await acceptBooking(id);
      setActiveBooking(updated);
      setBookingMessage(`Booking #${id} accepted! Status: ACCEPTED`);
    } catch (err) {
      setBookingError(err.message || "Failed to accept booking.");
    } finally {
      setBookingActionLoading(false);
    }
  };

  const handleStartBooking = async (id) => {
    setBookingActionLoading(true);
    setBookingError("");
    try {
      const updated = await startBooking(id);
      setActiveBooking(updated);
      setBookingMessage(`Booking #${id} started! Status: IN_PROGRESS`);
    } catch (err) {
      setBookingError(err.message || "Failed to start booking.");
    } finally {
      setBookingActionLoading(false);
    }
  };

  const handleCompleteBooking = async (id) => {
    setBookingActionLoading(true);
    setBookingError("");
    try {
      const updated = await completeBooking(id);
      setActiveBooking(updated);
      setBookingMessage(
        `Booking #${id} completed! Status: COMPLETED, Payment: PAID`
      );
    } catch (err) {
      setBookingError(err.message || "Failed to complete booking.");
    } finally {
      setBookingActionLoading(false);
    }
  };

  const handleCancelBooking = async (id) => {
    setBookingActionLoading(true);
    setBookingError("");
    try {
      const updated = await cancelBooking(id);
      setActiveBooking(updated);
      setBookingMessage(`Booking #${id} cancelled. Status: CANCELLED`);
    } catch (err) {
      setBookingError(err.message || "Failed to cancel booking.");
    } finally {
      setBookingActionLoading(false);
    }
  };

  const primarySkill =
    worker?.skills?.[0]?.skill_name || "Cooperative Worker";
  const ratingValue =
    worker?.average_rating !== null && worker?.average_rating !== undefined
      ? Number(worker.average_rating).toFixed(1)
      : "5.0";

  return (
    <div className="worker-page">
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
            onClick={() =>
              navigate("/worker-profile", {
                state: { worker_id: worker?.worker_id || workerId },
              })
            }
          >
            My Profile
          </button>
        </div>
      </nav>

      <main className="worker-dashboard">
        <div className="worker-welcome">
          <span className="section-label">WORKER DASHBOARD</span>

          <h1>
            Welcome back, <span>{worker?.name || "Worker"}.</span>
          </h1>

          <p>
            Manage your availability, profile, and active bookings from one
            place.
          </p>

          <div
            style={{
              marginTop: "16px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <label style={{ fontSize: "14px", fontWeight: 700 }}>
              Active Worker ID:
              <input
                type="number"
                value={workerId}
                onChange={(e) => setWorkerId(e.target.value)}
                style={{
                  width: "90px",
                  marginLeft: "8px",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid #d5e1db",
                }}
              />
            </label>

            <button
              className="secondary-btn"
              style={{ padding: "6px 14px", fontSize: "13px" }}
              onClick={() => loadWorker(workerId)}
              disabled={loadingWorker}
            >
              Switch ID
            </button>
          </div>
        </div>

        {workerError && (
          <div
            style={{
              padding: "16px",
              background: "#fce5e5",
              color: "#a23c3c",
              borderRadius: "14px",
              marginBottom: "20px",
            }}
          >
            {workerError}
          </div>
        )}

        <div className="worker-stats">
          <div className="worker-stat-card">
            <span>🛠️</span>
            <div>
              <strong>{primarySkill}</strong>
              <p>
                {worker?.experience_years ?? 5} Yrs Experience
                {worker?.is_verified ? " · Verified" : ""}
              </p>
            </div>
          </div>

          <div className="worker-stat-card">
            <span>₹</span>
            <div>
              <strong>₹{worker?.hourly_rate ?? 300}/hr</strong>
              <p>Base Hourly Rate</p>
            </div>
          </div>

          <div className="worker-stat-card">
            <span>⭐</span>
            <div>
              <strong>{ratingValue}</strong>
              <p>{worker?.total_reviews ?? 0} Customer Reviews</p>
            </div>
          </div>
        </div>

        {/* Availability Card */}
        <div
          className="booking-summary-card"
          style={{ marginBottom: "35px" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "15px",
            }}
          >
            <div>
              <h3>Availability Status</h3>
              <p style={{ color: "#667771", marginTop: "4px" }}>
                {worker?.is_active
                  ? "You are marked AVAILABLE for customer recommendations."
                  : "You are currently marked OFFLINE / BUSY."}
              </p>
            </div>

            <button
              className={worker?.is_active ? "primary-btn" : "secondary-btn"}
              onClick={handleToggleAvailability}
              disabled={availabilityUpdating || loadingWorker}
            >
              {availabilityUpdating
                ? "Updating..."
                : worker?.is_active
                ? "✓ Currently Available (Click to Go Offline)"
                : "⭕ Currently Offline (Click to Go Online)"}
            </button>
          </div>
        </div>

        {/* Booking Lifecycle Management */}
        <section className="worker-jobs">
          <div className="worker-section-title">
            <h2>Manage Booking Lifecycle</h2>
            <button
              className="secondary-btn"
              onClick={() =>
                navigate("/worker-profile", {
                  state: { worker_id: worker?.worker_id || workerId },
                })
              }
            >
              Edit Profile
            </button>
          </div>

          <div
            className="booking-summary-card"
            style={{ marginBottom: "25px" }}
          >
            <p style={{ color: "#667771", marginBottom: "15px" }}>
              Enter any Booking ID to review details and perform live lifecycle
              transitions (Accept, Start, Complete, or Cancel):
            </p>

            <form
              onSubmit={handleLookupBooking}
              style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
            >
              <input
                type="number"
                value={lookupBookingId}
                onChange={(e) => setLookupBookingId(e.target.value)}
                placeholder="Enter Booking ID (e.g. 101)"
                style={{
                  flex: "1",
                  minWidth: "200px",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #d5e1db",
                }}
                required
              />

              <button
                type="submit"
                className="primary-btn"
                disabled={loadingBooking}
              >
                {loadingBooking ? "Loading..." : "Load Booking"}
              </button>
            </form>

            {bookingMessage && (
              <p
                style={{
                  color: "#23704e",
                  fontWeight: 700,
                  marginTop: "15px",
                }}
              >
                ✓ {bookingMessage}
              </p>
            )}

            {bookingError && (
              <p
                style={{
                  color: "#a23c3c",
                  fontWeight: 700,
                  marginTop: "15px",
                }}
              >
                {bookingError}
              </p>
            )}
          </div>

          {activeBooking && (
            <div className="booking-summary-card">
              <div className="booking-summary-header">
                <div>
                  <h3>Booking #{activeBooking.booking_id}</h3>
                  <p>
                    Service #{activeBooking.service_id} · Customer #
                    {activeBooking.customer_id}
                  </p>
                </div>

                <span
                  className={
                    activeBooking.status === "PENDING"
                      ? "booking-status waiting"
                      : activeBooking.status === "CANCELLED"
                      ? "booking-status rejected"
                      : "booking-status accepted"
                  }
                >
                  {activeBooking.status}
                </span>
              </div>

              <div className="booking-details-grid">
                <div>
                  <small>Amount</small>
                  <strong>₹{activeBooking.amount}</strong>
                </div>

                <div>
                  <small>Payment Status</small>
                  <strong>{activeBooking.payment_status}</strong>
                </div>

                <div>
                  <small>Date</small>
                  <strong>{activeBooking.booking_date}</strong>
                </div>

                <div>
                  <small>Service Location</small>
                  <strong>
                    {activeBooking.service_lat !== undefined &&
                    activeBooking.service_lat !== null
                      ? `${activeBooking.service_lat}, ${activeBooking.service_lon}`
                      : "Jabalpur"}
                  </strong>
                </div>
              </div>

              {/* Action Buttons based on status */}
              <div
                className="booking-actions"
                style={{ marginTop: "20px" }}
              >
                {activeBooking.status === "PENDING" && (
                  <>
                    <button
                      className="primary-btn"
                      onClick={() =>
                        handleAcceptBooking(activeBooking.booking_id)
                      }
                      disabled={bookingActionLoading}
                    >
                      {bookingActionLoading
                        ? "Processing..."
                        : "✓ Accept Booking (PATCH /accept)"}
                    </button>

                    <button
                      className="secondary-btn"
                      style={{ borderColor: "#a23c3c", color: "#a23c3c" }}
                      onClick={() =>
                        handleCancelBooking(activeBooking.booking_id)
                      }
                      disabled={bookingActionLoading}
                    >
                      Cancel Booking
                    </button>
                  </>
                )}

                {activeBooking.status === "ACCEPTED" && (
                  <>
                    <button
                      className="primary-btn"
                      onClick={() =>
                        handleStartBooking(activeBooking.booking_id)
                      }
                      disabled={bookingActionLoading}
                    >
                      {bookingActionLoading
                        ? "Processing..."
                        : "▶ Start Service (PATCH /start)"}
                    </button>

                    <button
                      className="secondary-btn"
                      style={{ borderColor: "#a23c3c", color: "#a23c3c" }}
                      onClick={() =>
                        handleCancelBooking(activeBooking.booking_id)
                      }
                      disabled={bookingActionLoading}
                    >
                      Cancel Booking
                    </button>
                  </>
                )}

                {activeBooking.status === "IN_PROGRESS" && (
                  <button
                    className="primary-btn"
                    onClick={() =>
                      handleCompleteBooking(activeBooking.booking_id)
                    }
                    disabled={bookingActionLoading}
                  >
                    {bookingActionLoading
                      ? "Processing..."
                      : "✓ Complete Service (PATCH /complete)"}
                  </button>
                )}

                {activeBooking.status === "COMPLETED" && (
                  <p style={{ color: "#23704e", fontWeight: 700 }}>
                    ✓ This booking has been successfully completed and paid.
                  </p>
                )}

                {activeBooking.status === "CANCELLED" && (
                  <p style={{ color: "#a23c3c", fontWeight: 700 }}>
                    This booking was cancelled.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        <div className="worker-profile-card">
          <div>
            <h2>Grow with Sahāyu</h2>
            <p>
              Build your reputation and connect with more customers in your
              community.
            </p>
          </div>

          <button
            className="primary-btn"
            onClick={() =>
              navigate("/worker-profile", {
                state: { worker_id: worker?.worker_id || workerId },
              })
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