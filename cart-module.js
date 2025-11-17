;(() => {
  function getKey() {
    const auth = window.authSystem
    if (auth && typeof auth.isLoggedIn === "function" && auth.isLoggedIn()) {
      const user = auth.getCurrentUser?.() || auth.currentUser
      const email = user?.email || "unknown"
      return `cart_${email}`
    }
    return "cart_guest"
  }

  function get() {
    try {
      return JSON.parse(localStorage.getItem(getKey())) || []
    } catch {
      return []
    }
  }

  function set(cart) {
    localStorage.setItem(getKey(), JSON.stringify(cart || []))
    renderCount()
  }

  function count() {
    return get().reduce((t, i) => t + (Number(i.quantity) || 0), 0)
  }

  function add(item, qty = 1) {
    const cart = get()
    const idx = cart.findIndex((c) => c.id === item.id)
    if (idx >= 0) {
      cart[idx].quantity = Math.min(999, (cart[idx].quantity || 0) + qty)
    } else {
      cart.push({ ...item, quantity: Math.max(1, qty) })
    }
    set(cart)
    if (typeof window.showNotification === "function") {
      window.showNotification(`${item.title ? item.title + " " : ""}added to cart!`)
    }
    // trace client action
    try { window.ehTrace?.("add_to_cart", { id: item.id, title: item.title }); } catch {}
  }

  function clear() {
    set([])
  }

  function renderCount() {
    document.querySelectorAll(".cart-count").forEach((el) => {
      el.textContent = String(count())
    })
  }

  window.Cart = { getKey, get, set, add, count, clear, renderCount }
})()
