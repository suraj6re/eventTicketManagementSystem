// Seat selection system
const seatSelectionSystem = {
  currentEvent: null,
  currentUser: null,
  selectedSeats: [],
  seatMap: [],
  bookedSeats: [], // Track booked seats
  regularPrice: 350,
  premiumPrice: 500,
  authSystem: null,

  // Initialize the seat selection system
  init(authSystem) {
    this.authSystem = authSystem

    // Check authentication first
    if (!this.authSystem.isLoggedIn()) {
      this.showLoginRequired()
      return
    }

    // Load user data and show seat selection
    this.currentUser = this.authSystem.getCurrentUser()
    this.showSeatSelectionContent()
    this.loadEventData()
    this.loadBookedSeats()
    this.generateSeatMap()
    this.authSystem?.updateNavigation?.()
    window.Cart?.renderCount?.()
  },

  // Show login required message
  showLoginRequired() {
    document.getElementById("loginRequired").style.display = "flex"
    document.getElementById("seatSelectionContent").style.display = "none"
  },

  // Show seat selection content
  showSeatSelectionContent() {
    document.getElementById("loginRequired").style.display = "none"
    document.getElementById("seatSelectionContent").style.display = "block"
  },

  // Delegate navigation updates to authSystem
  updateNavigation() {
    this.authSystem?.updateNavigation?.()
  },

  // Load event data from URL parameters
  loadEventData() {
    const urlParams = new URLSearchParams(window.location.search)
    const eventId = Number.parseInt(urlParams.get("id"))

    // Get event data (in a real app, this would be an API call)
    this.currentEvent = this.getEventById(eventId)

    if (!this.currentEvent) {
      this.showEventNotFound()
      return
    }

    this.regularPrice = this.currentEvent.price
    this.premiumPrice = Math.round(this.currentEvent.price * 1.5)

    this.renderEventSummary()
  },

  // Get event by ID (mock data)
  getEventById(id) {
    const eventsData = [
      {
        id: 1,
        title: "Avengers: Endgame",
        category: "movies",
        date: "2025-01-15",
        time: "7:00 PM",
        venue: "PVR Cinemas, Phoenix Mall",
        price: 350,
        image: "/superhero-movie-poster.png",
      },
      {
        id: 2,
        title: "Coldplay Live Concert",
        category: "concerts",
        date: "2025-01-20",
        time: "8:00 PM",
        venue: "DY Patil Stadium",
        price: 2500,
        image: "/concert-stage-lights.png",
      },
    ]

    return eventsData.find((event) => event.id === id)
  },

  // Render event summary
  renderEventSummary() {
    const formattedDate = new Date(this.currentEvent.date).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const eventSummaryHTML = `
            <div class="event-summary-content">
                <div class="event-poster-small">
                    <img src="${this.currentEvent.image}" alt="${this.currentEvent.title}">
                </div>
                <div class="event-details-summary">
                    <h2>${this.currentEvent.title}</h2>
                    <div class="event-meta-summary">
                        <div class="meta-item-summary">
                            <i class="fas fa-calendar"></i>
                            <span>${formattedDate}</span>
                        </div>
                        <div class="meta-item-summary">
                            <i class="fas fa-clock"></i>
                            <span>${this.currentEvent.time}</span>
                        </div>
                        <div class="meta-item-summary">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${this.currentEvent.venue}</span>
                        </div>
                    </div>
                </div>
            </div>
        `

    document.getElementById("eventSummary").innerHTML = eventSummaryHTML
    document.getElementById("eventBreadcrumb").textContent = this.currentEvent.title
    document.getElementById("eventBreadcrumb").href = `event-details.html?id=${this.currentEvent.id}`
  },

  loadBookedSeats() {
    if (this.currentEvent) {
      const bookedSeatsKey = `bookedSeats_${this.currentEvent.id}`
      this.bookedSeats = JSON.parse(localStorage.getItem(bookedSeatsKey) || "[]")
    }
  },

  // Generate seat map
  generateSeatMap() {
    const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"]
    const seatsPerRow = 10 // Changed to 10 seats per row for 100 total seats

    // Initialize seat map data
    this.seatMap = []

    rows.forEach((row, rowIndex) => {
      const rowData = []
      for (let seatNum = 1; seatNum <= seatsPerRow; seatNum++) {
        const seatId = `${row}${seatNum}`
        const isPremium = rowIndex >= 3 && rowIndex <= 6 // Rows D-G are premium
        const isBooked = this.bookedSeats.includes(seatId) // Check if seat is booked

        rowData.push({
          id: seatId,
          row: row,
          number: seatNum,
          isPremium: isPremium,
          isBooked: isBooked, // Use booked status instead of random occupied
          isSelected: false,
        })
      }
      this.seatMap.push(rowData)
    })

    this.renderSeatMap()
  },

  // Render seat map HTML
  renderSeatMap() {
    const seatMapHTML = this.seatMap
      .map((row, rowIndex) => {
        const rowSeats = row
          .map((seat) => {
            let seatClass = "seat"
            if (seat.isBooked)
              seatClass += " occupied" // Use isBooked instead of isOccupied
            else if (seat.isPremium) seatClass += " premium"
            else seatClass += " available"

            if (seat.isSelected) seatClass += " selected"

            return `
              <div class="${seatClass}" 
                   data-seat-id="${seat.id}" 
                   data-row="${seat.row}" 
                   data-number="${seat.number}"
                   data-premium="${seat.isPremium}"
                   onclick="seatSelectionSystem.toggleSeat('${seat.id}')">
                  ${seat.number}
              </div>
            `
          })
          .join("")

        return `
          <div class="seat-row">
            <div class="row-label">${row[0].row}</div>
            <div class="seats">
              ${rowSeats}
            </div>
            <div class="row-label">${row[0].row}</div>
          </div>
        `
      })
      .join("")

    document.getElementById("seatMap").innerHTML = seatMapHTML
  },

  // Toggle seat selection
  toggleSeat(seatId) {
    const seat = this.findSeat(seatId)
    if (!seat || seat.isBooked) return // Use isBooked instead of isOccupied

    if (seat.isSelected) {
      // Deselect seat
      seat.isSelected = false
      this.selectedSeats = this.selectedSeats.filter((s) => s.id !== seatId)
    } else {
      // Select seat (max 10 seats)
      if (this.selectedSeats.length >= 10) {
        this.showNotification("Maximum 10 seats can be selected", "error")
        return
      }
      seat.isSelected = true
      this.selectedSeats.push(seat)
    }

    this.renderSeatMap()
    this.updateBookingSummary()
  },

  // Find seat by ID
  findSeat(seatId) {
    for (const row of this.seatMap) {
      const seat = row.find((s) => s.id === seatId)
      if (seat) return seat
    }
    return null
  },

  // Update booking summary
  updateBookingSummary() {
    const selectedSeatsInfo = document.getElementById("selectedSeatsInfo")
    const priceBreakdown = document.getElementById("priceBreakdown")
    const proceedBtn = document.getElementById("proceedBtn")

    if (this.selectedSeats.length === 0) {
      selectedSeatsInfo.innerHTML = `
                <div class="no-seats-selected">
                    <i class="fas fa-chair"></i>
                    <p>No seats selected</p>
                    <small>Please select seats to continue</small>
                </div>
            `
      priceBreakdown.style.display = "none"
      proceedBtn.disabled = true
      return
    }

    // Show selected seats
    const seatsList = this.selectedSeats
      .map((seat) => `<span class="selected-seat-tag ${seat.isPremium ? "premium" : "regular"}">${seat.id}</span>`)
      .join("")

    selectedSeatsInfo.innerHTML = `
            <div class="selected-seats-list">
                <h4>Selected Seats (${this.selectedSeats.length})</h4>
                <div class="seats-tags">${seatsList}</div>
            </div>
        `

    // Calculate pricing
    const regularSeats = this.selectedSeats.filter((seat) => !seat.isPremium)
    const premiumSeats = this.selectedSeats.filter((seat) => seat.isPremium)

    const regularTotal = regularSeats.length * this.regularPrice
    const premiumTotal = premiumSeats.length * this.premiumPrice
    const subtotal = regularTotal + premiumTotal
    const convenienceFee = Math.round(subtotal * 0.1)
    const gst = Math.round((subtotal + convenienceFee) * 0.18)
    const total = subtotal + convenienceFee + gst

    // Update price breakdown
    document.getElementById("regularCount").textContent = regularSeats.length
    document.getElementById("regularTotal").textContent = regularTotal.toLocaleString()
    document.getElementById("premiumCount").textContent = premiumSeats.length
    document.getElementById("premiumTotal").textContent = premiumTotal.toLocaleString()
    document.getElementById("convenienceFee").textContent = convenienceFee.toLocaleString()
    document.getElementById("gstAmount").textContent = gst.toLocaleString()
    document.getElementById("totalAmount").textContent = total.toLocaleString()

    priceBreakdown.style.display = "block"
    proceedBtn.disabled = false
  },

  // Proceed to payment
  proceedToPayment() {
    if (this.selectedSeats.length === 0) {
      this.showNotification("Please select at least one seat", "error")
      return
    }

    // Check if any selected seats are now booked (race condition protection)
    const currentlyBookedSeats = JSON.parse(localStorage.getItem(`bookedSeats_${this.currentEvent.id}`) || "[]")
    const conflictingSeats = this.selectedSeats.filter((seat) => currentlyBookedSeats.includes(seat.id))

    if (conflictingSeats.length > 0) {
      this.showNotification("Some selected seats are no longer available. Please refresh and try again.", "error")
      setTimeout(() => {
        window.location.reload()
      }, 2000)
      return
    }

    // Create booking data
    const bookingData = {
      event: this.currentEvent,
      seats: this.selectedSeats,
      user: this.currentUser,
      timestamp: new Date().toISOString(),
    }

    // Store booking data temporarily
    sessionStorage.setItem("pendingBooking", JSON.stringify(bookingData))

    try { window.ehTrace?.("proceed_to_payment", { eventId: this.currentEvent.id, seats: this.selectedSeats.map(s => s.id) }); } catch {}
    // Redirect to booking confirmation
    window.location.href = `booking-confirmation.html?eventId=${this.currentEvent.id}`
  },

  // Go back to event details
  goBack() {
    window.location.href = `event-details.html?id=${this.currentEvent.id}`
  },

  // Show event not found
  showEventNotFound() {
    document.getElementById("seatSelectionContent").innerHTML = `
            <div class="container">
                <div class="no-results">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Event Not Found</h3>
                    <p>The event you're looking for doesn't exist or has been removed.</p>
                    <a href="events.html" class="btn-primary">Browse All Events</a>
                </div>
            </div>
        `
  },

  // Update cart count
  updateCartCount() {
    const userCartKey = `cart_${this.currentUser.email}`
    const cart = JSON.parse(localStorage.getItem(userCartKey)) || []
    const cartCount = document.querySelector(".cart-count")
    if (cartCount) {
      cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0)
    }
  },

  // Show notification
  showNotification(message, type = "info") {
    const notification = document.createElement("div")
    notification.className = `notification ${type}`
    notification.textContent = message

    let backgroundColor = "var(--gradient-primary)"
    if (type === "error") backgroundColor = "#e74c3c"
    if (type === "success") backgroundColor = "#27ae60"

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
function proceedToPayment() {
  seatSelectionSystem.proceedToPayment()
}

function goBack() {
  seatSelectionSystem.goBack()
}

// Initialize seat selection system when page loads
document.addEventListener("DOMContentLoaded", () => {
  if (window.authSystem) {
    seatSelectionSystem.init(window.authSystem)
  } else {
    // Wait for auth system to load
    setTimeout(() => {
      seatSelectionSystem.init(window.authSystem)
    }, 100)
  }
})
