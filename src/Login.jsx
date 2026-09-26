import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setAuthSession, getAuthSession } from "./auth";
import { createCustomer, getSkills } from "./api";
import "./App.css";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialRole = searchParams.get("role") || "customer";
  const initialMode = searchParams.get("mode") || "login";
  const redirectPath = searchParams.get("redirect");

  const [activeRole, setActiveRole] = useState(initialRole === "worker" ? "worker" : "customer");
  const [authMode, setAuthMode] = useState(initialMode === "signup" ? "signup" : "login");

  // Dynamic Skill list for Worker registration
  const [skillsList, setSkillsList] = useState([]);

  // Worker Form State
  const [workerName, setWorkerName] = useState("");
  const [workerEshram, setWorkerEshram] = useState("");
  const [workerPhone, setWorkerPhone] = useState("");
  const [workerSkill, setWorkerSkill] = useState("Electrician");
  const [workerExp, setWorkerExp] = useState("5");
  const [workerOtpSent, setWorkerOtpSent] = useState(false);
  const [workerOtp, setWorkerOtp] = useState("");
  const [workerLoading, setWorkerLoading] = useState(false);
  const [workerError, setWorkerError] = useState("");
  const [workerSuccess, setWorkerSuccess] = useState("");

  // Customer Form State
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerOtpSent, setCustomerOtpSent] = useState(false);
  const [customerOtp, setCustomerOtp] = useState("");
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [customerSuccess, setCustomerSuccess] = useState("");
  const [googleSigningIn, setGoogleSigningIn] = useState(false);

  // Auto-redirect if already authenticated with matching role
  useEffect(() => {
    const existing = getAuthSession();
    if (existing && existing.role === activeRole) {
      navigate(redirectPath || (existing.role === "worker" ? "/worker" : "/customer"), { replace: true });
    }
  }, [activeRole, navigate, redirectPath]);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    const modeParam = searchParams.get("mode");
    if (roleParam === "worker") setActiveRole("worker");
    else if (roleParam === "customer") setActiveRole("customer");
    if (modeParam === "signup") setAuthMode("signup");
    else if (modeParam === "login") setAuthMode("login");
  }, [searchParams]);

  useEffect(() => {
    getSkills()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSkillsList(data);
          setWorkerSkill(data[0].skill_name || "Electrician");
        }
      })
      .catch(() => {});
  }, []);

  const clearAlerts = () => {
    setWorkerError("");
    setWorkerSuccess("");
    setCustomerError("");
    setCustomerSuccess("");
  };

  const handleRoleChange = (role) => {
    setActiveRole(role);
    clearAlerts();
    setWorkerOtpSent(false);
    setCustomerOtpSent(false);
  };

  const handleModeChange = (mode) => {
    setAuthMode(mode);
    clearAlerts();
    setWorkerOtpSent(false);
    setCustomerOtpSent(false);
  };

  // Format 12-digit e-Shram UAN
  const handleEshramChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
    setWorkerEshram(raw);
    if (workerError) setWorkerError("");
  };

  // Format 10-digit Phone
  const handleWorkerPhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setWorkerPhone(raw);
    if (workerError) setWorkerError("");
  };

  const handleCustomerPhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setCustomerPhone(raw);
    if (customerError) setCustomerError("");
  };

  // Worker: Send OTP
  const handleWorkerSendOtp = (e) => {
    e.preventDefault();
    setWorkerError("");

    if (authMode === "signup" && !workerName.trim()) {
      setWorkerError("Please enter your full name as printed on your Aadhaar / e-Shram card.");
      return;
    }

    if (workerEshram.length !== 12) {
      setWorkerError("Please enter a valid 12-digit National e-Shram UAN ID.");
      return;
    }
    if (workerPhone.length !== 10) {
      setWorkerError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setWorkerLoading(true);
    setTimeout(() => {
      setWorkerLoading(false);
      setWorkerOtpSent(true);
      setWorkerSuccess(
        authMode === "signup"
          ? "e-Shram identity validated. Simulation OTP 4821 generated for registration."
          : "Demo OTP 4821 generated for simulation. Enter it below to log in."
      );
    }, 700);
  };

  // Worker: Verify & Complete Auth
  const handleWorkerVerify = (e) => {
    e.preventDefault();
    setWorkerError("");

    if (workerOtp.length !== 4) {
      setWorkerError("Please enter the 4-digit verification code.");
      return;
    }

    if (workerOtp !== "4821" && workerOtp !== "1234") {
      setWorkerError("Invalid OTP. Use demo verification code: 4821");
      return;
    }

    setWorkerLoading(true);
    setTimeout(() => {
      // Resolve worker identity
      const matchedWorkerId = 11; // Default cooperative technician ID
      const finalName = workerName.trim() || "Arvind Gupta";

      setAuthSession({
        role: "worker",
        user: {
          id: matchedWorkerId,
          name: finalName,
          phone: workerPhone,
          uan: workerEshram,
          trade: workerSkill,
          provider: "eshram_otp",
        },
      });

      setWorkerLoading(false);
      setWorkerSuccess(
        authMode === "signup"
          ? `✓ Worker account registered! Welcome to Sahāyu Cooperative, ${finalName}.`
          : "✓ Identity verified! Opening Worker Desk..."
      );

      setTimeout(() => {
        navigate(redirectPath || "/worker", { replace: true });
      }, 600);
    }, 850);
  };

  // Customer: Send OTP
  const handleCustomerSendOtp = (e) => {
    e.preventDefault();
    setCustomerError("");

    if (authMode === "signup" && !customerName.trim()) {
      setCustomerError("Please enter your full name.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail.trim())) {
      setCustomerError("Please enter a valid email address (e.g. name@domain.com).");
      return;
    }

    if (authMode === "signup" && customerPhone && customerPhone.length !== 10) {
      setCustomerError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setCustomerLoading(true);
    setTimeout(() => {
      setCustomerLoading(false);
      setCustomerOtpSent(true);
      setCustomerSuccess(
        authMode === "signup"
          ? "Registration initialized. Simulation OTP 9134 generated for verification."
          : "Demo OTP 9134 generated for simulation. Enter it below to log in."
      );
    }, 700);
  };

  // Customer: Verify & Complete Auth
  const handleCustomerVerify = async (e) => {
    e.preventDefault();
    setCustomerError("");

    if (customerOtp.length !== 4) {
      setCustomerError("Please enter the 4-digit verification code.");
      return;
    }

    if (customerOtp !== "9134" && customerOtp !== "1234") {
      setCustomerError("Invalid OTP. Use demo verification code: 9134");
      return;
    }

    setCustomerLoading(true);

    const finalName = customerName.trim() || customerEmail.split("@")[0] || "Customer";
    let customerId = 1;

    // If Sign Up mode, try to register via backend API
    if (authMode === "signup") {
      try {
        const created = await createCustomer({
          name: finalName,
          email: customerEmail.trim(),
          phone: customerPhone.trim() || "9876543210",
        });
        if (created && (created.customer_id || created.id)) {
          customerId = created.customer_id || created.id;
        }
      } catch (apiErr) {
        console.warn("[Sahāyu Auth] Backend customer registration note:", apiErr.message);
      }
    }

    setTimeout(() => {
      setAuthSession({
        role: "customer",
        user: {
          id: customerId,
          name: finalName,
          email: customerEmail.trim(),
          phone: customerPhone.trim(),
          provider: "email_otp",
        },
      });

      setCustomerLoading(false);
      setCustomerSuccess(
        authMode === "signup"
          ? `✓ Account created successfully! Welcome to Sahāyu, ${finalName}.`
          : "✓ Customer session verified! Redirecting to customer dashboard..."
      );

      setTimeout(() => {
        navigate(redirectPath || "/customer", { replace: true });
      }, 600);
    }, 850);
  };

  // Customer: Google Sign-In
  const handleGoogleSignIn = () => {
    setCustomerError("");
    setGoogleSigningIn(true);

    setTimeout(() => {
      setAuthSession({
        role: "customer",
        user: {
          id: 1,
          name: "Aryan Gupta",
          email: "aryan.demo@gmail.com",
          provider: "google",
        },
      });

      setGoogleSigningIn(false);
      setCustomerSuccess("✓ Google Account verified: Aryan Gupta (aryan.demo@gmail.com)");
      setTimeout(() => {
        navigate(redirectPath || "/customer", { replace: true });
      }, 600);
    }, 850);
  };

  return (
    <div className="login-page">
      <div className="login-card-modern">
        {/* Top Logo & Branding */}
        <div className="login-header-section">
          <div className="logo login-logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            <span className="logo-icon">S</span>
            <span>Sahāyu</span>
          </div>
          <h1>
            {authMode === "signup" ? "Create Your" : "Access Your"}{" "}
            <span>{activeRole === "worker" ? "Worker Desk" : "Customer Portal"}</span>
          </h1>
          <p className="login-description">
            Cooperative-powered services with e-Shram identity validation & guaranteed fair wages.
          </p>
        </div>

        {/* Mode Switcher (Login vs Sign Up) */}
        <div className="auth-mode-switcher">
          <button
            type="button"
            className={`auth-mode-btn ${authMode === "login" ? "active" : ""}`}
            onClick={() => handleModeChange("login")}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-mode-btn ${authMode === "signup" ? "active" : ""}`}
            onClick={() => handleModeChange("signup")}
          >
            Sign Up / Register
          </button>
        </div>

        {/* Role Selector Tabs */}
        <div className="auth-role-tabs">
          <button
            type="button"
            className={`auth-role-tab ${activeRole === "customer" ? "active" : ""}`}
            onClick={() => handleRoleChange("customer")}
          >
            🏠 Customer Portal
          </button>
          <button
            type="button"
            className={`auth-role-tab ${activeRole === "worker" ? "active" : ""}`}
            onClick={() => handleRoleChange("worker")}
          >
            👨‍🔧 Worker Portal
          </button>
        </div>

        {/* =========================================================================
            WORKER AUTHENTICATION (LOGIN & SIGN UP)
            ========================================================================= */}
        {activeRole === "worker" && (
          <div className="auth-form-container">
            <div className="auth-flow-info-box">
              <span className="auth-flow-tag">
                {authMode === "signup" ? "WORKER COOPERATIVE REGISTRATION" : "WORKER AUTHENTICATION"}
              </span>
              <h3>
                {authMode === "signup"
                  ? "Join as an e-Shram Verified Professional"
                  : "e-Shram UAN + Mobile OTP Login"}
              </h3>
              <p>
                {authMode === "signup"
                  ? "Enter your National e-Shram details and trade skill to start receiving community bookings."
                  : "Enter your registered 12-digit e-Shram UAN and phone number to sign in."}
              </p>
            </div>

            {workerError && (
              <div className="auth-alert error">
                <span>⚠️ {workerError}</span>
              </div>
            )}

            {workerSuccess && (
              <div className="auth-alert success">
                <span>{workerSuccess}</span>
              </div>
            )}

            {!workerOtpSent ? (
              <form onSubmit={handleWorkerSendOtp} className="auth-form">
                {authMode === "signup" && (
                  <div className="form-group">
                    <label htmlFor="workerName">
                      Full Legal Name <span className="req">*</span>
                    </label>
                    <input
                      id="workerName"
                      type="text"
                      placeholder="e.g. Arvind Gupta"
                      value={workerName}
                      onChange={(e) => {
                        setWorkerName(e.target.value);
                        if (workerError) setWorkerError("");
                      }}
                      required
                      className="auth-input"
                      autoComplete="name"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="workerEshram">
                    12-digit e-Shram UAN ID <span className="req">*</span>
                  </label>
                  <input
                    id="workerEshram"
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 982345678901"
                    value={workerEshram}
                    onChange={handleEshramChange}
                    maxLength={12}
                    required
                    className="auth-input"
                    autoComplete="off"
                  />
                  <small className="input-hint">{workerEshram.length}/12 digits entered</small>
                </div>

                <div className="form-group">
                  <label htmlFor="workerPhone">
                    Registered Mobile Number <span className="req">*</span>
                  </label>
                  <div className="phone-input-wrapper">
                    <span className="phone-prefix">+91</span>
                    <input
                      id="workerPhone"
                      type="tel"
                      inputMode="numeric"
                      placeholder="9876543210"
                      value={workerPhone}
                      onChange={handleWorkerPhoneChange}
                      maxLength={10}
                      required
                      className="auth-input phone-field"
                      autoComplete="tel"
                    />
                  </div>
                  <small className="input-hint">{workerPhone.length}/10 digits entered</small>
                </div>

                {authMode === "signup" && (
                  <div className="form-row-2col">
                    <div className="form-group">
                      <label htmlFor="workerSkill">
                        Primary Trade Skill <span className="req">*</span>
                      </label>
                      <select
                        id="workerSkill"
                        value={workerSkill}
                        onChange={(e) => setWorkerSkill(e.target.value)}
                        className="auth-input"
                      >
                        {skillsList.length > 0 ? (
                          skillsList.map((s) => (
                            <option key={s.skill_id || s.id} value={s.skill_name || s.name}>
                              {s.skill_name || s.name}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Electrician">Electrician</option>
                            <option value="Plumber">Plumber</option>
                            <option value="Carpenter">Carpenter</option>
                            <option value="Gardener">Gardener</option>
                            <option value="Sanitation Specialist">Sanitation Specialist</option>
                            <option value="Appliance Technician">Appliance Technician</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="workerExp">
                        Experience (Years) <span className="req">*</span>
                      </label>
                      <input
                        id="workerExp"
                        type="number"
                        min="1"
                        max="40"
                        value={workerExp}
                        onChange={(e) => setWorkerExp(e.target.value)}
                        className="auth-input"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="primary-btn full-btn auth-submit-btn"
                  disabled={workerLoading || workerEshram.length !== 12 || workerPhone.length !== 10}
                >
                  {workerLoading ? (
                    <span className="btn-spinner-label">
                      <span className="btn-inline-spinner"></span> Validating e-Shram...
                    </span>
                  ) : authMode === "signup" ? (
                    "Verify e-Shram & Send OTP →"
                  ) : (
                    "Send Verification OTP →"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleWorkerVerify} className="auth-form">
                <div className="auth-sent-badge">
                  <span>
                    📱 OTP requested for: <strong>+91 {workerPhone}</strong>
                  </span>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => {
                      setWorkerOtpSent(false);
                      setWorkerOtp("");
                      setWorkerError("");
                    }}
                  >
                    Edit Phone / e-Shram
                  </button>
                </div>

                <div className="form-group">
                  <label htmlFor="workerOtp">
                    Enter 4-Digit Verification OTP <span className="req">*</span>
                  </label>
                  <input
                    id="workerOtp"
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 4821"
                    value={workerOtp}
                    onChange={(e) => setWorkerOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                    required
                    className="auth-input otp-field"
                    autoFocus
                  />
                  <div className="simulation-notice">
                    ⚡ <strong>Simulation notice:</strong> Enter demo code <code>4821</code> to verify.
                  </div>
                </div>

                <button
                  type="submit"
                  className="primary-btn full-btn auth-submit-btn"
                  disabled={workerLoading || workerOtp.length !== 4}
                >
                  {workerLoading ? (
                    <span className="btn-spinner-label">
                      <span className="btn-inline-spinner"></span> Finalizing Worker Desk...
                    </span>
                  ) : authMode === "signup" ? (
                    "✓ Complete Registration & Open Desk"
                  ) : (
                    "✓ Verify & Open Worker Desk"
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* =========================================================================
            CUSTOMER AUTHENTICATION (LOGIN & SIGN UP)
            ========================================================================= */}
        {activeRole === "customer" && (
          <div className="auth-form-container">
            <div className="auth-flow-info-box customer-box">
              <span className="auth-flow-tag customer-tag">
                {authMode === "signup" ? "CUSTOMER REGISTRATION" : "CUSTOMER ACCESS"}
              </span>
              <h3>
                {authMode === "signup"
                  ? "Create a Household Account"
                  : "Quick Sign-In to Book Services"}
              </h3>
              <p>
                {authMode === "signup"
                  ? "Register to book verified cooperative technicians with transparent pricing and 72h warranty."
                  : "Sign in with Google or your email address to manage your household service bookings."}
              </p>
            </div>

            {customerError && (
              <div className="auth-alert error">
                <span>⚠️ {customerError}</span>
              </div>
            )}

            {customerSuccess && (
              <div className="auth-alert success">
                <span>{customerSuccess}</span>
              </div>
            )}

            {/* Google Sign-In Option */}
            <button
              type="button"
              className="google-signin-btn"
              onClick={handleGoogleSignIn}
              disabled={googleSigningIn}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>
                {googleSigningIn
                  ? "Signing in with Google..."
                  : authMode === "signup"
                  ? "Sign Up with Google"
                  : "Continue with Google"}
              </span>
            </button>

            <div className="auth-divider">
              <span>OR USE EMAIL OTP</span>
            </div>

            {!customerOtpSent ? (
              <form onSubmit={handleCustomerSendOtp} className="auth-form">
                {authMode === "signup" && (
                  <>
                    <div className="form-group">
                      <label htmlFor="customerName">
                        Full Name <span className="req">*</span>
                      </label>
                      <input
                        id="customerName"
                        type="text"
                        placeholder="e.g. Aryan Gupta"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (customerError) setCustomerError("");
                        }}
                        required
                        className="auth-input"
                        autoComplete="name"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="customerPhone">Mobile Number (Optional)</label>
                      <div className="phone-input-wrapper">
                        <span className="phone-prefix">+91</span>
                        <input
                          id="customerPhone"
                          type="tel"
                          inputMode="numeric"
                          placeholder="9876543210"
                          value={customerPhone}
                          onChange={handleCustomerPhoneChange}
                          maxLength={10}
                          className="auth-input phone-field"
                          autoComplete="tel"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label htmlFor="customerEmail">
                    Email Address <span className="req">*</span>
                  </label>
                  <input
                    id="customerEmail"
                    type="email"
                    placeholder="e.g. aryan@example.com"
                    value={customerEmail}
                    onChange={(e) => {
                      setCustomerEmail(e.target.value);
                      if (customerError) setCustomerError("");
                    }}
                    required
                    className="auth-input"
                    autoComplete="email"
                  />
                </div>

                <button
                  type="submit"
                  className="primary-btn full-btn auth-submit-btn"
                  disabled={customerLoading || !customerEmail.trim()}
                >
                  {customerLoading ? (
                    <span className="btn-spinner-label">
                      <span className="btn-inline-spinner"></span> Sending OTP...
                    </span>
                  ) : authMode === "signup" ? (
                    "Register & Send Verification OTP →"
                  ) : (
                    "Send Verification OTP →"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCustomerVerify} className="auth-form">
                <div className="auth-sent-badge">
                  <span>
                    ✉️ OTP requested for: <strong>{customerEmail}</strong>
                  </span>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => {
                      setCustomerOtpSent(false);
                      setCustomerOtp("");
                      setCustomerError("");
                    }}
                  >
                    Edit Email
                  </button>
                </div>

                <div className="form-group">
                  <label htmlFor="customerOtp">
                    Enter 4-Digit Verification OTP <span className="req">*</span>
                  </label>
                  <input
                    id="customerOtp"
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 9134"
                    value={customerOtp}
                    onChange={(e) => setCustomerOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    maxLength={4}
                    required
                    className="auth-input otp-field"
                    autoFocus
                  />
                  <div className="simulation-notice">
                    ⚡ <strong>Simulation notice:</strong> Enter demo code <code>9134</code> to verify.
                  </div>
                </div>

                <button
                  type="submit"
                  className="primary-btn full-btn auth-submit-btn"
                  disabled={customerLoading || customerOtp.length !== 4}
                >
                  {customerLoading ? (
                    <span className="btn-spinner-label">
                      <span className="btn-inline-spinner"></span> Verifying Customer Session...
                    </span>
                  ) : authMode === "signup" ? (
                    "✓ Complete Registration & Continue"
                  ) : (
                    "✓ Verify & Open Customer Portal"
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Cooperative Admin Desk Entry (Preserved Admin Route) */}
        <div className="admin-portal-link-box">
          <button
            type="button"
            className="admin-link-btn"
            onClick={() => navigate("/admin")}
          >
            🏛️ Cooperative Admin Desk →
          </button>
        </div>

        {/* Footer Return Link */}
        <button
          type="button"
          className="back-home-btn"
          onClick={() => navigate("/")}
        >
          ← Return to Sahāyu Homepage
        </button>
      </div>
    </div>
  );
}