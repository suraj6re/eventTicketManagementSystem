;(function(){
  const sections = {
    movies: document.getElementById('grid-movies'),
    events: document.getElementById('grid-events'),
    sports: document.getElementById('grid-sports'),
    play: document.getElementById('grid-play'),
  }

  const placeholders = {
    movies: '/static/images/movies.svg',
    events: '/static/images/concert.svg',
    sports: '/static/images/sports.svg',
    play: '/static/images/plays.svg',
  }

  function placeholderCard(cat){
    const img = placeholders[cat] || '/static/images/placeholder.svg'
    return `
    <div class="event-card">
      <img src="${img}" class="event-image" style="width:100%;height:200px;object-fit:cover;border-radius:12px;">
      <div class="event-info">
        <div class="event-content">
          <span class="event-category">${cat}</span>
          <h3 class="event-title">Sample ${cat}</h3>
          <div class="event-details">
            <div class="event-detail"><i class="fas fa-calendar"></i><span>2025-02-01</span></div>
            <div class="event-detail"><i class="fas fa-map-marker-alt"></i><span>Sample Venue</span></div>
            <div class="event-detail"><i class="fas fa-ticket-alt"></i><span>10/10 seats available</span></div>
          </div>
        </div>
        <div class="event-actions"><a class="btn-secondary">Book Now</a></div>
      </div>
    </div>`
  }

  function addPlaceholders(){
    Object.keys(sections).forEach(cat => {
      const grid = sections[cat]
      if (!grid) return
      grid.innerHTML = Array.from({length: 9}).map(()=>placeholderCard(cat)).join('')
    })
  }

  function createCard(e){
    const img = e.image_url || placeholders[e.category] || '/static/images/placeholder.svg'
    const date = e.date || ''
    const venue = e.venue || ''
    const seats = e.available_seats || ''
    return `
    <div class="event-card" onclick="location.href='event-details.html?id=${e.id}'">
      <img src="${img}" alt="${e.name}" class="event-image" style="width:100%;height:200px;object-fit:cover;border-radius:12px;">
      <div class="event-info">
        <div class="event-content">
          <span class="event-category">${e.category}</span>
          <h3 class="event-title">${e.name}</h3>
          <div class="event-details">
            <div class="event-detail"><i class="fas fa-calendar"></i><span>${date}</span></div>
            <div class="event-detail"><i class="fas fa-map-marker-alt"></i><span>${venue}</span></div>
            <div class="event-detail"><i class="fas fa-ticket-alt"></i><span>${seats}</span></div>
          </div>
        </div>
        <div class="event-actions">
          <a class="btn-secondary" onclick="event.stopPropagation(); location.href='event-details.html?id=${e.id}'">Book Now</a>
          <button class="btn-add-to-cart" onclick="event.stopPropagation(); addToCart(${e.id}, '${e.name}')" title="Add to Cart">
            <i class="fas fa-shopping-cart"></i> Add to Cart
          </button>
        </div>
      </div>
    </div>`
  }

  function renderAll(list){
    const byCat = { movies: [], events: [], sports: [], play: [] }
    list.forEach(e => {
      const cat = (e.category || '').toLowerCase()
      if (byCat[cat]) byCat[cat].push(e)
    })
    Object.keys(sections).forEach(cat => {
      const grid = sections[cat]
      if (!grid) return
      const items = byCat[cat] && byCat[cat].length ? byCat[cat] : []
      if (items.length) {
        grid.innerHTML = items.slice(0, 12).map(createCard).join('')
      }
    })
  }

  function enableSmoothScroll(){
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const id = a.getAttribute('href')
        const el = document.querySelector(id)
        if (el){ e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
      })
    })
  }

  // Search functionality
  function initializeSearch() {
    const searchInput = document.getElementById('searchInput')
    const searchBtn = document.getElementById('searchBtn')
    const searchForm = document.getElementById('searchForm')
    const moodFilter = document.getElementById('moodFilter')
    const searchResults = document.getElementById('search-results')
    const searchGrid = document.getElementById('search-grid')
    const searchTitle = document.getElementById('search-title')
    const noResults = document.getElementById('no-results')
    const clearSearchBtn = document.getElementById('clearSearchBtn')
    const categorySections = document.querySelectorAll('.events-section:not(#search-results)')

    console.log('Search elements found:', {
      searchInput: !!searchInput,
      searchBtn: !!searchBtn,
      searchForm: !!searchForm,
      moodFilter: !!moodFilter,
      searchResults: !!searchResults,
      searchGrid: !!searchGrid
    })

    if (!searchInput || !searchBtn) {
      console.error('Search elements not found!')
      return
    }

    async function performSearch(query, mood) {
      console.log('Performing search for:', query, 'mood:', mood)
      
      if (!query.trim() && !mood) {
        clearSearch()
        return
      }

      // Show loading state
      searchBtn.textContent = 'Searching...'
      searchBtn.disabled = true

      try {
        let searchUrl = '/search?'
        const params = new URLSearchParams()
        if (query.trim()) params.append('query', query)
        if (mood) params.append('mood', mood)
        
        const response = await fetch(`/api/search?${params.toString()}`)
        console.log('Search response status:', response.status)
        
        if (response.ok) {
          const results = await response.json()
          console.log('Search results:', results.length, 'events found')
          displaySearchResults(results, query, mood)
        } else {
          console.error('Search failed:', response.statusText)
          alert('Search failed. Please try again.')
        }
      } catch (error) {
        console.error('Search error:', error)
        alert('Search error. Please check your connection.')
      } finally {
        // Reset button state
        searchBtn.textContent = 'Search'
        searchBtn.disabled = false
      }
    }

    function displaySearchResults(results, query, mood) {
      // Hide category sections
      categorySections.forEach(section => {
        section.style.display = 'none'
      })

      // Show search results section
      if (searchResults) {
        searchResults.style.display = 'block'
        searchResults.classList.add('search-results-enter')
        
        // Update title
        let titleText = '🔍 Search Results'
        if (query && mood) {
          titleText += ` for "${query}" with ${mood} mood`
        } else if (query) {
          titleText += ` for "${query}"`
        } else if (mood) {
          titleText += ` for ${mood} mood`
        }
        titleText += ` (${results.length})`
        
        if (searchTitle) {
          searchTitle.textContent = titleText
        }

        if (results.length > 0) {
          // Display results
          if (searchGrid) {
            searchGrid.innerHTML = results.map(createCardWithMood).join('')
            searchGrid.style.display = 'grid'
          }
          if (noResults) {
            noResults.style.display = 'none'
          }
        } else {
          // Show no results message
          if (searchGrid) {
            searchGrid.style.display = 'none'
          }
          if (noResults) {
            noResults.style.display = 'block'
          }
        }

        // Scroll to results
        searchResults.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    function clearSearch() {
      // Hide search results
      if (searchResults) {
        searchResults.style.display = 'none'
      }
      
      // Show category sections
      categorySections.forEach(section => {
        section.style.display = 'block'
      })

      // Clear search input and mood filter
      searchInput.value = ''
      if (moodFilter) {
        moodFilter.value = ''
      }
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Enhanced card creation with mood display
    function createCardWithMood(e) {
      const img = e.image_url || placeholders[e.category] || '/static/images/placeholder.svg'
      const date = e.date || ''
      const venue = e.venue || ''
      const seats = e.available_seats || ''
      const mood = e.mood || ''
      
      // Mood emoji mapping
      const moodEmojis = {
        'chill': '😌',
        'energetic': '⚡',
        'romantic': '💕',
        'learning': '📚',
        'adventure': '🎯',
        'intense': '🔥',
        'thoughtful': '🤔',
        'ambitious': '🚀',
        'creative': '🎨',
        'focused': '🎯',
        'determined': '💪',
        'mysterious': '🔮',
        'emotional': '😢'
      }
      
      const moodDisplay = mood ? `<span class="event-mood mood-${mood}">${moodEmojis[mood] || ''} ${mood.charAt(0).toUpperCase() + mood.slice(1)}</span>` : ''
      
      return `
      <div class="event-card" onclick="location.href='event-details.html?id=${e.id}'">
        <img src="${img}" alt="${e.name}" class="event-image" style="width:100%;height:200px;object-fit:cover;border-radius:12px;">
        <div class="event-info">
          <div class="event-content">
            <div class="event-badges">
              <span class="event-category">${e.category}</span>
              ${moodDisplay}
            </div>
            <h3 class="event-title">${e.name}</h3>
            <div class="event-details">
              <div class="event-detail"><i class="fas fa-calendar"></i><span>${date}</span></div>
              <div class="event-detail"><i class="fas fa-map-marker-alt"></i><span>${venue}</span></div>
              <div class="event-detail"><i class="fas fa-ticket-alt"></i><span>${seats}</span></div>
            </div>
          </div>
          <div class="event-actions">
            <a class="btn-secondary" onclick="event.stopPropagation(); location.href='event-details.html?id=${e.id}'">Book Now</a>
            <button class="btn-add-to-cart" onclick="event.stopPropagation(); addToCart(${e.id}, '${e.name}')" title="Add to Cart">
              <i class="fas fa-shopping-cart"></i> Add to Cart
            </button>
          </div>
        </div>
      </div>`
    }

    // Event listeners - Handle both AJAX and form submission
    if (searchForm) {
      // Prevent default form submission for AJAX search
      searchForm.addEventListener('submit', (e) => {
        e.preventDefault()
        const query = searchInput.value.trim()
        const mood = moodFilter ? moodFilter.value : ''
        console.log('Form submitted, query:', query, 'mood:', mood)
        
        // For better UX, redirect to search results page
        const params = new URLSearchParams()
        if (query) params.append('query', query)
        if (mood) params.append('mood', mood)
        
        window.location.href = `/search?${params.toString()}`
      })
    }

    // Alternative: AJAX search (uncomment if you prefer staying on same page)
    /*
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault()
      console.log('Search button clicked, input value:', searchInput.value)
      const mood = moodFilter ? moodFilter.value : ''
      performSearch(searchInput.value, mood)
    })

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        console.log('Enter key pressed, input value:', searchInput.value)
        const mood = moodFilter ? moodFilter.value : ''
        performSearch(searchInput.value, mood)
      }
    })
    */

    // Real-time search (optional - uncomment if you want search-as-you-type)
    // let searchTimeout
    // searchInput.addEventListener('input', (e) => {
    //   clearTimeout(searchTimeout)
    //   searchTimeout = setTimeout(() => {
    //     if (e.target.value.length >= 2) {
    //       performSearch(e.target.value)
    //     } else if (e.target.value.length === 0) {
    //       clearSearch()
    //     }
    //   }, 300)
    // })

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', clearSearch)
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    addPlaceholders()
    enableSmoothScroll()
    initializeSearch()
    try {
      const res = await fetch('/events')
      if (res.ok){ const data = await res.json(); if (Array.isArray(data) && data.length){ renderAll(data) } }
    } catch {}
  })
})()

