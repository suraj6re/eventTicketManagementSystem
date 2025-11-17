/* ========================================
   SMART EVENT TICKET BOOKING SYSTEM
   Test Program - All 3 Advanced Features
   ======================================== */

#include "native/eventhub.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int booking_counter = 5000;

void print_header(const char* title) {
  printf("\n");
  printf("========================================\n");
  printf("%s\n", title);
  printf("========================================\n\n");
}

void print_menu() {
  printf("\n--- MAIN MENU ---\n");
  printf("1. Create Event\n");
  printf("2. Initialize Buffer Seats (10%%)\n");
  printf("3. Book Tickets (Buffer System)\n");
  printf("4. Book Group Seats (Adaptive)\n");
  printf("5. Generate Ticket PDF\n");
  printf("6. Release Buffer (Admin)\n");
  printf("7. View Seat Status\n");
  printf("8. View Available Ranges\n");
  printf("9. View Event Details\n");
  printf("10. List Events by Category\n");
  printf("11. Demo: Full Workflow\n");
  printf("12. Exit\n");
  printf("\nEnter choice: ");
}

void create_event() {
  print_header("CREATE NEW EVENT");
  char event_id[64], name[128], category[32], venue[128];
  int total_seats;
  
  printf("Event ID: ");
  fgets(event_id, sizeof(event_id), stdin);
  event_id[strcspn(event_id, "\n")] = 0;
  
  printf("Event Name: ");
  fgets(name, sizeof(name), stdin);
  name[strcspn(name, "\n")] = 0;
  
  printf("Category (Movies/Plays/Sports/Concerts): ");
  fgets(category, sizeof(category), stdin);
  category[strcspn(category, "\n")] = 0;
  
  printf("Venue: ");
  fgets(venue, sizeof(venue), stdin);
  venue[strcspn(venue, "\n")] = 0;
  
  printf("Total Seats: ");
  scanf("%d", &total_seats);
  getchar();
  
  if (eh_add_event(event_id, name, category, venue, total_seats)) {
    printf("\n[OK] Event created: %s (%d seats)\n", name, total_seats);
  } else {
    printf("\n[FAIL] Failed to create event\n");
  }
}

void init_buffer() {
  print_header("INITIALIZE BUFFER SEATS");
  char event_id[64];
  printf("Event ID: ");
  fgets(event_id, sizeof(event_id), stdin);
  event_id[strcspn(event_id, "\n")] = 0;
  
  if (eh_initialize_buffer_seats(event_id)) {
    printf("\n[OK] Buffer initialized (10%% reserved)\n");
  } else {
    printf("\n[FAIL] Failed to initialize buffer\n");
  }
}

void book_tickets() {
  print_header("BOOK TICKETS (BUFFER SYSTEM)");
  char user_id[64], event_id[64];
  int qty;
  
  printf("User ID: ");
  fgets(user_id, sizeof(user_id), stdin);
  user_id[strcspn(user_id, "\n")] = 0;
  
  printf("Event ID: ");
  fgets(event_id, sizeof(event_id), stdin);
  event_id[strcspn(event_id, "\n")] = 0;
  
  printf("Quantity: ");
  scanf("%d", &qty);
  getchar();
  
  if (eh_book_with_buffer(user_id, event_id, qty)) {
    printf("\n[OK] Booking successful!\n");
    printf("Booking ID: %d\n", ++booking_counter);
  } else {
    printf("\n[FAIL] Booking failed\n");
  }
}

void book_group() {
  print_header("BOOK GROUP SEATS (ADAPTIVE)");
  char user_id[64], event_id[64];
  int size;
  
  printf("User ID: ");
  fgets(user_id, sizeof(user_id), stdin);
  user_id[strcspn(user_id, "\n")] = 0;
  
  printf("Event ID: ");
  fgets(event_id, sizeof(event_id), stdin);
  event_id[strcspn(event_id, "\n")] = 0;
  
  printf("Group Size: ");
  scanf("%d", &size);
  getchar();
  
  if (eh_book_group_seats(user_id, event_id, size)) {
    printf("\n[OK] Group booking successful!\n");
    printf("Booking ID: %d\n", ++booking_counter);
  } else {
    printf("\n[FAIL] Group booking failed (no consecutive seats)\n");
  }
}

void gen_ticket() {
  print_header("GENERATE TICKET PDF");
  char user_id[64], event_id[64];
  int booking_id, seat_count;
  
  printf("User ID: ");
  fgets(user_id, sizeof(user_id), stdin);
  user_id[strcspn(user_id, "\n")] = 0;
  
  printf("Event ID: ");
  fgets(event_id, sizeof(event_id), stdin);
  event_id[strcspn(event_id, "\n")] = 0;
  
  printf("Booking ID: ");
  scanf("%d", &booking_id);
  getchar();
  
  printf("Seat Count: ");
  scanf("%d", &seat_count);
  getchar();
  
  int* seats = (int*)malloc(seat_count * sizeof(int));
  for (int i = 0; i < seat_count; i++) {
    printf("Seat %d: ", i + 1);
    scanf("%d", &seats[i]);
  }
  getchar();
  
  if (eh_generate_ticket_pdf(user_id, event_id, booking_id, seats, seat_count)) {
    char* path = eh_get_ticket_path(booking_id);
    printf("\n[OK] Ticket generated!\n");
    printf("Path: %s\n", path);
    eh_free(path);
  } else {
    printf("\n[FAIL] Failed to generate ticket\n");
  }
  free(seats);
}

