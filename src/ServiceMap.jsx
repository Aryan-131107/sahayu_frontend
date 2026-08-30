import { useState } from "react";
import "./App.css";

function ServiceMap({
  customerLocation = "Civil Lines, Jabalpur",
  customerCoords = { lat: 23.1815, lon: 79.9864 },
  worker = null,
  allWorkers = [],
  onSelectWorker = null,
}) {
  const [showTracker, setShowTracker] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const selectedWorker = worker || (allWorkers.length > 0 ? allWorkers[0] : null);

  const distanceKm =
    selectedWorker?.distance_km !== undefined && selectedWorker?.distance_km !== null
      ? Number(selectedWorker.distance_km).toFixed(1)
      : "1.8";

  const etaMinutes = Math.max(3, Math.round(Number(distanceKm) * 4));

  return (
    <div className="service-map-container">
      <div className="service-map-header">
        <div className="service-map-title">
          <span className="map-badge">🗺️ LIVE SERVICE RADAR</span>
          <h3>Local Worker Proximity Map</h3>
          <p>
            Showing verified cooperative service providers near{" "}
            <strong>{customerLocation}</strong>
          </p>
        </div>

        <div className="service-map-actions">
          {selectedWorker && (
            <button
              className="primary-btn track-worker-btn"
              onClick={() => setShowTracker(true)}
            >
              🚗 Track Worker ({distanceKm} km)
            </button>
          )}
        </div>
      </div>

      {/* Interactive Map Visual */}
      <div className="map-canvas-wrapper">
        <svg
          className="map-vector-canvas"
          viewBox="0 0 800 360"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <defs>
            {/* Grid pattern */}
            <pattern
              id="map-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(29, 107, 85, 0.08)"
                strokeWidth="1"
              />
            </pattern>

            {/* Radial glow for radar effect */}
            <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1d765c" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#1d765c" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#1d765c" stopOpacity="0" />
            </radialGradient>

            {/* Gradient for route line */}
            <linearGradient id="route-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1d765c" />
              <stop offset="50%" stopColor="#2db58e" />
              <stop offset="100%" stopColor="#e5a824" />
            </linearGradient>
          </defs>

          {/* Map background with roads and zones */}
          <rect width="800" height="360" fill="#f2f7f4" />
          <rect width="800" height="360" fill="url(#map-grid)" />

          {/* Styled City Neighborhood Roads */}
          <path
            d="M 0 120 Q 250 160 500 110 T 800 140"
            fill="none"
            stroke="#e0ece6"
            strokeWidth="24"
            strokeLinecap="round"
          />
          <path
            d="M 0 120 Q 250 160 500 110 T 800 140"
            fill="none"
            stroke="#ffffff"
            strokeWidth="16"
            strokeLinecap="round"
          />

          <path
            d="M 180 0 Q 220 180 340 360"
            fill="none"
            stroke="#e0ece6"
            strokeWidth="20"
            strokeLinecap="round"
          />
          <path
            d="M 180 0 Q 220 180 340 360"
            fill="none"
            stroke="#ffffff"
            strokeWidth="12"
            strokeLinecap="round"
          />

          <path
            d="M 520 0 Q 480 180 620 360"
            fill="none"
            stroke="#e0ece6"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M 520 0 Q 480 180 620 360"
            fill="none"
            stroke="#ffffff"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Green zones / Parks */}
          <path
            d="M 60 40 Q 120 30 140 90 T 50 100 Z"
            fill="#dff0e7"
            stroke="#c8e4d6"
            strokeWidth="1.5"
          />
          <text x="75" y="70" fill="#2d6f56" fontSize="10" fontWeight="600">
            Civic Park
          </text>

          <path
            d="M 640 220 Q 720 200 760 270 T 630 310 Z"
            fill="#dff0e7"
            stroke="#c8e4d6"
            strokeWidth="1.5"
          />
          <text x="660" y="265" fill="#2d6f56" fontSize="10" fontWeight="600">
            South Gardens
          </text>

          {/* Customer Location: Fixed at (260, 210) */}
          <circle cx="260" cy="210" r="80" fill="url(#radar-glow)" />
          <circle
            cx="260"
            cy="210"
            r="38"
            fill="none"
            stroke="#1d765c"
            strokeWidth="1"
            strokeDasharray="4 4"
            className="radar-pulse"
          />

          {/* Route path between Customer (260, 210) and Selected Worker (560, 130) */}
          {selectedWorker && (
            <>
              <path
                d="M 260 210 Q 410 230 560 130"
                fill="none"
                stroke="#1d765c"
                strokeWidth="4"
                strokeDasharray="6 6"
                className="animated-route-line"
              />
              {/* Midpoint distance badge on map */}
              <g transform="translate(390, 165)">
                <rect
                  x="-45"
                  y="-14"
                  width="90"
                  height="28"
                  rx="14"
                  fill="#17352d"
                  filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
                />
                <text
                  x="0"
                  y="4"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  📍 {distanceKm} km · {etaMinutes}m
                </text>
              </g>
            </>
          )}

          {/* Other nearby worker pins */}
          {allWorkers.map((w, idx) => {
            if (selectedWorker && w.worker_id === selectedWorker.worker_id) {
              return null; // Rendered separately
            }
            // Spread pins organically around the map
            const pinPositions = [
              { x: 500, y: 80 },
              { x: 680, y: 150 },
              { x: 440, y: 280 },
              { x: 150, y: 250 },
              { x: 120, y: 140 },
            ];
            const pos = pinPositions[idx % pinPositions.length];

            return (
              <g
                key={w.worker_id}
                transform={`translate(${pos.x}, ${pos.y})`}
                style={{ cursor: "pointer" }}
                onClick={() => onSelectWorker && onSelectWorker(w)}
              >
                <circle cx="0" cy="0" r="16" fill="#ffffff" stroke="#1d765c" strokeWidth="2" />
                <text x="0" y="4" fontSize="12" textAnchor="middle">
                  👨‍🔧
                </text>
                <rect
                  x="-35"
                  y="18"
                  width="70"
                  height="18"
                  rx="6"
                  fill="#ffffff"
                  stroke="#dfe9e4"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="30"
                  fontSize="9"
                  fontWeight="700"
                  fill="#17352d"
                  textAnchor="middle"
                >
                  {w.name?.split(" ")[0]} ({w.distance_km ? `${Number(w.distance_km).toFixed(1)}k` : "near"})
                </text>
              </g>
            );
          })}

          {/* Selected Worker Pin: at (560, 130) */}
          {selectedWorker && (
            <g transform="translate(560, 130)">
              <circle
                cx="0"
                cy="0"
                r="28"
                fill="#e3f3ea"
                stroke="#1d765c"
                strokeWidth="2"
                className="radar-pulse"
              />
              <circle cx="0" cy="0" r="20" fill="#1d765c" />
              <text x="0" y="6" fontSize="16" textAnchor="middle">
                👨‍🔧
              </text>

              {/* Tooltip callout for selected worker */}
              <g transform="translate(0, -32)">
                <rect
                  x="-70"
                  y="-22"
                  width="140"
                  height="26"
                  rx="8"
                  fill="#17352d"
                  stroke="#1d765c"
                  strokeWidth="1.5"
                />
                <text
                  x="0"
                  y="-5"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {selectedWorker.name} ({selectedWorker.relevant_skill || "Worker"})
                </text>
              </g>
            </g>
          )}

          {/* Customer Pin: at (260, 210) */}
          <g transform="translate(260, 210)">
            <circle cx="0" cy="0" r="18" fill="#e53935" />
            <circle cx="0" cy="0" r="6" fill="#ffffff" />
            <g transform="translate(0, -26)">
              <rect
                x="-55"
                y="-18"
                width="110"
                height="22"
                rx="6"
                fill="#ffffff"
                stroke="#e53935"
                strokeWidth="1.5"
              />
              <text
                x="0"
                y="-3"
                fill="#c62828"
                fontSize="10"
                fontWeight="800"
                textAnchor="middle"
              >
                📍 Your Location
              </text>
            </g>
          </g>
        </svg>

        {/* Floating Map Controls */}
        <div className="map-floating-controls">
          <button
            type="button"
            className="map-ctrl-btn"
            title="Zoom In"
            onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
          >
            +
          </button>
          <button
            type="button"
            className="map-ctrl-btn"
            title="Zoom Out"
            onClick={() => setZoomLevel((z) => Math.max(0.9, z - 0.1))}
          >
            −
          </button>
          <button
            type="button"
            className="map-ctrl-btn"
            title="Recenter"
            onClick={() => setZoomLevel(1)}
          >
            🎯
          </button>
        </div>

        {/* Map Legend Banner */}
        <div className="map-legend-bar">
          <span>📍 <strong>Customer:</strong> {customerLocation} ({customerCoords.lat.toFixed(4)}, {customerCoords.lon.toFixed(4)})</span>
          {selectedWorker && (
            <span>
              👨‍🔧 <strong>Worker:</strong> {selectedWorker.name} · {distanceKm} km away · ~{etaMinutes} min arrival
            </span>
          )}
        </div>
      </div>

      {/* Live Worker Tracking Modal Drawer */}
      {showTracker && selectedWorker && (
        <div className="tracker-modal-overlay" onClick={() => setShowTracker(false)}>
          <div className="tracker-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="tracker-header">
              <div>
                <span className="live-pill">● LIVE TRACKING</span>
                <h2>{selectedWorker.name} is on the radar</h2>
                <p>{selectedWorker.relevant_skill || "Service Professional"} · Jabalpur Cooperative Zone</p>
              </div>
              <button className="tracker-close-btn" onClick={() => setShowTracker(false)}>
                ✕
              </button>
            </div>

            <div className="tracker-stats-grid">
              <div className="tracker-stat">
                <small>Estimated Arrival</small>
                <strong>~{etaMinutes} Minutes</strong>
              </div>
              <div className="tracker-stat">
                <small>Distance</small>
                <strong>{distanceKm} km away</strong>
              </div>
              <div className="tracker-stat">
                <small>Worker Rating</small>
                <strong>⭐ {selectedWorker.average_rating ? Number(selectedWorker.average_rating).toFixed(1) : "4.9"}</strong>
              </div>
              <div className="tracker-stat">
                <small>Contact Status</small>
                <strong style={{ color: "#1d765c" }}>📞 Direct Line Ready</strong>
              </div>
            </div>

            <div className="tracker-step-card">
              <div className="tracker-step active">
                <span className="step-dot">1</span>
                <div>
                  <strong>Worker Assigned & Notified</strong>
                  <p>Cooperative dispatcher matched worker near your zone.</p>
                </div>
              </div>
              <div className="tracker-step active">
                <span className="step-dot">2</span>
                <div>
                  <strong>Route Calculated ({distanceKm} km)</strong>
                  <p>Optimized route via Civil Lines & Napier Town roads.</p>
                </div>
              </div>
              <div className="tracker-step">
                <span className="step-dot">3</span>
                <div>
                  <strong>Service Tools & Equipment Prepared</strong>
                  <p>Worker verified standard toolkit for your requested service.</p>
                </div>
              </div>
            </div>

            <div className="tracker-footer">
              <button
                className="secondary-btn"
                onClick={() => alert(`Calling ${selectedWorker.name} via Sahāyu secure line: ${selectedWorker.phone || "+91 91234 56700"}`)}
              >
                📞 Call {selectedWorker.name.split(" ")[0]}
              </button>
              <button className="primary-btn" onClick={() => setShowTracker(false)}>
                Back to Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServiceMap;
