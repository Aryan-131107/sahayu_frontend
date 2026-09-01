import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getSkills,
  getWorkers,
  getStoredVerification,
  setStoredVerification,
} from "./api";
import "./App.css";

function WorkerVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queryWorkerId = searchParams.get("worker_id") || localStorage.getItem("sahayu_worker_id") || "11";

  const [workersList, setWorkersList] = useState([]);
  const [skillsList, setSkillsList] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form fields
  const [workerId, setWorkerId] = useState(queryWorkerId);
  const [workerName, setWorkerName] = useState("Arvind Gupta");
  const [mobileNumber, setMobileNumber] = useState("9876543210");
  const [eshramId, setEshramId] = useState("9823-4567-8901");
  const [selectedSkill, setSelectedSkill] = useState("Electrician");
  const [experience, setExperience] = useState("6");
  const [location, setLocation] = useState("Civil Lines, Jabalpur");

  // Verification states: 'IDLE' | 'VERIFYING' | 'VERIFIED' | 'PENDING' | 'REJECTED'
  const [verificationStatus, setVerificationStatus] = useState("IDLE");
  const [verificationStep, setVerificationStep] = useState(0);
  const [verificationDetails, setVerificationDetails] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Load existing workers and skills
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getWorkers(false).catch(() => []),
      getSkills().catch(() => []),
    ]).then(([workers, skills]) => {
      if (!isMounted) return;
      setWorkersList(Array.isArray(workers) ? workers : []);
      setSkillsList(Array.isArray(skills) ? skills : []);

      // Check if this worker already has a stored verification
      const existing = getStoredVerification(workerId);
      if (existing) {
        setVerificationStatus(existing.status || "VERIFIED");
        setVerificationDetails(existing);
        if (existing.name) setWorkerName(existing.name);
        if (existing.uan) setEshramId(existing.uan);
        if (existing.skill) setSelectedSkill(existing.skill);
        if (existing.mobile) setMobileNumber(existing.mobile);
      } else if (workers.length > 0) {
        const found = workers.find((w) => String(w.worker_id) === String(workerId));
        if (found) {
          setWorkerName(found.name || "");
          setMobileNumber(found.phone || "9876543210");
          if (found.skills?.[0]?.skill_name) {
            setSelectedSkill(found.skills[0].skill_name);
          }
          if (found.experience_years) {
            setExperience(String(found.experience_years));
          }
          if (found.address || found.city) {
            setLocation(found.address || found.city);
          }
          if (found.is_verified) {
            const autoData = {
              status: "VERIFIED",
              workerId: found.worker_id,
              name: found.name,
              uan: "9823-4567-8901",
              skill: found.skills?.[0]?.skill_name || "Electrician",
              mobile: found.phone || "9876543210",
              verifiedAt: new Date().toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            };
            setVerificationStatus("VERIFIED");
            setVerificationDetails(autoData);
            setStoredVerification(found.worker_id, autoData);
          }
        }
      }
      setLoadingInitial(false);
    });

    return () => {
      isMounted = false;
    };
  }, [workerId]);

  // Handle worker selection change
  const handleSelectWorker = (id) => {
    setWorkerId(id);
    localStorage.setItem("sahayu_worker_id", String(id));
    const found = workersList.find((w) => String(w.worker_id) === String(id));
    if (found) {
      setWorkerName(found.name || "");
      setMobileNumber(found.phone || "");
      if (found.skills?.[0]?.skill_name) {
        setSelectedSkill(found.skills[0].skill_name);
      }
      if (found.experience_years) {
        setExperience(String(found.experience_years));
      }
      if (found.address || found.city) {
        setLocation(found.address || found.city);
      }
    }

    const existing = getStoredVerification(id);
    if (existing) {
      setVerificationStatus(existing.status || "VERIFIED");
      setVerificationDetails(existing);
    } else {
      setVerificationStatus("IDLE");
      setVerificationDetails(null);
    }
  };

  // Live formatting for e-Shram UAN (XXXX-XXXX-XXXX)
  const handleUanChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 12);
    let formatted = "";
    for (let i = 0; i < raw.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += "-";
      formatted += raw[i];
    }
    setEshramId(formatted);
  };

  // Submit verification flow with simulated steps
  const handleSubmitVerification = (forcedStatus = null) => {
    const rawDigits = eshramId.replace(/\D/g, "");

    // Quick client-side check
    if (rawDigits.length !== 12 && !forcedStatus) {
      setVerificationStatus("REJECTED");
      setRejectionReason(
        "Invalid Shramik/e-Shram UAN format. The UAN must be exactly 12 digits (e.g. 1234-5678-9012)."
      );
      return;
    }

    setVerificationStatus("VERIFYING");
    setVerificationStep(1);

    setTimeout(() => {
      setVerificationStep(2);
      setTimeout(() => {
        setVerificationStep(3);
        setTimeout(() => {
          // Determine outcome (Support forced outcome for demo testing)
          let finalStatus = "VERIFIED";
          if (forcedStatus) {
            finalStatus = forcedStatus;
          } else if (rawDigits.endsWith("0000")) {
            finalStatus = "REJECTED";
            setRejectionReason(
              "NDUW Record Mismatch: The provided e-Shram number could not be matched with Aadhaar linked mobile records."
            );
          } else if (rawDigits.endsWith("9999")) {
            finalStatus = "PENDING";
          }

          const record = {
            status: finalStatus,
            workerId: Number(workerId),
            name: workerName,
            mobile: mobileNumber,
            uan: eshramId,
            skill: selectedSkill,
            experience: experience,
            location: location,
            verifiedAt: new Date().toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          };

          setStoredVerification(workerId, record);
          setVerificationDetails(record);
          setVerificationStatus(finalStatus);
        }, 800);
      }, 900);
    }, 800);
  };

  return (
    <div className="verification-page">
      {/* Top Navigation */}
      <nav className="navbar">
        <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <span className="logo-icon">S</span>
          <span>Sahāyu</span>
        </div>

        <div className="nav-links">
          <button className="nav-link-btn" onClick={() => navigate("/worker")}>
            Worker Dashboard
          </button>
          <button className="nav-link-btn" onClick={() => navigate("/worker-profile")}>
            My Profile
          </button>
          <button className="nav-link-btn" onClick={() => navigate("/admin")}>
            Admin Portal
          </button>
        </div>

        <button className="login-btn" onClick={() => navigate("/worker")}>
          ← Back to Dashboard
        </button>
      </nav>

      <main className="verification-container">
        {/* Prototype Header Disclaimer */}
        <div className="demo-disclaimer-banner">
          <div className="disclaimer-header">
            <span className="disclaimer-tag">🛡️ DEMO VERIFICATION</span>
            <span className="sih-tag">SIH 2026 Prototype Showcase</span>
          </div>
          <p>
            <strong>Note for Evaluators:</strong> This is a simulation of the automated unorganised worker
            verification pipeline. It validates 12-digit e-Shram / Shramik UAN identifiers against a simulated National Database of
            Unorganised Workers (NDUW) registry. It is not connected to the live Government of India production database.
          </p>
        </div>

        <div className="verification-grid">
          {/* LEFT: Verification Form */}
          <div className="verification-card form-section-card">
            <div className="section-header-box">
              <span className="section-subtitle">WORKER ONBOARDING</span>
              <h2>Shramik / e-Shram Verification</h2>
              <p>Verify your credentials to receive the verified worker badge and boost booking priority.</p>
            </div>

            {loadingInitial ? (
              <div className="loading-state-box">
                <div className="spinner"></div>
                <p>Loading worker registration info...</p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitVerification();
                }}
              >
                {/* Select Existing Worker ID */}
                <div className="form-group">
                  <label>Select Worker Account</label>
                  <select
                    value={workerId}
                    onChange={(e) => handleSelectWorker(e.target.value)}
                    className="form-control"
                  >
                    {workersList.map((w) => (
                      <option key={w.worker_id} value={w.worker_id}>
                        #{w.worker_id} - {w.name} ({w.skills?.[0]?.skill_name || "Worker"}) {w.is_verified ? "· [Verified]" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Worker Name */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Worker Full Name (As per Aadhaar/e-Shram)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={workerName}
                      onChange={(e) => setWorkerName(e.target.value)}
                      placeholder="e.g. Arvind Gupta"
                      required
                    />
                  </div>

                  {/* Mobile Number */}
                  <div className="form-group">
                    <label>Aadhaar-Linked Mobile Number</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="10-digit mobile number"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                {/* Shramik / e-Shram ID */}
                <div className="form-group highlight-input-group">
                  <div className="label-row">
                    <label>12-Digit Shramik / e-Shram UAN</label>
                    <span className="input-hint">Format: 1234-5678-9012</span>
                  </div>
                  <input
                    type="text"
                    className="form-control uan-input"
                    value={eshramId}
                    onChange={handleUanChange}
                    placeholder="Enter 12-digit e-Shram UAN"
                    maxLength={14}
                    required
                  />
                  <small className="field-note">
                    💡 <strong>Demo tip:</strong> Use any 12 digits (e.g. <code>9823-4567-8901</code>) for instant verification.
                  </small>
                </div>

                {/* Skill & Experience */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Primary Skill / Trade</label>
                    <select
                      className="form-control"
                      value={selectedSkill}
                      onChange={(e) => setSelectedSkill(e.target.value)}
                    >
                      {skillsList.length > 0 ? (
                        skillsList.map((s) => (
                          <option key={s.skill_id} value={s.skill_name}>
                            {s.skill_name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Electrician">Electrician</option>
                          <option value="Plumber">Plumber</option>
                          <option value="Carpenter">Carpenter</option>
                          <option value="Painter">Painter</option>
                          <option value="House Cleaning">House Cleaning</option>
                          <option value="Gardener">Gardener</option>
                          <option value="Appliance Repair">Appliance Repair</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Experience (Years)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      min="1"
                      max="40"
                      required
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="form-group">
                  <label>Operating Location / City</label>
                  <input
                    type="text"
                    className="form-control"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Civil Lines, Jabalpur"
                    required
                  />
                </div>

                {/* Action Buttons */}
                <div className="verification-actions">
                  <button
                    type="submit"
                    className="primary-btn submit-verify-btn"
                    disabled={verificationStatus === "VERIFYING"}
                  >
                    {verificationStatus === "VERIFYING"
                      ? "Verifying with e-Shram..."
                      : "Submit for e-Shram Verification (Demo)"}
                  </button>

                  {/* Demo Quick State Switcher for SIH Evaluators */}
                  <div className="demo-shortcuts">
                    <span className="shortcut-label">Demo Shortcuts:</span>
                    <button
                      type="button"
                      className="demo-btn verify-quick"
                      onClick={() => handleSubmitVerification("VERIFIED")}
                    >
                      Test Verified ✓
                    </button>
                    <button
                      type="button"
                      className="demo-btn pending-quick"
                      onClick={() => handleSubmitVerification("PENDING")}
                    >
                      Test Pending ⏳
                    </button>
                    <button
                      type="button"
                      className="demo-btn reject-quick"
                      onClick={() => {
                        setRejectionReason("UAN not found in simulated NDUW database.");
                        handleSubmitVerification("REJECTED");
                      }}
                    >
                      Test Rejected ✕
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* RIGHT: Verification Result & Digital e-Shram Card Preview */}
          <div className="verification-card result-section-card">
            {verificationStatus === "IDLE" && (
              <div className="idle-placeholder">
                <div className="placeholder-icon">🪪</div>
                <h3>Worker Identity & e-Shram Preview</h3>
                <p>
                  Fill out the form and submit to simulate the automated national verification check.
                </p>
                <div className="benefits-box">
                  <h4>Benefits of e-Shram Verification:</h4>
                  <ul>
                    <li>✓ Prominent <strong>"Verified Worker"</strong> badge on customer search</li>
                    <li>✓ Higher <strong>Smart Match %</strong> in cooperative algorithm</li>
                    <li>✓ Instant trust & higher customer booking conversion</li>
                    <li>✓ Direct linkage to cooperative insurance & fair-wage schemes</li>
                  </ul>
                </div>
              </div>
            )}

            {verificationStatus === "VERIFYING" && (
              <div className="verifying-stepper-box">
                <div className="spinner large"></div>
                <h3>Verifying Credentials...</h3>
                <p>Simulating NDUW Registry & Skill Checksum validation</p>

                <div className="steps-list">
                  <div className={`step-item ${verificationStep >= 1 ? "active" : ""}`}>
                    <span className="step-num">{verificationStep > 1 ? "✓" : "1"}</span>
                    <span>Validating 12-digit e-Shram UAN syntax...</span>
                  </div>
                  <div className={`step-item ${verificationStep >= 2 ? "active" : ""}`}>
                    <span className="step-num">{verificationStep > 2 ? "✓" : "2"}</span>
                    <span>Querying simulated NDUW Worker Database...</span>
                  </div>
                  <div className={`step-item ${verificationStep >= 3 ? "active" : ""}`}>
                    <span className="step-num">{verificationStep >= 3 ? "✓" : "3"}</span>
                    <span>Matching trade skill & Aadhaar checksum...</span>
                  </div>
                </div>
              </div>
            )}

            {verificationStatus === "VERIFIED" && (
              <div className="result-box verified-box">
                <div className="status-header verified">
                  <span className="status-icon">✓</span>
                  <div>
                    <h2>VERIFIED WORKER</h2>
                    <p>e-Shram / Shramik Card Authenticated (Demo)</p>
                  </div>
                </div>

                {/* Digital e-Shram Card Preview */}
                <div className="digital-eshram-card">
                  <div className="eshram-card-header">
                    <div className="emblem-row">
                      <span className="emblem-text">🇮🇳 NATIONAL DATABASE OF UNORGANISED WORKERS</span>
                      <span className="govt-sub">Ministry of Labour & Employment · Sahāyu Cooperative</span>
                    </div>
                  </div>

                  <div className="eshram-card-body">
                    <div className="eshram-photo-col">
                      <div className="worker-card-photo">👨‍🔧</div>
                      <div className="card-verified-stamp">✓ VERIFIED</div>
                    </div>

                    <div className="eshram-info-col">
                      <div className="eshram-field">
                        <small>Name / नाम</small>
                        <strong>{verificationDetails?.name || workerName}</strong>
                      </div>

                      <div className="eshram-field">
                        <small>Universal Account Number (UAN) / यूएएन</small>
                        <strong className="uan-text">{verificationDetails?.uan || eshramId}</strong>
                      </div>

                      <div className="eshram-row-fields">
                        <div className="eshram-field">
                          <small>Primary Occupation / व्यवसाय</small>
                          <span>{verificationDetails?.skill || selectedSkill}</span>
                        </div>
                        <div className="eshram-field">
                          <small>Experience</small>
                          <span>{experience} Years</span>
                        </div>
                      </div>

                      <div className="eshram-field">
                        <small>Current Location</small>
                        <span>{verificationDetails?.location || location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="eshram-card-footer">
                    <span>Verified on: {verificationDetails?.verifiedAt || "Today"}</span>
                    <span className="coop-ref">Ref: SAHAYU-SIH-2026</span>
                  </div>
                </div>

                <div className="result-actions">
                  <button
                    className="primary-btn"
                    onClick={() => navigate(`/worker-profile`)}
                  >
                    View Verified Worker Profile →
                  </button>
                  <button
                    className="secondary-btn"
                    onClick={() => navigate(`/worker`)}
                  >
                    Go to Worker Dashboard
                  </button>
                </div>
              </div>
            )}

            {verificationStatus === "PENDING" && (
              <div className="result-box pending-box">
                <div className="status-header pending">
                  <span className="status-icon">⏳</span>
                  <div>
                    <h2>VERIFICATION PENDING</h2>
                    <p>Application submitted for cooperative manual review</p>
                  </div>
                </div>

                <div className="pending-details-card">
                  <p>
                    Your Shramik credentials (<strong>{eshramId}</strong>) have been submitted to the
                    Sahāyu Cooperative Admin desk for manual document cross-referencing.
                  </p>

                  <div className="pending-tracker">
                    <div className="tracker-row">
                      <span>✓ Application Form Submitted</span>
                      <small>Completed</small>
                    </div>
                    <div className="tracker-row">
                      <span>⏳ Admin Document Verification</span>
                      <small className="highlight">In Progress</small>
                    </div>
                    <div className="tracker-row">
                      <span>○ Profile Badge Activation</span>
                      <small>Pending</small>
                    </div>
                  </div>

                  <p className="tracker-note">
                    Estimated turnaround: <strong>~2 hours</strong>. You can continue updating your availability.
                  </p>
                </div>

                <div className="result-actions">
                  <button className="primary-btn" onClick={() => navigate(`/admin`)}>
                    Open Admin Verification Desk →
                  </button>
                  <button
                    className="secondary-btn"
                    onClick={() => handleSubmitVerification("VERIFIED")}
                  >
                    Quick Approve (Demo)
                  </button>
                </div>
              </div>
            )}

            {verificationStatus === "REJECTED" && (
              <div className="result-box rejected-box">
                <div className="status-header rejected">
                  <span className="status-icon">✕</span>
                  <div>
                    <h2>VERIFICATION REJECTED</h2>
                    <p>Unable to validate Shramik / e-Shram credentials</p>
                  </div>
                </div>

                <div className="rejection-details-card">
                  <h4>Reason for Rejection:</h4>
                  <p className="rejection-reason-text">
                    {rejectionReason ||
                      "The provided e-Shram UAN could not be verified against the registered mobile number in the NDUW directory."}
                  </p>

                  <div className="rejection-guide">
                    <strong>How to resolve:</strong>
                    <ul>
                      <li>Ensure you entered all 12 digits of your e-Shram UAN correctly.</li>
                      <li>Verify that the mobile number matches your Aadhaar-registered SIM.</li>
                      <li>Ensure your primary trade corresponds with your certified skill.</li>
                    </ul>
                  </div>
                </div>

                <div className="result-actions">
                  <button
                    className="primary-btn"
                    onClick={() => {
                      setVerificationStatus("IDLE");
                      setEshramId("9823-4567-8901");
                    }}
                  >
                    Try Again with Valid UAN
                  </button>
                  <button
                    className="secondary-btn"
                    onClick={() => handleSubmitVerification("VERIFIED")}
                  >
                    Force Verify (Demo)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default WorkerVerification;
