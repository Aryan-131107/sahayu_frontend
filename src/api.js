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