// Global function for adding items to cart
async function addToCart(eventId, eventName) {
  console.log('Adding to cart:', eventId, eventName)
  
  try {
    // Get event details from the API
    const response = await fetch(`/event/${eventId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch event details')
    }
    
    const eventData = await response.json()
    
    // Create cart item in the format expected by the existing cart system
    const cartItem = {
      id: eventData.id,
      title: eventData.name,
      category: eventData.category || 'Event',
      price: eventData.price || 0,
      image: eventData.image_url || '/static/images/placeholder.svg',
      date: eventData.date || '2025-01-01',
      time: eventData.time || 'TBD',
      venue: eventData.venue || 'TBD'
    }
    
    // Use the existing Cart system
    if (window.Cart && window.Cart.add) {
      window.Cart.add(cartItem, 1)
      showCartMessage(`${eventName} added to cart!`, 'success')
    } else {
      throw new Error('Cart system not available')
    }
    
  } catch (error) {
    console.error('Error adding to cart:', error)
    showCartMessage(`Failed to add ${eventName} to cart. Please try again.`, 'error')
  }
}

// Function to show cart notification
function showCartMessage(message, type = 'success') {
  const notification = document.createElement('div')
  notification.className = `cart-notification ${type}`
  
  let icon = 'fas fa-shopping-cart'
  if (type === 'error') {
    icon = 'fas fa-exclamation-triangle'
  } else if (type === 'info') {
    icon = 'fas fa-info-circle'
  }
  
  notification.innerHTML = `
    <div class="notification-content">
      <i class="${icon}"></i>
      <span>${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `
  
  // Add to page
  document.body.appendChild(notification)
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove()
    }
  }, 3000)
}

// Function to update cart count in navigation
function updateCartCount() {
  if (window.Cart && window.Cart.renderCount) {
    window.Cart.renderCount()
  }
}

// Initialize cart count on page load
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount()
})


