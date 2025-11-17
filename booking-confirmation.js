// Booking confirmation system
const bookingConfirmationSystem = {
  currentEvent: null,
  currentUser: null,
  bookingData: null,
  authSystem: null,
  totalAmount: null,
  lastBooking: null,

  // Initialize the booking confirmation system
  init(authSystem) {
    this.authSystem = authSystem

    // Check authentication first
    if (!this.authSystem.isLoggedIn()) {
      this.showLoginRequired()
      return
    }

    // Load user data and show booking confirmation content
    this.currentUser = this.authSystem.getCurrentUser()
    this.showBookingConfirmationContent()
    this.loadBookingData()
    this.authSystem?.updateNavigation?.()
    window.Cart?.renderCount?.()
    this.initializePaymentForm()
  },

  // Show login required message
  showLoginRequired() {
    document.getElementById("loginRequired").style.display = "flex"
    document.getElementById("bookingConfirmationContent").style.display = "none"
  },

  // Show booking confirmation content
  showBookingConfirmationContent() {
    document.getElementById("loginRequired").style.display = "none"
    document.getElementById("bookingConfirmationContent").style.display = "block"
  },

  // Delegate navigation updates to authSystem
  updateNavigation() {
    this.authSystem?.updateNavigation?.()
  },

  // Load booking data from session storage
  loadBookingData() {
    const pendingBooking = sessionStorage.getItem("pendingBooking")
    if (!pendingBooking) {
      this.showBookingNotFound()
      return
    }

    this.bookingData = JSON.parse(pendingBooking)
    this.currentEvent = this.bookingData.event

    this.renderEventSummary()
    this.renderBookingSummary()
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

  // Render booking summary
  renderBookingSummary() {
    const seats = this.bookingData.seats
    const regularPrice = this.currentEvent.price
    const premiumPrice = Math.round(this.currentEvent.price * 1.5)

    // Show selected seats
    const seatsList = seats
      .map((seat) => `<span class="selected-seat-tag ${seat.isPremium ? "premium" : "regular"}">${seat.id}</span>`)
      .join("")

    document.getElementById("selectedSeatsDisplay").innerHTML = `
      <div class="selected-seats-list">
        <h4>Selected Seats (${seats.length})</h4>
        <div class="seats-tags">${seatsList}</div>
      </div>
    `

    // Calculate pricing
    const regularSeats = seats.filter((seat) => !seat.isPremium)
    const premiumSeats = seats.filter((seat) => seat.isPremium)

    const regularTotal = regularSeats.length * regularPrice
    const premiumTotal = premiumSeats.length * premiumPrice
    const subtotal = regularTotal + premiumTotal
    const convenienceFee = Math.round(subtotal * 0.1)
    const gst = Math.round((subtotal + convenienceFee) * 0.18)
    const total = subtotal + convenienceFee + gst

    // Update pricing details
    const pricingHTML = `
      <div class="price-breakdown">
        ${
          regularSeats.length > 0
            ? `
          <div class="price-row">
            <span>Regular Seats (${regularSeats.length}) × ₹${regularPrice.toLocaleString()}</span>
            <span>₹${regularTotal.toLocaleString()}</span>
          </div>
        `
            : ""
        }
        ${
          premiumSeats.length > 0
            ? `
          <div class="price-row">
            <span>Premium Seats (${premiumSeats.length}) × ₹${premiumPrice.toLocaleString()}</span>
            <span>₹${premiumTotal.toLocaleString()}</span>
          </div>
        `
            : ""
        }
        <div class="price-row">
          <span>Convenience Fee</span>
          <span>₹${convenienceFee.toLocaleString()}</span>
        </div>
        <div class="price-row">
          <span>GST (18%)</span>
          <span>₹${gst.toLocaleString()}</span>
        </div>
        <div class="price-row total-row">
          <span>Total</span>
          <span>₹${total.toLocaleString()}</span>
        </div>
      </div>
    `

    document.getElementById("pricingDetails").innerHTML = pricingHTML
    document.getElementById("finalTotal").textContent = `₹${total.toLocaleString()}`

    // Store total for payment processing
    this.totalAmount = total
  },

  // Initialize payment form
  initializePaymentForm() {
    const paymentForm = document.getElementById("paymentForm")
    const cardNumberInput = document.getElementById("cardNumber")
    const expiryDateInput = document.getElementById("expiryDate")
    const cvvInput = document.getElementById("cvv")
    const cardholderNameInput = document.getElementById("cardholderName")

    // Auto-fill cardholder name with user's name
    cardholderNameInput.value = this.currentUser.name

    // Format card number input
    cardNumberInput.addEventListener("input", (e) => {
      const value = e.target.value.replace(/\s/g, "").replace(/[^0-9]/gi, "")
      const formattedValue = value.match(/.{1,4}/g)?.join(" ") || value
      e.target.value = formattedValue
    })

    // Format expiry date input
    expiryDateInput.addEventListener("input", (e) => {
      let value = e.target.value.replace(/\D/g, "")
      if (value.length >= 2) {
        value = value.substring(0, 2) + "/" + value.substring(2, 4)
      }
      e.target.value = value
    })

    // Format CVV input
    cvvInput.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, "")
    })

    // Handle form submission
    paymentForm.addEventListener("submit", (e) => {
      e.preventDefault()
      this.processPayment()
    })
  },

  // Process payment
  processPayment() {
    const cardNumber = document.getElementById("cardNumber").value
    const expiryDate = document.getElementById("expiryDate").value
    const cvv = document.getElementById("cvv").value
    const cardholderName = document.getElementById("cardholderName").value

    // Basic validation
    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
      this.showNotification("Please fill in all payment details", "error")
      return
    }

    if (cardNumber.replace(/\s/g, "").length < 13) {
      this.showNotification("Please enter a valid card number", "error")
      return
    }

    if (expiryDate.length !== 5) {
      this.showNotification("Please enter a valid expiry date", "error")
      return
    }

    if (cvv.length < 3) {
      this.showNotification("Please enter a valid CVV", "error")
      return
    }

    // Simulate payment processing
    this.showNotification("Processing payment...", "info")

    setTimeout(() => {
      this.completeBooking()
    }, 2000)
  },

  // Complete booking
  completeBooking() {
    // Create booking record
    const booking = {
      id: Date.now().toString(),
      event: this.currentEvent,
      seats: this.bookingData.seats,
      user: this.currentUser,
      bookingDate: new Date().toISOString(),
      totalAmount: this.totalAmount,
      status: "confirmed",
      paymentMethod: "Credit Card",
      paymentStatus: "paid",
    }

    // Save booking to user's booking history
    this.saveBookingToHistory(booking)

    // Mark seats as booked in the system
    this.markSeatsAsBooked(this.currentEvent.id, this.bookingData.seats)

    // Clear pending booking
    sessionStorage.removeItem("pendingBooking")

    // Show success modal
    this.showBookingSuccess(booking)
    try { window.ehTrace?.("complete_booking", { bookingId: booking.id, eventId: booking.event.id, totalAmount: booking.totalAmount }); } catch {}
  },

  // Save booking to user's history
  saveBookingToHistory(booking) {
    // Get all users
    const users = JSON.parse(localStorage.getItem("eventHubUsers") || "[]")

    // Find current user and add booking
    const userIndex = users.findIndex((u) => u.email === this.currentUser.email)
    if (userIndex !== -1) {
      if (!users[userIndex].bookings) {
        users[userIndex].bookings = []
      }
      users[userIndex].bookings.push(booking)

      // Update users in localStorage
      localStorage.setItem("eventHubUsers", JSON.stringify(users))

      // Update current user in localStorage
      const updatedUser = users[userIndex]
      localStorage.setItem("eventHubCurrentUser", JSON.stringify(updatedUser))
      this.currentUser = updatedUser
    }
  },

  // Mark seats as booked
  markSeatsAsBooked(eventId, seats) {
    // Get existing booked seats
    const bookedSeatsKey = `bookedSeats_${eventId}`
    const existingBookedSeats = JSON.parse(localStorage.getItem(bookedSeatsKey) || "[]")

    // Add new booked seats
    const newBookedSeats = seats.map((seat) => seat.id)
    const allBookedSeats = [...existingBookedSeats, ...newBookedSeats]

    // Save updated booked seats
    localStorage.setItem(bookedSeatsKey, JSON.stringify(allBookedSeats))
  },

  // Show booking success modal
  showBookingSuccess(booking) {
    const modal = document.getElementById("bookingSuccessModal")
    const bookingDetails = document.getElementById("bookingDetails")

    // Remember the last booking so the Download button can use it
    this.lastBooking = booking

    const formattedDate = new Date(booking.event.date).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const seatsList = booking.seats.map((seat) => seat.id).join(", ")

    bookingDetails.innerHTML = `
      <div class="booking-success-details">
        <div class="booking-info">
          <h3>${booking.event.title}</h3>
          <p><i class="fas fa-calendar"></i> ${formattedDate} at ${booking.event.time}</p>
          <p><i class="fas fa-map-marker-alt"></i> ${booking.event.venue}</p>
          <p><i class="fas fa-chair"></i> Seats: ${seatsList}</p>
          <p><i class="fas fa-rupee-sign"></i> Total Paid: ₹${booking.totalAmount.toLocaleString()}</p>
        </div>
        <div class="booking-id">
          <small>Booking ID: ${booking.id}</small>
        </div>
      </div>
    `

    modal.style.display = "flex"
  },

  // Download the last booking as an HTML ticket (client-side)
  downloadTicket() {
    const booking = this.lastBooking
    if (!booking) {
      try { window.showNotification("No booking available to download") } catch {}
      return
    }

    const formattedDate = new Date(booking.event.date).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const seatsList = booking.seats.map((s) => s.id).join(", ")

    const ticketHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Ticket - ${booking.event.title}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #111 }
    .ticket { border: 2px dashed #333; padding: 20px; max-width: 700px }
    h1 { margin: 0 0 8px 0 }
    .meta { margin: 8px 0 }
    .meta span { display: block }
    .footer { margin-top: 20px; font-size: 0.9rem; color: #555 }
  </style>
</head>
<body>
  <div class="ticket">
    <h1>${booking.event.title}</h1>
    <div class="meta">
      <strong>Date:</strong>
      <span>${formattedDate} · ${booking.event.time}</span>
      <strong>Venue:</strong>
      <span>${booking.event.venue}</span>
      <strong>Seats:</strong>
      <span>${seatsList}</span>
      <strong>Booking ID:</strong>
      <span>${booking.id}</span>
      <strong>Name:</strong>
      <span>${booking.user.name || booking.user.email}</span>
      <strong>Total Paid:</strong>
      <span>₹${booking.totalAmount.toLocaleString()}</span>
    </div>
    <div class="footer">
      Please bring this ticket (printed or on your device) to the venue. This is your proof of purchase.
    </div>
  </div>
</body>
</html>`

    const blob = new Blob([ticketHtml], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Ticket_${booking.id}.html`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)

    try { window.showNotification("Ticket downloaded") } catch {}
  },

  // Download the last booking ticket via standardized server-side PDF
  async downloadPdfTicket() {
    const booking = this.lastBooking
    if (!booking) {
      try { window.showNotification("No booking available to download") } catch {}
      return
    }

    try {
      // Map booking-confirmation structure to server booking
      const firstSeat = Array.isArray(booking.seats) && booking.seats.length ? booking.seats[0] : { id: "A1" }
      const payload = {
        booking: {
          bookingId: booking.id || booking.bookingId || "TICKET",
          eventTitle: booking.event?.title || booking.eventTitle || "Event",
          category: booking.event?.category || booking.category || "events",
          date: booking.event?.date || booking.date,
          time: booking.event?.time || booking.time,
          venue: booking.event?.venue || booking.venue,
          price: booking.event?.price || booking.price || 0,
          seatNumber: firstSeat?.id || booking.seatNumber || "A1",
          row: (firstSeat?.row || booking.row || "A").toString()
        }
      }

      const res = await fetch('/download_ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        // Fallback GET if server rejects POST
        const a = document.createElement('a')
        a.href = `/download_ticket/${payload.booking.bookingId}`
        a.style.display = 'none'
        document.body.appendChild(a)
        a.click()
        a.remove()
        try { window.showNotification('🎫 Downloading ticket...') } catch {}
        return
      }

      let filename = 'ticket.pdf'
      const cd = res.headers.get('Content-Disposition') || res.headers.get('content-disposition')
      if (cd) {
        const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd)
        filename = decodeURIComponent(match?.[1] || match?.[2] || filename)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      try { window.showNotification('✅ Ticket downloaded successfully!') } catch {}
    } catch (err) {
      console.error('downloadPdfTicket error', err)
      try { window.showNotification('⚠️ Could not download ticket') } catch {}
    }
  }
      doc.text(`Name: ${booking.user.name || booking.user.email}`, left, y)
      y += 18
      doc.text(`Total Paid: ₹${booking.totalAmount.toLocaleString()}`, left, y)
      y += 24

      doc.setFontSize(10)
      doc.text("Please bring this ticket (printed or on your device) to the venue.", left, y)

      const filename = `Ticket_${booking.id}.pdf`
      doc.save(filename)
      try { window.showNotification("PDF downloaded") } catch {}
    } catch (err) {
      console.error(err)
      try { window.showNotification("Failed to generate PDF") } catch {}
    }
  },

  // Open a printable ticket in a new window and call print()
  printTicket() {
    const booking = this.lastBooking
    if (!booking) {
      try { window.showNotification("No booking available to print") } catch {}
      return
    }

    const formattedDate = new Date(booking.event.date).toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    const seatsList = booking.seats.map((s) => s.id).join(", ")

    const ticketHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket - ${booking.event.title}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;padding:24px;color:#111}
    .ticket{border:1px solid #ccc;padding:16px;max-width:720px}
    h1{margin:0 0 8px}
    .meta{margin:8px 0}
  </style>
</head>
<body>
  <div class="ticket">
    <h1>${booking.event.title}</h1>
    <div class="meta">
      <div><strong>Date:</strong> ${formattedDate} · ${booking.event.time}</div>
      <div><strong>Venue:</strong> ${booking.event.venue}</div>
      <div><strong>Seats:</strong> ${seatsList}</div>
      <div><strong>Booking ID:</strong> ${booking.id}</div>
      <div><strong>Name:</strong> ${booking.user.name || booking.user.email}</div>
      <div><strong>Total Paid:</strong> ₹${booking.totalAmount.toLocaleString()}</div>
    </div>
    <div style="margin-top:16px;color:#555;font-size:12px">Please bring this ticket (printed or on your device) to the venue. This is your proof of purchase.</div>
  </div>
  <script>
    window.onload = function(){ setTimeout(()=>{ window.print(); }, 200); }
  </script>
</body>
</html>`

    const w = window.open('', '_blank')
    if (!w) {
      try { window.showNotification('Popup blocked — allow popups to print') } catch {}
      return
    }
    w.document.write(ticketHtml)
    w.document.close()
  },

  // Show booking not found
  showBookingNotFound() {
    document.getElementById("bookingConfirmationContent").innerHTML = `
      <div class="container">
        <div class="no-results">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Booking Not Found</h3>
          <p>No pending booking found. Please select seats first.</p>
          <a href="events.html" class="btn-primary">Browse Events</a>
        </div>
      </div>
    `
  },
}

// Global functions
function goToProfile() {
  window.location.href = "profile.html"
}

function closeSuccessModal() {
  document.getElementById("bookingSuccessModal").style.display = "none"
  window.location.href = "events.html"
}

// Initialize booking confirmation system when page loads
document.addEventListener("DOMContentLoaded", () => {
  if (window.authSystem) {
    bookingConfirmationSystem.init(window.authSystem)
  } else {
    // Wait for auth system to load
    setTimeout(() => {
      bookingConfirmationSystem.init(window.authSystem)
    }, 100)
  }
})
