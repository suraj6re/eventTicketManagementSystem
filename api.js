;(() => {
  // Get API base URL from meta tag or fallback to current origin
  function getBase() {
    const metaApiBase = document.querySelector('meta[name="api-base"]')?.getAttribute('content')
    return metaApiBase || window.API_BASE || window.location.origin
  }

  async function request(path, { method = "GET", body, retries = 3, timeout = 5000 } = {}) {
    let lastError;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const res = await fetch(`${getBase()}${path}`, {
          method,
          headers: { 
            "Content-Type": "application/json",
            "X-Request-ID": Math.random().toString(36).substring(7)
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const contentType = res.headers.get("content-type") || "";
        
        if (!res.ok) {
          let msg = "Request failed";
          try {
            const err = await res.json();
            msg = err.error || JSON.stringify(err);
          } catch {
            msg = await res.text();
          }
          throw new Error(msg || `HTTP ${res.status}`);
        }
        
        if (contentType.includes("application/json")) {
          return res.json();
        }
        
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return text;
        }
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError') {
          console.warn(`Request timeout (attempt ${attempt + 1}/${retries})`);
        } else {
          console.warn(`Request failed (attempt ${attempt + 1}/${retries}):`, err);
        }
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    
    throw lastError;
  }

  async function sha256Hex(str) {
    if (window.crypto?.subtle) {
      const enc = new TextEncoder()
      const buf = await crypto.subtle.digest("SHA-256", enc.encode(str))
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    }
    // Fallback (not cryptographically strong, but avoids blocking)
    return `plain:${str}`
  }

  const ehApi = {
    base: getBase,
    setBase(url) {
      window.API_BASE = url
    },
    health() {
      return request("/health", { method: "GET" })
    },
    async register(email, password, name) {
      const password_hash = await sha256Hex(password)
      // unified signup endpoint for app.py; accepts password or hash
      return request("/signup", {
        method: "POST",
        body: { user_id: email, email, password, password_hash, name },
      })
    },
    async login(email, password) {
      const password_hash = await sha256Hex(password)
      // unified login endpoint for app.py; accepts password or hash
      return request("/login", {
        method: "POST",
        body: { user_id: email, email, password, password_hash },
      })
    },
    me() {
      return request("/me", { method: "GET" })
    },
    logout() {
      return request("/logout", { method: "POST" })
    }
    // Events
    listEvents() {
      return request("/events", { method: "GET" })
    },
    getEvent(id) {
      return request(`/event/${encodeURIComponent(id)}`, { method: "GET" })
    },
    listCategories() {
      return request("/categories", { method: "GET" })
    },
    addEvent(evt) {
      return request("/events", { method: "POST", body: evt })
    },
    deleteEvent(id) {
      return request(`/events/${encodeURIComponent(id)}`, { method: "DELETE" })
    },
    // Booking queue
    book(user_id, event_id, quantity) {
      return request("/book", { method: "POST", body: { user_id, event_id, quantity } })
    },
    processBooking() {
      return request("/book/process", { method: "POST" })
    },
    // Cancellations
    cancel(user_id, event_id, quantity) {
      return request("/cancel", { method: "POST", body: { user_id, event_id, quantity } })
    },
    processCancellation() {
      return request("/cancel/process", { method: "POST" })
    },
    // Venues / paths
    addVenue(name) {
      return request("/venues", { method: "POST", body: { name } })
    },
    addPath(from, to, distance) {
      return request("/paths", { method: "POST", body: { from, to, distance } })
    },
    shortest(from, to) {
      const qs = new URLSearchParams({ from, to }).toString()
      return request(`/venues/shortest?${qs}`, { method: "GET" })
    },
  }

  window.ehApi = ehApi
})()

// Trace helper (posts lightweight client-side events to server)
;(async () => {
  async function trace(action, details) {
    try {
      await fetch((window.API_BASE || "http://localhost:5000") + "/trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, details }),
      })
    } catch (e) {
      // non-fatal
      console.warn("Trace failed", e)
    }
  }
  window.ehTrace = trace
})()
