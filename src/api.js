/**
 * Central API Client for Sahāyu
 * Connects to the FastAPI backend without hardcoding endpoints across components.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://sahayu-backend-8.onrender.com";

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
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

    return data;
  } catch (error) {
    if (error.status) throw error;
    // Network or other unexpected errors
    throw new Error(
      error.message || "Failed to communicate with backend server.",
      { cause: error }
    );
  }
}

// System
export const getHealth = () => request("/health");

// Services & Skills
export const getServices = () => request("/services");
export const getService = (serviceId) => request(`/services/${serviceId}`);
export const getSkills = () => request("/skills");

// Workers
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

// Customer
export const getCustomer = (customerId) => request(`/customers/${customerId}`);
export const createCustomer = (customerData) =>
  request("/customers", {
    method: "POST",
    body: JSON.stringify(customerData),
  });

// Bookings
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

export const acceptBooking = (bookingId) =>
  request(`/bookings/${bookingId}/accept`, {
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

// Reviews
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
