// Get event ID from URL parameters
const urlParams = new URLSearchParams(window.location.search)
const eventId = Number.parseInt(urlParams.get("id"))

let currentEvent = null
let ticketQuantity = 1

// Initialize page
document.addEventListener("DOMContentLoaded", async () => {
  await loadEventDetails()
  loadRelatedEvents()
  window.Cart?.renderCount?.()
  window.authSystem?.updateNavigation?.()
})

function initializeAuth() {
  window.authSystem?.updateNavigation?.()
}

function updateNavigation() {
  window.authSystem?.updateNavigation?.()
}

async function loadEventDetails() {
  // Fetch from backend if available
  try {
    if (window.ehApi?.getEvent) {
      const evt = await window.ehApi.getEvent(eventId)
      if (evt) {
        // Normalize event object
        currentEvent = {
          id: evt.id,
          title: evt.title || evt.name || "Untitled",
          description: evt.description || "",
          category: (evt.category || "").toLowerCase(),
          date: evt.date || "2025-02-01",
          time: evt.time || "7:00 PM",
          venue: evt.venue || "",
          price: evt.price || 0,
          image: evt.image || evt.image_url || "/static/images/placeholder.svg",
          image_url: evt.image_url || evt.image || "/static/images/placeholder.svg",
          rating: evt.rating || 4.6,
          duration: evt.duration || "2 hours",
          language: evt.language || "English",
          genre: evt.genre || "",
          director: evt.director,
          cast: evt.cast,
          artist: evt.artist,
          teams: evt.teams,
        }
      }
    }
  } catch (e) {
    console.warn(`/event/${eventId} fetch failed:`, e)
  }
  // Fallback to local if not found
  if (!currentEvent) {
    currentEvent = getEventById(eventId)
  }

  if (!currentEvent) {
    showEventNotFound()
    return
  }

  // Update page title and breadcrumb
  document.title = `${currentEvent.title} - Event Hub`
  document.getElementById("breadcrumbTitle").textContent = currentEvent.title

  // Render event details
  renderEventDetails(currentEvent)
}

