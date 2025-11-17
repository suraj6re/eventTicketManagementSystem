// Events data comes from the backend `/events`; start with what's in DOM
let eventsData = []

let filteredEvents = [...eventsData]
let currentView = "grid"
const eventsPerPage = 6
let currentPage = 1

// Initialize page
document.addEventListener("DOMContentLoaded", async () => {
  // 1) Keep static HTML visible immediately
  // 2) Try to fetch real data and replace contents if available
  try {
    if (window.ehApi?.listEvents) {
      const apiEvents = await window.ehApi.listEvents()
      if (Array.isArray(apiEvents) && apiEvents.length > 0) {
        // Normalize to unified model expected by UI
        eventsData = apiEvents.map((e) => ({
          id: e.id,
          title: e.title || e.name || "Untitled",
          description: e.description || "",
          category: (e.category || "").toLowerCase(),
          date: e.date || "2025-02-01",
          time: e.time || "7:00 PM",
          venue: e.venue || "",
          price: e.price || 0,
          image: e.image ? `/static/images/catalog/${e.image}` : '/static/images/placeholder.svg',
          image_url: e.image_url ? `/static/images/catalog/${e.image_url}` : (e.image ? `/static/images/catalog/${e.image}` : '/static/images/placeholder.svg'),
          location: e.location || "",
        }))
      }
    }
  } catch (e) {
    console.warn("/events fetch failed:", e)
  }
  initializeFilters()
  renderEvents()
  setupEventListeners()
  window.Cart?.renderCount?.()
})

function initializeFilters() {
  // Check for category in URL first
  const params = new URLSearchParams(location.search)
  const urlCat = (params.get("category") || "").toLowerCase()

  // Check for stored search query or category
  const searchQuery = localStorage.getItem("searchQuery")
  const selectedCategory = localStorage.getItem("selectedCategory")

  if (searchQuery) {
    document.getElementById("eventSearch").value = searchQuery
    localStorage.removeItem("searchQuery")
  }

  const initialCategory = urlCat || selectedCategory || ""
  if (initialCategory) {
    document.getElementById("categoryFilter").value = initialCategory
    if (selectedCategory) localStorage.removeItem("selectedCategory")
  }

  // Apply initial filters
  applyFilters()
}

function setupEventListeners() {
  // Search input
  document.getElementById("eventSearch").addEventListener("input", debounce(applyFilters, 300))

  // Filter selects
  document.getElementById("categoryFilter").addEventListener("change", applyFilters)
  document.getElementById("locationFilter").addEventListener("change", applyFilters)
  document.getElementById("priceFilter").addEventListener("change", applyFilters)

  // View toggle
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".view-btn").forEach((b) => b.classList.remove("active"))
      this.classList.add("active")
      currentView = this.dataset.view
      toggleView()
    })
  })
}

function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

function applyFilters() {
  const searchTerm = document.getElementById("eventSearch").value.toLowerCase()
  const category = document.getElementById("categoryFilter").value
  const location = document.getElementById("locationFilter").value
  const priceRange = document.getElementById("priceFilter").value

  filteredEvents = eventsData.filter((event) => {
    const matchesSearch =
      (event.title || event.name || "").toLowerCase().includes(searchTerm) ||
      (event.description || "").toLowerCase().includes(searchTerm) ||
      (event.venue || "").toLowerCase().includes(searchTerm)

    const matchesCategory = !category || (event.category || "").toLowerCase() === category
    const matchesLocation = !location || (event.location || "").toLowerCase() === location
    const matchesPrice = !priceRange || checkPriceRange(event.price, priceRange)

    return matchesSearch && matchesCategory && matchesLocation && matchesPrice
  })

  currentPage = 1
  renderEvents()
}

function checkPriceRange(price, range) {
  switch (range) {
    case "0-500":
      return price >= 0 && price <= 500
    case "500-1000":
      return price > 500 && price <= 1000
    case "1000-2000":
      return price > 1000 && price <= 2000
    case "2000+":
      return price > 2000
    default:
      return true
  }
}

function clearFilters() {
  document.getElementById("eventSearch").value = ""
  document.getElementById("categoryFilter").value = ""
  document.getElementById("locationFilter").value = ""
  document.getElementById("priceFilter").value = ""
  applyFilters()
}

function renderEvents() {
  const eventsGrid = document.getElementById("eventsGrid")
  // If no data fetched, keep existing static cards and bail out
  if (!Array.isArray(eventsData) || eventsData.length === 0) {
    document.querySelector(".load-more-container").style.display = "none"
    return
  }

  const startIndex = 0
  const endIndex = currentPage * eventsPerPage
  const eventsToShow = filteredEvents.slice(startIndex, endIndex)

  if (eventsToShow.length === 0) {
    eventsGrid.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <h3>No events found</h3>
        <p>Try adjusting your search criteria</p>
      </div>
    `
    document.querySelector(".load-more-container").style.display = "none"
    return
  }

  eventsGrid.innerHTML = eventsToShow.map((event) => createEventCard(event)).join("")

  // Show/hide load more button
  const loadMoreContainer = document.querySelector(".load-more-container")
  if (endIndex >= filteredEvents.length) {
    loadMoreContainer.style.display = "none"
  } else {
    loadMoreContainer.style.display = "block"
  }
}

function createEventCard(event) {
  const img = event.image || '/static/images/placeholder.svg';
  
  const formattedDate = new Date(event.date).toLocaleDateString("en-IN", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  return `
    <div class="event-card" onclick="viewEventDetails(${event.id})">
      <img 
        src="${img}" 
        alt="${event.title}" 
        class="event-image" 
        onerror="this.onerror=null;this.src='/static/images/placeholder.svg';"
      >
      <div class="event-info">
        <div class="event-content">
          <span class="event-category">${event.category}</span>
          <h3 class="event-title">${event.title}</h3>
          <div class="event-details">
            <div class="event-detail">
              <i class="fas fa-calendar"></i>
              <span>${formattedDate}</span>
            </div>
            <div class="event-detail">
              <i class="fas fa-clock"></i>
              <span>${event.time}</span>
            </div>
            <div class="event-detail">
              <i class="fas fa-map-marker-alt"></i>
              <span>${event.venue}</span>
            </div>
          </div>
          <div class="event-price">₹${event.price}</div>
        </div>
        <div class="event-actions">
          <a href="event-details.html?id=${event.id}" class="btn-secondary">View Details</a>
          <button class="btn-add-cart" onclick="event.stopPropagation(); addToCart(${JSON.stringify(event).replace(/"/g, "&quot;")})">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  `
}

function toggleView() {
  const eventsGrid = document.getElementById("eventsGrid")
  if (currentView === "list") {
    eventsGrid.classList.add("list-view")
  } else {
    eventsGrid.classList.remove("list-view")
  }
}

function loadMoreEvents() {
  currentPage++
  renderEvents()
}

function viewEventDetails(eventId) {
  window.location.href = `event-details.html?id=${eventId}`
}

// Cart functionality
function addToCart(event) {
  window.Cart?.add?.(event, 1)
  // keep existing notification UX
  showNotification(`${event.title} added to cart!`)
}

function updateCartCount() {
  window.Cart?.renderCount?.()
}

function showNotification(message) {
  const notification = document.createElement("div")
  notification.className = "notification"
  notification.textContent = message
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    background: var(--gradient-primary);
    color: white;
    padding: 1rem 2rem;
    border-radius: 10px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `

  document.body.appendChild(notification)

  setTimeout(() => {
    notification.remove()
  }, 3000)
}
