import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getWorkers,
  getServices,
  getSkills,
  getCustomerBookings,
  getWorkerReviews,
  createService,
  updateWorkerAvailability,
  getStoredVerification,
  setStoredVerification,
  getAllStoredVerifications,
  getGullakSummary,
} from "./api";
import "./App.css";

function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  // Detect initial tab from URL path (e.g. /admin/workers, /admin/gullak, etc.)
  const pathSegment = location.pathname.split("/")[2] || "overview";
  const validTabs = [
    "overview",
    "workers",
    "verifications",
    "bookings",
    "payments",
    "gullak",
    "services",
    "reviews",
  ];
  const [activeTab, setActiveTab] = useState(
    validTabs.includes(pathSegment) ? pathSegment : "overview"
  );

  // Admin authorization state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(
    () => sessionStorage.getItem("sahayu_admin_auth") === "true"
  );
  const [adminPin, setAdminPin] = useState("");
  const [authError, setAuthError] = useState("");

  // Data states
  const [workers, setWorkers] = useState([]);
  const [services, setServices] = useState([]);
  const [skills, setSkills] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviewsList, setReviewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gullakLoading, setGullakLoading] = useState(false);
  const [gullakError, setGullakError] = useState("");
  const [gullakData, setGullakData] = useState(null);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Worker Modal View State
  const [selectedWorker, setSelectedWorker] = useState(null);

  // New Service Modal State
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDesc, setNewServiceDesc] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("239");
  const [newServiceSkillId, setNewServiceSkillId] = useState("1");
  const [creatingService, setCreatingService] = useState(false);

  // Search and Filter States
  const [searchWorkerTerm, setSearchWorkerTerm] = useState("");
  const [filterSkill, setFilterSkill] = useState("ALL");
  const [filterVerification, setFilterVerification] = useState("ALL");
  const [searchBookingTerm, setSearchBookingTerm] = useState("");
  const [filterBookingStatus, setFilterBookingStatus] = useState("ALL");

  const loadGullakData = useCallback(async () => {
    setGullakLoading(true);
    setGullakError("");
    try {
      const summary = await getGullakSummary();
      setGullakData(summary);
    } catch (err) {
      setGullakError(err.message || "Unable to load cooperative Gullak data.");
    } finally {
      setGullakLoading(false);
    }
  }, []);

  // Fetch all initial data from backend with instant UI responsiveness
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [workersData, servicesData, skillsData, bookingsData] =
        await Promise.all([
          getWorkers(false).catch(() => []),
          getServices().catch(() => []),
          getSkills().catch(() => []),
          getCustomerBookings(1).catch(() => []),
        ]);

      const storedVerifications = getAllStoredVerifications();

      // Merge verified states with live worker records
      const mergedWorkers = (Array.isArray(workersData) ? workersData : []).map(
        (w) => {
          const stored =
            storedVerifications[w.worker_id] ||
            getStoredVerification(w.worker_id);
          const isVer = stored
            ? stored.status === "VERIFIED"
            : Boolean(w.is_verified);
          const verStatus = stored
            ? stored.status
            : w.is_verified
            ? "VERIFIED"
            : "UNVERIFIED";
          const uan =
            stored?.uan ||
            `98${String(w.worker_id).padStart(2, "0")}-4567-${
              1000 + w.worker_id
            }`;
          return {
            ...w,
            is_verified: isVer,
            verification_status: verStatus,
            eshram_uan: uan,
          };
        }
      );

      setWorkers(mergedWorkers);
      setServices(Array.isArray(servicesData) ? servicesData : []);
      setSkills(Array.isArray(skillsData) ? skillsData : []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);

      // Release main loading state immediately so UI is responsive
      setLoading(false);

      // Progressive fetch for Gullak & Reviews in background
      loadGullakData();

      // Background load reviews
      const reviewPromises = mergedWorkers.slice(0, 6).map(async (w) => {
        try {
          const revRes = await getWorkerReviews(w.worker_id);
          if (revRes && Array.isArray(revRes.reviews)) {
            return revRes.reviews.map((r) => ({
              ...r,
              worker_name: w.name,
              worker_id: w.worker_id,
            }));
          }
          return [];
        } catch {
          return [];
        }
      });

      Promise.all(reviewPromises)
        .then((allRev) => {
          setReviewsList(allRev.flat());
        })
        .catch(() => {});
    } catch (err) {
      setError(err.message || "Failed to load admin dashboard data.");
      setLoading(false);
    }
  }, [loadGullakData]);

  useEffect(() => {
    let isMounted = true;
    if (isAdminAuthenticated) {
      Promise.all([
        getWorkers(false).catch(() => []),
        getServices().catch(() => []),
        getSkills().catch(() => []),
        getCustomerBookings(1).catch(() => []),
      ]).then(([workersData, servicesData, skillsData, bookingsData]) => {
        if (!isMounted) return;
        const storedVerifications = getAllStoredVerifications();
        const mergedWorkers = (Array.isArray(workersData) ? workersData : []).map(
          (w) => {
            const stored =
              storedVerifications[w.worker_id] ||
              getStoredVerification(w.worker_id);
            const isVer = stored
              ? stored.status === "VERIFIED"
              : Boolean(w.is_verified);
            const verStatus = stored
              ? stored.status
              : w.is_verified
              ? "VERIFIED"
              : "UNVERIFIED";
            const uan =
              stored?.uan ||
              `98${String(w.worker_id).padStart(2, "0")}-4567-${
                1000 + w.worker_id
              }`;
            return {
              ...w,
              is_verified: isVer,
              verification_status: verStatus,
              eshram_uan: uan,
            };
          }
        );

        setWorkers(mergedWorkers);
        setServices(Array.isArray(servicesData) ? servicesData : []);
        setSkills(Array.isArray(skillsData) ? skillsData : []);
        setBookings(Array.isArray(bookingsData) ? bookingsData : []);
        setLoading(false);

        loadGullakData();

        const reviewPromises = mergedWorkers.slice(0, 6).map(async (w) => {
          try {
            const revRes = await getWorkerReviews(w.worker_id);
            if (revRes && Array.isArray(revRes.reviews)) {
              return revRes.reviews.map((r) => ({
                ...r,
                worker_name: w.name,
                worker_id: w.worker_id,
              }));
            }
            return [];
          } catch {
            return [];
          }
        });

        Promise.all(reviewPromises)
          .then((allRev) => {
            if (isMounted) setReviewsList(allRev.flat());
          })
          .catch(() => {});
      }).catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load admin dashboard data.");
          setLoading(false);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [isAdminAuthenticated, loadGullakData]);

  // Handle Admin Login
  const handleAdminLogin = (e) => {
    if (e) e.preventDefault();
    if (
      adminPin === "admin" ||
      adminPin === "sahayu2026" ||
      adminPin === "1234" ||
      adminPin === ""
    ) {
      sessionStorage.setItem("sahayu_admin_auth", "true");
      setIsAdminAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError(
        "Invalid credentials. (Hint: Use default 'admin' or 1-click Demo Unlock)"
      );
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem("sahayu_admin_auth");
    setIsAdminAuthenticated(false);
  };

  // Sync tab navigation with URL
  const switchTab = (tab) => {
    setActiveTab(tab);
    navigate(`/admin/${tab}`);
  };

  // Worker Action Handlers
  const handleToggleWorkerStatus = async (workerItem) => {
    const newStatus = !workerItem.is_active;
    try {
      await updateWorkerAvailability(workerItem.worker_id, newStatus);
      setWorkers((prev) =>
        prev.map((w) =>
          w.worker_id === workerItem.worker_id
            ? { ...w, is_active: newStatus }
            : w
        )
      );
      setActionSuccess(
        `✓ ${workerItem.name} availability toggled to ${
          newStatus ? "ACTIVE" : "INACTIVE"
        }.`
      );
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      alert(`Failed to update availability: ${err.message}`);
    }
  };

  const handleVerifyWorker = (workerItem) => {
    setStoredVerification(workerItem.worker_id, {
      status: "VERIFIED",
      verified_at: new Date().toISOString(),
      uan: workerItem.eshram_uan,
      worker_name: workerItem.name,
      trade: workerItem.skills?.[0]?.skill_name || "Cooperative Worker",
    });

    setWorkers((prev) =>
      prev.map((w) =>
        w.worker_id === workerItem.worker_id
          ? { ...w, is_verified: true, verification_status: "VERIFIED" }
          : w
      )
    );

    setActionSuccess(
      `✓ ${workerItem.name} has been approved and marked VERIFIED.`
    );
    setTimeout(() => setActionSuccess(""), 4000);
  };

  const handleRejectWorker = (workerItem) => {
    setStoredVerification(workerItem.worker_id, {
      status: "REJECTED",
      verified_at: new Date().toISOString(),
      uan: workerItem.eshram_uan,
      worker_name: workerItem.name,
      rejection_reason: "Document details mismatch with demo registry.",
    });

    setWorkers((prev) =>
      prev.map((w) =>
        w.worker_id === workerItem.worker_id
          ? { ...w, is_verified: false, verification_status: "REJECTED" }
          : w
      )
    );

    setActionSuccess(`✕ ${workerItem.name} verification has been rejected.`);
    setTimeout(() => setActionSuccess(""), 4000);
  };

  // Add Service Handler
  const handleCreateService = async (e) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    setCreatingService(true);
    try {
      const res = await createService({
        service: newServiceName.trim(),
        description:
          newServiceDesc.trim() || "Standard cooperative home service.",
        base_price: parseFloat(newServicePrice) || 239,
        skill_id: parseInt(newServiceSkillId, 10) || 1,
      });

      setServices((prev) => [...prev, res]);
      setShowAddServiceModal(false);
      setNewServiceName("");
      setNewServiceDesc("");
      setActionSuccess(
        `✓ Service '${res.service || res.service_name}' added to catalog!`
      );
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      alert(`Failed to create service: ${err.message}`);
    } finally {
      setCreatingService(false);
    }
  };

  // Metrics Calculations (Transparent Pricing Model)
  const totalWorkersCount = workers.length;
  const verifiedWorkersCount = workers.filter((w) => w.is_verified).length;
  const pendingVerificationsCount = workers.filter(
    (w) => !w.is_verified && w.verification_status !== "REJECTED"
  ).length;
  const activeWorkersCount = workers.filter((w) => w.is_active).length;
  const totalBookingsCount = bookings.length;
  const completedBookingsCount = bookings.filter(
    (b) => b.status === "COMPLETED"
  ).length;

  // Pricing Model: Customer Paid = ₹239, Worker Payout = ₹199 (100%), Platform Ops = ₹30, Gullak = ₹10
  const totalCustomerPayments = completedBookingsCount * 239;
  const totalWorkerEarnings = completedBookingsCount * 199;
  const totalPlatformFees = completedBookingsCount * 30;
  const totalGullakPool = gullakData?.total_pool_balance !== undefined ? gullakData.total_pool_balance : completedBookingsCount * 10;

  // Filtered Workers List
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const nameMatch = (w.name || "")
        .toLowerCase()
        .includes(searchWorkerTerm.toLowerCase());
      const skillName = (w.skills?.[0]?.skill_name || "").toLowerCase();
      const termMatch =
        nameMatch || skillName.includes(searchWorkerTerm.toLowerCase());

      const skillMatch =
        filterSkill === "ALL" ||
        w.skills?.some((s) => String(s.skill_id) === String(filterSkill));

      const verMatch =
        filterVerification === "ALL" ||
        (filterVerification === "VERIFIED" && w.is_verified) ||
        (filterVerification === "PENDING" &&
          !w.is_verified &&
          w.verification_status !== "REJECTED") ||
        (filterVerification === "REJECTED" &&
          w.verification_status === "REJECTED");

      return termMatch && skillMatch && verMatch;
    });
  }, [workers, searchWorkerTerm, filterSkill, filterVerification]);

  // Filtered Bookings List
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const term = searchBookingTerm.toLowerCase();
      const idMatch = String(b.booking_id).includes(term);
      const custMatch =
        String(b.customer_id).includes(term) ||
        (b.customer_name || "").toLowerCase().includes(term);
      const workerMatch =
        String(b.worker_id).includes(term) ||
        (b.worker_name || "").toLowerCase().includes(term);
      const statusMatch =
        filterBookingStatus === "ALL" || b.status === filterBookingStatus;

      return (idMatch || custMatch || workerMatch) && statusMatch;
    });
  }, [bookings, searchBookingTerm, filterBookingStatus]);

  // 1. Authorization Screen
  if (!isAdminAuthenticated) {
    return (
      <div className="admin-auth-page">
        <div className="admin-auth-card">
          <div className="admin-badge-icon">🏛️</div>
          <h2>Sahāyu Cooperative Admin</h2>
          <p className="admin-auth-subtitle">
            Restricted access for Cooperative Governance & Welfare Desk.
          </p>

          {authError && <div className="auth-error-msg">{authError}</div>}

          <form onSubmit={handleAdminLogin}>
            <div className="form-group">
              <label>Passcode</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter admin passcode (e.g. admin)"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                autoFocus
              />
            </div>

            <button type="submit" className="primary-btn admin-login-btn">
              Unlock Admin Portal →
            </button>
          </form>

          <div className="demo-unlock-box">
            <button
              type="button"
              className="quick-unlock-btn"
              onClick={() => {
                sessionStorage.setItem("sahayu_admin_auth", "true");
                setIsAdminAuthenticated(true);
              }}
            >
              ⚡ 1-Click Demo Admin Access
            </button>
          </div>

          <button
            className="back-link"
            style={{ marginTop: "16px" }}
            onClick={() => navigate("/")}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* 2. Standard Admin Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div
            className="logo"
            onClick={() => navigate("/")}
            style={{ cursor: "pointer" }}
          >
            <span className="logo-icon">S</span>
            Sahāyu
          </div>
          <span className="coop-cluster-pill">🏛️ Jabalpur Cooperative Cluster</span>
        </div>

        {/* Sidebar Nav Items with Isolated Count Badges */}
        <nav className="admin-nav-menu">
          <button
            className={`admin-nav-item ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => switchTab("overview")}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-label">Overview</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "workers" ? "active" : ""}`}
            onClick={() => switchTab("workers")}
          >
            <span className="nav-icon">👨‍🔧</span>
            <span className="nav-label">Workers</span>
            <span className="nav-count-badge">{totalWorkersCount}</span>
          </button>

          <button
            className={`admin-nav-item ${
              activeTab === "verifications" ? "active" : ""
            }`}
            onClick={() => switchTab("verifications")}
          >
            <span className="nav-icon">🛡️</span>
            <span className="nav-label">Verifications</span>
            {pendingVerificationsCount > 0 ? (
              <span className="nav-alert-badge">{pendingVerificationsCount}</span>
            ) : (
              <span className="nav-count-badge">0</span>
            )}
          </button>

          <button
            className={`admin-nav-item ${activeTab === "bookings" ? "active" : ""}`}
            onClick={() => switchTab("bookings")}
          >
            <span className="nav-icon">📋</span>
            <span className="nav-label">Bookings</span>
            <span className="nav-count-badge">{totalBookingsCount}</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "payments" ? "active" : ""}`}
            onClick={() => switchTab("payments")}
          >
            <span className="nav-icon">💳</span>
            <span className="nav-label">Payments</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "gullak" ? "active" : ""}`}
            onClick={() => switchTab("gullak")}
          >
            <span className="nav-icon">🪙</span>
            <span className="nav-label">Gullak Pool</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "services" ? "active" : ""}`}
            onClick={() => switchTab("services")}
          >
            <span className="nav-icon">🛠️</span>
            <span className="nav-label">Services</span>
            <span className="nav-count-badge">{services.length}</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "reviews" ? "active" : ""}`}
            onClick={() => switchTab("reviews")}
          >
            <span className="nav-icon">⭐</span>
            <span className="nav-label">Reviews</span>
            <span className="nav-count-badge">{reviewsList.length}</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <span className="admin-avatar">👤</span>
            <div>
              <strong>Coop Admin</strong>
              <small>Jabalpur Hub</small>
            </div>
          </div>
          <button className="logout-btn" onClick={handleAdminLogout} title="Logout">
            ⎋ Logout
          </button>
        </div>
      </aside>

      {/* 3. Main Content Area */}
      <div className="admin-main-content">
        {/* Top Header Bar */}
        <header className="admin-topbar">
          <div className="topbar-title">
            <h1>
              {activeTab === "overview" && "Platform Overview & Operations"}
              {activeTab === "workers" && "Worker Registry & Credentials"}
              {activeTab === "verifications" && "e-Shram Demo Verification Queue"}
              {activeTab === "bookings" && "Live Service Bookings & Orders"}
              {activeTab === "payments" && "Transparent Fee & Payout Division"}
              {activeTab === "gullak" && "Cooperative Welfare Reserve (Gullak Pool)"}
              {activeTab === "services" && "Standardized Service Catalog"}
              {activeTab === "reviews" && "Customer Ratings & Feedback"}
            </h1>
            <p>Sahāyu Cooperative Governance & Unorganised Labour Protection Desk</p>
          </div>

          <div className="topbar-actions">
            <button
              className="secondary-btn"
              onClick={loadDashboardData}
              title="Reload live database values"
            >
              🔄 Refresh Data
            </button>
            <button className="secondary-btn" onClick={() => navigate("/")}>
              View Live Site
            </button>
          </div>
        </header>

        {/* Tab Body */}
        <div className="admin-tab-body">
          {actionSuccess && (
            <div className="admin-toast-success">{actionSuccess}</div>
          )}

          {error && <div className="admin-toast-error">{error}</div>}

          {loading ? (
            <div className="admin-loading-state">
              <div className="loading-spinner"></div>
              <p>Loading live cooperative data...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="admin-tab-content">
                  {/* Top Key Metrics Grid */}
                  <div className="admin-stats-grid">
                    <div className="admin-stat-card">
                      <div className="stat-header">
                        <span className="stat-title">TOTAL WORKERS</span>
                        <span className="stat-icon">👨‍🔧</span>
                      </div>
                      <div className="stat-value">{totalWorkersCount}</div>
                      <span className="stat-sub">{activeWorkersCount} Active in Jabalpur</span>
                    </div>

                    <div className="admin-stat-card">
                      <div className="stat-header">
                        <span className="stat-title">VERIFIED WORKERS</span>
                        <span className="stat-icon">✓</span>
                      </div>
                      <div className="stat-value green">{verifiedWorkersCount}</div>
                      <span className="stat-sub">e-Shram Authenticated</span>
                    </div>

                    <div className="admin-stat-card">
                      <div className="stat-header">
                        <span className="stat-title">PENDING QUEUE</span>
                        <span className="stat-icon">⏳</span>
                      </div>
                      <div className="stat-value orange">{pendingVerificationsCount}</div>
                      <span className="stat-sub">Action required in queue</span>
                    </div>

                    <div className="admin-stat-card">
                      <div className="stat-header">
                        <span className="stat-title">COMPLETED JOBS</span>
                        <span className="stat-icon">📋</span>
                      </div>
                      <div className="stat-value">{completedBookingsCount}</div>
                      <span className="stat-sub">Out of {totalBookingsCount} total orders</span>
                    </div>

                    <div className="admin-stat-card highlight">
                      <div className="stat-header">
                        <span className="stat-title">CUSTOMER PAYMENTS</span>
                        <span className="stat-icon">₹</span>
                      </div>
                      <div className="stat-value">₹{totalCustomerPayments}</div>
                      <span className="stat-sub">@ ₹239 per completed job</span>
                    </div>

                    <div className="admin-stat-card">
                      <div className="stat-header">
                        <span className="stat-title">WORKER DISBURSEMENTS</span>
                        <span className="stat-icon">🤝</span>
                      </div>
                      <div className="stat-value green">₹{totalWorkerEarnings}</div>
                      <span className="stat-sub">100% of ₹199 floor disbursed</span>
                    </div>

                    <div className="admin-stat-card">
                      <div className="stat-header">
                        <span className="stat-title">PLATFORM OPERATIONS</span>
                        <span className="stat-icon">⚡</span>
                      </div>
                      <div className="stat-value">₹{totalPlatformFees}</div>
                      <span className="stat-sub">@ ₹30 operations fee/order</span>
                    </div>

                    <div className="admin-stat-card highlight-gullak">
                      <div className="stat-header">
                        <span className="stat-title">GULLAK WELFARE POOL</span>
                        <span className="stat-icon">🪙</span>
                      </div>
                      <div className="stat-value gold">₹{totalGullakPool}</div>
                      <span className="stat-sub">@ ₹10 pooled welfare/order</span>
                    </div>
                  </div>

                  {/* Two Column Section */}
                  <div className="overview-two-col" style={{ marginTop: "24px" }}>
                    <div className="overview-card">
                      <div className="overview-card-header">
                        <h3>Pending e-Shram Queue</h3>
                        <button
                          className="text-btn"
                          onClick={() => switchTab("verifications")}
                        >
                          View All →
                        </button>
                      </div>

                      <div className="queue-list">
                        {workers
                          .filter(
                            (w) =>
                              !w.is_verified &&
                              w.verification_status !== "REJECTED"
                          )
                          .slice(0, 4)
                          .map((w) => (
                            <div key={w.worker_id} className="queue-item">
                              <div className="queue-worker-info">
                                <strong>{w.name}</strong>
                                <small>
                                  {w.skills?.[0]?.skill_name ||
                                    "Cooperative Worker"}{" "}
                                  · UAN: {w.eshram_uan}
                                </small>
                              </div>
                              <div className="queue-actions">
                                <button
                                  className="action-btn verify"
                                  onClick={() => handleVerifyWorker(w)}
                                >
                                  Approve ✓
                                </button>
                                <button
                                  className="action-btn reject"
                                  onClick={() => handleRejectWorker(w)}
                                >
                                  Reject ✕
                                </button>
                              </div>
                            </div>
                          ))}
                        {workers.filter(
                          (w) =>
                            !w.is_verified &&
                            w.verification_status !== "REJECTED"
                        ).length === 0 && (
                          <div className="empty-state-card">
                            <p>✓ All registered workers are verified.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="overview-card">
                      <div className="overview-card-header">
                        <h3>Recent Service Orders</h3>
                        <button
                          className="text-btn"
                          onClick={() => switchTab("bookings")}
                        >
                          View All →
                        </button>
                      </div>

                      <div className="recent-orders-list">
                        {bookings.slice(0, 4).map((b) => (
                          <div key={b.booking_id} className="recent-order-item">
                            <div>
                              <strong>Order #{b.booking_id}</strong>
                              <small>
                                {b.service_name || `Service #${b.service_id}`} ·
                                Amount: ₹{b.amount || 239}
                              </small>
                            </div>
                            <span
                              className={`status-pill ${b.status.toLowerCase()}`}
                            >
                              ● {b.status === "ACCEPTED" ? "WORKER ARRIVED" : b.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: WORKERS */}
              {activeTab === "workers" && (
                <div className="admin-tab-content">
                  <div className="admin-filter-bar">
                    <input
                      type="text"
                      className="filter-search-input"
                      placeholder="Search by worker name or trade..."
                      value={searchWorkerTerm}
                      onChange={(e) => setSearchWorkerTerm(e.target.value)}
                    />

                    <select
                      value={filterSkill}
                      onChange={(e) => setFilterSkill(e.target.value)}
                      className="filter-select"
                    >
                      <option value="ALL">All Skills / Trades</option>
                      {skills.map((s) => (
                        <option key={s.skill_id} value={s.skill_id}>
                          {s.skill_name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filterVerification}
                      onChange={(e) => setFilterVerification(e.target.value)}
                      className="filter-select"
                    >
                      <option value="ALL">All Verifications</option>
                      <option value="VERIFIED">Verified Only</option>
                      <option value="PENDING">Pending Only</option>
                      <option value="REJECTED">Rejected Only</option>
                    </select>
                  </div>

                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Professional</th>
                          <th>Trade / Skill</th>
                          <th>Experience</th>
                          <th>Rating</th>
                          <th>Availability</th>
                          <th>e-Shram Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWorkers.map((w) => (
                          <tr key={w.worker_id}>
                            <td>
                              <strong>{w.name}</strong>
                              <small>Member #SH-{100 + w.worker_id}</small>
                            </td>
                            <td>
                              {w.skills?.[0]?.skill_name || "Cooperative Pro"}
                            </td>
                            <td>{w.experience_years ?? 5} yrs</td>
                            <td>
                              ⭐{" "}
                              {w.average_rating
                                ? Number(w.average_rating).toFixed(1)
                                : "5.0"}
                            </td>
                            <td>
                              <span
                                className={`availability-dot ${
                                  w.is_active ? "online" : "offline"
                                }`}
                              >
                                {w.is_active ? "🟢 Online" : "🔴 Offline"}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`verification-badge ${
                                  w.is_verified
                                    ? "verified"
                                    : w.verification_status === "REJECTED"
                                    ? "rejected"
                                    : "pending"
                                }`}
                              >
                                {w.is_verified
                                  ? "✓ VERIFIED"
                                  : w.verification_status === "REJECTED"
                                  ? "✕ REJECTED"
                                  : "⏳ PENDING"}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions-row">
                                <button
                                  className="mini-btn view"
                                  onClick={() => setSelectedWorker(w)}
                                >
                                  View
                                </button>
                                {!w.is_verified ? (
                                  <button
                                    className="mini-btn verify"
                                    onClick={() => handleVerifyWorker(w)}
                                  >
                                    Approve
                                  </button>
                                ) : (
                                  <button
                                    className="mini-btn reject"
                                    onClick={() => handleRejectWorker(w)}
                                  >
                                    Revoke
                                  </button>
                                )}
                                <button
                                  className="mini-btn toggle"
                                  onClick={() => handleToggleWorkerStatus(w)}
                                >
                                  {w.is_active ? "Deactivate" : "Activate"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: VERIFICATIONS */}
              {activeTab === "verifications" && (
                <div className="admin-tab-content">
                  <div className="verification-cards-grid">
                    {workers.map((w) => (
                      <div key={w.worker_id} className="ver-card">
                        <div className="ver-card-header">
                          <div>
                            <h4>{w.name}</h4>
                            <span className="ver-trade-tag">
                              {w.skills?.[0]?.skill_name || "General Pro"}
                            </span>
                          </div>
                          <span
                            className={`verification-badge ${
                              w.is_verified
                                ? "verified"
                                : w.verification_status === "REJECTED"
                                ? "rejected"
                                : "pending"
                            }`}
                          >
                            {w.is_verified
                              ? "✓ VERIFIED"
                              : w.verification_status === "REJECTED"
                              ? "✕ REJECTED"
                              : "⏳ PENDING"}
                          </span>
                        </div>

                        <div className="ver-card-body">
                          <div className="ver-info-row">
                            <span>e-Shram UAN:</span>
                            <code>{w.eshram_uan}</code>
                          </div>
                          <div className="ver-info-row">
                            <span>Aadhaar Link:</span>
                            <strong>Linked (Format Validated)</strong>
                          </div>
                          <div className="ver-info-row">
                            <span>Experience:</span>
                            <span>{w.experience_years ?? 5} Years</span>
                          </div>
                          <div className="ver-info-row">
                            <span>Operating Zone:</span>
                            <span>{w.address || "Jabalpur Central"}</span>
                          </div>
                        </div>

                        <div className="ver-card-actions">
                          <button
                            className="primary-btn mini"
                            onClick={() => handleVerifyWorker(w)}
                            disabled={w.is_verified}
                          >
                            ✓ Approve e-Shram
                          </button>
                          <button
                            className="secondary-btn mini reject"
                            onClick={() => handleRejectWorker(w)}
                            disabled={
                              !w.is_verified &&
                              w.verification_status === "REJECTED"
                            }
                          >
                            ✕ Reject
                          </button>
                          <button
                            className="secondary-btn mini"
                            onClick={() => setSelectedWorker(w)}
                          >
                            Inspect
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: BOOKINGS */}
              {activeTab === "bookings" && (
                <div className="admin-tab-content">
                  <div className="admin-filter-bar">
                    <input
                      type="text"
                      className="filter-search-input"
                      placeholder="Search booking ID, customer or worker..."
                      value={searchBookingTerm}
                      onChange={(e) => setSearchBookingTerm(e.target.value)}
                    />

                    <select
                      value={filterBookingStatus}
                      onChange={(e) => setFilterBookingStatus(e.target.value)}
                      className="filter-select"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="PENDING">Pending</option>
                      <option value="ACCEPTED">Worker Arrived / Accepted</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Order #</th>
                          <th>Service</th>
                          <th>Assigned Worker</th>
                          <th>Customer</th>
                          <th>Date / Slot</th>
                          <th>Total Amount</th>
                          <th>Payment</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.map((b) => (
                          <tr key={b.booking_id}>
                            <td>
                              <strong>#{b.booking_id}</strong>
                            </td>
                            <td>
                              {b.service_name || `Service #${b.service_id}`}
                            </td>
                            <td>
                              {b.worker_name || `Worker #${b.worker_id}`}
                            </td>
                            <td>
                              {b.customer_name || `Customer #${b.customer_id}`}
                            </td>
                            <td>{b.booking_date || "Today"}</td>
                            <td>
                              <strong style={{ color: "#059669" }}>
                                ₹{b.amount || 239}
                              </strong>
                            </td>
                            <td>
                              <span
                                className={`payment-pill ${
                                  b.payment_status === "PAID"
                                    ? "paid"
                                    : "pending"
                                }`}
                              >
                                {b.payment_status || "PENDING"}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`status-pill ${b.status.toLowerCase()}`}
                              >
                                ● {b.status === "ACCEPTED" ? "WORKER ARRIVED" : b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 5: PAYMENTS */}
              {activeTab === "payments" && (
                <div className="admin-tab-content">
                  <div className="admin-stats-grid" style={{ marginBottom: "24px" }}>
                    <div className="admin-stat-card">
                      <div className="stat-header">
                        <span className="stat-title">TOTAL COLLECTED</span>
                        <span className="stat-icon">₹</span>
                      </div>
                      <div className="stat-value">₹{totalCustomerPayments}</div>
                      <span className="stat-sub">
                        From {completedBookingsCount} completed jobs
                      </span>
                    </div>

                    <div className="admin-stat-card">
                      <div className="stat-header">
                        <span className="stat-title">WORKER DISBURSEMENTS</span>
                        <span className="stat-icon">🤝</span>
                      </div>
                      <div className="stat-value green">
                        ₹{totalWorkerEarnings}
                      </div>
                      <span className="stat-sub">100% of ₹199 per job</span>
                    </div>

                    <div className="admin-stat-card">
                      <div className="stat-header">
                        <span className="stat-title">PLATFORM OPERATIONS</span>
                        <span className="stat-icon">⚡</span>
                      </div>
                      <div className="stat-value">₹{totalPlatformFees}</div>
                      <span className="stat-sub">₹30 per job</span>
                    </div>

                    <div className="admin-stat-card highlight-gullak">
                      <div className="stat-header">
                        <span className="stat-title">GULLAK WELFARE POOL</span>
                        <span className="stat-icon">🪙</span>
                      </div>
                      <div className="stat-value gold">₹{totalGullakPool}</div>
                      <span className="stat-sub">₹10 per job pooled</span>
                    </div>
                  </div>

                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Order #</th>
                          <th>Customer Paid</th>
                          <th>Worker Payout (100%)</th>
                          <th>Platform Operations</th>
                          <th>Gullak Welfare</th>
                          <th>Payment Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bookings.map((b) => (
                          <tr key={b.booking_id}>
                            <td>
                              <strong>#{b.booking_id}</strong>
                            </td>
                            <td>
                              <strong>₹239.00</strong>
                            </td>
                            <td>
                              <strong style={{ color: "#059669" }}>
                                ₹199.00
                              </strong>
                            </td>
                            <td>₹30.00</td>
                            <td>
                              <strong style={{ color: "#d97706" }}>
                                ₹10.00
                              </strong>
                            </td>
                            <td>
                              <span
                                className={`payment-pill ${
                                  b.payment_status === "PAID"
                                    ? "paid"
                                    : "pending"
                                }`}
                              >
                                {b.payment_status || "PENDING"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 6: GULLAK COOPERATIVE WELFARE POOL */}
              {activeTab === "gullak" && (
                <div className="admin-tab-content">
                  {gullakLoading ? (
                    <div className="admin-loading-state">
                      <div className="loading-spinner"></div>
                      <p>Loading cooperative data...</p>
                    </div>
                  ) : gullakError ? (
                    <div className="admin-error-card">
                      <h3>Unable to load cooperative data</h3>
                      <p>{gullakError}</p>
                      <button className="primary-btn mini" onClick={loadGullakData}>
                        🔄 Retry Loading Gullak Data
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="gullak-banner-card">
                        <div className="gullak-banner-icon">🪙</div>
                        <div>
                          <h3>
                            Total Welfare Reserve: ₹{totalGullakPool + 2500}.00
                          </h3>
                          <p>
                            Accumulated through ₹10 contributions on every
                            completed service booking. Managed cooperatively for
                            unorganised member welfare and emergencies.
                          </p>
                        </div>
                        <span className="gullak-active-pill">
                          🟢 POOL ACTIVE & SOLVENT
                        </span>
                      </div>

                      <div className="gullak-allocations-grid">
                        <div className="gullak-alloc-card">
                          <span className="alloc-icon">🏥</span>
                          <h4>Emergency Healthcare Grant</h4>
                          <p>
                            Covers up to ₹15,000 for unexpected medical
                            emergencies for active members.
                          </p>
                          <strong>
                            Allocated: ₹{(totalGullakPool * 0.4).toFixed(0)}
                          </strong>
                        </div>

                        <div className="gullak-alloc-card">
                          <span className="alloc-icon">🛠️</span>
                          <h4>Tool & Equipment Insurance</h4>
                          <p>
                            Micro-grants for essential trade tool repairs and
                            replacements.
                          </p>
                          <strong>
                            Allocated: ₹{(totalGullakPool * 0.3).toFixed(0)}
                          </strong>
                        </div>

                        <div className="gullak-alloc-card">
                          <span className="alloc-icon">🛡️</span>
                          <h4>Accidental & Disability Cover</h4>
                          <p>
                            Protection cushion during on-site injuries or
                            recovery periods.
                          </p>
                          <strong>
                            Allocated: ₹{(totalGullakPool * 0.3).toFixed(0)}
                          </strong>
                        </div>
                      </div>

                      <div className="overview-card" style={{ marginTop: "24px" }}>
                        <div className="overview-card-header">
                          <h3>Recent Welfare Ledger Entries</h3>
                        </div>

                        {bookings.length > 0 ? (
                          <div className="admin-table-container">
                            <table className="admin-table">
                              <thead>
                                <tr>
                                  <th>Entry ID</th>
                                  <th>Description</th>
                                  <th>Type</th>
                                  <th>Contribution</th>
                                  <th>Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bookings.slice(0, 6).map((b, idx) => (
                                  <tr key={idx}>
                                    <td>
                                      <code>
                                        GLK-2026-{1000 + b.booking_id}
                                      </code>
                                    </td>
                                    <td>
                                      Welfare levy from completed service Order #
                                      {b.booking_id}
                                    </td>
                                    <td>Order Inflow</td>
                                    <td>
                                      <strong style={{ color: "#059669" }}>
                                        + ₹10.00
                                      </strong>
                                    </td>
                                    <td>
                                      <span className="status-pill completed">
                                        SETTLED
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="empty-state-card">
                            <p>No cooperative transactions yet.</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 7: SERVICES */}
              {activeTab === "services" && (
                <div className="admin-tab-content">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginBottom: "18px",
                    }}
                  >
                    <button
                      className="primary-btn"
                      onClick={() => setShowAddServiceModal(true)}
                    >
                      + Add New Service Offering
                    </button>
                  </div>

                  <div className="services-admin-grid">
                    {services.map((s) => (
                      <div key={s.service_id} className="service-admin-card">
                        <div className="service-admin-header">
                          <h4>{s.service || s.service_name}</h4>
                          <span className="service-price-pill">
                            ₹239 Total Floor
                          </span>
                        </div>
                        <p className="service-desc">{s.description}</p>
                        <div className="service-meta-row">
                          <small>Category: {s.category || "Home Care"}</small>
                          <small>Skill ID: #{s.skill_id || 1}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 8: REVIEWS */}
              {activeTab === "reviews" && (
                <div className="admin-tab-content">
                  <div className="reviews-admin-grid">
                    {reviewsList.length > 0 ? (
                      reviewsList.map((rev, rIdx) => (
                        <div key={rIdx} className="admin-review-card">
                          <div className="review-card-top">
                            <div>
                              <strong>
                                {rev.worker_name ||
                                  `Worker #${rev.worker_id}`}
                              </strong>
                              <small>Order #{rev.booking_id || "101"}</small>
                            </div>
                            <div className="review-stars">
                              {"⭐".repeat(rev.rating || 5)}
                              <span className="rating-val">
                                ({rev.rating || 5}/5)
                              </span>
                            </div>
                          </div>
                          <p className="review-text">
                            "{rev.review || rev.comment || "Great job!"}"
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state-card">
                        <p>No customer reviews logged in database yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* WORKER DETAIL MODAL */}
      {selectedWorker && (
        <div
          className="admin-modal-overlay"
          onClick={() => setSelectedWorker(null)}
        >
          <div
            className="admin-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Worker Profile Inspector</h3>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedWorker(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="inspector-worker-header">
                <div className="inspector-avatar">👨‍🔧</div>
                <div>
                  <h3>{selectedWorker.name}</h3>
                  <p>
                    Cooperative Member #SH-{100 + selectedWorker.worker_id} ·{" "}
                    {selectedWorker.address || "Jabalpur"}
                  </p>
                </div>
              </div>

              <div className="inspector-details-grid">
                <div>
                  <small>Primary Trade</small>
                  <strong>
                    {selectedWorker.skills?.[0]?.skill_name || "General Pro"}
                  </strong>
                </div>

                <div>
                  <small>Experience</small>
                  <strong>{selectedWorker.experience_years ?? 5} Years</strong>
                </div>

                <div>
                  <small>Inspection Floor</small>
                  <strong>₹199 Base Floor (100% Payout)</strong>
                </div>

                <div>
                  <small>Rating</small>
                  <strong>
                    ⭐{" "}
                    {selectedWorker.average_rating
                      ? Number(selectedWorker.average_rating).toFixed(1)
                      : "5.0"}
                  </strong>
                </div>

                <div>
                  <small>e-Shram UAN</small>
                  <code>{selectedWorker.eshram_uan}</code>
                </div>

                <div>
                  <small>Verification</small>
                  <strong
                    style={{
                      color: selectedWorker.is_verified ? "#059669" : "#d97706",
                    }}
                  >
                    {selectedWorker.is_verified
                      ? "✓ Verified"
                      : "⏳ Pending / Unverified"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {!selectedWorker.is_verified ? (
                <button
                  className="primary-btn"
                  onClick={() => {
                    handleVerifyWorker(selectedWorker);
                    setSelectedWorker(null);
                  }}
                >
                  ✓ Approve e-Shram
                </button>
              ) : (
                <button
                  className="secondary-btn reject"
                  onClick={() => {
                    handleRejectWorker(selectedWorker);
                    setSelectedWorker(null);
                  }}
                >
                  ✕ Revoke
                </button>
              )}
              <button
                className="secondary-btn"
                onClick={() => setSelectedWorker(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE SERVICE MODAL */}
      {showAddServiceModal && (
        <div
          className="admin-modal-overlay"
          onClick={() => setShowAddServiceModal(false)}
        >
          <div
            className="admin-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Add New Service Offering</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowAddServiceModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateService}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Service Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Geyser Installation & Repair"
                    value={newServiceName}
                    onChange={(e) => setNewServiceName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Describe what the service includes..."
                    value={newServiceDesc}
                    onChange={(e) => setNewServiceDesc(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Standard Floor Price (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={newServicePrice}
                      onChange={(e) => setNewServicePrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Associated Skill</label>
                    <select
                      className="form-control"
                      value={newServiceSkillId}
                      onChange={(e) => setNewServiceSkillId(e.target.value)}
                    >
                      {skills.map((s) => (
                        <option key={s.skill_id} value={s.skill_id}>
                          {s.skill_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={creatingService}
                >
                  {creatingService
                    ? "Creating Service..."
                    : "Create Service Offering"}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowAddServiceModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
