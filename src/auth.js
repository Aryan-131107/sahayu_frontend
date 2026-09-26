/**
 * Central Authentication & Session Management for Sahāyu
 * Handles persistent authentication sessions for Workers, Customers, and Admins.
 * Sessions survive page reloads, tab navigation, and browser close/reopen.
 */

const SESSION_KEY = "sahayu_auth_session";

// 7-day default session TTL (in milliseconds)
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Retrieve active authenticated session.
 * Automatically validates expiry and integrity.
 */
export function getAuthSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw);
    if (!session || !session.role || !session.user) {
      clearAuthSession();
      return null;
    }

    // Check expiry
    if (session.expiresAt && Date.now() > session.expiresAt) {
      console.warn("[Sahāyu Auth] Session expired. Clearing session.");
      clearAuthSession();
      return null;
    }

    return session;
  } catch (err) {
    console.error("[Sahāyu Auth] Failed to parse auth session:", err);
    clearAuthSession();
    return null;
  }
}

/**
 * Store a newly verified session.
 */
export function setAuthSession({ role, user, token, ttlMs = SESSION_TTL_MS }) {
  const session = {
    role, // 'worker' | 'customer' | 'admin'
    user: {
      id: user.id || user.worker_id || user.customer_id || 1,
      name: user.name || "User",
      phone: user.phone || "",
      email: user.email || "",
      uan: user.uan || user.eshram || "",
      trade: user.trade || user.skill || "",
      provider: user.provider || "phone_otp",
    },
    token: token || `sahayu_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  };

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // Also keep legacy sync keys for existing components
    if (role === "worker") {
      sessionStorage.setItem("sahayu_worker_auth", "true");
      sessionStorage.setItem("sahayu_worker_phone", session.user.phone);
      if (session.user.uan) sessionStorage.setItem("sahayu_worker_eshram", session.user.uan);
      if (session.user.id) localStorage.setItem("sahayu_worker_id", String(session.user.id));
    } else if (role === "customer") {
      sessionStorage.setItem("sahayu_customer_auth", "true");
      sessionStorage.setItem("sahayu_customer_email", session.user.email);
      sessionStorage.setItem("sahayu_customer_name", session.user.name);
    }
  } catch (err) {
    console.error("[Sahāyu Auth] Failed to persist session:", err);
  }

  return session;
}

/**
 * Clear session and log out.
 */
export function clearAuthSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("sahayu_worker_auth");
    sessionStorage.removeItem("sahayu_worker_phone");
    sessionStorage.removeItem("sahayu_worker_eshram");
    sessionStorage.removeItem("sahayu_customer_auth");
    sessionStorage.removeItem("sahayu_customer_email");
    sessionStorage.removeItem("sahayu_customer_name");
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if active session is Worker
 */
export function isWorkerAuthenticated() {
  const session = getAuthSession();
  if (session && session.role === "worker") return true;
  // Fallback check for active sessionStorage in current tab
  return sessionStorage.getItem("sahayu_worker_auth") === "true";
}

/**
 * Check if active session is Customer
 */
export function isCustomerAuthenticated() {
  const session = getAuthSession();
  if (session && session.role === "customer") return true;
  // Fallback check for active sessionStorage in current tab
  return sessionStorage.getItem("sahayu_customer_auth") === "true";
}

/**
 * Get active Worker user profile
 */
export function getActiveWorker() {
  const session = getAuthSession();
  if (session && session.role === "worker") return session.user;
  const workerId = localStorage.getItem("sahayu_worker_id") || "11";
  return {
    id: workerId,
    phone: sessionStorage.getItem("sahayu_worker_phone") || "9876543210",
    uan: sessionStorage.getItem("sahayu_worker_eshram") || "9823-4567-8901",
  };
}

/**
 * Get active Customer user profile
 */
export function getActiveCustomer() {
  const session = getAuthSession();
  if (session && session.role === "customer") return session.user;
  return {
    id: 1,
    email: sessionStorage.getItem("sahayu_customer_email") || "customer@example.com",
    name: sessionStorage.getItem("sahayu_customer_name") || "Customer",
  };
}