void release_buffer() {
  print_header("RELEASE BUFFER SEATS");
  char event_id[64];
  printf("Event ID: ");
  fgets(event_id, sizeof(event_id), stdin);
  event_id[strcspn(event_id, "\n")] = 0;
  
  if (eh_release_buffer_seats(event_id)) {
    printf("\n[OK] Buffer released\n");
  } else {
    printf("\n[FAIL] Failed to release buffer\n");
  }
}

void view_status() {
  print_header("VIEW SEAT STATUS");
  char event_id[64];
  printf("Event ID: ");
  fgets(event_id, sizeof(event_id), stdin);
  event_id[strcspn(event_id, "\n")] = 0;
  
  char* status = eh_get_seat_status(event_id);
  if (status) {
    printf("\n%s\n", status);
    eh_free(status);
  } else {
    printf("\n[FAIL] Event not found\n");
  }
}

void view_ranges() {
  print_header("VIEW AVAILABLE SEAT RANGES");
  char event_id[64];
  printf("Event ID: ");
  fgets(event_id, sizeof(event_id), stdin);
  event_id[strcspn(event_id, "\n")] = 0;
  
  char* ranges = eh_get_available_seat_ranges(event_id);
  if (ranges) {
    printf("\n%s\n", ranges);
    eh_free(ranges);
  } else {
    printf("\n[FAIL] Event not found\n");
  }
}

void view_event() {
  print_header("VIEW EVENT DETAILS");
  char event_id[64];
  printf("Event ID: ");
  fgets(event_id, sizeof(event_id), stdin);
  event_id[strcspn(event_id, "\n")] = 0;
  
  char* details = eh_search_event(event_id);
  if (details) {
    printf("\n%s\n", details);
    eh_free(details);
  } else {
    printf("\n[FAIL] Event not found\n");
  }
}

void list_categories() {
  print_header("LIST EVENTS BY CATEGORY");
  char* tree = eh_list_categories_tree();
  if (tree) {
    printf("%s\n", tree);
    eh_free(tree);
  } else {
    printf("[FAIL] Failed to retrieve categories\n");
  }
}

void demo_workflow() {
  print_header("DEMO: COMPLETE WORKFLOW");
  
  printf("Step 1: Create event with 100 seats...\n");
  eh_add_event("demo001", "Concert 2025", "Concerts", "Stadium", 100);
  
  printf("Step 2: Initialize buffer (10%% = 10 seats hidden)...\n");
  eh_initialize_buffer_seats("demo001");
  
  printf("Step 3: Book 50 tickets (user1)...\n");
  eh_book_with_buffer("user1", "demo001", 50);
  
  printf("Step 4: Book 30 tickets (user2)...\n");
  eh_book_with_buffer("user2", "demo001", 30);
  
  printf("Step 5: View seat status...\n");
  char* status = eh_get_seat_status("demo001");
  if (status) printf("%s\n", status);
  eh_free(status);
  
  printf("\nStep 6: Book 10 more tickets (user3) - triggers buffer release...\n");
  eh_book_with_buffer("user3", "demo001", 10);
  
  printf("Step 7: View status after buffer release...\n");
  status = eh_get_seat_status("demo001");
  if (status) printf("%s\n", status);
  eh_free(status);
  
  printf("\nStep 8: Book group of 5 consecutive seats...\n");
  eh_book_group_seats("family1", "demo001", 5);
  
  printf("Step 9: View available ranges...\n");
  char* ranges = eh_get_available_seat_ranges("demo001");
  if (ranges) printf("%s\n", ranges);
  eh_free(ranges);
  
  printf("\nStep 10: Generate ticket PDF...\n");
  int seats[] = {15, 16, 17};
  eh_generate_ticket_pdf("user1", "demo001", 5001, seats, 3);
  char* path = eh_get_ticket_path(5001);
  printf("Ticket saved to: %s\n", path);
  eh_free(path);
  
  printf("\n[OK] Demo complete!\n");
}

int main() {
  eh_init();
  
  print_header("SMART EVENT TICKET BOOKING SYSTEM");
  printf("Features:\n");
  printf("  1. 10%% Buffer Seat Reservation\n");
  printf("  2. Adaptive Group Inventory (Segment Tree)\n");
  printf("  3. PDF Ticket Download\n\n");
  
  int choice;
  while (1) {
    print_menu();
    scanf("%d", &choice);
    getchar();
    
    switch (choice) {
      case 1: create_event(); break;
      case 2: init_buffer(); break;
      case 3: book_tickets(); break;
      case 4: book_group(); break;
      case 5: gen_ticket(); break;
      case 6: release_buffer(); break;
      case 7: view_status(); break;
      case 8: view_ranges(); break;
      case 9: view_event(); break;
      case 10: list_categories(); break;
      case 11: demo_workflow(); break;
      case 12:
        printf("\nShutting down...\n");
        eh_shutdown();
        printf("Goodbye!\n\n");
        return 0;
      default:
        printf("\n[FAIL] Invalid choice\n");
    }
  }
  return 0;
}

