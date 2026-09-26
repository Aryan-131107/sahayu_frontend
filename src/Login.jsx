import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./App.css";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialRole = searchParams.get("role") || "customer";
  const redirectPath = searchParams.get("redirect");

  const [activeTab, setActiveTab] = useState(initialRole === "worker" ? "worker" : "customer");

  // Worker Auth Form State
  const [workerEshram, setWorkerEshram] = useState("");
  const [workerPhone, setWorkerPhone] = useState("");
  const [workerOtpSent, setWorkerOtpSent] = useState(false);
  const [workerOtp, setWorkerOtp] = useState("");
  const [workerSendingOtp, setWorkerSendingOtp] = useState(false);
  const [workerVerifying, setWorkerVerifying] = useState(false);
  const [workerError, setWorkerError] = useState("");
  const [workerSuccess, setWorkerSuccess] = useState("");

  // Customer Auth Form State
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerOtpSent, setCustomerOtpSent] = useState(false);
  const [customerOtp, setCustomerOtp] = useState("");
  const [customerSendingOtp, setCustomerSendingOtp] = useState(false);
  const [customerVerifying, setCustomerVerifying] = useState(false);
  const [customerError, setCustomerError] = useState("");
  const [customerSuccess, setCustomerSuccess] = useState("");
  const [googleSigningIn, setGoogleSigningIn] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam === "worker") setActiveTab("worker");
    else if (roleParam === "customer") setActiveTab("customer");
  }, [searchParams]);

  // Clear errors when switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setWorkerError("");
    setWorkerSuccess("");
    setCustomerError("");
    setCustomerSuccess("");
  };

  // Format 12-digit e-Shram UAN
  const handleEshramChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
    setWorkerEshram(raw);
    if (workerError) setWorkerError("");
  };

  // Format 10-digit Phone
  const handlePhoneChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setWorkerPhone(raw);
    if (workerError) setWorkerError("");
  };

  // Worker: Step 1 - Send OTP
  const handleWorkerSendOtp = (e) => {
    e.preventDefault();
    setWorkerError("");

    if (workerEshram.length !== 12) {
      setWorkerError("Please enter a valid 12-digit e-Shram UAN number.");
      return;
    }
    if (workerPhone.length !== 10) {
      setWorkerError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setWorkerSendingOtp(true);
    setTimeout(() => {
      setWorkerSendingOtp(false);
      setWorkerOtpSent(true);
      setWorkerSuccess("Demo OTP 4821 generated for simulation. Enter it below to verify.");
    }, 700);
  };

  // Worker: Step 2 - Verify OTP
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

    setWorkerVerifying(true);
    setTimeout(() => {
      sessionStorage.setItem("sahayu_worker_auth", "true");
      sessionStorage.setItem("sahayu_worker_phone", workerPhone);
      sessionStorage.setItem("sahayu_worker_eshram", workerEshram);
      if (!localStorage.getItem("sahayu_worker_id")) {
        localStorage.setItem("sahayu_worker_id", "11");
      }
      setWorkerVerifying(false);
      setWorkerSuccess("✓ Worker authentication verified! Opening Worker Desk...");
      setTimeout(() => {
        navigate(redirectPath || "/worker");
      }, 500);
    }, 850);
  };

  // Customer: Step 1 - Send OTP
  const handleCustomerSendOtp = (e) => {
    e.preventDefault();
    setCustomerError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail.trim())) {
      setCustomerError("Please enter a valid email address (e.g. name@domain.com).");
      return;
    }

    setCustomerSendingOtp(true);
    setTimeout(() => {
      setCustomerSendingOtp(false);
      setCustomerOtpSent(true);
      setCustomerSuccess("Demo OTP 9134 generated for simulation. Enter it below to verify.");
    }, 700);
  };

  // Customer: Step 2 - Verify OTP
  const handleCustomerVerify = (e) => {
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

    setCustomerVerifying(true);
    setTimeout(() => {
      sessionStorage.setItem("sahayu_customer_auth", "true");
      sessionStorage.setItem("sahayu_customer_email", customerEmail.trim());
      setCustomerVerifying(false);
      setCustomerSuccess("✓ Customer session verified! Redirecting to customer dashboard...");
      setTimeout(() => {
        navigate(redirectPath || "/customer");
      }, 500);
    }, 850);
  };

  // Customer: Google One-Click Login
  const handleGoogleSignIn = () => {
    setCustomerError("");
    setGoogleSigningIn(true);

    setTimeout(() => {
      sessionStorage.setItem("sahayu_customer_auth", "true");
      sessionStorage.setItem("sahayu_customer_email", "aryan.demo@gmail.com");
      sessionStorage.setItem("sahayu_customer_name", "Aryan Gupta");
      setGoogleSigningIn(false);
      setCustomerSuccess("✓ Google Account verified: Aryan Gupta (aryan.demo@gmail.com)");
      setTimeout(() => {
        navigate(redirectPath || "/customer");
      }, 500);
    }, 900);
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
            Secure <span>Portal Access</span>
          </h1>
          <p className="login-description">
            Cooperative-powered services with e-Shram integration & fair labour floor.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="auth-role-tabs">
          <button
            type="button"
            className={`auth-role-tab ${activeTab === "customer" ? "active" : ""}`}
            onClick={() => handleTabChange("customer")}
          >
            🏠 Customer Portal
          </button>
          <button
            type="button"
            className={`auth-role-tab ${activeTab === "worker" ? "active" : ""}`}
            onClick={() => handleTabChange("worker")}
          >
            👨‍🔧 Worker Portal
          </button>
        </div>

        {/* WORKER AUTHENTICATION FLOW */}
        {activeTab === "worker" && (
          <div className="auth-form-container">
            <div className="auth-flow-info-box">
              <span className="auth-flow-tag">WORKER AUTHENTICATION</span>
              <h3>e-Shram + Mobile OTP Verification</h3>
              <p>Enter your 12-digit National e-Shram UAN and registered mobile number.</p>
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
                  <small className="input-hint">
                    {workerEshram.length}/12 digits entered
                  </small>
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
                      onChange={handlePhoneChange}
                      maxLength={10}
                      required
                      className="auth-input phone-field"
                      autoComplete="tel"
                    />
                  </div>
                  <small className="input-hint">
                    {workerPhone.length}/10 digits entered
                  </small>
                </div>

                <button
                  type="submit"
                  className="primary-btn full-btn auth-submit-btn"
                  disabled={workerSendingOtp || workerEshram.length !== 12 || workerPhone.length !== 10}
                >
                  {workerSendingOtp ? (
                    <span className="btn-spinner-label">
                      <span className="btn-inline-spinner"></span> Sending OTP...
                    </span>
                  ) : (
                    "Send Verification OTP →"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleWorkerVerify} className="auth-form">
                <div className="auth-sent-badge">
                  <span>📱 Verification OTP requested for: <strong>+91 {workerPhone}</strong></span>
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
                  disabled={workerVerifying || workerOtp.length !== 4}
                >
                  {workerVerifying ? (
                    <span className="btn-spinner-label">
                      <span className="btn-inline-spinner"></span> Verifying Credentials...
                    </span>
                  ) : (
                    "✓ Verify & Open Worker Desk"
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* CUSTOMER AUTHENTICATION FLOW */}
        {activeTab === "customer" && (
          <div className="auth-form-container">
            <div className="auth-flow-info-box customer-box">
              <span className="auth-flow-tag customer-tag">CUSTOMER ACCESS</span>
              <h3>Quick Sign-In / Registration</h3>
              <p>Sign in with Google or your email to book trusted cooperative services.</p>
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
              <span>{googleSigningIn ? "Signing in with Google..." : "Continue with Google"}</span>
            </button>

            <div className="auth-divider">
              <span>OR USE EMAIL OTP</span>
            </div>

            {!customerOtpSent ? (
              <form onSubmit={handleCustomerSendOtp} className="auth-form">
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
                  disabled={customerSendingOtp || !customerEmail.trim()}
                >
                  {customerSendingOtp ? (
                    <span className="btn-spinner-label">
                      <span className="btn-inline-spinner"></span> Sending OTP...
                    </span>
                  ) : (
                    "Send Verification OTP →"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCustomerVerify} className="auth-form">
                <div className="auth-sent-badge">
                  <span>✉️ Verification OTP requested for: <strong>{customerEmail}</strong></span>
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
                  disabled={customerVerifying || customerOtp.length !== 4}
                >
                  {customerVerifying ? (
                    <span className="btn-spinner-label">
                      <span className="btn-inline-spinner"></span> Verifying Customer Session...
                    </span>
                  ) : (
                    "✓ Verify & Open Customer Portal"
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Cooperative Admin Desk Entry (Unchanged Admin Route) */}
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