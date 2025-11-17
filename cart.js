// Booking cart management system
const bookingCartSystem = {
  cart: [],
  currentUser: null,
  currentStep: 1,
  authSystem: null, // Declare authSystem variable

  // Initialize the cart system
  init() {
    this.authSystem = window.authSystem
    if (!this.authSystem || !this.authSystem.isLoggedIn()) {
      this.showLoginRequired()
      return
    }

    this.currentUser = this.authSystem.getCurrentUser?.() || this.authSystem.currentUser
    this.showCartContent()
    this.loadCart()
    this.renderCart()
    this.setupEventListeners()
    this.authSystem.updateNavigation?.()
    window.Cart?.renderCount?.()
  },

  // Show login required message
  showLoginRequired() {
    document.getElementById("loginRequired").style.display = "flex"
    document.getElementById("cartContent").style.display = "none"
  },

  // Show cart content
  showCartContent() {
    document.getElementById("loginRequired").style.display = "none"
    document.getElementById("cartContent").style.display = "block"
  },

  updateNavigation() {
    this.authSystem?.updateNavigation?.()
  },

  // Load cart data from localStorage
  loadCart() {
    this.cart = window.Cart?.get?.() || []
    this.updateCartCount()
  },

  // Save cart data to localStorage with error handling
  saveCart() {
    try {
      window.Cart?.set?.(this.cart)
      this.updateCartCount()
      return true
    } catch (err) {
      console.error('Failed to save cart:', err)
      this.showError('Failed to save your cart. Please try again.')
      return false
    }
  },

  showError(message) {
    const errorDiv = document.createElement('div')
    errorDiv.className = 'error-message'
    errorDiv.textContent = message
    document.querySelector('.cart-content')?.prepend(errorDiv)
    setTimeout(() => errorDiv.remove(), 5000)
  },

  // Setup event listeners
  setupEventListeners() {
    // Payment method selection
    document.querySelectorAll(".payment-method").forEach((method) => {
      method.addEventListener("click", () => this.selectPaymentMethod(method.dataset.method))
    })

    // Card number formatting
    document.getElementById("cardNumber").addEventListener("input", this.formatCardNumber)
    document.getElementById("expiryDate").addEventListener("input", this.formatExpiryDate)
    document.getElementById("cvv").addEventListener("input", this.formatCVV)
  },

  // Render cart items and summary
  renderCart() {
    const cartContainer = document.getElementById("cartContainer")

    if (this.cart.length === 0) {
      cartContainer.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <h3>Your booking cart is empty</h3>
                    <p>Looks like you haven't added any events to your cart yet.</p>
                    <a href="events.html" class="btn-primary">Browse Events</a>
                </div>
            `
      return
    }

    const cartItemsHTML = this.cart
      .map((item) => {
        const formattedDate = new Date(item.date).toLocaleDateString("en-IN", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })

        return `
                <div class="cart-item">
                    <div class="cart-item-content">
                        <div class="cart-item-image">
                            <img src="${item.image}" alt="${item.title}">
                        </div>
                        <div class="cart-item-info">
                            <span class="cart-item-category">${item.category}</span>
                            <h3 class="cart-item-title">${item.title}</h3>
                            <div class="cart-item-details">
                                <div class="cart-item-detail">
                                    <i class="fas fa-calendar"></i>
                                    <span>${formattedDate}</span>
                                </div>
                                <div class="cart-item-detail">
                                    <i class="fas fa-clock"></i>
                                    <span>${item.time}</span>
                                </div>
                                <div class="cart-item-detail">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>${item.venue}</span>
                                </div>
                                <div class="cart-item-detail">
                                    <i class="fas fa-ticket-alt"></i>
                                    <span>Tickets: ${item.quantity}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="cart-item-actions">
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="bookingCartSystem.updateQuantity(${item.id}, -1)" ${item.quantity <= 1 ? "disabled" : ""}>
                                <i class="fas fa-minus"></i>
                            </button>
                            <div class="quantity-display">${item.quantity}</div>
                            <button class="quantity-btn" onclick="bookingCartSystem.updateQuantity(${item.id}, 1)" ${item.quantity >= 10 ? "disabled" : ""}>
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <div class="cart-item-price">
                            <div class="item-price">₹${item.price}</div>
                            <div class="item-total">Total: ₹${item.price * item.quantity}</div>
                        </div>
                        <button class="remove-item" onclick="bookingCartSystem.removeFromCart(${item.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `
      })
      .join("")

    const cartSummary = this.generateCartSummary()

    cartContainer.innerHTML = `
            <div class="cart-items">
                ${cartItemsHTML}
            </div>
            ${cartSummary}
        `
  },

  // Generate cart summary
  generateCartSummary() {
    const subtotal = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const convenienceFee = Math.round(subtotal * 0.1) // 10% convenience fee
    const gst = Math.round((subtotal + convenienceFee) * 0.18) // 18% GST
    const total = subtotal + convenienceFee + gst

    return `
            <div class="cart-summary">
                <h3>Booking Summary</h3>
                <div class="summary-row">
                    <span>Subtotal (${this.cart.reduce((sum, item) => sum + item.quantity, 0)} tickets)</span>
                    <span>₹${subtotal.toLocaleString()}</span>
                </div>
                <div class="summary-row">
                    <span>Convenience Fee</span>
                    <span>₹${convenienceFee.toLocaleString()}</span>
                </div>
                <div class="summary-row">
                    <span>GST (18%)</span>
                    <span>₹${gst.toLocaleString()}</span>
                </div>
                <div class="summary-row total">
                    <span>Total Amount</span>
                    <span>₹${total.toLocaleString()}</span>
                </div>
                <button class="checkout-btn" onclick="bookingCartSystem.openBookingModal()" ${this.cart.length === 0 ? "disabled" : ""}>
                    Proceed to Book
                </button>
                <a href="events.html" class="continue-shopping">Continue Shopping</a>
                <div class="cart-features">
                    <div class="feature-item">
                        <i class="fas fa-shield-alt"></i>
                        <span>100% Safe & Secure</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-mobile-alt"></i>
                        <span>Mobile Tickets</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-undo"></i>
                        <span>Easy Cancellation</span>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-headset"></i>
                        <span>24/7 Customer Support</span>
                    </div>
                </div>
            </div>
        `
  },

  // Update item quantity
  updateQuantity(itemId, change) {
    const item = this.cart.find((item) => item.id === itemId)
    if (item) {
      const newQuantity = item.quantity + change
      if (newQuantity >= 1 && newQuantity <= 10) {
        item.quantity = newQuantity
        this.saveCart()
        this.renderCart()
      }
    }
  },

  // Remove item from cart
  removeFromCart(itemId) {
    if (confirm("Are you sure you want to remove this item from your cart?")) {
      this.cart = this.cart.filter((item) => item.id !== itemId)
      this.saveCart()
      this.renderCart()
      this.showNotification("Item removed from cart!")
    }
  },

  updateCartCount() {
    window.Cart?.renderCount?.()
  },

  // Open booking modal
  openBookingModal() {
    if (this.cart.length === 0) return

    document.getElementById("bookingModal").classList.add("active")
    document.body.style.overflow = "hidden"
    this.currentStep = 1
    this.updateBookingStep()
    this.populateBookingSummary()
    this.populateBookingReview()
  },

  // Close booking modal
  closeBookingModal() {
    document.getElementById("bookingModal").classList.remove("active")
    document.body.style.overflow = "auto"
    this.currentStep = 1
    this.updateBookingStep()
  },

  // Populate booking review
  populateBookingReview() {
    const reviewItemsHTML = this.cart
      .map((item) => {
        const formattedDate = new Date(item.date).toLocaleDateString("en-IN", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })

        return `
                <div class="booking-review-item">
                    <div class="review-item-info">
                        <h5>${item.title}</h5>
                        <p><i class="fas fa-calendar"></i> ${formattedDate} at ${item.time}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${item.venue}</p>
                        <p><i class="fas fa-ticket-alt"></i> ${item.quantity} ticket(s) × ₹${item.price}</p>
                    </div>
                    <div class="review-item-total">
                        <strong>₹${(item.price * item.quantity).toLocaleString()}</strong>
                    </div>
                </div>
            `
      })
      .join("")

    document.getElementById("bookingReviewItems").innerHTML = reviewItemsHTML
  },

  // Navigate to next step
  nextStep() {
    if (this.currentStep === 1) {
      this.currentStep = 2
      this.updateBookingStep()
    } else if (this.currentStep === 2) {
      if (this.validatePaymentForm()) {
        this.processPayment()
      }
    } else if (this.currentStep === 3) {
      this.completeBooking()
    }
  },

  // Navigate to previous step
  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--
      this.updateBookingStep()
    }
  },

  // Update booking step UI
  updateBookingStep() {
    // Update step indicators
    document.querySelectorAll(".step").forEach((step, index) => {
      step.classList.remove("active", "completed")
      if (index + 1 < this.currentStep) {
        step.classList.add("completed")
      } else if (index + 1 === this.currentStep) {
        step.classList.add("active")
      }
    })

    // Update step content
    document.querySelectorAll(".checkout-step").forEach((step, index) => {
      step.classList.remove("active")
      if (index + 1 === this.currentStep) {
        step.classList.add("active")
      }
    })

    // Update buttons
    const prevBtn = document.getElementById("prevStepBtn")
    const nextBtn = document.getElementById("nextStepBtn")

    if (this.currentStep === 1) {
      prevBtn.style.display = "none"
      nextBtn.textContent = "Continue to Payment"
    } else if (this.currentStep === 2) {
      prevBtn.style.display = "block"
      nextBtn.textContent = "Complete Booking"
    } else if (this.currentStep === 3) {
      prevBtn.style.display = "none"
      nextBtn.textContent = "View My Bookings"
    }
  },

  // Validate payment form
  validatePaymentForm() {
    const activeMethod = document.querySelector(".payment-method.active").dataset.method

    if (activeMethod === "card") {
      const cardNumber = document.getElementById("cardNumber").value.replace(/\s/g, "")
      const expiryDate = document.getElementById("expiryDate").value
      const cvv = document.getElementById("cvv").value
      const cardName = document.getElementById("cardName").value.trim()

      if (!cardNumber || cardNumber.length < 13 || !expiryDate || !cvv || !cardName) {
        this.showNotification("Please fill in all card details!")
        return false
      }
    } else if (activeMethod === "upi") {
      const upiId = document.getElementById("upiId").value.trim()
      if (!upiId || !upiId.includes("@")) {
        this.showNotification("Please enter a valid UPI ID!")
        return false
      }
    } else if (activeMethod === "wallet") {
      const selectedWallet = document.querySelector('input[name="wallet"]:checked')
      if (!selectedWallet) {
        this.showNotification("Please select a wallet!")
        return false
      }
    }

    return true
  },

  // Process payment
  processPayment() {
    this.showNotification("Processing payment...")

    setTimeout(async () => {
      this.currentStep = 3
      this.updateBookingStep()
      this.generateBookingReference()

      try {
        if (window.ehApi?.book && this.currentUser?.email) {
          for (const item of this.cart) {
            await window.ehApi.book(this.currentUser.email, item.id, Number(item.quantity) || 1)
          }
          if (window.ehApi?.processBooking) {
            await window.ehApi.processBooking()
          }
        }
      } catch (e) {
        // best-effort; continue UX regardless
        console.warn("[v0] booking backend error:", e)
      }
    }, 2000)
  },

  // Generate booking reference
  generateBookingReference() {
    const reference = "BK" + new Date().getFullYear() + Math.random().toString(36).substr(2, 6).toUpperCase()
    document.getElementById("bookingReference").textContent = reference
    return reference
  },

  // Complete booking process
  async completeBooking() {
    // Attempt backend booking first (best effort)
    try {
      const userId = this.currentUser?.email
      if (window.ehApi?.book && userId) {
        // Create bookings for each item
        for (const item of this.cart) {
          await window.ehApi.book(userId, item.id, Number(item.quantity) || 1)
        }
        // Optionally process booking queue if available
        if (window.ehApi?.processBooking) {
          await window.ehApi.processBooking()
        }
      }
    } catch (err) {
      console.log("[v0] Booking API error (continuing with local save):", err?.message || err)
    }

    // Local persistence for UX/history
    this.saveBookingToHistory()

    // Clear cart
    this.cart = []
    this.saveCart()

    // Close modal and redirect
    this.closeBookingModal()

    setTimeout(() => {
      this.showNotification("Booking confirmed! Redirecting to your profile...")
      setTimeout(() => {
        window.location.href = "profile.html"
      }, 2000)
    }, 1000)
  },

  // Save booking to user's history
  saveBookingToHistory() {
    const bookingReference = document.getElementById("bookingReference").textContent
    const subtotal = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const convenienceFee = Math.round(subtotal * 0.1)
    const gst = Math.round((subtotal + convenienceFee) * 0.18)
    const total = subtotal + convenienceFee + gst

    // Create booking records for each cart item
    const bookings = this.cart.map((item) => ({
      id: Date.now() + Math.random(),
      eventTitle: item.title,
      eventImage: item.image,
      category: item.category,
      date: item.date,
      time: item.time,
      venue: item.venue,
      tickets: item.quantity,
      totalAmount: item.price * item.quantity,
      bookingDate: new Date().toISOString().split("T")[0],
      status: "confirmed",
      bookingId: bookingReference,
    }))

    // Save to user's booking history
    const userBookingsKey = `bookings_${this.currentUser.email}`
    const existingBookings = JSON.parse(localStorage.getItem(userBookingsKey)) || []
    const updatedBookings = [...existingBookings, ...bookings]
    localStorage.setItem(userBookingsKey, JSON.stringify(updatedBookings))
  },

  // Populate booking summary
  populateBookingSummary() {
    const subtotal = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const convenienceFee = Math.round(subtotal * 0.1)
    const gst = Math.round((subtotal + convenienceFee) * 0.18)
    const total = subtotal + convenienceFee + gst

    // Update summary items
    const summaryItemsHTML = this.cart
      .map(
        (item) => `
            <div class="summary-item">
                <div>
                    <div class="summary-item-name">${item.title}</div>
                    <div class="summary-item-quantity">${item.quantity} × ₹${item.price}</div>
                </div>
                <div>₹${(item.price * item.quantity).toLocaleString()}</div>
            </div>
        `,
      )
      .join("")

    document.getElementById("checkoutSummaryItems").innerHTML = summaryItemsHTML
    document.getElementById("checkoutSubtotal").textContent = `₹${subtotal.toLocaleString()}`
    document.getElementById("checkoutConvenienceFee").textContent = `₹${convenienceFee.toLocaleString()}`
    document.getElementById("checkoutGst").textContent = `₹${gst.toLocaleString()}`
    document.getElementById("checkoutTotal").textContent = `₹${total.toLocaleString()}`
  },

  // Select payment method
  selectPaymentMethod(method) {
    // Update active payment method
    document.querySelectorAll(".payment-method").forEach((pm) => pm.classList.remove("active"))
    document.querySelector(`[data-method="${method}"]`).classList.add("active")

    // Show/hide payment forms
    document.querySelectorAll(".payment-form").forEach((form) => {
      form.style.display = "none"
    })
    document.getElementById(`${method}Payment`).style.display = "block"
  },

  // Form formatting functions
  formatCardNumber(e) {
    const value = e.target.value.replace(/\s/g, "").replace(/[^0-9]/gi, "")
    const formattedValue = value.match(/.{1,4}/g)?.join(" ") || value
    e.target.value = formattedValue
  },

  formatExpiryDate(e) {
    let value = e.target.value.replace(/\D/g, "")
    if (value.length >= 2) {
      value = value.substring(0, 2) + "/" + value.substring(2, 4)
    }
    e.target.value = value
  },

  formatCVV(e) {
    e.target.value = e.target.value.replace(/[^0-9]/g, "")
  },

  // Show notification
  showNotification(message) {
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
  },
}

// Legacy functions for backward compatibility
function nextStep() {
  bookingCartSystem.nextStep()
}

function previousStep() {
  bookingCartSystem.previousStep()
}

function closeBookingModal() {
  bookingCartSystem.closeBookingModal()
}

function downloadTickets() {
  bookingCartSystem.showNotification("Tickets will be sent to your email shortly!")
}

function viewBookingDetails() {
  window.location.href = "profile.html"
}

// Initialize booking cart system when page loads
document.addEventListener("DOMContentLoaded", () => {
  bookingCartSystem.init()
})

// Close modal when clicking outside
document.getElementById("bookingModal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeBookingModal()
  }
})

// Handle escape key to close modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeBookingModal()
  }
})