function getEventById(id) {
  // Local fallback list
  const eventsData = [
    {
      id: 1,
      title: "Avengers: Endgame",
      category: "movies",
      location: "mumbai",
      date: "2025-01-15",
      time: "7:00 PM",
      venue: "PVR Cinemas, Phoenix Mall",
      price: 350,
      image: "/generic-superhero-team-poster.png",
      description:
        "The epic conclusion to the Infinity Saga brings together all your favorite Marvel heroes for the ultimate battle against Thanos. Experience stunning visual effects, emotional storytelling, and action-packed sequences that will keep you on the edge of your seat. This is more than just a movie - it's a cinematic event that defines a generation of superhero storytelling.",
      rating: 4.8,
      duration: "181 minutes",
      language: "English",
      genre: "Action, Adventure, Sci-Fi",
      director: "Anthony Russo, Joe Russo",
      cast: "Robert Downey Jr., Chris Evans, Mark Ruffalo, Chris Hemsworth",
    },
    {
      id: 2,
      title: "Coldplay Live Concert",
      category: "concerts",
      location: "mumbai",
      date: "2025-01-20",
      time: "8:00 PM",
      venue: "DY Patil Stadium",
      price: 2500,
      image: "/coldplay-concert-stage.jpg",
      description:
        "Experience the magic of Coldplay live in concert! Join thousands of fans for an unforgettable evening filled with their greatest hits including 'Yellow', 'Fix You', 'Viva La Vida', and songs from their latest album. Known for their spectacular light shows, confetti cannons, and interactive wristbands that light up in sync with the music, this concert promises to be a truly immersive experience.",
      rating: 4.9,
      duration: "2.5 hours",
      language: "English",
      genre: "Alternative Rock, Pop Rock",
      artist: "Coldplay",
      support: "Local opening acts TBA",
    },
    {
      id: 3,
      title: "Romeo and Juliet",
      category: "plays",
      location: "delhi",
      date: "2025-01-18",
      time: "6:30 PM",
      venue: "National Centre for Performing Arts",
      price: 800,
      image: "/romeo-juliet-theater-play.jpg",
      description:
        "Shakespeare's timeless tale of love and tragedy comes to life in this stunning theatrical production. Set against the backdrop of Renaissance Verona, witness the passionate love story of Romeo and Juliet unfold with breathtaking performances, elaborate costumes, and masterful direction. This classic play explores themes of love, fate, and family conflict that remain relevant today.",
      rating: 4.6,
      duration: "2 hours 30 minutes",
      language: "English",
      genre: "Drama, Romance, Tragedy",
      director: "Sarah Mitchell",
      cast: "Emma Thompson, James Norton, Helen Mirren",
    },
    {
      id: 4,
      title: "IPL Final Match",
      category: "sports",
      location: "mumbai",
      date: "2025-01-25",
      time: "7:30 PM",
      venue: "Wankhede Stadium",
      price: 1500,
      image: "/cricket-stadium-ipl-match.jpg",
      description:
        "Witness cricket history in the making at the IPL Final! Experience the electrifying atmosphere as the two best teams of the season battle it out for the championship trophy. Feel the energy of 50,000 passionate fans, enjoy world-class cricket action, and be part of India's most celebrated sporting event. This is more than just a match - it's a celebration of cricket, entertainment, and sportsmanship.",
      rating: 4.7,
      duration: "4 hours",
      language: "Hindi/English",
      genre: "Cricket, Sports",
      teams: "TBA vs TBA",
      format: "T20 Cricket Match",
    },
    {
      id: 5,
      title: "Spider-Man: No Way Home",
      category: "movies",
      location: "bangalore",
      date: "2025-01-16",
      time: "9:00 PM",
      venue: "INOX Forum Mall",
      price: 400,
      image: "/spiderman-movie-poster.jpg",
      description:
        "The multiverse adventure continues in this spectacular Spider-Man film that brings together multiple Spider-Man universes. Watch as Peter Parker faces his greatest challenge yet when villains from other dimensions threaten his world. With stunning visual effects, incredible action sequences, and appearances from beloved characters across the Spider-Man franchise, this is a must-see cinematic experience.",
      rating: 4.5,
      duration: "148 minutes",
      language: "English",
      genre: "Action, Adventure, Sci-Fi",
      director: "Jon Watts",
      cast: "Tom Holland, Zendaya, Benedict Cumberbatch",
    },
    {
      id: 6,
      title: "AR Rahman Live",
      category: "concerts",
      location: "chennai",
      date: "2025-01-22",
      time: "7:00 PM",
      venue: "Nehru Indoor Stadium",
      price: 1800,
      image: "/ar-rahman-concert-music.jpg",
      description:
        "Experience the musical genius of AR Rahman live in concert! The Oscar-winning composer will perform his most beloved compositions from movies like Slumdog Millionaire, Lagaan, Dil Se, and many more. This concert features a full orchestra, special guest vocalists, and stunning visual presentations that complement Rahman's soul-stirring melodies. A night of pure musical magic awaits!",
      rating: 4.9,
      duration: "3 hours",
      language: "Multi-language",
      genre: "Film Music, World Music",
      artist: "AR Rahman",
      special: "Live Orchestra Performance",
    },
    {
      id: 7,
      title: "The Lion King Musical",
      category: "plays",
      location: "mumbai",
      date: "2025-01-19",
      time: "5:00 PM",
      venue: "Jamshed Bhabha Theatre",
      price: 1200,
      image: "/lion-king-musical-theater.jpg",
      description:
        "Disney's spectacular musical adaptation of The Lion King comes to life with breathtaking costumes, innovative puppetry, and unforgettable music. Follow Simba's journey from a playful cub to the rightful king of the Pride Lands in this visually stunning production. Featuring beloved songs like 'Circle of Life', 'Hakuna Matata', and 'Can You Feel the Love Tonight', this musical is perfect for audiences of all ages.",
      rating: 4.8,
      duration: "2 hours 45 minutes",
      language: "English",
      genre: "Musical, Family, Drama",
      director: "Julie Taymor",
      music: "Elton John, Tim Rice, Hans Zimmer",
    },
    {
      id: 8,
      title: "Football Championship",
      category: "sports",
      location: "kolkata",
      date: "2025-01-24",
      time: "6:00 PM",
      venue: "Salt Lake Stadium",
      price: 600,
      image: "/football-stadium-championship.jpg",
      description:
        "The ultimate football showdown arrives at the iconic Salt Lake Stadium! Watch as the two finest teams compete for the championship title in what promises to be an epic battle of skill, strategy, and determination. Experience the roar of the crowd, the thrill of every goal, and the passion of beautiful football. This is more than just a match - it's a celebration of the world's most beloved sport.",
      rating: 4.4,
      duration: "2 hours",
      language: "Hindi/English",
      genre: "Football, Sports",
      teams: "East Bengal FC vs Mohun Bagan",
      tournament: "Kolkata Derby Championship",
    },
  ]

  return eventsData.find((event) => event.id === id)
}

