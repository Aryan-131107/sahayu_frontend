import { useState } from "react";
import "./App.css";

import Worker from "./Worker";
import Customer from "./Customer";
import Login from "./Login";
import Workers from "./Workers";
import WorkerProfile from "./WorkerProfile";
import WorkerVerification from "./WorkerVerification";
import AdminDashboard from "./AdminDashboard";
import Booking from "./Booking";
import MyBookings from "./MyBookings";
import PresentationMode from "./PresentationMode";

import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";

import ServiceHeroSlider from "./ServiceHeroSlider";

function Home() {
  const navigate = useNavigate();
  const [lang, setLang] = useState(() => localStorage.getItem("sahayu_lang") || "EN");

  const toggleLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem("sahayu_lang", newLang);
  };

  return (
    <div className="app">

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <span className="logo-icon">S</span>
          <span>Sahāyu</span>
        </div>

        <div className="nav-links">
          <a href="#services">{lang === "HI" ? "सेवाएं" : "Services"}</a>
          <a href="#how-it-works">{lang === "HI" ? "यह कैसे काम करता है" : "How It Works"}</a>
          <a href="#workers">{lang === "HI" ? "श्रमिकों के लिए" : "For Workers"}</a>
          <a href="#about">{lang === "HI" ? "हमारे बारे में" : "About Us"}</a>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div className="lang-selector-toggle" style={{ display: "inline-flex", alignItems: "center", background: "#f1f5f9", borderRadius: "20px", padding: "2px 6px", border: "1px solid #cbd5e1", fontSize: "13px" }}>
            <span style={{ marginRight: "4px", fontSize: "13px" }}>🌐</span>
            <button
              type="button"
              onClick={() => toggleLang("EN")}
              style={{
                background: lang === "EN" ? "#1d6b55" : "transparent",
                color: lang === "EN" ? "#fff" : "#475569",
                border: "none",
                borderRadius: "12px",
                padding: "2px 7px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              EN
            </button>
            <span style={{ color: "#94a3b8", margin: "0 2px" }}>|</span>
            <button
              type="button"
              onClick={() => toggleLang("HI")}
              style={{
                background: lang === "HI" ? "#1d6b55" : "transparent",
                color: lang === "HI" ? "#fff" : "#475569",
                border: "none",
                borderRadius: "12px",
                padding: "2px 7px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              हिन्दी
            </button>
          </div>

          <button
            className="login-btn"
            onClick={() => navigate("/login")}
          >
            {lang === "HI" ? "पोर्टल लॉगिन" : "Portal Login"}
          </button>
        </div>
      </nav>

      {/* 6-SERVICE HERO CAROUSEL SLIDER */}
      <section className="hero-slider-section" id="services">
        <ServiceHeroSlider />
      </section>

      {/* WHY SAHĀYU */}
      <section className="why-section" id="about">

        <div>

          <span className="section-label">
            WHY SAHĀYU?
          </span>

          <h2>
            A better way to work
            <br />
            <span>together.</span>
          </h2>

          <p>
            Sahāyu connects households with cooperative workers,
            creating a transparent ecosystem where workers,
            customers and communities grow together.
          </p>

          <button
            className="primary-btn"
            onClick={() => navigate("/login")}
          >
            Explore Sahāyu
          </button>

        </div>

        <div className="benefits">

          <div className="benefit-card">
            <span>✓</span>

            <div>
              <h3>Verified Workers</h3>

              <p>
                Connect with skilled and cooperative-verified
                professionals.
              </p>
            </div>
          </div>

          <div className="benefit-card">
            <span>₹</span>

            <div>
              <h3>Fair & Transparent</h3>

              <p>
                Clear pricing and transparent worker earnings.
              </p>
            </div>
          </div>

          <div className="benefit-card">
            <span>🤝</span>

            <div>
              <h3>Cooperative First</h3>

              <p>
                Workers are part of the community they serve.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        className="how-section"
        id="how-it-works"
      >

        <span className="section-label">
          HOW IT WORKS
        </span>

        <h2>
          Get help in{" "}
          <span>three simple steps.</span>
        </h2>

        <div className="steps">

          <div className="step">
            <div className="step-number">
              01
            </div>

            <h3>Choose a Service</h3>

            <p>
              Tell us what service you need.
            </p>
          </div>

          <div className="step">
            <div className="step-number">
              02
            </div>

            <h3>Find a Worker</h3>

            <p>
              Choose from verified nearby professionals.
            </p>
          </div>

          <div className="step">
            <div className="step-number">
              03
            </div>

            <h3>Book & Relax</h3>

            <p>
              Book your service and track the request.
            </p>
          </div>

        </div>
      </section>

      {/* WORKER CTA */}
      <section
        className="worker-section"
        id="workers"
      >

        <span className="section-label">
          FOR WORKERS
        </span>

        <h2>
          Your skills.
          <br />
          Your community.
          <br />
          <span>Your opportunity.</span>
        </h2>

        <p>
          Join your local cooperative network and connect
          with households looking for your skills.
        </p>

        <button
          className="primary-btn"
          onClick={() => navigate("/login?role=worker")}
        >
          Join as a Worker
        </button>

      </section>

      {/* FOOTER */}
      <footer>

        <div className="footer-logo">
          <span className="logo-icon">
            S
          </span>

          Sahāyu
        </div>

        <p>
          Cooperative-powered services for stronger communities.
        </p>

        <div className="footer-bottom">
          © 2026 Sahāyu · Built for SIH 2026
        </div>

      </footer>

    </div>
  );
}

function App() {
  return (
    <BrowserRouter>

      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/customer"
          element={<Customer />}
        />

        <Route
          path="/worker"
          element={<Worker />}
        />

        <Route
          path="/worker/verification"
          element={<WorkerVerification />}
        />

        <Route
          path="/worker-verification"
          element={<WorkerVerification />}
        />

        <Route
          path="/worker-profile"
          element={<WorkerProfile />}
        />

        <Route
          path="/worker/profile"
          element={<WorkerProfile />}
        />

        <Route
          path="/admin"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/*"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/workers"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/verifications"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/bookings"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/payments"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/gullak"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/services"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/reviews"
          element={<AdminDashboard />}
        />

        <Route
          path="/workers"
          element={<Workers />}
        />

        <Route
          path="/booking"
          element={<Booking />}
        />

        <Route
          path="/my-bookings"
          element={<MyBookings />}
        />

        <Route
          path="/live-demo"
          element={<PresentationMode />}
        />

        <Route
          path="/presentation"
          element={<PresentationMode />}
        />

        <Route
          path="/demo"
          element={<PresentationMode />}
        />

        <Route
          path="/live-split-demo"
          element={<PresentationMode />}
        />

        <Route
          path="/split-demo"
          element={<PresentationMode />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;