/**
 * Fix for new user profile issue
 * This script ensures new users start with completely empty profiles
 */

// Function to clear all user data for testing
function clearAllUserData() {
    const currentUser = JSON.parse(localStorage.getItem("eventHubCurrentUser"));
    if (!currentUser) {
        console.log("No user logged in");
        return;
    }
    
    const email = currentUser.email;
    localStorage.setItem(`bookings_${email}`, JSON.stringify([]));
    localStorage.setItem(`favorites_${email}`, JSON.stringify([]));
    
    console.log(`Cleared all data for user: ${email}`);
    
    // Reload the page to see changes
    if (window.location.pathname.includes('profile.html')) {
        window.location.reload();
    }
}

// Function to verify user has empty profile
function verifyEmptyProfile() {
    const currentUser = JSON.parse(localStorage.getItem("eventHubCurrentUser"));
    if (!currentUser) {
        console.log("No user logged in");
        return false;
    }
    
    const email = currentUser.email;
    const bookings = JSON.parse(localStorage.getItem(`bookings_${email}`) || '[]');
    const favorites = JSON.parse(localStorage.getItem(`favorites_${email}`) || '[]');
    const totalSpent = bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0);
    
    console.log(`User: ${email}`);
    console.log(`Bookings: ${bookings.length}`);
    console.log(`Favorites: ${favorites.length}`);
    console.log(`Total Spent: ₹${totalSpent}`);
    
    const isEmpty = bookings.length === 0 && favorites.length === 0 && totalSpent === 0;
    console.log(`Profile is empty: ${isEmpty}`);
    
    return isEmpty;
}

// Function to ensure new user gets empty profile
function ensureEmptyProfileForNewUser(userEmail) {
    if (!userEmail) return;
    
    // Force empty arrays for new users
    localStorage.setItem(`bookings_${userEmail}`, JSON.stringify([]));
    localStorage.setItem(`favorites_${userEmail}`, JSON.stringify([]));
    
    console.log(`Initialized empty profile for new user: ${userEmail}`);
}

// Enhanced auth system patch
if (window.authSystem) {
    const originalLoginUser = window.authSystem.loginUser;
    window.authSystem.loginUser = function(user) {
        // Ensure new users get empty profiles
        if (user?.email) {
            ensureEmptyProfileForNewUser(user.email);
        }
        
        // Call original function
        return originalLoginUser.call(this, user);
    };
}

// Add to window for console access
window.clearAllUserData = clearAllUserData;
window.verifyEmptyProfile = verifyEmptyProfile;
window.ensureEmptyProfileForNewUser = ensureEmptyProfileForNewUser;

console.log("New user profile fix loaded. Available functions:");
console.log("- clearAllUserData() - Clear current user's data");
console.log("- verifyEmptyProfile() - Check if current user has empty profile");
console.log("- ensureEmptyProfileForNewUser(email) - Force empty profile for user");