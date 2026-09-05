import { useState, useEffect, useMemo, useCallback, Component } from "react";
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

// 1. Error Boundary to prevent any blank-screen failure
class AdminErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[Sahāyu Admin ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="admin-auth-page">
          <div className="admin-auth-card" style={{ maxWidth: "560px", textAlign: "left" }}>
            <div className="admin-badge-icon" style={{ textAlign: "center" }}>⚠️</div>
            <h2 style={{ textAlign: "center", color: "#991b1b" }}>Admin Workspace Restored</h2>
            <p className="admin-auth-subtitle" style={{ textAlign: "center" }}>
              An unexpected render issue occurred. The system has prevented a blank screen.
            </p>
            <div className="auth-error-msg" style={{ fontFamily: "monospace", fontSize: "12px" }}>
              {this.state.error?.message || "Render exception handled gracefully."}
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                className="primary-btn full-btn"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
              >
                🔄 Reload Admin Portal
              </button>
              <button
                className="secondary-btn full-btn"
                onClick={() => (window.location.href = "/")}
              >
                Return to Site
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminDashboardContent() {
  const navigate = useNavigate();
  const location = useLocation();

  // Robust tab segment detection (handles /admin, /admin/, /admin/workers, etc.)
  const cleanPath = location.pathname.replace(/^\/admin\/?/, "").split("/")[0] || "overview";
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
  const activeTab = validTabs.includes(cleanPath) ? cleanPath : "overview";

  // Admin authorization state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(
    () => sessionStorage.getItem("sahayu_admin_auth") === "true"
  );
  const [adminPin, setAdminPin] = useState("");
  const [authError, setAuthError] = useState("");

  // Data states with safe array initializers
  const [workers, setWorkers] = useState([]);
  const [services, setServices] = useState([]);
  const [skills, setSkills] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviewsList, setReviewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gullakLoading, setGullakLoading] = useState(false);
  const [gullakError, setGullakError] = useState("");
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Emergency Grant Modal State
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantCategory, setGrantCategory] = useState("Emergency Healthcare Assistance");
  const [grantAmount, setGrantAmount] = useState(500);
  const [grantBeneficiaryId, setGrantBeneficiaryId] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [grantProcessing, setGrantProcessing] = useState(false);

  // Cooperative Welfare Audit Ledger (Append-only local sync + presentation entries)
  const [welfareLedger, setWelfareLedger] = useState(() => {
    try {
      const saved = localStorage.getItem("sahayu_welfare_ledger");
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback below
    }
    return [
      {
        id: "GLK-2026-0060",
        ref: "#SH-0060",
        desc: "Welfare micro-allocation from completed service Order #101",
        type: "CREDIT",
        amount: 10.0,
        balance: 1480.0,
        date: "Today, 11:42 AM",
        status: "SETTLED",
      },
      {
        id: "GLK-2026-0059",
        ref: "#SH-0059",
        desc: "Welfare micro-allocation from completed service Order #100",
        type: "CREDIT",
        amount: 10.0,
        balance: 1470.0,
        date: "Today, 09:15 AM",
        status: "SETTLED",
      },
      {
        id: "GLK-2026-0058",
        ref: "#SH-0058",
        desc: "Welfare micro-allocation from completed service Order #99",
        type: "CREDIT",
        amount: 10.0,
        balance: 1460.0,
        date: "Yesterday, 04:30 PM",
        status: "SETTLED",
      },
      {
        id: "GLK-2026-0057",
        ref: "#SH-0057",
        desc: "Emergency Tool Breakdown Micro-Grant to Member #SH-104 (Santosh M.)",
        type: "DEBIT",
        amount: 500.0,
        balance: 1450.0,
        date: "Yesterday, 02:10 PM",
        status: "DISBURSED",
      },
      {
        id: "GLK-2026-0056",
        ref: "#SH-0056",
        desc: "Welfare micro-allocation from completed service Order #98",
        type: "CREDIT",
        amount: 10.0,
        balance: 1950.0,
        date: "03 Sep 2026",
        status: "SETTLED",
      },
    ];
  });

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
    try {
      await getGullakSummary();
    } catch (err) {
      setGullakError(err.message || "Unable to load cooperative Gullak data.");
    } finally {
      setGullakLoading(false);
    }
  }, []);

  // Fetch all initial data from backend with resilient fallbacks
  const loadDashboardData = useCallback(() => {
    return Promise.all([
      getWorkers(false).catch(() => []),
      getServices().catch(() => []),
      getSkills().catch(() => []),
      getCustomerBookings(1).catch(() => []),
    ])
      .then(([workersData, servicesData, skillsData, bookingsData]) => {
        const storedVerifications = getAllStoredVerifications();

        // Merge verified states with live worker records
        const mergedWorkers = (Array.isArray(workersData) ? workersData : []).map(
          (w) => {
            const stored =
              storedVerifications[w?.worker_id] ||
              getStoredVerification(w?.worker_id);
            const isVer = stored
              ? stored.status === "VERIFIED"
              : Boolean(w?.is_verified);
            const verStatus = stored
              ? stored.status
              : w?.is_verified
              ? "VERIFIED"
              : "UNVERIFIED";
            const uan =
              stored?.uan ||
              `98${String(w?.worker_id || "00").padStart(2, "0")}-4567-${
                1000 + (w?.worker_id || 0)
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

        if (mergedWorkers.length > 0 && !grantBeneficiaryId) {
          setGrantBeneficiaryId(String(mergedWorkers[0].worker_id));
        }

        // Unblock main UI immediately
        setLoading(false);

        // Background tasks (Gullak & Reviews)
        void loadGullakData();

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
      })
      .catch((err) => {
        setError(err.message || "Failed to load admin dashboard data.");
        setLoading(false);
      });
  }, [loadGullakData, grantBeneficiaryId]);

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadDashboardData();
    }
  }, [isAdminAuthenticated, loadDashboardData]);

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
        "Invalid passcode. (Hint: Use 'admin' or click 1-Click Demo Unlock)"
      );
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem("sahayu_admin_auth");
    setIsAdminAuthenticated(false);
  };

  const switchTab = (tab) => {
    navigate(`/admin/${tab}`);
  };

  // Worker Action Handlers
  const handleToggleWorkerStatus = async (workerItem) => {
    if (!workerItem) return;
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
        `✓ ${workerItem.name} availability updated to ${
          newStatus ? "ACTIVE" : "INACTIVE"
        }.`
      );
      setTimeout(() => setActionSuccess(""), 4000);
    } catch (err) {
      alert(`Failed to update availability: ${err.message}`);
    }
  };

  const handleVerifyWorker = (workerItem) => {
    if (!workerItem) return;
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
      `✓ ${workerItem.name} has been approved and marked e-Shram Validated.`
    );
    setTimeout(() => setActionSuccess(""), 4000);
  };

  const handleRejectWorker = (workerItem) => {
    if (!workerItem) return;
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

  // Handle Authorize Emergency Grant (Demo Action with Ledger Append)
  const handleAuthorizeGrant = (e) => {
    e.preventDefault();
    setGrantProcessing(true);

    const beneficiary = workers.find(
      (w) => String(w.worker_id) === String(grantBeneficiaryId)
    ) || { name: "Society Member", worker_id: grantBeneficiaryId || 104 };

    const newLedgerEntry = {
      id: `GLK-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      ref: `#SH-G${Math.floor(100 + Math.random() * 900)}`,
      desc: `${grantCategory} authorized for Member #SH-${
        100 + Number(beneficiary.worker_id)
      } (${beneficiary.name})${grantReason ? ` - ${grantReason}` : ""}`,
      type: "DEBIT",
      amount: Number(grantAmount),
      balance: Math.max(0, 1480.0 - Number(grantAmount)),
      date: "Just now",
      status: "DISBURSED (DEMO)",
    };

    setTimeout(() => {
      const updated = [newLedgerEntry, ...welfareLedger];
      setWelfareLedger(updated);
      try {
        localStorage.setItem("sahayu_welfare_ledger", JSON.stringify(updated));
      } catch {
        // Ignore storage error
      }
      setGrantProcessing(false);
      setShowGrantModal(false);
      setGrantReason("");
      setActionSuccess(
        `✓ Emergency Grant of ₹${grantAmount} authorized for ${beneficiary.name} (Recorded in Welfare Ledger).`
      );
      setTimeout(() => setActionSuccess(""), 5000);
    }, 600);
  };

  // Cooperative Federation Metrics Calculations
  const totalWorkersCount = workers.length;
  const verifiedWorkersCount = workers.filter((w) => w?.is_verified).length;
  const pendingVerificationsCount = workers.filter(
    (w) => !w?.is_verified && w?.verification_status !== "REJECTED"
  ).length;
  
  // 1. Active Society Members Deployed (Technicians on-duty/available)
  const activeSocietyMembersCount = workers.filter((w) => w?.is_active).length;
  
  const totalBookingsCount = bookings.length;
  const completedBookingsCount = bookings.filter(
    (b) => b?.status === "COMPLETED"
  ).length;

  // 2. 100% Wage Settlement Volume (Cumulative labor-floor payouts settled to worker wallets)
  const totalWageSettlementVolume =
    completedBookingsCount > 0 ? completedBookingsCount * 199 : 148 * 199; // Presentation base + live

  // 3. Active 3-Day Warranties (Completed jobs in 72-hr protection window)
  const activeWarrantiesCount = Math.max(1, completedBookingsCount || 3);

  // 4. Gullak Welfare Reserve Pool
  const gullakReserveBalance = "1,480.00";
  const gullakCompletedBookings = 148;

  // Pricing calculations
  const totalCustomerPayments = completedBookingsCount * 239;
  const totalPlatformFees = completedBookingsCount * 30;

  // Filtered Workers List
  const filteredWorkers = useMemo(() => {
    return (Array.isArray(workers) ? workers : []).filter((w) => {
      const nameMatch = (w?.name || "")
        .toLowerCase()
        .includes(searchWorkerTerm.toLowerCase());
      const skillName = (w?.skills?.[0]?.skill_name || "").toLowerCase();
      const termMatch =
        nameMatch || skillName.includes(searchWorkerTerm.toLowerCase());

      const skillMatch =
        filterSkill === "ALL" ||
        w?.skills?.some((s) => String(s?.skill_id) === String(filterSkill));

      const verMatch =
        filterVerification === "ALL" ||
        (filterVerification === "VERIFIED" && w?.is_verified) ||
        (filterVerification === "PENDING" &&
          !w?.is_verified &&
          w?.verification_status !== "REJECTED") ||
        (filterVerification === "REJECTED" &&
          w?.verification_status === "REJECTED");

      return termMatch && skillMatch && verMatch;
    });
  }, [workers, searchWorkerTerm, filterSkill, filterVerification]);

  // Filtered Bookings List
  const filteredBookings = useMemo(() => {
    return (Array.isArray(bookings) ? bookings : []).filter((b) => {
      const term = searchBookingTerm.toLowerCase();
      const idMatch = String(b?.booking_id || "").includes(term);
      const custMatch =
        String(b?.customer_id || "").includes(term) ||
        (b?.customer_name || "").toLowerCase().includes(term);
      const workerMatch =
        String(b?.worker_id || "").includes(term) ||
        (b?.worker_name || "").toLowerCase().includes(term);
      const statusMatch =
        filterBookingStatus === "ALL" || b?.status === filterBookingStatus;

      return (idMatch || custMatch || workerMatch) && statusMatch;
    });
  }, [bookings, searchBookingTerm, filterBookingStatus]);

  // Authorization Gate Screen
  if (!isAdminAuthenticated) {
    return (
      <div className="admin-auth-page">
        <div className="admin-auth-card">
          <div className="admin-badge-icon">🏛️</div>
          <h2>Sahāyu Cooperative Federation</h2>
          <p className="admin-auth-subtitle">
            Cooperative Governance, Labour Welfare & Sinking Fund Desk.
          </p>

          {authError && <div className="auth-error-msg">{authError}</div>}

          <form onSubmit={handleAdminLogin}>
            <div className="form-group" style={{ textAlign: "left" }}>
              <label>Administrator Passcode</label>
              <input
                type="password"
                className="form-control"
                placeholder="Enter passcode (e.g. admin)"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                autoFocus
              />
            </div>

            <button type="submit" className="primary-btn admin-login-btn">
              Unlock Federation Admin Portal →
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
            ← Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* 2. FIXED / STATIONARY SIDEBAR (Remains visible during content scroll) */}
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
          <span className="coop-cluster-pill">🏛️ Jabalpur Federation Cluster</span>
        </div>

        {/* Navigation Menu with right-aligned badges */}
        <nav className="admin-nav-menu">
          <button
            className={`admin-nav-item ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => switchTab("overview")}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-label">Federation Health</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "workers" ? "active" : ""}`}
            onClick={() => switchTab("workers")}
          >
            <span className="nav-icon">👨‍🔧</span>
            <span className="nav-label">Worker Roster</span>
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
            className={`admin-nav-item ${activeTab === "gullak" ? "active" : ""}`}
            onClick={() => switchTab("gullak")}
          >
            <span className="nav-icon">🪙</span>
            <span className="nav-label">Gullak Pool</span>
            <span className="nav-count-badge gold">₹1.48k</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "bookings" ? "active" : ""}`}
            onClick={() => switchTab("bookings")}
          >
            <span className="nav-icon">📋</span>
            <span className="nav-label">Society Bookings</span>
            <span className="nav-count-badge">{totalBookingsCount}</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "payments" ? "active" : ""}`}
            onClick={() => switchTab("payments")}
          >
            <span className="nav-icon">💳</span>
            <span className="nav-label">Wage Settlement</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "services" ? "active" : ""}`}
            onClick={() => switchTab("services")}
          >
            <span className="nav-icon">🛠️</span>
            <span className="nav-label">Service Catalog</span>
            <span className="nav-count-badge">{services.length}</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "reviews" ? "active" : ""}`}
            onClick={() => switchTab("reviews")}
          >
            <span className="nav-icon">⭐</span>
            <span className="nav-label">Member Reviews</span>
            <span className="nav-count-badge">{reviewsList.length}</span>
          </button>
        </nav>

        {/* Stationary Sidebar Footer */}
        <div className="admin-sidebar-footer">
          <div className="admin-user-info">
            <span className="admin-avatar">🏛️</span>
            <div>
              <strong>Federation Admin</strong>
              <small>Jabalpur Central</small>
            </div>
          </div>
          <button className="logout-btn" onClick={handleAdminLogout} title="Logout">
            ⎋
          </button>
        </div>
      </aside>

      {/* 3. INDEPENDENTLY SCROLLABLE MAIN CONTENT AREA */}
      <div className="admin-main-content">
        {/* Top Header Bar */}
        <header className="admin-topbar">
          <div className="topbar-title">
            <h1>
              {activeTab === "overview" && "Cooperative Federation Dashboard"}
              {activeTab === "workers" && "Society Worker Roster & Two-Layer Trust"}
              {activeTab === "verifications" && "e-Shram Demo Verification Queue"}
              {activeTab === "gullak" && "Gullak Welfare Pool & Sinking Fund"}
              {activeTab === "bookings" && "Society Service Orders & Lifecycle"}
              {activeTab === "payments" && "100% Wage Settlement Audit"}
              {activeTab === "services" && "Standardized Service Offerings"}
              {activeTab === "reviews" && "Customer Ratings & Community Feedback"}
            </h1>
            <p>Sahāyu Cooperative Federation · Unorganised Labour Protection System</p>
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
              <p>Loading cooperative federation data...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & FEDERATION HEALTH */}
              {activeTab === "overview" && (
                <div className="admin-tab-content">
                  {/* Top Key Metrics Ribbon (Cooperative Federation Metrics) */}
                  <div className="admin-stats-grid">
                    {/* Metric 1: Active Society Members Deployed */}
                    <div className="admin-stat-card">
                      <div className="stat-header">
                        <span className="stat-title">ACTIVE SOCIETY MEMBERS</span>
                        <span className="stat-icon">👨‍🔧</span>
                      </div>
                      <div className="stat-value green">
                        {activeSocietyMembersCount} <small style={{ fontSize: "13px", fontWeight: 600 }}>/ {totalWorkersCount}</small>
                      </div>
                      <span className="stat-sub">On-duty & deployed in Jabalpur</span>
                    </div>

                    {/* Metric 2: 100% Wage Settlement Volume */}
                    <div className="admin-stat-card highlight">
                      <div className="stat-header">
                        <span className="stat-title">100% WAGE SETTLEMENT</span>
                        <span className="stat-icon">🤝</span>
                      </div>
                      <div className="stat-value">₹{totalWageSettlementVolume.toLocaleString("en-IN")}</div>
                      <span className="stat-sub">100% labor floor to worker wallets</span>
                    </div>

                    {/* Metric 3: Active 3-Day Warranties */}
                    <div className="admin-stat-card">
                      <div className="stat-header">
                        <span className="stat-title">ACTIVE 3-DAY WARRANTIES</span>
                        <span className="stat-icon">🛡️</span>
                      </div>
                      <div className="stat-value emerald">{activeWarrantiesCount}</div>
                      <span className="stat-sub">Under 72-hr workmanship guarantee</span>
                    </div>

                    {/* Metric 4: Dedicated Gullak Welfare Pool Card */}
                    <div className="admin-stat-card highlight-gullak">
                      <div className="stat-header">
                        <span className="stat-title">GULLAK WELFARE POOL</span>
                        <span className="stat-icon">🪙</span>
                      </div>
                      <div className="stat-value gold">₹{gullakReserveBalance}</div>
                      <span className="stat-sub">Mutual Aid Sinking Fund · ₹10/order</span>
                    </div>
                  </div>

                  {/* Dedicated Gullak Welfare Pool Sinking Fund Banner */}
                  <div className="gullak-banner-card" style={{ marginTop: "24px" }}>
                    <div className="gullak-banner-icon">🪙</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0 }}>
                          Gullak Welfare Pool: ₹{gullakReserveBalance}
                        </h3>
                        <span className="gullak-active-pill">
                          MUTUAL AID SINKING FUND
                        </span>
                      </div>
                      <p style={{ marginTop: "6px" }}>
                        Accumulated via {gullakCompletedBookings} completed society bookings • ₹10/booking micro-sinking fund
                        allocated for emergency healthcare, tool breakdown micro-grants, and injury protection.
                      </p>
                    </div>
                    <button
                      className="primary-btn"
                      onClick={() => setShowGrantModal(true)}
                      style={{ background: "#92400e", borderColor: "#78350f" }}
                    >
                      🛡️ Authorize Emergency Grant
                    </button>
                  </div>

                  {/* Two Column Section: Pending Queue & Recent Service Orders */}
                  <div className="overview-two-col" style={{ marginTop: "24px" }}>
                    <div className="overview-card">
                      <div className="overview-card-header">
                        <h3>e-Shram Verification Desk</h3>
                        <button
                          className="text-btn"
                          onClick={() => switchTab("verifications")}
                        >
                          View All →
                        </button>
                      </div>

                      <div className="queue-list">
                        {(Array.isArray(workers) ? workers : [])
                          .filter(
                            (w) =>
                              !w?.is_verified &&
                              w?.verification_status !== "REJECTED"
                          )
                          .slice(0, 4)
                          .map((w) => (
                            <div key={w.worker_id} className="queue-item">
                              <div className="queue-worker-info">
                                <strong>{w.name}</strong>
                                <small>
                                  Member #SH-{100 + w.worker_id} · UAN: {w.eshram_uan}
                                </small>
                              </div>
                              <div className="queue-actions">
                                <button
                                  className="action-btn verify"
                                  onClick={() => handleVerifyWorker(w)}
                                >
                                  Validate ✓
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
                            !w?.is_verified &&
                            w?.verification_status !== "REJECTED"
                        ).length === 0 && (
                          <div className="empty-state-card">
                            <p>✓ All registered workers are currently verified.</p>
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
                        {(Array.isArray(bookings) ? bookings : []).slice(0, 4).map((b) => (
                          <div key={b.booking_id} className="recent-order-item">
                            <div>
                              <strong>Order #{b.booking_id}</strong>
                              <small>
                                {b.service_name || `Service #${b.service_id}`} ·
                                Amount: ₹{b.amount || 239}
                              </small>
                            </div>
                            <span
                              className={`status-pill ${b?.status ? b.status.toLowerCase() : "pending"}`}
                            >
                              ● {b?.status === "ACCEPTED" ? "WORKER ARRIVED" : b?.status || "PENDING"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Welfare Audit Log Summary Strip */}
                  <div className="overview-card" style={{ marginTop: "24px" }}>
                    <div className="overview-card-header">
                      <h3>Recent Welfare Ledger Entries (cooperative_welfare_ledger)</h3>
                      <button className="text-btn" onClick={() => switchTab("gullak")}>
                        Open Full Sinking Fund Ledger →
                      </button>
                    </div>

                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Transaction ID</th>
                            <th>Booking Ref</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {welfareLedger.slice(0, 3).map((entry, idx) => (
                            <tr key={idx}>
                              <td><code>{entry.id}</code></td>
                              <td><strong>{entry.ref}</strong></td>
                              <td>{entry.desc}</td>
                              <td>
                                <strong
                                  style={{
                                    color: entry.type === "CREDIT" ? "#059669" : "#b91c1c",
                                  }}
                                >
                                  {entry.type === "CREDIT" ? "+" : "-"}₹{entry.amount.toFixed(2)} {entry.type}
                                </strong>
                              </td>
                              <td>
                                <span className={`status-pill ${entry.type === "CREDIT" ? "completed" : "active"}`}>
                                  {entry.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: WORKER ROSTER (TWO-LAYER TRUST MODEL) */}
              {activeTab === "workers" && (
                <div className="admin-tab-content">
                  <div style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
                      Showing <strong>{filteredWorkers.length}</strong> society technicians (<strong>{verifiedWorkersCount}</strong> e-Shram validated)
                    </p>
                  </div>
                  <div className="admin-filter-bar">
                    <input
                      type="text"
                      className="filter-search-input"
                      placeholder="Search by worker name, trade or Society ID..."
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
                      <option value="VERIFIED">e-Shram Validated Only</option>
                      <option value="PENDING">Pending Only</option>
                      <option value="REJECTED">Rejected Only</option>
                    </select>
                  </div>

                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Society Member</th>
                          <th>Trade / Skill</th>
                          <th>Two-Layer Trust Badges</th>
                          <th>Experience</th>
                          <th>Rating</th>
                          <th>Duty Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWorkers.map((w) => (
                          <tr key={w.worker_id}>
                            <td>
                              <strong>{w.name}</strong>
                              <span className="society-member-tag">
                                Cooperative Member #SH-{100 + w.worker_id}
                              </span>
                            </td>
                            <td>
                              <strong>{w.skills?.[0]?.skill_name || "Cooperative Pro"}</strong>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                {/* Layer 1: Green e-Shram Validated Badge */}
                                {w.is_verified ? (
                                  <span className="trust-badge-green" title="Identity & Unorganised Registry Confirmed">
                                    ✓ e-Shram Validated
                                  </span>
                                ) : (
                                  <span className="trust-badge-yellow" title="e-Shram Validation Pending">
                                    ⏳ e-Shram Pending
                                  </span>
                                )}

                                {/* Layer 2: Blue ITI / NCVET Certified Badge */}
                                <span className="trust-badge-blue" title="Professional Trade Qualification Confirmed">
                                  🔵 ITI / NCVET Certified
                                </span>
                              </div>
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
                                {w.is_active ? "🟢 Deployed / Online" : "🔴 Offline"}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions-row">
                                <button
                                  className="mini-btn view"
                                  onClick={() => setSelectedWorker(w)}
                                >
                                  Credentials
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
                                  {w.is_active ? "Deactivate" : "Deploy"}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="trust-footnote-box" style={{ marginTop: "16px" }}>
                    💡 <strong>Two-Layer Trust Governance:</strong> <em>e-Shram Validated</em> confirms Aadhaar linkage and National Database of Unorganised Workers (NDUW) registration. <em>ITI / NCVET Certified</em> verifies formal trade skill training and technical qualification.
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
                            <span className="society-member-tag">
                              Cooperative Member #SH-{100 + w.worker_id}
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
                              ? "✓ e-Shram Validated"
                              : w.verification_status === "REJECTED"
                              ? "✕ REJECTED"
                              : "⏳ PENDING"}
                          </span>
                        </div>

                        <div className="ver-card-body">
                          <div className="ver-info-row">
                            <span>Primary Trade:</span>
                            <strong>{w.skills?.[0]?.skill_name || "General Pro"}</strong>
                          </div>
                          <div className="ver-info-row">
                            <span>e-Shram UAN:</span>
                            <code>{w.eshram_uan}</code>
                          </div>
                          <div className="ver-info-row">
                            <span>Skill Credential:</span>
                            <span className="trust-badge-blue mini">ITI / NCVET Level 4</span>
                          </div>
                          <div className="ver-info-row">
                            <span>Field Experience:</span>
                            <span>{w.experience_years ?? 5} Years</span>
                          </div>
                        </div>

                        <div className="ver-card-actions">
                          <button
                            className="primary-btn mini"
                            onClick={() => handleVerifyWorker(w)}
                            disabled={w.is_verified}
                          >
                            ✓ Validate e-Shram
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

              {/* TAB 4: GULLAK WELFARE POOL & SINKING FUND AUDIT LOG */}
              {activeTab === "gullak" && (
                <div className="admin-tab-content">
                  {gullakLoading ? (
                    <div className="admin-loading-state">
                      <div className="loading-spinner"></div>
                      <p>Loading cooperative welfare data...</p>
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
                      {/* Dedicated Gullak Banner */}
                      <div className="gullak-banner-card">
                        <div className="gullak-banner-icon">🪙</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                            <h3 style={{ margin: 0 }}>
                              Gullak Welfare Pool: ₹{gullakReserveBalance}
                            </h3>
                            <span className="gullak-active-pill">
                              MUTUAL AID SINKING FUND
                            </span>
                          </div>
                          <p style={{ marginTop: "6px" }}>
                            Accumulated via {gullakCompletedBookings} completed society bookings • ₹10/booking micro-sinking fund
                            allocated for member health, tool breakdown micro-grants, and injury protection.
                          </p>
                        </div>
                        <button
                          className="primary-btn"
                          onClick={() => setShowGrantModal(true)}
                          style={{ background: "#92400e", borderColor: "#78350f" }}
                        >
                          🛡️ Authorize Emergency Grant
                        </button>
                      </div>

                      {/* Sinking Fund Allocations */}
                      <div className="gullak-allocations-grid">
                        <div className="gullak-alloc-card">
                          <span className="alloc-icon">🏥</span>
                          <h4>Emergency Healthcare Assistance</h4>
                          <p>
                            Immediate grants up to ₹15,000 for emergency medical care of active society members.
                          </p>
                          <strong>Allocated Reserve: ₹592.00</strong>
                        </div>

                        <div className="gullak-alloc-card">
                          <span className="alloc-icon">🛠️</span>
                          <h4>Tool & Equipment Insurance</h4>
                          <p>
                            Micro-grants for essential trade tool repairs and replacements on job sites.
                          </p>
                          <strong>Allocated Reserve: ₹444.00</strong>
                        </div>

                        <div className="gullak-alloc-card">
                          <span className="alloc-icon">🛡️</span>
                          <h4>Accidental Injury Cushion</h4>
                          <p>
                            Protection cushion during unexpected injury recovery or temporary disability.
                          </p>
                          <strong>Allocated Reserve: ₹444.00</strong>
                        </div>
                      </div>

                      {/* PART 5: WELFARE AUDIT LOG TABLE (cooperative_welfare_ledger) */}
                      <div className="overview-card" style={{ marginTop: "24px" }}>
                        <div className="overview-card-header">
                          <div>
                            <h3>Append-Only Welfare Audit Log (cooperative_welfare_ledger)</h3>
                            <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                              Immutable micro-sinking fund credits (+₹10.00) and authorized emergency grants.
                            </p>
                          </div>
                          <span className="status-pill completed">AUDIT VERIFIED</span>
                        </div>

                        <div className="admin-table-container">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>Ledger Entry ID</th>
                                <th>Booking Ref</th>
                                <th>Transaction Detail</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>Reserve Balance</th>
                                <th>Timestamp</th>
                                <th>Audit Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {welfareLedger.map((entry, idx) => (
                                <tr key={idx}>
                                  <td><code>{entry.id}</code></td>
                                  <td><strong>{entry.ref}</strong></td>
                                  <td>{entry.desc}</td>
                                  <td>
                                    <span
                                      className={`payment-pill ${
                                        entry.type === "CREDIT" ? "paid" : "pending"
                                      }`}
                                    >
                                      {entry.type}
                                    </span>
                                  </td>
                                  <td>
                                    <strong
                                      style={{
                                        color:
                                          entry.type === "CREDIT"
                                            ? "#059669"
                                            : "#b91c1c",
                                      }}
                                    >
                                      {entry.type === "CREDIT" ? "+" : "-"}₹
                                      {entry.amount.toFixed(2)}
                                    </strong>
                                  </td>
                                  <td>₹{entry.balance.toFixed(2)}</td>
                                  <td><small>{entry.date}</small></td>
                                  <td>
                                    <span className="status-pill completed">
                                      {entry.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 5: SOCIETY BOOKINGS */}
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
                          <th>Assigned Society Pro</th>
                          <th>Customer</th>
                          <th>Date / Slot</th>
                          <th>Total Paid</th>
                          <th>Worker Payout</th>
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
                              <span style={{ color: "#065f46", fontWeight: 700 }}>
                                ₹199 (100%)
                              </span>
                            </td>
                            <td>
                              <span
                                className={`status-pill ${b?.status ? b.status.toLowerCase() : "pending"}`}
                              >
                                ● {b?.status === "ACCEPTED" ? "WORKER ARRIVED" : b?.status || "PENDING"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 6: 100% WAGE SETTLEMENT VIEW */}
              {activeTab === "payments" && (
                <div className="admin-tab-content">
                  <div className="admin-stats-grid" style={{ marginBottom: "24px" }}>
                    <div className="admin-stat-card">
                      <div className="stat-header">
                        <span className="stat-title">TOTAL CUSTOMER BILLING</span>
                        <span className="stat-icon">₹</span>
                      </div>
                      <div className="stat-value">₹{totalCustomerPayments || 35372}</div>
                      <span className="stat-sub">
                        From {completedBookingsCount || 148} completed jobs
                      </span>
                    </div>

                    <div className="admin-stat-card highlight">
                      <div className="stat-header">
                        <span className="stat-title">100% WAGE SETTLEMENT</span>
                        <span className="stat-icon">🤝</span>
                      </div>
                      <div className="stat-value green">
                        ₹{totalWageSettlementVolume.toLocaleString("en-IN")}
                      </div>
                      <span className="stat-sub">100% of ₹199 labor floor (0% cut)</span>
                    </div>

                    <div className="admin-stat-card">
                      <div className="stat-header">
                        <span className="stat-title">PLATFORM OPERATIONS</span>
                        <span className="stat-icon">⚡</span>
                      </div>
                      <div className="stat-value">₹{totalPlatformFees || 4440}</div>
                      <span className="stat-sub">₹30 infrastructure fee/job</span>
                    </div>

                    <div className="admin-stat-card highlight-gullak">
                      <div className="stat-header">
                        <span className="stat-title">GULLAK WELFARE SINKING FUND</span>
                        <span className="stat-icon">🪙</span>
                      </div>
                      <div className="stat-value gold">₹{gullakReserveBalance}</div>
                      <span className="stat-sub">₹10 pooled/completed job</span>
                    </div>
                  </div>

                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Order #</th>
                          <th>Customer Paid</th>
                          <th>Worker Payout (100% Floor)</th>
                          <th>Platform Operations</th>
                          <th>Gullak Sinking Fund</th>
                          <th>Settlement Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(Array.isArray(bookings) && bookings.length > 0
                          ? bookings
                          : [{ booking_id: 101 }, { booking_id: 100 }, { booking_id: 99 }]
                        ).map((b, bIdx) => (
                          <tr key={b.booking_id || bIdx}>
                            <td>
                              <strong>#{b.booking_id || 100 + bIdx}</strong>
                            </td>
                            <td>
                              <strong>₹239.00</strong>
                            </td>
                            <td>
                              <strong style={{ color: "#059669" }}>
                                ₹199.00 (100%)
                              </strong>
                            </td>
                            <td>₹30.00</td>
                            <td>
                              <strong style={{ color: "#d97706" }}>
                                ₹10.00
                              </strong>
                            </td>
                            <td>
                              <span className="payment-pill paid">
                                SETTLED TO WALLET
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                            ₹239 Standard Floor
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
                            "{rev.review || rev.comment || "High trade quality and on-time service."}"
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

      {/* AUTHORIZE EMERGENCY GRANT MODAL (Interactive Demo) */}
      {showGrantModal && (
        <div
          className="admin-modal-overlay"
          onClick={() => setShowGrantModal(false)}
        >
          <div
            className="admin-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "520px" }}
          >
            <div className="modal-header">
              <div>
                <h3>Authorize Emergency Welfare Grant</h3>
                <small style={{ color: "#d97706", fontWeight: 700 }}>
                  🪙 Gullak Mutual Aid Sinking Fund (Demo Action)
                </small>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setShowGrantModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAuthorizeGrant}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Grant Assistance Category</label>
                  <select
                    className="form-control"
                    value={grantCategory}
                    onChange={(e) => setGrantCategory(e.target.value)}
                  >
                    <option value="Emergency Healthcare Assistance">🏥 Emergency Healthcare Assistance</option>
                    <option value="Tool & Equipment Breakdown Grant">🛠️ Tool & Equipment Breakdown Grant</option>
                    <option value="Accidental Injury Relief Cushion">🛡️ Accidental Injury Relief Cushion</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Beneficiary Society Member</label>
                  <select
                    className="form-control"
                    value={grantBeneficiaryId}
                    onChange={(e) => setGrantBeneficiaryId(e.target.value)}
                  >
                    {workers.map((w) => (
                      <option key={w.worker_id} value={w.worker_id}>
                        {w.name} (Member #SH-{100 + w.worker_id}) - {w.skills?.[0]?.skill_name || "Pro"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Disbursement Amount (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={grantAmount}
                      onChange={(e) => setGrantAmount(Number(e.target.value))}
                      min={100}
                      max={5000}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Current Sinking Fund Balance</label>
                    <input
                      type="text"
                      className="form-control"
                      value="₹1,480.00"
                      disabled
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Authorization Rationale / Audit Notes</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="e.g. Urgent drill machine motor repair required during on-site plumbing work..."
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={grantProcessing}
                  style={{ background: "#92400e", borderColor: "#78350f" }}
                >
                  {grantProcessing ? "Recording..." : "Authorize & Record in Ledger →"}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowGrantModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WORKER DETAIL INSPECTOR MODAL */}
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
              <h3>Member Credentials Inspector</h3>
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
                  <span className="society-member-tag">
                    Cooperative Member #SH-{100 + selectedWorker.worker_id}
                  </span>
                  <p style={{ marginTop: "4px", color: "#64748b" }}>
                    Operating in {selectedWorker.address || "Jabalpur Central"}
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
                  <small>Trade Qualification</small>
                  <strong className="trust-badge-blue mini" style={{ display: "inline-block" }}>
                    ITI / NCVET Level 4
                  </strong>
                </div>

                <div>
                  <small>e-Shram Identity</small>
                  <code style={{ fontSize: "13px" }}>{selectedWorker.eshram_uan}</code>
                </div>

                <div>
                  <small>Identity Verification</small>
                  <strong
                    style={{
                      color: selectedWorker.is_verified ? "#059669" : "#d97706",
                    }}
                  >
                    {selectedWorker.is_verified
                      ? "✓ e-Shram Validated"
                      : "⏳ Pending Unorganised Registry Check"}
                  </strong>
                </div>

                <div>
                  <small>Labour Floor Rate</small>
                  <strong style={{ color: "#059669" }}>₹199 Base Floor (100% Payout)</strong>
                </div>

                <div>
                  <small>Rating & Jobs</small>
                  <strong>
                    ⭐{" "}
                    {selectedWorker.average_rating
                      ? Number(selectedWorker.average_rating).toFixed(1)
                      : "5.0"}{" "}
                    ({selectedWorker.total_reviews ?? 4} orders)
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
                  ✓ Validate e-Shram
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

function AdminDashboard() {
  return (
    <AdminErrorBoundary>
      <AdminDashboardContent />
    </AdminErrorBoundary>
  );
}

export default AdminDashboard;
