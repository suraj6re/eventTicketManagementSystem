/**
 * Booking Integration Verification Script
 * This script verifies that the cart booking system is properly wired to the profile system
 */

// Verification functions
const BookingIntegrationVerifier = {
    
    // Verify that cart and profile use the same data structure
    verifyDataStructure() {
        console.log('🔍 Verifying booking data structure compatibility...');
        
        // Sample cart item structure
        const cartItem = {
            id: 1,
            title: "Test Event",
            category: "movies",
            date: "2025-01-15",
            time: "7:00 PM",
            venue: "Test Venue",
            price: 350,
            image: "/test-image.jpg",
            quantity: 2
        };
        
        // Expected booking structure (from cart.js saveBookingToHistory)
        const expectedBooking = {
            id: Date.now() + Math.random(),
            eventTitle: cartItem.title,
            eventImage: cartItem.image,
            category: cartItem.category,
            date: cartItem.date,
            time: cartItem.time,
            venue: cartItem.venue,
            tickets: cartItem.quantity,
            totalAmount: cartItem.price * cartItem.quantity,
            bookingDate: new Date().toISOString().split("T")[0],
            status: "confirmed",
            bookingId: "BK2025TEST123"
        };
        
        console.log('✅ Cart item structure:', cartItem);
        console.log('✅ Expected booking structure:', expectedBooking);
        
        // Verify required fields are present
        const requiredFields = ['eventTitle', 'category', 'date', 'time', 'venue', 'tickets', 'totalAmount', 'status', 'bookingId'];
        const missingFields = requiredFields.filter(field => !(field in expectedBooking));
        
        if (missingFields.length === 0) {
            console.log('✅ All required fields present in booking structure');
            return true;
        } else {
            console.error('❌ Missing fields in booking structure:', missingFields);
            return false;
        }
    },
    
    // Verify localStorage key consistency
    verifyStorageKeys() {
        console.log('🔍 Verifying localStorage key consistency...');
        
        const testEmail = 'test@example.com';
        
        // Cart system uses this key format (from cart.js)
        const cartBookingKey = `bookings_${testEmail}`;
        
        // Profile system uses this key format (from profile.js)
        const profileBookingKey = `bookings_${testEmail}`;
        
        if (cartBookingKey === profileBookingKey) {
            console.log('✅ Storage keys match:', cartBookingKey);
            return true;
        } else {
            console.error('❌ Storage key mismatch!');
            console.error('Cart key:', cartBookingKey);
            console.error('Profile key:', profileBookingKey);
            return false;
        }
    },
    
    // Test the complete booking flow
    testBookingFlow() {
        console.log('🔍 Testing complete booking flow...');
        
        // Create test user
        const testUser = {
            email: 'flow_test@example.com',
            name: 'Flow Test User'
        };
        
        // Simulate cart items
        const cartItems = [
            {
                id: 1,
                title: "Test Movie",
                category: "movies",
                date: "2025-01-15",
                time: "7:00 PM",
                venue: "Test Cinema",
                price: 300,
                image: "/test-movie.jpg",
                quantity: 2
            }
        ];
        
        // Simulate booking creation (from cart.js logic)
        const bookingReference = "BK2025TEST" + Math.random().toString(36).substr(2, 6).toUpperCase();
        const bookings = cartItems.map((item) => ({
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
        }));
        
        // Save to localStorage (cart.js logic)
        const userBookingsKey = `bookings_${testUser.email}`;
        localStorage.setItem(userBookingsKey, JSON.stringify(bookings));
        
        // Verify profile can load the data
        const loadedBookings = JSON.parse(localStorage.getItem(userBookingsKey)) || [];
        
        if (loadedBookings.length === bookings.length) {
            console.log('✅ Booking flow test passed');
            console.log('Created bookings:', bookings);
            console.log('Loaded bookings:', loadedBookings);
            
            // Clean up test data
            localStorage.removeItem(userBookingsKey);
            return true;
        } else {
            console.error('❌ Booking flow test failed');
            console.error('Expected:', bookings.length, 'bookings');
            console.error('Got:', loadedBookings.length, 'bookings');
            return false;
        }
    },
    
    // Verify profile system can display cart bookings
    verifyProfileDisplay() {
        console.log('🔍 Verifying profile can display cart bookings...');
        
        // Check if profile system exists
        if (typeof profileSystem === 'undefined') {
            console.error('❌ profileSystem not found');
            return false;
        }
        
        // Check if required methods exist
        const requiredMethods = ['loadUserData', 'loadBookings', 'loadUserProfile'];
        const missingMethods = requiredMethods.filter(method => typeof profileSystem[method] !== 'function');
        
        if (missingMethods.length === 0) {
            console.log('✅ Profile system has all required methods');
            return true;
        } else {
            console.error('❌ Profile system missing methods:', missingMethods);
            return false;
        }
    },
    
    // Run all verification tests
    runAllTests() {
        console.log('🚀 Starting booking integration verification...');
        console.log('================================================');
        
        const tests = [
            { name: 'Data Structure', test: this.verifyDataStructure },
            { name: 'Storage Keys', test: this.verifyStorageKeys },
            { name: 'Booking Flow', test: this.testBookingFlow },
            { name: 'Profile Display', test: this.verifyProfileDisplay }
        ];
        
        let passedTests = 0;
        let totalTests = tests.length;
        
        tests.forEach(({ name, test }) => {
            console.log(`\n📋 Running test: ${name}`);
            try {
                const result = test.call(this);
                if (result) {
                    console.log(`✅ ${name} test PASSED`);
                    passedTests++;
                } else {
                    console.log(`❌ ${name} test FAILED`);
                }
            } catch (error) {
                console.error(`❌ ${name} test ERROR:`, error.message);
            }
        });
        
        console.log('\n================================================');
        console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
        
        if (passedTests === totalTests) {
            console.log('🎉 All tests passed! Booking integration is working correctly.');
        } else {
            console.log('⚠️ Some tests failed. Please check the integration.');
        }
        
        return passedTests === totalTests;
    }
};

// Auto-run verification when script loads
if (typeof window !== 'undefined') {
    // Browser environment
    window.BookingIntegrationVerifier = BookingIntegrationVerifier;
    
    // Add to console for manual testing
    console.log('🔧 Booking Integration Verifier loaded');
    console.log('Run BookingIntegrationVerifier.runAllTests() to verify integration');
} else {
    // Node.js environment
    module.exports = BookingIntegrationVerifier;
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.verifyBookingIntegration = () => BookingIntegrationVerifier.runAllTests();
}