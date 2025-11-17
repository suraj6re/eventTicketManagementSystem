#!/usr/bin/env python3
"""
Simple script to trigger eventhub.c functions and show output in terminal
"""

import sys
import time
from pathlib import Path

# Add the project root to Python path
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from scripts.eventhub_binding import EventHub

def main():
    print("🚀 Triggering EventHub.c functions - watch your terminal!")
    print("=" * 60)
    
    # Initialize EventHub
    eh = EventHub()
    
    print("\n1. 👤 USER REGISTRATION:")
    eh.register_user("alice@test.com", "password123")
    time.sleep(0.5)
    
    print("\n2. 👤 USER LOGIN:")
    eh.login_user("alice@test.com", "password123")
    time.sleep(0.5)
    
    print("\n3. 🎭 ADD EVENT:")
    eh.add_event("E001", "Inception Movie", "Movies", "IMAX Theater", 150)
    time.sleep(0.5)
    
    print("\n4. 🔍 SEARCH EVENT:")
    result = eh.search_event_json("E001")
    print(f"Found: {result[:50] if result else 'None'}...")
    time.sleep(0.5)
    
    print("\n5. 📋 LIST CATEGORIES:")
    categories = eh.list_categories_json()
    print(f"Categories: {categories[:100] if categories else 'None'}...")
    time.sleep(0.5)
    
    print("\n6. 🎫 BOOK TICKETS (Queue):")
    eh.book("alice@test.com", "E001", 2)
    time.sleep(0.5)
    
    print("\n7. ⚡ PROCESS BOOKING (Queue FIFO):")
    booking_result = eh.process_next_booking_json()
    print(f"Booking result: {booking_result[:80] if booking_result else 'None'}...")
    time.sleep(0.5)
    
    print("\n8. ❌ CANCEL TICKETS (Stack):")
    eh.cancel("alice@test.com", "E001", 1)
    time.sleep(0.5)
    
    print("\n9. ⚡ PROCESS CANCELLATION (Stack LIFO):")
    cancel_result = eh.process_last_cancellation_json()
    print(f"Cancel result: {cancel_result[:80] if cancel_result else 'None'}...")
    time.sleep(0.5)
    
    print("\n10. 🗺️ ADD VENUES (Graph):")
    eh.add_venue("Stadium_A")
    eh.add_venue("Stadium_B")
    time.sleep(0.5)
    
    print("\n11. 🛤️ ADD PATH (Graph Edge):")
    eh.add_path("Stadium_A", "Stadium_B", 5)
    time.sleep(0.5)
    
    print("\n12. 🎯 SHORTEST PATH (Dijkstra):")
    path_result = eh.shortest_path_json("Stadium_A", "Stadium_B")
    print(f"Path result: {path_result[:80] if path_result else 'None'}...")
    time.sleep(0.5)
    
    print("\n" + "=" * 60)
    print("✅ All EventHub.c functions have been triggered!")
    print("📊 Check the colored output above to see function calls")
    
    # Clean shutdown
    print("\n🔴 Shutting down...")
    eh.shutdown()

if __name__ == "__main__":
    main()