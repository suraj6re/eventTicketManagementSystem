// Profile management system
const profileSystem = {
  currentUser: null,
  bookingsData: [],
  favoritesData: [],
  currentFilter: "all",

  // Initialize profile page
  init() {
    // Wait for auth system to be available
    const auth = window.authSystem
    if (!auth) {
      console.error('Auth system not available')
      this.showLoginRequired()
      return
    }
    
    if (!auth.isLoggedIn()) {
      this.showLoginRequired()
      return
    }

    this.currentUser = auth.getCurrentUser?.() || auth.currentUser
    console.log('Profile init for user:', this.currentUser?.email)
    
    this.loadUserData()
    this.showProfileContent()
    this.setupEventListeners()
    window.Cart?.renderCount?.()
    auth.updateNavigation?.()
  },

  // Show login required message
  showLoginRequired() {
    document.getElementById("loginRequired").style.display = "flex"
    document.getElementById("profileContent").style.display = "none"
  },

  // Show profile content
  showProfileContent() {
    document.getElementById("loginRequired").style.display = "none"
    document.getElementById("profileContent").style.display = "block"
  },

  // Load user data from localStorage or API
  loadUserData() {
    const bookingsKey = `bookings_${this.currentUser.email}`
    const favoritesKey = `favorites_${this.currentUser.email}`
    
    console.log('Loading data for user:', this.currentUser.email)
    console.log('Bookings key:', bookingsKey)
    console.log('Raw bookings data:', localStorage.getItem(bookingsKey))
    
    // Load user bookings from localStorage - ensure empty array for new users
    this.bookingsData = JSON.parse(localStorage.getItem(bookingsKey)) || []

    // Load user favorites from localStorage - ensure empty array for new users
    this.favoritesData = JSON.parse(localStorage.getItem(favoritesKey)) || []

    console.log('Loaded bookings:', this.bookingsData.length)
    console.log('Loaded favorites:', this.favoritesData.length)

    // Ensure new users start with completely empty data
    if (this.bookingsData.length === 0) {
      this.bookingsData = []
      this.saveBookingsData()
    }
    
    if (this.favoritesData.length === 0) {
      this.favoritesData = []
      this.saveFavoritesData()
    }

    // Update profile display
    this.loadUserProfile()
    this.loadBookings()
    this.loadFavorites()
  },

  // Sample bookings for testing ticket downloads (only used for manual testing)
  getSampleBookings() {
    return [
      {
        id: 1,
        bookingId: "BK001",
        eventTitle: "Avengers: Endgame",
        category: "movies",
        date: "2025-01-15",
        time: "7:00 PM",
        venue: "PVR Cinemas, Phoenix Mall",
        tickets: 2,
        totalAmount: 700,
        status: "confirmed",
        bookingDate: "2025-01-01",
        mood: "adventure",
        description: "The epic conclusion to the Infinity Saga that brings together all Marvel heroes for the ultimate battle.",
        image: "/static/images/catalog/avengers-endgame.jpg",
        price: 350,
        gate: "Gate A",
        seatNumber: "A15",
        row: "A"
      },
      {
        id: 2,
        bookingId: "BK002",
        eventTitle: "Coldplay Live Concert",
        category: "events",
        date: "2025-01-20",
        time: "8:00 PM",
        venue: "DY Patil Stadium",
        tickets: 1,
        totalAmount: 2500,
        status: "confirmed",
        bookingDate: "2025-01-02",
        mood: "energetic",
        description: "Experience the magic of Coldplay live with their spectacular Music of the Spheres World Tour.",
        image: "/static/images/catalog/coldplay-live.jpg",
        price: 2500,
        gate: "Gate B",
        seatNumber: "B42",
        row: "B"
      },
      {
        id: 3,
        bookingId: "BK003",
        eventTitle: "Romeo and Juliet",
        category: "play",
        date: "2025-01-18",
        time: "6:30 PM",
        venue: "National Centre for Performing Arts",
        tickets: 2,
        totalAmount: 1600,
        status: "confirmed",
        bookingDate: "2025-01-03",
        mood: "romantic",
        description: "Shakespeare's timeless love story brought to life with stunning performances and beautiful staging.",
        image: "/static/images/catalog/romeo-and-juliet.jpg",
        price: 800,
        gate: "Main Gate",
        seatNumber: "C28",
        row: "C"
      },
      {
        id: 4,
        bookingId: "BK004",
        eventTitle: "IPL Final Match",
        category: "sports",
        date: "2025-01-25",
        time: "7:30 PM",
        venue: "Wankhede Stadium",
        tickets: 3,
        totalAmount: 4500,
        status: "confirmed",
        bookingDate: "2025-01-04",
        mood: "energetic",
        description: "The ultimate cricket showdown between the top two teams of the season.",
        image: "/static/images/catalog/ipl-final.jpg",
        price: 1500,
        gate: "Gate D",
        seatNumber: "D55",
        row: "D"
      }
    ]
  },

  // legacy: removed demo favorites
  getSampleFavorites() { return [] },

  // Add sample bookings for testing (manual only - for developers)
  addSampleBookingsForTesting() {
    if (this.bookingsData.length === 0) {
      this.bookingsData = this.getSampleBookings()
      this.saveBookingsData()
      this.loadUserProfile()
      this.loadBookings()
      this.showNotification("Sample bookings added for testing")
    } else {
      this.showNotification("User already has bookings")
    }
  },

  // Clear all user data (for testing new user experience)
  clearAllUserData() {
    if (confirm("Are you sure you want to clear all your data? This will remove all bookings and favorites.")) {
      this.bookingsData = []
      this.favoritesData = []
      this.saveBookingsData()
      this.saveFavoritesData()
      this.loadUserProfile()
      this.loadBookings()
      this.loadFavorites()
      this.showNotification("All user data cleared successfully")
    }
  },

  // Load and display user profile information
  loadUserProfile() {
    // Update profile information
    document.getElementById("profileName").textContent = this.currentUser.name || this.currentUser.email
    document.getElementById("profileEmail").textContent = this.currentUser.email

    // Set member since date
    const memberSince =
      this.currentUser.memberSince ||
      new Date().toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    document.getElementById("profileMemberSince").textContent = `Member since ${memberSince}`

    // Update avatar
    const avatar = this.currentUser.avatar || "/diverse-user-avatars.png"
    document.getElementById("profileAvatar").src = avatar

    // Update stats
    const totalBookings = this.bookingsData.length
    const totalSpent = this.bookingsData.reduce((sum, booking) => sum + booking.totalAmount, 0)
    const favoriteEvents = this.favoritesData.length

    document.getElementById("totalBookings").textContent = totalBookings
    document.getElementById("totalSpent").textContent = `₹${totalSpent.toLocaleString()}`
    document.getElementById("favoriteEvents").textContent = favoriteEvents

    // Populate settings form
    this.populateSettingsForm()
  },

  // Populate settings form with user data
  populateSettingsForm() {
    document.getElementById("fullName").value = this.currentUser.name || ""
    document.getElementById("email").value = this.currentUser.email || ""
    document.getElementById("phone").value = this.currentUser.phone || ""
    document.getElementById("location").value = this.currentUser.location || "mumbai"
  },

  // Setup event listeners
  setupEventListeners() {
    // Tab switching
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.switchTab(btn.dataset.tab))
    })

    // Booking filter
    document.getElementById("bookingFilter").addEventListener("change", (e) => {
      this.currentFilter = e.target.value
      this.loadBookings()
    })

    // Settings form
    document.getElementById("personalInfoForm").addEventListener("submit", (e) => {
      e.preventDefault()
      this.savePersonalInfo()
    })

    // Update navigation
    window.authSystem?.updateNavigation?.()
  },

  // Switch between tabs
  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active")
    })
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active")

    // Update tab panels
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.remove("active")
    })
    document.getElementById(tabName).classList.add("active")
  },

  // Load and display bookings
  loadBookings() {
    let filteredBookings = this.bookingsData

    // Apply filter
    if (this.currentFilter !== "all") {
      filteredBookings = this.bookingsData.filter((booking) => {
        const eventDate = new Date(booking.date)
        const today = new Date()

        switch (this.currentFilter) {
          case "upcoming":
            return booking.status === "confirmed" && eventDate >= today
          case "past":
            return booking.status === "past" || (booking.status === "confirmed" && eventDate < today)
          case "cancelled":
            return booking.status === "cancelled"
          default:
            return true
        }
      })
    }

    const bookingsList = document.getElementById("bookingsList")

    if (filteredBookings.length === 0) {
      bookingsList.innerHTML = `
                <div class="no-bookings">
                    <i class="fas fa-ticket-alt"></i>
                    <h3>No bookings found</h3>
                    <p>You don't have any bookings matching the selected filter.</p>
                    <a href="events.html" class="btn-primary" style="margin-top: 1rem;">Browse Events</a>
                </div>
            `
      return
    }

    const bookingsHTML = filteredBookings
      .map((booking) => {
        const eventDate = new Date(booking.date).toLocaleDateString("en-IN", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        })

        const bookingDate = new Date(booking.bookingDate).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })

        return `
                <div class="booking-card">
                    <div class="booking-header">
                        <div class="booking-info">
                            <h3>${booking.eventTitle}</h3>
                            <div class="booking-details">
                                <div class="booking-detail">
                                    <i class="fas fa-calendar"></i>
                                    <span>${eventDate} at ${booking.time}</span>
                                </div>
                                <div class="booking-detail">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>${booking.venue}</span>
                                </div>
                                <div class="booking-detail">
                                    <i class="fas fa-ticket-alt"></i>
                                    <span>${booking.tickets} ticket(s)</span>
                                </div>
                                <div class="booking-detail">
                                    <i class="fas fa-rupee-sign"></i>
                                    <span>₹${booking.totalAmount}</span>
                                </div>
                                <div class="booking-detail">
                                    <i class="fas fa-receipt"></i>
                                    <span>Booking ID: ${booking.bookingId}</span>
                                </div>
                                <div class="booking-detail">
                                    <i class="fas fa-clock"></i>
                                    <span>Booked on ${bookingDate}</span>
                                </div>
                            </div>
                        </div>
                        <span class="booking-status ${booking.status}">${booking.status}</span>
                    </div>
                    <div class="booking-actions">
                        ${this.generateBookingActions(booking)}
                    </div>
                </div>
            `
      })
      .join("")

    bookingsList.innerHTML = bookingsHTML
  },

  // Generate booking action buttons
  generateBookingActions(booking) {
    const eventDate = new Date(booking.date)
    const today = new Date()
    const isUpcoming = eventDate >= today && booking.status === "confirmed"
    const isPast = booking.status === "past" || (booking.status === "confirmed" && eventDate < today)

    let actions = `<button class="btn-secondary" onclick="profileSystem.viewBookingDetails('${booking.bookingId}')">View Details</button>`

    if (isUpcoming) {
      actions += `<button class="btn-primary" onclick="profileSystem.downloadTicket('${booking.bookingId}')">
        <i class="fas fa-download"></i> Download Ticket
      </button>`
      actions += `<button class="btn-danger" onclick="profileSystem.cancelBooking('${booking.bookingId}')">Cancel Booking</button>`
    } else if (isPast) {
      actions += `<button class="btn-primary" onclick="profileSystem.downloadTicket('${booking.bookingId}')">
        <i class="fas fa-download"></i> Download Ticket
      </button>`
      // Removed Rate Event button as requested
    }

    return actions
  },

  // Load and display favorites
  loadFavorites() {
    const favoritesGrid = document.getElementById("favoritesGrid")

    if (this.favoritesData.length === 0) {
      favoritesGrid.innerHTML = `
                <div class="no-favorites">
                    <i class="fas fa-heart"></i>
                    <h3>No favorites yet</h3>
                    <p>Start adding events to your favorites to see them here.</p>
                    <a href="events.html" class="btn-primary" style="margin-top: 1rem;">Browse Events</a>
                </div>
            `
      return
    }

    const favoritesHTML = this.favoritesData
      .map((favorite) => {
        const eventDate = new Date(favorite.date).toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
        })

        return `
                <div class="favorite-card" onclick="profileSystem.viewEventDetails(${favorite.id})">
                    <img src="${favorite.image}" alt="${favorite.title}" class="favorite-image">
                    <div class="favorite-info">
                        <span class="favorite-category">${favorite.category}</span>
                        <h4 class="favorite-title">${favorite.title}</h4>
                        <p class="favorite-date">${eventDate}</p>
                        <div class="favorite-actions">
                            <span class="favorite-price">₹${favorite.price}</span>
                            <button class="remove-favorite" onclick="event.stopPropagation(); profileSystem.removeFavorite(${favorite.id})">
                                <i class="fas fa-heart"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `
      })
      .join("")

    favoritesGrid.innerHTML = favoritesHTML
  },

  // Save personal information
  savePersonalInfo() {
    const formData = {
      name: document.getElementById("fullName").value,
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value,
      location: document.getElementById("location").value,
    }

    // Update current user data
    Object.assign(this.currentUser, formData)

    // Save to localStorage
    authSystem.updateUser(this.currentUser)

    // Update profile header
    this.loadUserProfile()

    this.showNotification("Personal information saved successfully!")
  },

  // Booking actions
  viewBookingDetails(bookingId) {
    // Fetch booking details from server
    fetch(`/booking_details/${bookingId}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Booking not found')
        }
        return response.json()
      })
      .then(data => {
        // Show modal with server data
        this.showBookingDetailsModal(data.booking, data.show)
      })
      .catch(error => {
        console.error('Error fetching booking details:', error)
        this.showNotification('Could not load booking details')
      })
  },

  // Show detailed booking modal
  showBookingDetailsModal(booking, show = null) {
    const eventDate = new Date(booking.date).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const bookingDate = new Date(booking.bookingDate).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    // Get category emoji and color
    const categoryInfo = {
      movies: { emoji: '🎬', color: '#cc1a1a', name: 'Movie' },
      events: { emoji: '🎵', color: '#3399e6', name: 'Concert' },
      sports: { emoji: '🏆', color: '#1ab31a', name: 'Sports' },
      play: { emoji: '🎭', color: '#9933cc', name: 'Theater' }
    }
    
    const info = categoryInfo[booking.category] || categoryInfo.movies

    const modalHTML = `
      <div class="booking-details-modal" id="bookingDetailsModal">
        <div class="modal-overlay" onclick="profileSystem.closeBookingDetailsModal()"></div>
        <div class="modal-content">
          <div class="modal-header" style="background: linear-gradient(135deg, ${info.color}, ${info.color}dd);">
            <div class="modal-title">
              <span class="category-emoji">${info.emoji}</span>
              <div>
                <h2>${booking.eventTitle}</h2>
                <p class="category-label">${info.name} Event</p>
              </div>
            </div>
            <button class="modal-close" onclick="profileSystem.closeBookingDetailsModal()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          
          <div class="modal-body">
            <div class="booking-details-grid">
              <div class="detail-item">
                <i class="fas fa-calendar-alt"></i>
                <div>
                  <label>Event Date & Time</label>
                  <span>${eventDate} at ${booking.time}</span>
                </div>
              </div>
              
              <div class="detail-item">
                <i class="fas fa-map-marker-alt"></i>
                <div>
                  <label>Venue</label>
                  <span>${booking.venue}</span>
                </div>
              </div>
              
              <div class="detail-item">
                <i class="fas fa-ticket-alt"></i>
                <div>
                  <label>Tickets</label>
                  <span>${booking.tickets} ticket(s)</span>
                </div>
              </div>
              
              <div class="detail-item">
                <i class="fas fa-rupee-sign"></i>
                <div>
                  <label>Total Amount</label>
                  <span>₹${booking.totalAmount.toLocaleString()}</span>
                </div>
              </div>
              
              <div class="detail-item">
                <i class="fas fa-receipt"></i>
                <div>
                  <label>Booking ID</label>
                  <span>${booking.bookingId}</span>
                </div>
              </div>
              
              <div class="detail-item">
                <i class="fas fa-clock"></i>
                <div>
                  <label>Booked On</label>
                  <span>${bookingDate}</span>
                </div>
              </div>
              
              <div class="detail-item">
                <i class="fas fa-heart"></i>
                <div>
                  <label>Mood</label>
                  <span class="mood-tag">${booking.mood.charAt(0).toUpperCase() + booking.mood.slice(1)}</span>
                </div>
              </div>
              
              <div class="detail-item">
                <i class="fas fa-check-circle"></i>
                <div>
                  <label>Status</label>
                  <span class="status-badge ${booking.status}">${booking.status.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn-primary" onclick="profileSystem.downloadTicket('${booking.bookingId}')">
              <i class="fas fa-download"></i> Download Ticket
            </button>
            <button class="btn-secondary" onclick="profileSystem.closeBookingDetailsModal()">
              Close
            </button>
          </div>
        </div>
      </div>
    `

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML)
    document.body.style.overflow = 'hidden'
  },

  // Close booking details modal
  closeBookingDetailsModal() {
    const modal = document.getElementById('bookingDetailsModal')
    if (modal) {
      modal.remove()
      document.body.style.overflow = 'auto'
    }
  },

  async downloadTicket(bookingId) {
    try {
      // Find real booking from current user's bookings
      const booking = this.bookingsData.find((b) => b.bookingId === bookingId)

      // Fallback to GET route if booking not found locally
      if (!booking) {
        const fallbackUrl = `/download_ticket/${bookingId}`
        const a = document.createElement('a')
        a.href = fallbackUrl
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        a.remove()
        this.showNotification('🎫 Downloading ticket...')
        return
      }

      // POST real booking to server to generate ticket with correct details
      const res = await fetch('/download_ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking }),
      })

      if (!res.ok) {
        // If POST fails, try GET fallback
        const fallbackUrl = `/download_ticket/${bookingId}`
        const a = document.createElement('a')
        a.href = fallbackUrl
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        a.remove()
        this.showNotification('🎫 Downloading ticket...')
        return
      }

      // Extract filename from headers
      let filename = 'ticket.pdf'
      const cd = res.headers.get('Content-Disposition') || res.headers.get('content-disposition')
      if (cd) {
        const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd)
        filename = decodeURIComponent(match?.[1] || match?.[2] || filename)
      } else {
        const safeTitle = (booking.eventTitle || 'Event').replace(/[^\w\s-]/g, '').trim().replace(/[\s-]+/g, '_')
        filename = `${safeTitle}_ticket_${booking.bookingId}.pdf`
      }

      // Download blob
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      this.showNotification('✅ Ticket downloaded successfully!')
    } catch (e) {
      console.error('downloadTicket error', e)
      this.showNotification('⚠️ Could not download ticket')
    }
  },

  cancelBooking(bookingId) {
    const proceed = () => {
      const booking = this.bookingsData.find((b) => b.bookingId === bookingId)
      if (booking) {
        booking.status = "cancelled"
        this.saveBookingsData()
        this.loadBookings()
        this.loadUserProfile()
        this.showNotification("Booking cancelled successfully!")
      }
    }

    if (confirm("Are you sure you want to cancel this booking?")) {
      const auth = window.authSystem
      const user = auth?.getCurrentUser?.() || auth?.currentUser
      if (window.ehApi?.cancel && user?.email) {
        // best-effort backend cancel
        window.ehApi
          .cancel(user.email, bookingId, 1)
          .then(() => proceed())
          .catch(() => proceed())
      } else {
        proceed()
      }
    }
  },

  // Favorites actions
  viewEventDetails(eventId) {
    window.location.href = `event-details.html?id=${eventId}`
  },

  removeFavorite(eventId) {
    const index = this.favoritesData.findIndex((fav) => fav.id === eventId)
    if (index > -1) {
      this.favoritesData.splice(index, 1)
      this.saveFavoritesData()
      this.loadFavorites()
      this.loadUserProfile() // Update stats
      this.showNotification("Removed from favorites!")
    }
  },

  // Save bookings data to localStorage
  saveBookingsData() {
    localStorage.setItem(`bookings_${this.currentUser.email}`, JSON.stringify(this.bookingsData))
  },

  // Save favorites data to localStorage
  saveFavoritesData() {
    localStorage.setItem(`favorites_${this.currentUser.email}`, JSON.stringify(this.favoritesData))
  },

  // Update cart count
  updateCartCount() {
    window.Cart?.renderCount?.()
  },

  // Show notification
  showNotification(message, type = "info") {
    const notification = document.createElement("div")
    notification.className = "notification"
    notification.textContent = message

    let backgroundColor = "var(--gradient-primary)"
    if (type === "error") backgroundColor = "#e74c3c"
    if (type === "success") backgroundColor = "#27ae60"
    if (type === "warning") backgroundColor = "#f39c12"

    notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${backgroundColor};
            color: white;
            padding: 1rem 2rem;
            border-radius: 10px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `

    document.body.appendChild(notification)

    setTimeout(() => {
      notification.remove()
    }, 3000)
  },
}

// Legacy functions for backward compatibility
function editProfile() {
  console.log('editProfile() called')
  
  if (!profileSystem) {
    console.error('profileSystem not found')
    alert('Profile system not loaded. Please refresh the page.')
    return
  }
  
  if (!profileSystem.currentUser) {
    console.error('No current user')
    profileSystem.showNotification("Please log in to edit your profile", "error")
    return
  }

  console.log('Current user:', profileSystem.currentUser)

  // Check if form elements exist
  const elements = ['editFullName', 'editEmail', 'editPhone', 'editBio']
  for (const id of elements) {
    const element = document.getElementById(id)
    if (!element) {
      console.error(`Element not found: ${id}`)
      profileSystem.showNotification(`Form element missing: ${id}`, "error")
      return
    }
  }

  // Populate edit form with current data
  document.getElementById("editFullName").value = profileSystem.currentUser.name || ""
  document.getElementById("editEmail").value = profileSystem.currentUser.email || ""
  document.getElementById("editPhone").value = profileSystem.currentUser.phone || ""
  document.getElementById("editBio").value = profileSystem.currentUser.bio || ""

  console.log('Form populated with user data')

  // Show modal
  const modal = document.getElementById("editProfileModal")
  if (modal) {
    console.log('Modal found, showing...')
    modal.classList.add("active")
    document.body.style.overflow = "hidden"
    
    // Setup form submission handler
    const form = document.getElementById("editProfileForm")
    if (form) {
      form.onsubmit = handleEditProfileSubmit
      console.log('Form handler attached')
    } else {
      console.error('Form not found')
    }
    
    profileSystem.showNotification("Edit profile modal opened", "success")
  } else {
    console.error('Modal not found')
    profileSystem.showNotification("Edit profile modal not found", "error")
  }
}

function closeEditProfileModal() {
  const modal = document.getElementById("editProfileModal")
  if (modal) {
    modal.classList.remove("active")
    document.body.style.overflow = "auto"
  }
}

function handleEditProfileSubmit(e) {
  e.preventDefault()
  
  if (!profileSystem.currentUser) {
    profileSystem.showNotification("User not found", "error")
    return
  }

  // Get form data
  const formData = {
    name: document.getElementById("editFullName").value.trim(),
    email: document.getElementById("editEmail").value.trim(),
    phone: document.getElementById("editPhone").value.trim(),
    bio: document.getElementById("editBio").value.trim()
  }

  // Validate required fields
  if (!formData.name || !formData.email) {
    profileSystem.showNotification("Name and email are required", "error")
    return
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(formData.email)) {
    profileSystem.showNotification("Please enter a valid email address", "error")
    return
  }

  // Update current user data
  const oldEmail = profileSystem.currentUser.email
  Object.assign(profileSystem.currentUser, formData)

  // If email changed, we need to migrate user data
  if (oldEmail !== formData.email) {
    // Get old data
    const oldBookings = localStorage.getItem(`bookings_${oldEmail}`)
    const oldFavorites = localStorage.getItem(`favorites_${oldEmail}`)
    
    // Set new data
    if (oldBookings) localStorage.setItem(`bookings_${formData.email}`, oldBookings)
    if (oldFavorites) localStorage.setItem(`favorites_${formData.email}`, oldFavorites)
    
    // Clean up old data
    localStorage.removeItem(`bookings_${oldEmail}`)
    localStorage.removeItem(`favorites_${oldEmail}`)
  }

  // Save updated user to localStorage
  localStorage.setItem("eventHubCurrentUser", JSON.stringify(profileSystem.currentUser))

  // Update the auth system
  if (window.authSystem) {
    window.authSystem.currentUser = profileSystem.currentUser
    window.authSystem.updateNavigation()
  }

  // Update profile display
  profileSystem.loadUserProfile()

  // Close modal and show success message
  closeEditProfileModal()
  profileSystem.showNotification("Profile updated successfully!", "success")
}

function editAvatar() {
  profileSystem.showNotification("Avatar upload feature coming soon!")
}

function changePassword() {
  profileSystem.showNotification("Password change feature coming soon!")
}

function downloadData() {
  profileSystem.showNotification("Data download feature coming soon!")
}

function deleteAccount() {
  if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
    profileSystem.showNotification("Account deletion feature coming soon!")
  }
}

// Initialize profile system when page loads
document.addEventListener("DOMContentLoaded", () => {
  // Wait a bit for auth system to initialize
  if (window.authSystem) {
    profileSystem.init()
  } else {
    // Retry after a short delay if auth system isn't ready
    setTimeout(() => {
      if (window.authSystem) {
        profileSystem.init()
      } else {
        console.error('Auth system failed to initialize')
        profileSystem.showLoginRequired()
      }
    }, 500)
  }
})
