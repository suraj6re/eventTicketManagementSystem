#ifndef EVENTHUB_H
#define EVENTHUB_H

#ifdef __cplusplus
extern "C" {
#endif

#include <stddef.h>
#include <stdint.h>

// Initialization / Shutdown
void eh_init(void);
void eh_shutdown(void);

// Memory management for JSON strings returned by the library
void eh_free(char* ptr);

// ===== Users (Hashing) =====
int eh_register_user(const char* user_id, const char* password_hash);
int eh_login_user(const char* user_id, const char* password_hash);

// ===== Events (Hashing + Tree categories) =====
// categories must be one of: "Movies", "Plays", "Sports", "Concerts"
int   eh_add_event(const char* event_id, const char* name, const char* category, const char* venue, int total_tickets);
int   eh_delete_event(const char* event_id);
char* eh_search_event(const char* event_id);            // returns JSON or NULL
char* eh_list_categories_tree(void);                    // returns JSON tree of categories and events

// ===== Bookings (Queue) =====
int   eh_book_tickets(const char* user_id, const char* event_id, int quantity); // enqueue request
char* eh_process_next_booking(void);                                             // process FIFO booking, returns JSON result

// ===== Cancellations (Stack) =====
int   eh_cancel_tickets(const char* user_id, const char* event_id, int quantity); // push cancellation
char* eh_process_last_cancellation(void);                                         // pop LIFO, returns JSON result

// ===== Venues Graph (Shortest Path) =====
int   eh_add_venue(const char* venue_name);
int   eh_add_path(const char* from_venue, const char* to_venue, int distance); // undirected
char* eh_shortest_path(const char* from_venue, const char* to_venue);          // returns JSON or NULL

#ifdef __cplusplus
}
#endif

#endif // EVENTHUB_H
