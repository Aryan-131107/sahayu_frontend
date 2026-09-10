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

export const createDemoBooking = async () => {
  try {
    return await request("/demo/new-booking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    try {
      return await request("/demo/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      const workers = await getWorkers(false).catch(() => []);
      const workerId = workers.length > 0 ? workers[0].worker_id : 11;
      return await createBooking({
        customer_id: 1,
        worker_id: workerId,
        service_id: 1,
        service_lat: 23.1815,
        service_lon: 79.9864,
        amount: 239,
      });
    }
  }
};

export const DEMO_SCENARIOS = [
  {
    id: "DEMO-001",
    booking_id: "DEMO-001",
    booking_reference: "DEMO-001",
    service_name: "Ceiling Fan Repair & Inspection",
    service_category: "Electrical",
    category: "Electrical",
    worker_id: 11,
    worker_name: "Arvind Gupta",
    worker_trade_skill: "Cooperative Electrician / Wireman",
    service_skill_required: "Cooperative Electrician / Wireman",
    address: "Civil Lines, Jabalpur",
    status: "ASSIGNED",
    amount: 239,
    base_price: 199,
    platform_fee: 30,
    gullak_fee: 10,
    start_otp: "4821",
    end_otp: "9134",
    completion_otp: "9134",
  },
  {
    id: "DEMO-002",
    booking_id: "DEMO-002",
    booking_reference: "DEMO-002",
    service_name: "Lawn Mowing & Garden Care",
    service_category: "Gardening",
    category: "Gardening",
    worker_id: 12,
    worker_name: "Ramesh Patel",
    worker_trade_skill: "Cooperative Landscaper / Gardener",
    service_skill_required: "Cooperative Landscaper / Gardener",
    address: "Vijay Nagar, Jabalpur",
    status: "ASSIGNED",
    amount: 239,
    base_price: 199,
    platform_fee: 30,
    gullak_fee: 10,
    start_otp: "4821",
    end_otp: "9134",
    completion_otp: "9134",
  },
  {
    id: "DEMO-003",
    booking_id: "DEMO-003",
    booking_reference: "DEMO-003",
    service_name: "Kitchen Sink Leak & Pipe Repair",
    service_category: "Plumbing",
    category: "Plumbing",
    worker_id: 13,
    worker_name: "Suresh Raikwar",
    worker_trade_skill: "Cooperative Plumber / Pipe Fitter",
    service_skill_required: "Cooperative Plumber / Pipe Fitter",
    address: "Wright Town, Jabalpur",
    status: "ASSIGNED",
    amount: 239,
    base_price: 199,
    platform_fee: 30,
    gullak_fee: 10,
    start_otp: "4821",
    end_otp: "9134",
    completion_otp: "9134",
  },
  {
    id: "DEMO-004",
    booking_id: "DEMO-004",
    booking_reference: "DEMO-004",
    service_name: "Door Hinge & Mortise Lock Repair",
    service_category: "Carpentry",
    category: "Carpentry",
    worker_id: 14,
    worker_name: "Mohan Vishwakarma",
    worker_trade_skill: "Cooperative Carpenter / Woodworker",
    service_skill_required: "Cooperative Carpenter / Woodworker",
    address: "Napier Town, Jabalpur",
    status: "ASSIGNED",
    amount: 239,
    base_price: 199,
    platform_fee: 30,
    gullak_fee: 10,
    start_otp: "4821",
    end_otp: "9134",
    completion_otp: "9134",
  },
  {
    id: "DEMO-005",
    booking_id: "DEMO-005",
    booking_reference: "DEMO-005",
    service_name: "Split AC Deep Cleaning & Filter Service",
    service_category: "Appliance",
    category: "Appliance",
    worker_id: 15,
    worker_name: "Imran Khan",
    worker_trade_skill: "Cooperative HVAC / RAC Technician",
    service_skill_required: "Cooperative HVAC / RAC Technician",
    address: "Gorakhpur, Jabalpur",
    status: "ASSIGNED",
    amount: 239,
    base_price: 199,
    platform_fee: 30,
    gullak_fee: 10,
    start_otp: "4821",
    end_otp: "9134",
    completion_otp: "9134",
  },
];

export const cycleDemoScenario = async (scenarioIndex) => {
  try {
    return await request("/demo/cycle-scenario", {
      method: "POST",
      body: JSON.stringify({ scenario_index: scenarioIndex }),
    });
  } catch {
    return null;
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
  Gardening: {
    skill: "Cooperative Landscaper / Gardener",
    tradeTitle: "Lawn Mowing & Garden Care",
    items: [
      { id: "g1", title: "Hedge Trimming & Shrub Shaping", name: "Hedge Trimming & Shrub Shaping", price: 150, category: "Gardening" },
      { id: "g2", title: "Lawn Aeration & Soil Enrichment", name: "Lawn Aeration & Soil Enrichment", price: 200, category: "Gardening" },
      { id: "g3", title: "Organic Weed Treatment", name: "Organic Weed Treatment", price: 120, category: "Gardening" },
      { id: "g4", title: "Green Waste Removal & Bagging", name: "Green Waste Removal & Bagging", price: 100, category: "Gardening" },
    ],
  },
  Painting: {
    skill: "Cooperative Painter / Surface Specialist",
    tradeTitle: "Painting & Wall Surface Treatment",
    items: [
      { id: "pnt_putty", title: "Wall Putty & Surface Leveling (per 100 sq ft)", name: "Wall Putty & Surface Leveling (per 100 sq ft)", price: 350, category: "Painting" },
      { id: "pnt_primer", title: "Waterproof Primer Undercoat (per room)", name: "Waterproof Primer Undercoat (per room)", price: 280, category: "Painting" },
      { id: "pnt_emulsion", title: "Premium Acrylic Emulsion (2-Coat Application)", name: "Premium Acrylic Emulsion (2-Coat Application)", price: 450, category: "Painting" },
      { id: "pnt_damp", title: "Ceiling Damp & Stain Barrier Treatment", name: "Ceiling Damp & Stain Barrier Treatment", price: 320, category: "Painting" },
      { id: "pnt_prep", title: "Masking Tape & Edge Precision Prep", name: "Masking Tape & Edge Precision Prep", price: 150, category: "Painting" },
    ],
  },
  Electrical: {
    skill: "Cooperative Electrician / Wireman",
    tradeTitle: "Electrical Trade & Fixtures",
    items: [
      { id: "elec_cap", title: "Ceiling Fan Heavy Capacitor Replacement", name: "Ceiling Fan Heavy Capacitor Replacement", price: 150, category: "Electrical" },
      { id: "elec_motor", title: "Fan Motor Rewinding & Coil Repair", name: "Fan Motor Rewinding & Coil Repair", price: 350, category: "Electrical" },
      { id: "elec_switch", title: "Modular Switch & 16A Socket Replacement", name: "Modular Switch & 16A Socket Replacement", price: 120, category: "Electrical" },
      { id: "elec_mcb", title: "Main Panel Heavy MCB Breaker Replacement", name: "Main Panel Heavy MCB Breaker Replacement", price: 280, category: "Electrical" },
      { id: "elec_wire", title: "Conduit Wire Routing & Patching (per 5m)", name: "Conduit Wire Routing & Patching (per 5m)", price: 140, category: "Electrical" },
    ],
  },
  Plumbing: {
    skill: "Cooperative Plumber / Pipe Fitter",
    tradeTitle: "Plumbing & Water Systems",
    items: [
      { id: "plm_joint", title: "Copper / CPVC Pipe Joint Seal & Weld", name: "Copper / CPVC Pipe Joint Seal & Weld", price: 180, category: "Plumbing" },
      { id: "plm_valve", title: "Heavy Brass Gate Valve Replacement", name: "Heavy Brass Gate Valve Replacement", price: 220, category: "Plumbing" },
      { id: "plm_drain", title: "Chemical Drain Declogging & Trap Cleaning", name: "Chemical Drain Declogging & Trap Cleaning", price: 160, category: "Plumbing" },
      { id: "plm_tap", title: "Ceramic Tap Spindle & Cartridge Replacement", name: "Ceramic Tap Spindle & Cartridge Replacement", price: 140, category: "Plumbing" },
      { id: "plm_tank", title: "Overhead Water Tank Float Ball Valve Repair", name: "Overhead Water Tank Float Ball Valve Repair", price: 260, category: "Plumbing" },
    ],
  },
  Carpentry: {
    skill: "Cooperative Carpenter / Woodworker",
    tradeTitle: "Carpentry & Furniture Fitting",
    items: [
      { id: "crp_hinge", title: "Concealed Hydraulic Hinge Replacement (Pair)", name: "Concealed Hydraulic Hinge Replacement (Pair)", price: 190, category: "Carpentry" },
      { id: "crp_lock", title: "Door Lock Cylinder & Latch Mechanism Repair", name: "Door Lock Cylinder & Latch Mechanism Repair", price: 250, category: "Carpentry" },
      { id: "crp_drawer", title: "Drawer Telescopic Channel Fitting (Set)", name: "Drawer Telescopic Channel Fitting (Set)", price: 220, category: "Carpentry" },
      { id: "crp_plane", title: "Wood Planing & Edge Trimming", name: "Wood Planing & Edge Trimming", price: 160, category: "Carpentry" },
      { id: "crp_bracket", title: "Wooden Cabinet Corner Reinforcement", name: "Wooden Cabinet Corner Reinforcement", price: 130, category: "Carpentry" },
    ],
  },
  Appliance: {
    skill: "Appliance & AC Technician",
    tradeTitle: "Appliance & Cooling Systems",
    items: [
      { id: "app_gas", title: "Refrigerant Gas Top-Up & Pressure Check", name: "Refrigerant Gas Top-Up & Pressure Check", price: 450, category: "Appliance" },
      { id: "app_cap", title: "Heavy Compressor Starting Capacitor (50uF)", name: "Heavy Compressor Starting Capacitor (50uF)", price: 320, category: "Appliance" },
      { id: "app_jet", title: "Drain Pipe Flush & Blower Jet Cleaning", name: "Drain Pipe Flush & Blower Jet Cleaning", price: 200, category: "Appliance" },
      { id: "app_thermo", title: "Thermostat Sensor Replacement", name: "Thermostat Sensor Replacement", price: 240, category: "Appliance" },
      { id: "app_mount", title: "Anti-Vibration Rubber Mount Kit", name: "Anti-Vibration Rubber Mount Kit", price: 150, category: "Appliance" },
    ],
  },
  Cleaning: {
    skill: "Sanitation & Deep Cleaning Specialist",
    tradeTitle: "Sanitation & Deep Cleaning",
    items: [
      { id: "cln_floor", title: "Deep Floor Scrubbing & Stain Extraction (per room)", name: "Deep Floor Scrubbing & Stain Extraction (per room)", price: 250, category: "Cleaning" },
      { id: "cln_bath", title: "Sanitary Ware Acid-Free Descaling & Polish", name: "Sanitary Ware Acid-Free Descaling & Polish", price: 180, category: "Cleaning" },
      { id: "cln_chimney", title: "Kitchen Chimney & Degreasing Treatment", name: "Kitchen Chimney & Degreasing Treatment", price: 350, category: "Cleaning" },
      { id: "cln_balcony", title: "Balcony High-Pressure Wash", name: "Balcony High-Pressure Wash", price: 160, category: "Cleaning" },
    ],
  },
  Masonry: {
    skill: "Mason & Tile Specialist",
    tradeTitle: "Masonry & Civil Works",
    items: [
      { id: "msn_grout", title: "Tile Grouting & Waterproof Sealing (per 50 sq ft)", name: "Tile Grouting & Waterproof Sealing (per 50 sq ft)", price: 220, category: "Masonry" },
      { id: "msn_crack", title: "Wall Crack V-Groove Repair & Plastering", name: "Wall Crack V-Groove Repair & Plastering", price: 280, category: "Masonry" },
      { id: "msn_anchor", title: "Door Frame Anchor Fastener Re-setting", name: "Door Frame Anchor Fastener Re-setting", price: 190, category: "Masonry" },
    ],
  },
};

export const RATE_CARD_CATALOG = {
  gardening: TRADE_RATE_CARDS.Gardening.items,
  electrical: TRADE_RATE_CARDS.Electrical.items,
  plumbing: TRADE_RATE_CARDS.Plumbing.items,
  painting: TRADE_RATE_CARDS.Painting.items,
  carpentry: TRADE_RATE_CARDS.Carpentry.items,
  appliance: TRADE_RATE_CARDS.Appliance.items,
  cleaning: TRADE_RATE_CARDS.Cleaning.items,
  masonry: TRADE_RATE_CARDS.Masonry.items,
};

export const RATE_CARD_ITEMS = [
  ...TRADE_RATE_CARDS.Gardening.items,
  ...TRADE_RATE_CARDS.Electrical.items,
  ...TRADE_RATE_CARDS.Plumbing.items,
  ...TRADE_RATE_CARDS.Painting.items,
];

export function getCategoryKey(serviceNameOrCategory) {
  const text = String(serviceNameOrCategory || "").toLowerCase();
  if (
    text.includes("lawn") ||
    text.includes("mow") ||
    text.includes("garden") ||
    text.includes("grass") ||
    text.includes("plant") ||
    text.includes("tree") ||
    text.includes("landscap") ||
    text.includes("hedge")
  ) {
    return "gardening";
  }
  if (
    text.includes("paint") ||
    text.includes("putty") ||
    text.includes("wall") ||
    text.includes("primer") ||
    text.includes("emulsion")
  ) {
    return "painting";
  }
  if (
    text.includes("plumb") ||
    text.includes("leak") ||
    text.includes("pipe") ||
    text.includes("tap") ||
    text.includes("drain") ||
    text.includes("tank") ||
    text.includes("valve")
  ) {
    return "plumbing";
  }
  if (
    text.includes("carpent") ||
    text.includes("wood") ||
    text.includes("furn") ||
    text.includes("door") ||
    text.includes("lock") ||
    text.includes("hinge") ||
    text.includes("drawer")
  ) {
    return "carpentry";
  }
  if (
    text.includes("ac") ||
    text.includes("cool") ||
    text.includes("appliance") ||
    text.includes("refriger") ||
    text.includes("wash") ||
    text.includes("micro")
  ) {
    return "appliance";
  }
  if (
    text.includes("clean") ||
    text.includes("sanit") ||
    text.includes("pest") ||
    text.includes("deep clean")
  ) {
    return "cleaning";
  }
  if (
    text.includes("mason") ||
    text.includes("tile") ||
    text.includes("civil") ||
    text.includes("brick") ||
    text.includes("plaster")
  ) {
    return "masonry";
  }
  return "electrical";
}

export function getRateCardForBooking(booking) {
  if (!booking) {
    return {
      category: "Electrical",
      tradeTitle: "Electrical Service",
      skillName: TRADE_RATE_CARDS.Electrical.skill,
      items: TRADE_RATE_CARDS.Electrical.items,
    };
  }

  const queryKey = getCategoryKey(
    `${booking.service_name || ""} ${booking.service_category || ""} ${booking.service || ""} ${booking.category || ""} ${booking.skill_name || ""} ${booking.service_skill_required || ""}`
  );

  const categoryNameMap = {
    gardening: "Gardening",
    painting: "Painting",
    plumbing: "Plumbing",
    carpentry: "Carpentry",
    appliance: "Appliance",
    cleaning: "Cleaning",
    masonry: "Masonry",
    electrical: "Electrical",
  };

  const matchedCat = categoryNameMap[queryKey] || "Electrical";
  const matchedTrade = TRADE_RATE_CARDS[matchedCat] || TRADE_RATE_CARDS.Electrical;

  // Skill badge resolution: dynamic worker trade_skill or service_skill_required or trade default
  let resolvedSkill = matchedTrade.skill;
  const workerSkill = booking.worker?.trade_skill || booking.worker_trade_skill || booking.trade_skill;
  const serviceSkill = booking.service_skill_required || booking.skill_name;

  if (workerSkill && !workerSkill.toLowerCase().includes("electric") && matchedCat !== "Electrical") {
    resolvedSkill = workerSkill;
  } else if (serviceSkill && !serviceSkill.toLowerCase().includes("electric") && matchedCat !== "Electrical") {
    resolvedSkill = serviceSkill;
  } else {
    resolvedSkill = matchedTrade.skill;
  }

  return {
    category: matchedCat,
    tradeTitle: booking.service_name || matchedTrade.tradeTitle,
    skillName: resolvedSkill,
    items: matchedTrade.items || RATE_CARD_CATALOG[queryKey] || [],
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
