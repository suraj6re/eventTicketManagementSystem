# EventHub.c Function Mapping Guide

## 🎯 Frontend Activity → C Function Mapping

This document shows exactly which `eventhub.c` functions are called when users perform activities in the frontend.

---

## 📊 Data Structures Used

| Data Structure | Purpose | C Functions |
|----------------|---------|-------------|
| **HashTable** | User storage, Event storage | `eh_register_user`, `eh_login_user`, `eh_add_event`, `eh_search_event`, `eh_delete_event` |
| **BST/Tree** | Category organization | `eh_add_event`, `eh_list_categories_tree`, `eh_delete_event` |
| **Queue (FIFO)** | Booking requests | `eh_book_tickets`, `eh_process_next_booking` |
| **Stack (LIFO)** | Cancellation requests | `eh_cancel_tickets`, `eh_process_last_cancellation` |
| **Graph** | Venue connections | `eh_add_venue`, `eh_add_path`, `eh_shortest_path` |

---

## 🔄 Frontend Activity Mappings

### 👤 User Authentication

#### User Registration
- **Frontend Action**: User fills registration form and clicks "Sign Up"
- **API Call**: `POST /signup`
- **C Function**: `eh_register_user(user_id, password_hash)`
- **Data Structure**: HashTable
- **Terminal Output**: 
  ```
  👤 USER_ACTION: REGISTER_USER | user_id=user@example.com
  🔧 eh_register_user() → DS: HashTable | params: user_id=user@example.com | result: success
  ```

#### User Login
- **Frontend Action**: User enters credentials and clicks "Login"
- **API Call**: `POST /login`
- **C Function**: `eh_login_user(user_id, password_hash)`
- **Data Structure**: HashTable
- **Terminal Output**:
  ```
  👤 USER_ACTION: LOGIN_USER | user_id=user@example.com
  🔧 eh_login_user() → DS: HashTable | params: user_id=user@example.com | result: success
  ```

---

### 🎭 Event Management

#### Browse Events
- **Frontend Action**: User visits homepage or category pages
- **API Call**: `GET /events` or `GET /events?category=movies`
- **C Function**: `eh_list_categories_tree()`
- **Data Structure**: BST + Tree
- **Terminal Output**:
  ```
  👤 USER_ACTION: LIST_CATEGORIES | retrieving category tree
  🔧 eh_list_categories_tree() → DS: BST + Tree | result: category tree retrieved
  ```

#### Search for Specific Event
- **Frontend Action**: User searches for event by ID or name
- **API Call**: `GET /event/{id}`
- **C Function**: `eh_search_event(event_id)`
- **Data Structure**: HashTable
- **Terminal Output**:
  ```
  👤 USER_ACTION: SEARCH_EVENT | event_id=E001
  🔧 eh_search_event() → DS: HashTable | params: event_id=E001 | result: found
  ```

#### Add New Event (Admin)
- **Frontend Action**: Admin adds new event through admin panel
- **API Call**: `POST /events`
- **C Function**: `eh_add_event(id, name, category, venue, total)`
- **Data Structure**: HashTable + BST
- **Terminal Output**:
  ```
  👤 USER_ACTION: ADD_EVENT | event_id=E001, name=Inception, category=Movies
  🔧 eh_add_event() → DS: HashTable + BST | params: event_id=E001, category=Movies, total=150 | result: success
  ```

#### Delete Event (Admin)
- **Frontend Action**: Admin deletes event
- **API Call**: `DELETE /events/{id}`
- **C Function**: `eh_delete_event(event_id)`
- **Data Structure**: HashTable + BST
- **Terminal Output**:
  ```
  👤 USER_ACTION: DELETE_EVENT | event_id=E001
  🔧 eh_delete_event() → DS: HashTable + BST | params: event_id=E001 | result: success
  ```

---

### 🎫 Booking System

#### Book Tickets
- **Frontend Action**: User selects seats and clicks "Book Now"
- **API Call**: `POST /book`
- **C Function**: `eh_book_tickets(user_id, event_id, quantity)`
- **Data Structure**: Queue (FIFO)
- **Terminal Output**:
  ```
  👤 USER_ACTION: BOOK_TICKETS | user_id=user@example.com, event_id=E001, qty=2
  🔧 eh_book_tickets() → DS: Queue (FIFO) | params: user=user@example.com, event=E001, qty=2 | result: enqueued
  ```

#### Process Booking Queue
- **Frontend Action**: System automatically processes bookings or admin triggers processing
- **API Call**: `POST /book/process`
- **C Function**: `eh_process_next_booking()`
- **Data Structure**: Queue (FIFO)
- **Terminal Output**:
  ```
  👤 USER_ACTION: PROCESS_BOOKING | processing next booking from queue
  🔧 eh_process_next_booking() → DS: Queue (FIFO) | params: dequeue operation | result: status=ok
  ```

