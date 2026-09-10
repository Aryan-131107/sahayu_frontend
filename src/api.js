/**
 * Central API Client for Sahāyu
 * Connects to the FastAPI backend with automatic proxy fallback for Vercel/production CORS compatibility.
 */

let cachedWorkingBaseUrl = null;

function getApiBaseCandidates() {
  const envUrl = import.meta.env.VITE_API_URL;
  const list = [];

  // 1. If running in browser and on a non-localhost domain (e.g. Vercel),
  // prioritize the same-origin /api rewrite to avoid CORS preflight rejection.
  const isBrowser = typeof window !== "undefined";
  const isLocalhost =
    isBrowser &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  if (!isLocalhost && isBrowser) {
    list.push("/api");
  }

  // 2. User environment variable
  if (typeof envUrl === "string" && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim().replace(/\/+$/, "");
    if (!list.includes(trimmed)) {
      list.push(trimmed);
    }
  }

  // 3. Direct Render backend
  const directRender = "https://sahayu-backend-8.onrender.com";
  if (!list.includes(directRender)) {
    list.push(directRender);
  }

  // 4. Local / Vite proxy fallback
  if (!list.includes("/api")) {
    list.push("/api");
  }

  return list;
}

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://sahayu-backend-8.onrender.com";

async function request(endpoint, options = {}) {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const candidates = cachedWorkingBaseUrl
    ? [cachedWorkingBaseUrl, ...getApiBaseCandidates().filter((c) => c !== cachedWorkingBaseUrl)]
    : getApiBaseCandidates();

  let lastError = null;

  for (const base of candidates) {
    const url = `${base}${cleanEndpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      let data = null;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { message: text } : null;
      }

      if (!response.ok) {
        const message =
          data?.detail ||
          (Array.isArray(data?.detail)
            ? data.detail.map((d) => d.msg || JSON.stringify(d)).join(", ")
            : null) ||
          data?.message ||
          `Request failed with status ${response.status}`;
        const err = new Error(message);
        err.status = response.status;
        err.data = data;
        throw err;
      }

      // Cache the base URL that succeeded
      cachedWorkingBaseUrl = base;
      return data;
    } catch (error) {
      lastError = error;
      // If error is an application/HTTP error (status 400, 404, 422, etc.), do not retry different base URL
      if (error.status && error.status !== 404) {
        throw error;
      }
      // If network/CORS error ("Failed to fetch"), continue loop to try next candidate
      console.warn(`[Sahāyu API] Base URL "${base}" failed. Trying next fallback candidate...`);
    }
  }

  throw new Error(
    lastError?.message ||
      "Failed to connect to backend server. Please verify backend availability.",
    { cause: lastError }
  );
}

// System Health Check
export const getHealth = () => request("/health");

// Services & Skills API
export const getServices = () => request("/services");
export const getService = (serviceId) => request(`/services/${serviceId}`);
export const createService = ({ service, description, base_price, skill_id }) =>
  request("/services", {
    method: "POST",
    body: JSON.stringify({
      service: String(service),
      description: String(description || ""),
      base_price: Number(base_price),
      skill_id: Number(skill_id),
    }),
  });
export const getSkills = () => request("/skills");

// Workers API
export const getWorkers = (activeOnly = true) =>
  request(`/workers?active_only=${activeOnly}`);

export const getWorker = (workerId) => request(`/workers/${workerId}`);

export const searchWorkers = (skill) =>
  request(`/workers/search?skill=${encodeURIComponent(skill)}`);

export const getRecommendedWorkers = ({
  service_id,
  latitude,
  longitude,
  top_n = 5,
}) => {
  const params = new URLSearchParams({
    service_id: String(service_id),
    latitude: String(latitude),
    longitude: String(longitude),
    top_n: String(top_n),
  });
  return request(`/workers/recommend?${params.toString()}`);
};

export const updateWorkerAvailability = (workerId, isAvailable) =>
  request(`/workers/${workerId}/availability`, {
    method: "PATCH",
    body: JSON.stringify({ is_available: Boolean(isAvailable) }),
  });

export const updateWorkerProfile = (workerId, updateData) =>
  request(`/workers/${workerId}`, {
    method: "PATCH",
    body: JSON.stringify(updateData),
  });

// Customer API
export const getCustomer = (customerId) => request(`/customers/${customerId}`);
export const createCustomer = (customerData) =>
  request("/customers", {
    method: "POST",
    body: JSON.stringify(customerData),
  });

// Bookings API
export const createBooking = ({
  customer_id,
  worker_id,
  service_id,
  service_lat,
  service_lon,
  amount,
}) =>
  request("/bookings", {
    method: "POST",
    body: JSON.stringify({
      customer_id: Number(customer_id),
      worker_id: Number(worker_id),
      service_id: Number(service_id),
      service_lat:
        service_lat !== undefined && service_lat !== null
          ? Number(service_lat)
          : undefined,
      service_lon:
        service_lon !== undefined && service_lon !== null
          ? Number(service_lon)
          : undefined,
      amount: Number(amount),
    }),
  });

export const getBooking = (bookingId) => request(`/bookings/${bookingId}`);

export const getCustomerBookings = (customerId = 1) =>
  request(`/bookings/customer/${customerId}`);

export const getWorkerBookings = (workerId) =>
  request(`/bookings/worker/${workerId}`);

export const acceptBooking = (bookingId) =>
  request(`/bookings/${bookingId}/accept`, {
    method: "PATCH",
  });

export const rejectBooking = (bookingId) =>
  request(`/bookings/${bookingId}/reject`, {
    method: "PATCH",
  });

export const startBooking = (bookingId) =>
  request(`/bookings/${bookingId}/start`, {
    method: "PATCH",
  });

export const completeBooking = (bookingId) =>
  request(`/bookings/${bookingId}/complete`, {
    method: "PATCH",
  });

export const cancelBooking = (bookingId) =>
  request(`/bookings/${bookingId}/cancel`, {
    method: "PATCH",
  });

export const resetDemo = async (bookingId) => {
  try {
    return await request("/demo/reset", {
      method: "POST",
      body: JSON.stringify(
        bookingId
          ? { booking_id: Number(bookingId), order_id: Number(bookingId) }
          : {}
      ),
    });
  } catch {
    try {
      return await request(`/bookings/${bookingId}/reset`, {
        method: "POST",
      });
    } catch {
      return { status: "ASSIGNED", booking_id: Number(bookingId) };
    }
  }
};

// Real Backend-Driven OTP Verification Handshakes
export const verifyStartOtp = ({ booking_id, otp }) =>
  request("/bookings/verify-start-otp", {
    method: "POST",
    body: JSON.stringify({
      booking_id: Number(booking_id),
      otp: String(otp).trim(),
    }),
  });

export const verifyEndOtp = ({ booking_id, otp }) =>
  request("/bookings/verify-end-otp", {
    method: "POST",
    body: JSON.stringify({
      booking_id: Number(booking_id),
      otp: String(otp).trim(),
    }),
  });

export const getWelfareFundSummary = (societyId = 1) =>
  request(`/bookings/welfare-fund/summary?society_id=${societyId}`);

// Reviews API
export const getWorkerReviews = (workerId) =>
  request(`/workers/${workerId}/reviews`);

export const createReview = ({ booking_id, customer_id, rating, review }) =>
  request("/reviews", {
    method: "POST",
    body: JSON.stringify({
      booking_id: Number(booking_id),
      customer_id: Number(customer_id),
      rating: Number(rating),
      review: String(review || ""),
    }),
  });

// Verification State Management (Demo SIH Prototype Sync)
export const getStoredVerification = (workerId) => {
  try {
    const raw = localStorage.getItem(`sahayu_verification_${workerId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredVerification = (workerId, data) => {
  try {
    localStorage.setItem(`sahayu_verification_${workerId}`, JSON.stringify(data));
  } catch {
    // Ignore localStorage errors
  }
};

// Quotation Management (On-Site Inspection & Additional Work)
export const TRADE_RATE_CARDS = {
  Painting: {
    skill: "Cooperative Painter / Surface Specialist",
    items: [
      { id: "pnt_putty", name: "Wall Putty & Surface Leveling (per 100 sq ft)", price: 350, category: "Painting" },
      { id: "pnt_primer", name: "Waterproof Primer Undercoat (per room)", price: 280, category: "Painting" },
      { id: "pnt_emulsion", name: "Premium Acrylic Emulsion (2-Coat Application)", price: 450, category: "Painting" },
      { id: "pnt_damp", name: "Ceiling Damp & Stain Barrier Treatment", price: 320, category: "Painting" },
      { id: "pnt_prep", name: "Masking Tape & Edge Precision Prep", price: 150, category: "Painting" },
    ],
  },
  Electrical: {
    skill: "Cooperative Electrician / Wireman",
    items: [
      { id: "elec_cap", name: "Ceiling Fan Heavy Capacitor Replacement", price: 150, category: "Electrical" },
      { id: "elec_motor", name: "Fan Motor Rewinding & Coil Repair", price: 350, category: "Electrical" },
      { id: "elec_switch", name: "Modular Switch & 16A Socket Replacement", price: 120, category: "Electrical" },
      { id: "elec_mcb", name: "Main Panel Heavy MCB Breaker Replacement", price: 280, category: "Electrical" },
      { id: "elec_wire", name: "Conduit Wire Routing & Patching (per 5m)", price: 140, category: "Electrical" },
    ],
  },
  Plumbing: {
    skill: "Cooperative Plumber / Pipe Fitter",
    items: [
      { id: "plm_joint", name: "Copper / CPVC Pipe Joint Seal & Weld", price: 180, category: "Plumbing" },
      { id: "plm_valve", name: "Heavy Brass Gate Valve Replacement", price: 220, category: "Plumbing" },
      { id: "plm_drain", name: "Chemical Drain Declogging & Trap Cleaning", price: 160, category: "Plumbing" },
      { id: "plm_tap", name: "Ceramic Tap Spindle & Cartridge Replacement", price: 140, category: "Plumbing" },
      { id: "plm_tank", name: "Overhead Water Tank Float Ball Valve Repair", price: 260, category: "Plumbing" },
    ],
  },
  Carpentry: {
    skill: "Cooperative Carpenter / Woodworker",
    items: [
      { id: "crp_hinge", name: "Concealed Hydraulic Hinge Replacement (Pair)", price: 190, category: "Carpentry" },
      { id: "crp_lock", name: "Door Lock Cylinder & Latch Mechanism Repair", price: 250, category: "Carpentry" },
      { id: "crp_drawer", name: "Drawer Telescopic Channel Fitting (Set)", price: 220, category: "Carpentry" },
      { id: "crp_plane", name: "Wood Planing & Edge Trimming", price: 160, category: "Carpentry" },
      { id: "crp_bracket", name: "Wooden Cabinet Corner Reinforcement", price: 130, category: "Carpentry" },
    ],
  },
  Appliance: {
    skill: "Appliance & AC Technician",
    items: [
      { id: "app_gas", name: "Refrigerant Gas Top-Up & Pressure Check", price: 450, category: "Appliance" },
      { id: "app_cap", name: "Heavy Compressor Starting Capacitor (50uF)", price: 320, category: "Appliance" },
      { id: "app_jet", name: "Drain Pipe Flush & Blower Jet Cleaning", price: 200, category: "Appliance" },
      { id: "app_thermo", name: "Thermostat Sensor Replacement", price: 240, category: "Appliance" },
      { id: "app_mount", name: "Anti-Vibration Rubber Mount Kit", price: 150, category: "Appliance" },
    ],
  },
  Cleaning: {
    skill: "Sanitation & Deep Cleaning Specialist",
    items: [
      { id: "cln_floor", name: "Deep Floor Scrubbing & Stain Extraction (per room)", price: 250, category: "Cleaning" },
      { id: "cln_bath", name: "Sanitary Ware Acid-Free Descaling & Polish", price: 180, category: "Cleaning" },
      { id: "cln_chimney", name: "Kitchen Chimney & Degreasing Treatment", price: 350, category: "Cleaning" },
      { id: "cln_balcony", name: "Balcony High-Pressure Wash", price: 160, category: "Cleaning" },
    ],
  },
  Masonry: {
    skill: "Mason & Tile Specialist",
    items: [
      { id: "msn_grout", name: "Tile Grouting & Waterproof Sealing (per 50 sq ft)", price: 220, category: "Masonry" },
      { id: "msn_crack", name: "Wall Crack V-Groove Repair & Plastering", price: 280, category: "Masonry" },
      { id: "msn_anchor", name: "Door Frame Anchor Fastener Re-setting", price: 190, category: "Masonry" },
    ],
  },
};

export const RATE_CARD_ITEMS = [
  ...TRADE_RATE_CARDS.Electrical.items,
  ...TRADE_RATE_CARDS.Plumbing.items,
  ...TRADE_RATE_CARDS.Painting.items,
];

export function getRateCardForBooking(booking) {
  if (!booking) {
    return {
      category: "Electrical",
      tradeTitle: "Electrical Service",
      skillName: TRADE_RATE_CARDS.Electrical.skill,
      items: TRADE_RATE_CARDS.Electrical.items,
    };
  }

  const text = `${booking.service_name || ""} ${booking.service || ""} ${booking.category || ""} ${booking.skill_name || ""}`.toLowerCase();

  if (text.includes("paint") || text.includes("putty") || text.includes("wall")) {
    return {
      category: "Painting",
      tradeTitle: "Painting & Wall Surface Treatment",
      skillName: TRADE_RATE_CARDS.Painting.skill,
      items: TRADE_RATE_CARDS.Painting.items,
    };
  }
  if (text.includes("plumb") || text.includes("leak") || text.includes("pipe") || text.includes("tap") || text.includes("drain") || text.includes("tank")) {
    return {
      category: "Plumbing",
      tradeTitle: "Plumbing & Water Systems",
      skillName: TRADE_RATE_CARDS.Plumbing.skill,
      items: TRADE_RATE_CARDS.Plumbing.items,
    };
  }
  if (text.includes("carpent") || text.includes("wood") || text.includes("furn") || text.includes("door") || text.includes("lock") || text.includes("hinge")) {
    return {
      category: "Carpentry",
      tradeTitle: "Carpentry & Furniture Fitting",
      skillName: TRADE_RATE_CARDS.Carpentry.skill,
      items: TRADE_RATE_CARDS.Carpentry.items,
    };
  }
  if (text.includes("ac") || text.includes("cool") || text.includes("appliance") || text.includes("refriger") || text.includes("wash") || text.includes("micro")) {
    return {
      category: "Appliance",
      tradeTitle: "Appliance & Cooling Systems",
      skillName: TRADE_RATE_CARDS.Appliance.skill,
      items: TRADE_RATE_CARDS.Appliance.items,
    };
  }
  if (text.includes("clean") || text.includes("sanit") || text.includes("pest") || text.includes("deep clean")) {
    return {
      category: "Cleaning",
      tradeTitle: "Sanitation & Deep Cleaning",
      skillName: TRADE_RATE_CARDS.Cleaning.skill,
      items: TRADE_RATE_CARDS.Cleaning.items,
    };
  }
  if (text.includes("mason") || text.includes("tile") || text.includes("civil") || text.includes("brick")) {
    return {
      category: "Masonry",
      tradeTitle: "Masonry & Civil Works",
      skillName: TRADE_RATE_CARDS.Masonry.skill,
      items: TRADE_RATE_CARDS.Masonry.items,
    };
  }

  // Default to Electrical
  return {
    category: "Electrical",
    tradeTitle: "Electrical Trade & Fixtures",
    skillName: TRADE_RATE_CARDS.Electrical.skill,
    items: TRADE_RATE_CARDS.Electrical.items,
  };
}

export const getBookingQuotation = (bookingId) => {
  try {
    const raw = localStorage.getItem(`sahayu_quotation_${bookingId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveBookingQuotation = (bookingId, quoteData) => {
  try {
    localStorage.setItem(`sahayu_quotation_${bookingId}`, JSON.stringify(quoteData));
  } catch {
    // Ignore localStorage errors
  }
};

// Post-Completion Payment State Management
export const getBookingPayment = (bookingId) => {
  try {
    const raw = localStorage.getItem(`sahayu_payment_${bookingId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveBookingPayment = (bookingId, paymentData) => {
  try {
    localStorage.setItem(`sahayu_payment_${bookingId}`, JSON.stringify(paymentData));
  } catch {
    // Ignore localStorage errors
  }
};

// 72-Hour Workmanship Guarantee State Management
export const getBookingWarranty = (bookingId) => {
  try {
    const raw = localStorage.getItem(`sahayu_warranty_${bookingId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveBookingWarranty = (bookingId, warrantyData) => {
  try {
    localStorage.setItem(`sahayu_warranty_${bookingId}`, JSON.stringify(warrantyData));
  } catch {
    // Ignore localStorage errors
  }
};

export const clearDemoBookingState = (bookingId) => {
  try {
    localStorage.removeItem(`sahayu_quotation_${bookingId}`);
    localStorage.removeItem(`sahayu_payment_${bookingId}`);
    localStorage.removeItem(`sahayu_warranty_${bookingId}`);
  } catch {
    // Ignore localStorage errors
  }
};

// Admin and Gullak APIs
export const getAdminStats = () => request("/admin/stats");
export const getAdminPayments = () => request("/admin/payments");
export const getGullakSummary = async () => {
  try {
    return await request("/admin/gullak-summary");
  } catch {
    try {
      return await request("/admin/payments");
    } catch {
      return null;
    }
  }
};

export const getAllStoredVerifications = () => {
  try {
    const result = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("sahayu_verification_")) {
        const id = key.replace("sahayu_verification_", "");
        result[id] = JSON.parse(localStorage.getItem(key) || "{}");
      }
    }
    return result;
  } catch {
    return {};
  }
};
