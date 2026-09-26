import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import plumbing from "./assets/plumbing.png";
import electrical from "./assets/electrical.png";
import cleaning from "./assets/cleaning.png";
import carpentry from "./assets/carpentry.png";
import gardening from "./assets/gardening.png";
import care from "./assets/care.png";

const SLIDER_SERVICES = [
  {
    id: "plumbing",
    name: "Plumbing",
    tagline: "Repairs, tap installation & leak maintenance",
    description: "Verified cooperative plumbers available for immediate doorstep assistance.",
    icon: "🔧",
    image: plumbing,
    badge: "Cooperative Plumbers",
    rating: "4.9",
    priceFloor: "₹199 Labour Floor",
  },
  {
    id: "electrical",
    name: "Electrical",
    tagline: "Safe wiring, fixture replacement & diagnostics",
    description: "ITI-certified electricians ensuring complete home electrical safety.",
    icon: "⚡",
    image: electrical,
    badge: "Certified Wiremen",
    rating: "4.8",
    priceFloor: "₹199 Labour Floor",
  },
  {
    id: "cleaning",
    name: "Cleaning",
    tagline: "Professional deep home & kitchen sanitization",
    description: "Trained hygiene specialists using eco-safe materials for sparkling homes.",
    icon: "🧹",
    image: cleaning,
    badge: "Sanitation Specialists",
    rating: "4.9",
    priceFloor: "₹199 Labour Floor",
  },
  {
    id: "carpentry",
    name: "Carpentry",
    tagline: "Furniture repair, locks & custom woodwork",
    description: "Master woodworkers for hinge repairs, lock fitting, and cabinetry.",
    icon: "🪚",
    image: carpentry,
    badge: "Cooperative Carpenters",
    rating: "4.8",
    priceFloor: "₹199 Labour Floor",
  },
  {
    id: "gardening",
    name: "Gardening",
    tagline: "Lawn mowing, hedge shaping & plant nourishment",
    description: "Skilled community gardeners keeping your lawns green, healthy and manicured.",
    icon: "🌱",
    image: gardening,
    badge: "Landscaping Experts",
    rating: "4.9",
    priceFloor: "₹199 Labour Floor",
  },
  {
    id: "care",
    name: "Care Services",
    tagline: "Compassionate elder assistance & family support",
    description: "Background-verified cooperative caregivers providing dedicated household care.",
    icon: "❤️",
    image: care,
    badge: "Trusted Caregivers",
    rating: "4.9",
    priceFloor: "₹199 Labour Floor",
  },
];

export default function ServiceHeroSlider() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(null);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SLIDER_SERVICES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? SLIDER_SERVICES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % SLIDER_SERVICES.length);
  };

  const handleServiceClick = (serviceName) => {
    const isCustomerAuth = sessionStorage.getItem("sahayu_customer_auth") === "true";
    if (isCustomerAuth) {
      navigate(`/customer?service=${encodeURIComponent(serviceName)}`);
    } else {
      navigate(`/login?role=customer&redirect=${encodeURIComponent(`/customer?service=${encodeURIComponent(serviceName)}`)}`);
    }
  };

  const activeService = SLIDER_SERVICES[currentIndex];

  // Touch swipe support for mobile
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) handleNext();
    else if (diff < -50) handlePrev();
    touchStartX.current = null;
  };

  return (
    <div
      className="service-hero-slider-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="slider-main-card">
        {/* Left Info Column */}
        <div className="slider-info-pane">
          <div className="slider-badge-row">
            <span className="slider-pill">
              {activeService.icon} {activeService.badge}
            </span>
            <span className="slider-rating-pill">⭐ {activeService.rating} Rating</span>
          </div>

          <h2 className="slider-service-title">{activeService.name} Services</h2>
          <p className="slider-tagline">{activeService.tagline}</p>
          <p className="slider-desc">{activeService.description}</p>

          <div className="slider-feature-pills">
            <span className="slider-feat">✓ 100% Labour Floor ({activeService.priceFloor})</span>
            <span className="slider-feat">✓ e-Shram Verified</span>
            <span className="slider-feat">✓ 72h Workmanship Protection</span>
          </div>

          <div className="slider-action-row">
            <button
              className="primary-btn slider-book-btn"
              onClick={() => handleServiceClick(activeService.name)}
            >
              Book {activeService.name} →
            </button>
            <button
              className="secondary-btn slider-explore-btn"
              onClick={() => {
                const el = document.getElementById("services");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            >
              All Services
            </button>
          </div>
        </div>

        {/* Right Image Visual Column */}
        <div className="slider-visual-pane">
          <div className="slider-image-frame" onClick={() => handleServiceClick(activeService.name)}>
            <img
              key={activeService.id}
              src={activeService.image}
              alt={activeService.name}
              className="slider-active-image"
            />
            <div className="slider-image-overlay">
              <div className="slider-overlay-content">
                <span className="slider-overlay-icon">{activeService.icon}</span>
                <div>
                  <strong>{activeService.name}</strong>
                  <small>Click to book verified technician</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Arrow Controls */}
        <button
          className="slider-nav-arrow prev"
          onClick={handlePrev}
          aria-label="Previous service"
          title="Previous service"
        >
          ‹
        </button>
        <button
          className="slider-nav-arrow next"
          onClick={handleNext}
          aria-label="Next service"
          title="Next service"
        >
          ›
        </button>
      </div>

      {/* Interactive Dots Indicator */}
      <div className="slider-dots-container">
        {SLIDER_SERVICES.map((s, idx) => (
          <button
            key={s.id}
            className={`slider-dot-btn ${idx === currentIndex ? "active" : ""}`}
            onClick={() => setCurrentIndex(idx)}
            title={`View ${s.name}`}
            aria-label={`Slide ${idx + 1}: ${s.name}`}
          >
            <span className="dot-icon">{s.icon}</span>
            <span className="dot-name">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
