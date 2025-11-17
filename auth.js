// Authentication System
class AuthSystem {
  constructor() {
    this.currentUser = this.getCurrentUser()
    this.initializeAuth()
  }

  initializeAuth() {
    // Try to sync existing server session
    if (window.ehApi?.me) {
      window.ehApi
        .me()
        .then((res) => {
          if (res?.user) {
            // Mirror session to local for existing site features
            localStorage.setItem("eventHubCurrentUser", JSON.stringify(res.user))
            this.currentUser = res.user
          }
          this.updateNavigation()
        })
        .catch(() => this.updateNavigation())
    } else {
      this.updateNavigation()
    }

    // Check if we're on the login page
    if (document.getElementById("loginForm")) {
      this.initializeLoginPage()
    }
  }

  initializeLoginPage() {
    const loginForm = document.getElementById("loginForm")
    const registerForm = document.getElementById("registerForm")
    const toggleLink = document.getElementById("toggleLink")
    const authTitle = document.getElementById("authTitle")
    const authSubtitle = document.getElementById("authSubtitle")
    const toggleText = document.getElementById("toggleText")

    let isLoginMode = true

    // Toggle between login and register
    toggleLink.addEventListener("click", () => {
      isLoginMode = !isLoginMode

      if (isLoginMode) {
        loginForm.style.display = "block"
        registerForm.style.display = "none"
        authTitle.textContent = "Welcome Back"
        authSubtitle.textContent = "Sign in to your Event Hub account"
        toggleText.innerHTML = 'Don\'t have an account? <span id="toggleLink">Sign up</span>'
      } else {
        loginForm.style.display = "none"
        registerForm.style.display = "block"
        authTitle.textContent = "Create Account"
        authSubtitle.textContent = "Join Event Hub and start booking"
        toggleText.innerHTML = 'Already have an account? <span id="toggleLink">Sign in</span>'
      }

      // Re-attach event listener to new toggle link
      const newToggleLink = document.getElementById("toggleLink")
      newToggleLink.addEventListener("click", () => {
        toggleLink.click()
      })
    })

    // Handle login form submission
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleLogin()
    })

    // Handle registration form submission
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault()
      this.handleRegistration()
    })

    // Social auth buttons
    document.querySelectorAll(".social-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault()
        this.handleSocialAuth(btn.classList.contains("google-btn") ? "google" : "facebook")
      })
    })
  }

  handleLogin() {
    const email = document.getElementById("loginEmail").value
    const password = document.getElementById("loginPassword").value

    const doLocal = () => {
      const users = JSON.parse(localStorage.getItem("eventHubUsers") || "[]")
      const user = users.find((u) => u.email === email && u.password === password)
      if (user) {
        this.loginUser(user)
        this.showSuccessModal("Welcome back!", "You have been logged in successfully.")
        setTimeout(() => {
          window.location.href = "profile.html"
        }, 1500)
      } else {
        this.showError("Invalid email or password. Please try again.")
      }
    }

    if (email && password) {
      if (window.ehApi?.login) {
        window.ehApi
          .login(email, password)
          .then((res) => {
            const user = res?.user || {
              id: res.user_id || email,
              email,
              name: res.name || email.split("@")[0],
              joinDate: new Date().toISOString(),
              bookings: [],
            }
            this.loginUser(user)
            this.showSuccessModal("Welcome back!", "You have been logged in successfully.")
            setTimeout(() => {
              window.location.href = "profile.html"
            }, 1500)
            try { window.ehTrace?.("login", { email }); } catch {}
          })
          .catch(() => {
            // if backend fails, fallback to local
            doLocal()
          })
      } else {
        doLocal()
      }
    } else {
      this.showError("Please fill in all fields.")
    }
  }

  handleRegistration() {
    const name = document.getElementById("registerName").value.trim()
    const email = document.getElementById("registerEmail").value.trim()
    const password = document.getElementById("registerPassword").value
    const confirmPassword = document.getElementById("confirmPassword").value

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      this.showError("Please fill in all fields.")
      return
    }

    // Name: letters and spaces only
    if (!/^[A-Za-z ]+$/.test(name)) {
      this.showError("Name must contain only letters and spaces.")
      return
    }

    // Email format
    if (!/^([\w\.-]+)@([\w\.-]+)\.[A-Za-z]{2,}$/.test(email)) {
      this.showError("Please enter a valid email address.")
      return
    }

    if (password !== confirmPassword) {
      this.showError("Passwords do not match.")
      return
    }

    if (password.length < 6) {
      this.showError("Password must be at least 6 characters long.")
      return
    }

    // Local duplicate check for UX (server also validates)
    const users = JSON.parse(localStorage.getItem("eventHubUsers") || "[]")
    if (users.find((u) => u.email === email)) {
      this.showError("An account with this email already exists.")
      return
    }

    const redirectToLogin = () => {
      this.showSuccessModal("Account created!", "Please sign in to continue.")
      setTimeout(() => {
        window.location.href = "login.html"
      }, 1200)
    }

    const doLocal = () => {
      const newUser = {
        id: Date.now().toString(),
        name: name,
        email: email,
        password: password,
        joinDate: new Date().toISOString(),
        bookings: [],
      }
      const users = JSON.parse(localStorage.getItem("eventHubUsers") || "[]")
      users.push(newUser)
      localStorage.setItem("eventHubUsers", JSON.stringify(users))
      redirectToLogin()
    }

    if (window.ehApi?.register) {
      window.ehApi
        .register(email, password, name)
        .then(() => {
          try { window.ehTrace?.("register", { email }); } catch {}
          redirectToLogin()
        })
        .catch(() => doLocal())
    } else {
      doLocal()
    }
  }

  handleSocialAuth(provider) {
    // Simulate social authentication
    const mockUser = {
      id: Date.now().toString(),
      name: provider === "google" ? "Google User" : "Facebook User",
      email: `user@${provider}.com`,
      joinDate: new Date().toISOString(),
      bookings: [],
    }

    this.loginUser(mockUser)
    this.showSuccessModal(`Welcome!`, `You have been logged in with ${provider}.`)
    setTimeout(() => {
      window.location.href = "profile.html"
    }, 2000)
  }

  loginUser(user) {
    // For new accounts, ensure completely empty bookings/favorites data
    if (user?.email) {
      const bookingsKey = `bookings_${user.email}`
      const favoritesKey = `favorites_${user.email}`
      
      // Always initialize with empty arrays for new users
      if (!localStorage.getItem(bookingsKey)) {
        localStorage.setItem(bookingsKey, JSON.stringify([]))
      }
      if (!localStorage.getItem(favoritesKey)) {
        localStorage.setItem(favoritesKey, JSON.stringify([]))
      }
    }

    // Store current user in localStorage
    localStorage.setItem("eventHubCurrentUser", JSON.stringify(user))
    this.currentUser = user
    this.updateNavigation()
    window.Cart?.renderCount?.()
  }

  logout() {
    console.log('Logout called')

    const after = () => {
      // Clear user data
      localStorage.removeItem("eventHubCurrentUser")
      this.currentUser = null
      this.updateNavigation()
      this.showNotification("You have been logged out successfully")
      setTimeout(() => {
        window.location.href = "index.html"
      }, 1200)
    }

    if (window.ehApi?.logout) {
      window.ehApi.logout().finally(after)
    } else {
      after()
    }
  }

  getCurrentUser() {
    const user = localStorage.getItem("eventHubCurrentUser")
    return user ? JSON.parse(user) : null
  }

  isLoggedIn() {
    return this.currentUser !== null
  }

  updateNavigation() {
    const profileLink = document.querySelector('a[href="profile.html"]') || document.getElementById("profileNavLink")
    const logoutNavItem = document.getElementById("logoutNavItem")

    if (profileLink) {
      const parentLi = profileLink.parentElement

      if (this.isLoggedIn()) {
        profileLink.textContent = this.currentUser.name.split(" ")[0]
        profileLink.href = "profile.html"
        profileLink.title = "View Profile"

        // Show logout option if available
        if (logoutNavItem) {
          logoutNavItem.style.display = "block"
        }
      } else {
        profileLink.textContent = "Login"
        profileLink.href = "login.html"
        profileLink.title = "Login to your account"

        // Hide logout option
        if (logoutNavItem) {
          logoutNavItem.style.display = "none"
        }
      }
    }
  }

  showSuccessModal(title, message) {
    const modal = document.getElementById("successModal")
    const titleEl = document.getElementById("successTitle")
    const messageEl = document.getElementById("successMessage")

    if (modal && titleEl && messageEl) {
      titleEl.textContent = title
      messageEl.textContent = message
      modal.style.display = "flex"
    }
  }

  showError(message) {
    // Create or update error message
    let errorEl = document.querySelector(".auth-error")
    if (!errorEl) {
      errorEl = document.createElement("div")
      errorEl.className = "auth-error"
      const authCard = document.querySelector(".auth-card")
      authCard.insertBefore(errorEl, authCard.querySelector(".auth-form"))
    }

    errorEl.textContent = message
    errorEl.style.display = "block"

    // Hide error after 5 seconds
    setTimeout(() => {
      errorEl.style.display = "none"
    }, 5000)
  }

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
  }
}

// Close success modal
function closeSuccessModal() {
  document.getElementById("successModal").style.display = "none"
}

// Global logout function for easy access
function logout() {
  if (window.authSystem) {
    window.authSystem.logout()
  } else {
    console.error('Auth system not available')
    // Fallback logout
    localStorage.removeItem("eventHubCurrentUser")
    window.location.href = "index.html"
  }
}

// Initialize auth system when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.authSystem = new AuthSystem()
  
  // Also expose logout function globally
  window.logout = logout
})