function renderEventDetails(event) {
  const formattedDate = new Date(event.date).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const eventDetailsHTML = `
    <div class="event-main-content">
      <div class="event-hero">
        <div class="event-poster">
          <img src="${event.image}" alt="${event.title}">
        </div>
        <div class="event-info-main">
          <span class="event-category-badge">${event.category}</span>
          <h1 class="event-title-main">${event.title}</h1>
          <div class="event-rating">
            <div class="stars">
              ${generateStars(event.rating)}
            </div>
            <span class="rating-text">${event.rating}/5 (1,234 reviews)</span>
          </div>
          <div class="event-meta">
            <div class="meta-item">
              <i class="fas fa-calendar meta-icon"></i>
              <div class="meta-content">
                <h4>Date</h4>
                <p>${formattedDate}</p>
              </div>
            </div>
            <div class="meta-item">
              <i class="fas fa-clock meta-icon"></i>
              <div class="meta-content">
                <h4>Time</h4>
                <p>${event.time}</p>
              </div>
            </div>
            <div class="meta-item">
              <i class="fas fa-map-marker-alt meta-icon"></i>
              <div class="meta-content">
                <h4>Venue</h4>
                <p>${event.venue}</p>
              </div>
            </div>
            <div class="meta-item">
              <i class="fas fa-clock meta-icon"></i>
              <div class="meta-content">
                <h4>Duration</h4>
                <p>${event.duration || "2 hours"}</p>
              </div>
            </div>
            <div class="meta-item">
              <i class="fas fa-language meta-icon"></i>
              <div class="meta-content">
                <h4>Language</h4>
                <p>${event.language}</p>
              </div>
            </div>
            <div class="meta-item">
              <i class="fas fa-tags meta-icon"></i>
              <div class="meta-content">
                <h4>Genre</h4>
                <p>${event.genre}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="event-description">
        <h3>About This Event</h3>
        <p>${event.description}</p>
        ${generateAdditionalInfo(event)}
      </div>
    </div>
    
    <div class="booking-sidebar">
      <div class="booking-header">
        <div class="booking-price">₹${event.price}</div>
        <div class="booking-price-label">per ticket</div>
      </div>
      <div class="booking-actions">
        <button class="btn-book-now" onclick="openBookingModal()">
          <i class="fas fa-ticket-alt"></i> Book Now
        </button>
        <button class="btn-add-to-cart" onclick="addToBookingCart()">
          <i class="fas fa-shopping-cart"></i> Add to Cart
        </button>
      </div>
      <div class="booking-features">
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

  document.getElementById("eventDetailsContainer").innerHTML = eventDetailsHTML

  // Update modal with event details
  document.getElementById("ticketPrice").textContent = event.price
  updateBookingSummary()
}

function generateStars(rating) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 !== 0
  let starsHTML = ""

  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<i class="fas fa-star star"></i>'
  }

  if (hasHalfStar) {
    starsHTML += '<i class="fas fa-star-half-alt star"></i>'
  }

  const emptyStars = 5 - Math.ceil(rating)
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<i class="far fa-star star"></i>'
  }

  return starsHTML
}

function generateAdditionalInfo(event) {
  let additionalInfo = ""

  if (event.director) {
    additionalInfo += `<p><strong>Director:</strong> ${event.director}</p>`
  }
  if (event.cast) {
    additionalInfo += `<p><strong>Cast:</strong> ${event.cast}</p>`
  }
  if (event.artist) {
    additionalInfo += `<p><strong>Artist:</strong> ${event.artist}</p>`
  }
  if (event.teams) {
    additionalInfo += `<p><strong>Teams:</strong> ${event.teams}</p>`
  }

  return additionalInfo
}

function loadRelatedEvents() {
  // Get related events (same category, different events)
  const allEvents = [
    {
      id: 2,
      title: "Coldplay Live Concert",
      category: "concerts",
      date: "2025-01-20",
      price: 2500,
      image: "/coldplay-concert-stage.jpg",
    },
    {
      id: 5,
      title: "Spider-Man: No Way Home",
      category: "movies",
      date: "2025-01-16",
      price: 400,
      image: "/spiderman-movie-poster.jpg",
    },
    {
      id: 7,
      title: "The Lion King Musical",
      category: "plays",
      date: "2025-01-19",
      price: 1200,
      image: "/lion-king-musical-theater.jpg",
    },
  ]

  const relatedEvents = allEvents.filter((event) => event.id !== eventId).slice(0, 3)

  const relatedEventsHTML = relatedEvents
    .map((event) => {
      const formattedDate = new Date(event.date).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      })

      return `
      <div class="related-event-card" onclick="viewEventDetails(${event.id})">
        <img src="${event.image}" alt="${event.title}" class="related-event-image">
        <div class="related-event-info">
          <span class="related-event-category">${event.category}</span>
          <h4 class="related-event-title">${event.title}</h4>
          <p class="related-event-date">${formattedDate}</p>
          <div class="related-event-price">₹${event.price}</div>
        </div>
      </div>
    `
    })
    .join("")

  document.getElementById("relatedEventsGrid").innerHTML = relatedEventsHTML
}

// Add to cart from event-details
function addToBookingCart() {
  if (!currentEvent) return
  window.Cart?.add?.(currentEvent, 1)
  showNotification(`${currentEvent.title} added to cart!`)
  try { window.ehTrace?.("add_to_cart", { id: currentEvent.id, title: currentEvent.title }); } catch {}
}

function showEventNotFound() {
  document.getElementById("eventDetailsContainer").innerHTML = `
    <div class="no-results">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Event Not Found</h3>
      <p>The event you're looking for doesn't exist or has been removed.</p>
      <a href="events.html" class="btn-primary">Browse All Events</a>
    </div>
  `
}

function viewEventDetails(eventId) {
  window.location.href = `event-details.html?id=${eventId}`
}

// Booking Modal Functions
function openBookingModal() {
  if (!window.authSystem || !window.authSystem.isLoggedIn()) {
    showLoginPrompt()
    return
  }

  document.getElementById("bookingModal").classList.add("active")
  document.body.style.overflow = "hidden"
  showBookingOptions()
}

function showLoginPrompt() {
  const loginModal = document.createElement("div")
  loginModal.className = "modal active"
  loginModal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Login Required</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove(); document.body.style.overflow = 'auto';">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="login-prompt">
          <i class="fas fa-lock" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
          <h4>Please login to book tickets</h4>
          <p>You need to be logged in to book tickets and access your booking history.</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="this.closest('.modal').remove(); document.body.style.overflow = 'auto';">Cancel</button>
        <a href="login.html" class="btn-primary">Login Now</a>
      </div>
    </div>
  `
  document.body.appendChild(loginModal)
  document.body.style.overflow = "hidden"
}