#### Cancel Tickets
- **Frontend Action**: User clicks "Cancel Booking"
- **API Call**: `POST /cancel`
- **C Function**: `eh_cancel_tickets(user_id, event_id, quantity)`
- **Data Structure**: Stack (LIFO)
- **Terminal Output**:
  ```
  👤 USER_ACTION: CANCEL_TICKETS | user_id=user@example.com, event_id=E001, qty=1
  🔧 eh_cancel_tickets() → DS: Stack (LIFO) | params: user=user@example.com, event=E001, qty=1 | result: pushed
  ```

#### Process Cancellation Stack
- **Frontend Action**: System processes cancellations or admin triggers processing
- **API Call**: `POST /cancel/process`
- **C Function**: `eh_process_last_cancellation()`
- **Data Structure**: Stack (LIFO)
- **Terminal Output**:
  ```
  👤 USER_ACTION: PROCESS_CANCELLATION | processing last cancellation from stack
  🔧 eh_process_last_cancellation() → DS: Stack (LIFO) | params: pop operation | result: status=ok
  ```

---

### 🗺️ Venue Navigation

#### Add Venue (Admin)
- **Frontend Action**: Admin adds new venue location
- **API Call**: `POST /venues`
- **C Function**: `eh_add_venue(venue_name)`
- **Data Structure**: Graph (Node)
- **Terminal Output**:
  ```
  👤 USER_ACTION: ADD_VENUE | venue_name=Stadium_A
  🔧 eh_add_venue() → DS: Graph (Node) | params: venue=Stadium_A | result: added
  ```

#### Add Path Between Venues (Admin)
- **Frontend Action**: Admin defines routes between venues
- **API Call**: `POST /paths`
- **C Function**: `eh_add_path(from_venue, to_venue, distance)`
- **Data Structure**: Graph (Edge)
- **Terminal Output**:
  ```
  👤 USER_ACTION: ADD_PATH | from=Stadium_A, to=Stadium_B, distance=5
  🔧 eh_add_path() → DS: Graph (Edge) | params: Stadium_A ↔ Stadium_B, dist=5 | result: added
  ```

#### Find Route Between Venues
- **Frontend Action**: User requests directions between venues
- **API Call**: `GET /venues/shortest?from=A&to=B`
- **C Function**: `eh_shortest_path(from_venue, to_venue)`
- **Data Structure**: Graph + Dijkstra
- **Terminal Output**:
  ```
  👤 USER_ACTION: SHORTEST_PATH | from=Stadium_A, to=Stadium_B
  🔧 eh_shortest_path() → DS: Graph + Dijkstra | params: Stadium_A → Stadium_B | result: found: dist=5, path_len=2
  ```

---

## 🔧 System Functions

#### System Initialization
- **When**: Server starts up
- **C Function**: `eh_init()`
- **Data Structure**: All (HashTable + BST + Queue + Stack + Graph)
- **Terminal Output**:
  ```
  🔧 eh_init() → DS: HashTable + BST + Queue + Stack + Graph | result: system initialized
  🚀 EventHub C backend initialized - all data structures ready
  ```

#### System Shutdown
- **When**: Server shuts down
- **C Function**: `eh_shutdown()`
- **Data Structure**: All (cleanup)
- **Terminal Output**:
  ```
  🔧 eh_shutdown() → DS: All Data Structures | result: cleanup complete
  🔴 EventHub C backend shutdown
  ```

---

## 🎮 How to Monitor Function Calls

### Method 1: Use the Function Tracker HTML
1. Open `eventhub_function_tracker.html` in your browser
2. Click buttons to trigger different operations
3. Watch the terminal output in real-time

### Method 2: Run the Test Script
```bash
python test_function_tracking.py
```

### Method 3: Use the Flask Server
1. Start the Flask server: `python app.py`
2. Use the frontend or make API calls
3. Watch the terminal for function call logs

---

## 📈 Example Terminal Output

When a user books tickets, you'll see:
```
[14:23:45.123] EVENTHUB.C → 👤 USER_ACTION: BOOK_TICKETS | user_id=alice@example.com, event_id=E001, qty=2
[14:23:45.124] EVENTHUB.C → 🔧 eh_book_tickets() → DS: Queue (FIFO) | params: user=alice@example.com, event=E001, qty=2 | result: enqueued
[14:23:45.125] EVENTHUB.C → [QUEUE] book_tickets enqueue user=alice@example.com event=E001 qty=2
```

When the booking is processed:
```
[14:23:50.456] EVENTHUB.C → 👤 USER_ACTION: PROCESS_BOOKING | processing next booking from queue
[14:23:50.457] EVENTHUB.C → 🔧 eh_process_next_booking() → DS: Queue (FIFO) | params: dequeue operation | result: status=ok
[14:23:50.458] EVENTHUB.C → [QUEUE] processed OK user=alice@example.com event=E001 qty=2 remaining=148
```

---

## 🎯 Key Insights

1. **User Management** uses HashTable for O(1) lookup performance
2. **Event Storage** combines HashTable (fast access) + BST (organized categories)
3. **Booking System** uses Queue for fair FIFO processing
4. **Cancellation System** uses Stack for LIFO processing (most recent first)
5. **Venue Navigation** uses Graph with Dijkstra's algorithm for shortest paths

This architecture ensures efficient data access patterns matching real-world event management needs!