function showBookingOptions() {
  document.querySelector(".booking-options").style.display = "block"
  document.getElementById("quickBookingSection").style.display = "none"
  document.getElementById("modalFooter").innerHTML = `
      <button class="btn-secondary" onclick="closeBookingModal()">Cancel</button>
  `
}

function selectSeats() {
  if (!window.authSystem || !window.authSystem.isLoggedIn()) {
    closeBookingModal()
    showLoginPrompt()
    return
  }

  // Redirect to seat selection page
  window.location.href = `seat-selection.html?id=${currentEvent.id}`
}

function addToBookingCart() {
  if (!window.authSystem || !window.authSystem.isLoggedIn()) {
    closeBookingModal()
    showLoginPrompt()
    return
  }

  window.Cart?.add?.(currentEvent, 1)
  showNotification(`${currentEvent.title} added to booking cart!`)
}

// Cart functionality
function updateCartCount() {
  window.Cart?.renderCount?.()
}

function closeBookingModal() {
  document.getElementById("bookingModal").classList.remove("active")
  document.body.style.overflow = "auto"
  showBookingOptions() // Reset to options view
}

function proceedToCheckout() {
  if (!window.authSystem || !window.authSystem.isLoggedIn()) {
    showLoginPrompt()
    return
  }

  const currentUser = window.authSystem.getCurrentUser()
  // add tickets to cart in one step via Cart
  window.Cart?.add?.(currentEvent, Number(ticketQuantity) || 1)

  closeBookingModal()
  showNotification(`${ticketQuantity} ticket(s) added to booking cart!`)

  setTimeout(() => {
    window.location.href = "cart.html"
  }, 1500)
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

function updateBookingSummary() {
  if (!currentEvent) return

  const subtotal = currentEvent.price * ticketQuantity
  const convenienceFee = Math.round(subtotal * 0.1) // 10% convenience fee
  const total = subtotal + convenienceFee

  document.getElementById("summaryQuantity").textContent = ticketQuantity
  document.getElementById("summarySubtotal").textContent = subtotal
  document.getElementById("convenienceFee").textContent = convenienceFee
  document.getElementById("totalAmount").textContent = total
}

function changeQuantity(change) {
  ticketQuantity = Math.max(1, Math.min(10, ticketQuantity + change))
  document.getElementById("ticketQuantity").textContent = ticketQuantity
  updateBookingSummary()
}
