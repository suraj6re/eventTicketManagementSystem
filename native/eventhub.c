#include "eventhub.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <limits.h>

/* =========================
   Utilities
   ========================= */
static char* eh_strdup(const char* s) {
  if (!s) return NULL;
  size_t n = strlen(s) + 1;
  char* p = (char*)malloc(n);
  if (p) memcpy(p, s, n);
  return p;
}

void eh_free(char* ptr) {
  free(ptr);
}

static unsigned long hash_str(const char* str) {
  // djb2
  unsigned long hash = 5381;
  int c;
  while ((c = *str++)) {
    hash = ((hash << 5) + hash) + (unsigned char)c;
  }
  return hash;
}

static int streq(const char* a, const char* b) {
  return a && b && strcmp(a, b) == 0;
}

/* =========================
   Users Hash Table
   ========================= */
#define USERS_BUCKETS 1024

typedef struct UserNode {
  char* user_id;
  char* pwd_hash;
  struct UserNode* next;
} UserNode;

static UserNode* users_ht[USERS_BUCKETS];

static void users_ht_init(void) {
  memset(users_ht, 0, sizeof(users_ht));
}
static void users_ht_free(void) {
  for (size_t i = 0; i < USERS_BUCKETS; i++) {
    UserNode* n = users_ht[i];
    while (n) {
      UserNode* tmp = n->next;
      free(n->user_id);
      free(n->pwd_hash);
      free(n);
      n = tmp;
    }
    users_ht[i] = NULL;
  }
}
static UserNode* users_ht_get(const char* user_id) {
  unsigned long h = hash_str(user_id) % USERS_BUCKETS;
  UserNode* n = users_ht[h];
  while (n) {
    if (streq(n->user_id, user_id)) return n;
    n = n->next;
  }
  return NULL;
}
static int users_ht_set(const char* user_id, const char* pwd_hash) {
  unsigned long h = hash_str(user_id) % USERS_BUCKETS;
  UserNode* n = users_ht[h];
  while (n) {
    if (streq(n->user_id, user_id)) {
      // update
      free(n->pwd_hash);
      n->pwd_hash = eh_strdup(pwd_hash);
      return 1;
    }
    n = n->next;
  }
  // insert
  UserNode* u = (UserNode*)calloc(1, sizeof(UserNode));
  if (!u) return 0;
  u->user_id = eh_strdup(user_id);
  u->pwd_hash = eh_strdup(pwd_hash);
  u->next = users_ht[h];
  users_ht[h] = u;
  return 1;
}

int eh_register_user(const char* user_id, const char* password_hash) {
  if (!user_id || !password_hash) return 0;
  printf("[USERS] register user_id=%s\n", user_id);
  return users_ht_set(user_id, password_hash);
}
int eh_login_user(const char* user_id, const char* password_hash) {
  if (!user_id || !password_hash) return 0;
  UserNode* u = users_ht_get(user_id);
  printf("[USERS] login user_id=%s result=%s\n", user_id, (u && streq(u->pwd_hash, password_hash))?"ok":"fail");
  return (u && streq(u->pwd_hash, password_hash)) ? 1 : 0;
}

/* =========================
   Events Hash Table + Category Tree
   ========================= */
#define EVENTS_BUCKETS 1024

typedef struct Event {
  char* id;
  char* name;
  char* category;
  char* venue;
  int   total;
  int   available;
  struct Event* next; // hash chain
} Event;

static Event* events_ht[EVENTS_BUCKETS];

static void events_ht_init(void) { memset(events_ht, 0, sizeof(events_ht)); }
static void events_ht_free(void) {
  for (size_t i = 0; i < EVENTS_BUCKETS; i++) {
    Event* e = events_ht[i];
    while (e) {
      Event* tmp = e->next;
      free(e->id);
      free(e->name);
      free(e->category);
      free(e->venue);
      free(e);
      e = tmp;
    }
    events_ht[i] = NULL;
  }
}
static Event* events_ht_get(const char* id) {
  unsigned long h = hash_str(id) % EVENTS_BUCKETS;
  Event* e = events_ht[h];
  while (e) {
    if (streq(e->id, id)) return e;
    e = e->next;
  }
  return NULL;
}
static int events_ht_set(const char* id, const char* name, const char* category, const char* venue, int total) {
  unsigned long h = hash_str(id) % EVENTS_BUCKETS;
  Event* e = events_ht[h];
  while (e) {
    if (streq(e->id, id)) {
      // update existing
      free(e->name); e->name = eh_strdup(name);
      free(e->category); e->category = eh_strdup(category);
      free(e->venue); e->venue = eh_strdup(venue);
      e->total = total;
      if (e->available > total) e->available = total;
      return 1;
    }
    e = e->next;
  }
  // insert
  Event* ne = (Event*)calloc(1, sizeof(Event));
  if (!ne) return 0;
  ne->id = eh_strdup(id);
  ne->name = eh_strdup(name);
  ne->category = eh_strdup(category);
  ne->venue = eh_strdup(venue);
  ne->total = total;
  ne->available = total;
  ne->next = events_ht[h];
  events_ht[h] = ne;
  return 1;
}
static int events_ht_del(const char* id) {
  unsigned long h = hash_str(id) % EVENTS_BUCKETS;
  Event* e = events_ht[h];
  Event* prev = NULL;
  while (e) {
    if (streq(e->id, id)) {
      if (prev) prev->next = e->next; else events_ht[h] = e->next;
      free(e->id);
      free(e->name);
      free(e->category);
      free(e->venue);
      free(e);
      return 1;
    }
    prev = e; e = e->next;
  }
  return 0;
}

// Category Tree: fixed root categories; Each node holds event IDs list
typedef struct CatEventNode {
  char* event_id;
  struct CatEventNode* next;
} CatEventNode;

typedef struct CategoryNode {
  char* name;
  CatEventNode* events;      // linked list of event ids in this category
  struct CategoryNode* next; // siblings (we use a simple list for the four root categories)
} CategoryNode;

static CategoryNode* categories_root = NULL;

static CategoryNode* category_find(const char* name) {
  CategoryNode* c = categories_root;
  while (c) {
    if (streq(c->name, name)) return c;
    c = c->next;
  }
  return NULL;
}

static void category_add_event(const char* category, const char* event_id) {
  CategoryNode* c = category_find(category);
  if (!c) return;
  // prevent duplicates
  CatEventNode* n = c->events;
  while (n) {
    if (streq(n->event_id, event_id)) return;
    n = n->next;
  }
  // prepend
  CatEventNode* ce = (CatEventNode*)calloc(1, sizeof(CatEventNode));
  if (!ce) return;
  ce->event_id = eh_strdup(event_id);
  ce->next = c->events;
  c->events = ce;
}

static void category_remove_event(const char* category, const char* event_id) {
  CategoryNode* c = category_find(category);
  if (!c) return;
  CatEventNode* n = c->events;
  CatEventNode* prev = NULL;
  while (n) {
    if (streq(n->event_id, event_id)) {
      if (prev) prev->next = n->next; else c->events = n->next;
      free(n->event_id); free(n);
      return;
    }
    prev = n; n = n->next;
  }
}

static void categories_init(void) {
  // Create four root categories: Movies, Plays, Sports, Concerts
  const char* names[4] = {"Movies","Plays","Sports","Concerts"};
  CategoryNode* head = NULL;
  CategoryNode* tail = NULL;
  for (int i = 0; i < 4; i++) {
    CategoryNode* c = (CategoryNode*)calloc(1, sizeof(CategoryNode));
    c->name = eh_strdup(names[i]);
    c->events = NULL;
    c->next = NULL;
    if (!head) { head = tail = c; } else { tail->next = c; tail = c; }
  }
  categories_root = head;
}

static void categories_free(void) {
  CategoryNode* c = categories_root;
  while (c) {
    CategoryNode* tmp = c->next;
    CatEventNode* e = c->events;
    while (e) {
      CatEventNode* et = e->next;
      free(e->event_id);
      free(e);
      e = et;
    }
    free(c->name);
    free(c);
    c = tmp;
  }
  categories_root = NULL;
}

int eh_add_event(const char* event_id, const char* name, const char* category, const char* venue, int total_tickets) {
  if (!event_id || !name || !category || !venue || total_tickets < 0) return 0;
  if (!streq(category,"Movies") && !streq(category,"Plays") && !streq(category,"Sports") && !streq(category,"Concerts")) {
    printf("[EVENTS] add_event rejected id=%s name=%s category=%s venue=%s total=%d\n", event_id, name, category, venue, total_tickets);
    return 0;
  }
  printf("[EVENTS] add_event id=%s name=%s category=%s venue=%s total=%d\n", event_id, name, category, venue, total_tickets);
  if (!events_ht_set(event_id, name, category, venue, total_tickets)) return 0;
  category_add_event(category, event_id);
  return 1;
}

int eh_delete_event(const char* event_id) {
  if (!event_id) return 0;
  printf("[EVENTS] delete_event id=%s\n", event_id);
  Event* e = events_ht_get(event_id);
  if (!e) return 0;
  category_remove_event(e->category, event_id);
  return events_ht_del(event_id);
}

char* eh_search_event(const char* event_id) {
  if (!event_id) return NULL;
  Event* e = events_ht_get(event_id);
  printf("[EVENTS] search_event id=%s found=%s\n", event_id, e?"yes":"no");
  if (!e) return NULL;
  // build JSON
  char buf[1024];
  snprintf(buf, sizeof(buf),
    "{\"id\":\"%s\",\"name\":\"%s\",\"category\":\"%s\",\"venue\":\"%s\",\"total\":%d,\"available\":%d}",
    e->id, e->name, e->category, e->venue, e->total, e->available);
  return eh_strdup(buf);
}

char* eh_list_categories_tree(void) {
  printf("[EVENTS] list_categories_tree\n");
  // Build JSON: [{ "name": "...", "events": ["id1","id2"] }, ...]
  // Simple buffer growth strategy
  size_t cap = 4096;
  char* json = (char*)malloc(cap);
  if (!json) return NULL;
  size_t len = 0;
  #define APPEND_FMT(fmt, ...) do { \
    char tmp[1024]; \
    int n = snprintf(tmp, sizeof(tmp), fmt, __VA_ARGS__); \
    if ((size_t)(len + n + 1) >= cap) { \
      cap = (cap + n + 1024); \
      char* nj = (char*)realloc(json, cap); \
      if (!nj) { free(json); return NULL; } \
      json = nj; \
    } \
    memcpy(json + len, tmp, n); \
    len += n; \
    json[len] = '\0'; \
  } while (0)

  APPEND_FMT("%s","[");
  CategoryNode* c = categories_root;
  int firstCat = 1;
  while (c) {
    if (!firstCat) APPEND_FMT("%s",",");
    firstCat = 0;
    APPEND_FMT("{\"name\":\"%s\",\"events\":[", c->name);
    CatEventNode* e = c->events;
    int firstEv = 1;
    while (e) {
      if (!firstEv) APPEND_FMT("%s",",");
      firstEv = 0;
      APPEND_FMT("\"%s\"", e->event_id);
      e = e->next;
    }
    APPEND_FMT("%s","]}");
    c = c->next;
  }
  APPEND_FMT("%s","]");
  #undef APPEND_FMT
  return json;
}

/* =========================
   Booking Queue
   ========================= */
typedef struct BookingReq {
  char* user_id;
  char* event_id;
  int quantity;
  struct BookingReq* next;
} BookingReq;

static BookingReq* q_head = NULL;
static BookingReq* q_tail = NULL;

int eh_book_tickets(const char* user_id, const char* event_id, int quantity) {
  if (!user_id || !event_id || quantity <= 0) return 0;
  BookingReq* br = (BookingReq*)calloc(1, sizeof(BookingReq));
  if (!br) return 0;
  br->user_id = eh_strdup(user_id);
  br->event_id = eh_strdup(event_id);
  br->quantity = quantity;
  br->next = NULL;
  if (!q_tail) { q_head = q_tail = br; }
  else { q_tail->next = br; q_tail = br; }
  printf("[QUEUE] book_tickets enqueue user=%s event=%s qty=%d\n", user_id, event_id, quantity);
  return 1;
}

char* eh_process_next_booking(void) {
  if (!q_head) {
    printf("[QUEUE] process_next empty\n");
    return eh_strdup("{\"status\":\"empty\",\"message\":\"No pending bookings\"}");
  }
  BookingReq* br = q_head;
  q_head = br->next;
  if (!q_head) q_tail = NULL;

  Event* e = events_ht_get(br->event_id);
  int ok = 0;
  if (e && e->available >= br->quantity) {
    e->available -= br->quantity;
    ok = 1;
  }
  char buf[512];
  if (ok) {
    snprintf(buf, sizeof(buf),
      "{\"status\":\"ok\",\"user\":\"%s\",\"event\":\"%s\",\"quantity\":%d,\"remaining\":%d}",
      br->user_id, br->event_id, br->quantity, e ? e->available : -1);
    printf("[QUEUE] processed OK user=%s event=%s qty=%d remaining=%d\n", br->user_id, br->event_id, br->quantity, e?e->available:-1);
  } else {
    snprintf(buf, sizeof(buf),
      "{\"status\":\"fail\",\"user\":\"%s\",\"event\":\"%s\",\"quantity\":%d,\"reason\":\"insufficient or unknown event\"}",
      br->user_id, br->event_id, br->quantity);
    printf("[QUEUE] processed FAIL user=%s event=%s qty=%d\n", br->user_id, br->event_id, br->quantity);
  }

  free(br->user_id); free(br->event_id); free(br);
  return eh_strdup(buf);
}

/* =========================
   Cancellation Stack
   ========================= */
typedef struct CancelReq {
  char* user_id;
  char* event_id;
  int quantity;
  struct CancelReq* next;
} CancelReq;

static CancelReq* s_top = NULL;

int eh_cancel_tickets(const char* user_id, const char* event_id, int quantity) {
  if (!user_id || !event_id || quantity <= 0) return 0;
  CancelReq* cr = (CancelReq*)calloc(1, sizeof(CancelReq));
  if (!cr) return 0;
  cr->user_id = eh_strdup(user_id);
  cr->event_id = eh_strdup(event_id);
  cr->quantity = quantity;
  cr->next = s_top;
  s_top = cr;
  printf("[STACK] cancel_tickets push user=%s event=%s qty=%d\n", user_id, event_id, quantity);
  return 1;
}

char* eh_process_last_cancellation(void) {
  if (!s_top) {
    printf("[STACK] process_last empty\n");
    return eh_strdup("{\"status\":\"empty\",\"message\":\"No cancellations to process\"}");
  }
  CancelReq* cr = s_top;
  s_top = cr->next;

  Event* e = events_ht_get(cr->event_id);
  int ok = 0;
  if (e) {
    // return tickets
    if (e->available + cr->quantity <= e->total) {
      e->available += cr->quantity;
      ok = 1;
    } else {
      // cap at total
      e->available = e->total;
      ok = 1;
    }
  }
  char buf[512];
  if (ok) {
    snprintf(buf, sizeof(buf),
      "{\"status\":\"ok\",\"user\":\"%s\",\"event\":\"%s\",\"quantity\":%d,\"available\":%d}",
      cr->user_id, cr->event_id, cr->quantity, e ? e->available : -1);
    printf("[STACK] processed OK user=%s event=%s qty=%d available=%d\n", cr->user_id, cr->event_id, cr->quantity, e?e->available:-1);
  } else {
    snprintf(buf, sizeof(buf),
      "{\"status\":\"fail\",\"user\":\"%s\",\"event\":\"%s\",\"quantity\":%d,\"reason\":\"unknown event\"}",
      cr->user_id, cr->event_id, cr->quantity);
    printf("[STACK] processed FAIL user=%s event=%s qty=%d\n", cr->user_id, cr->event_id, cr->quantity);
  }

  free(cr->user_id); free(cr->event_id); free(cr);
  return eh_strdup(buf);
}

/* =========================
   Venues Graph + Dijkstra
   ========================= */
#define VENUE_BUCKETS 257

typedef struct Venue Venue;
typedef struct Edge Edge;

struct Edge {
  Venue* to;
  int w;
  Edge* next;
};

struct Venue {
  char* name;
  int id;      // index for Dijkstra arrays
  Edge* adj;   // adjacency list
  Venue* next; // hash chain
};

static Venue* venues_ht[VENUE_BUCKETS];
static int venue_count = 0;

static void venues_init(void) {
  memset(venues_ht, 0, sizeof(venues_ht));
  venue_count = 0;
}
static void venues_free(void) {
  for (size_t i = 0; i < VENUE_BUCKETS; i++) {
    Venue* v = venues_ht[i];
    while (v) {
      Venue* tmp = v->next;
      Edge* e = v->adj;
      while (e) { Edge* et = e->next; free(e); e = et; }
      free(v->name);
      free(v);
      v = tmp;
    }
    venues_ht[i] = NULL;
  }
  venue_count = 0;
}
static Venue* venues_get(const char* name) {
  unsigned long h = hash_str(name) % VENUE_BUCKETS;
  Venue* v = venues_ht[h];
  while (v) {
    if (streq(v->name, name)) return v;
    v = v->next;
  }
  return NULL;
}
static Venue* venues_put(const char* name) {
  unsigned long h = hash_str(name) % VENUE_BUCKETS;
  Venue* v = venues_ht[h];
  while (v) {
    if (streq(v->name, name)) return v; // exists
    v = v->next;
  }
  // new
  Venue* nv = (Venue*)calloc(1, sizeof(Venue));
  if (!nv) return NULL;
  nv->name = eh_strdup(name);
  nv->id = venue_count++;
  nv->adj = NULL;
  nv->next = venues_ht[h];
  venues_ht[h] = nv;
  return nv;
}

int eh_add_venue(const char* venue_name) {
  if (!venue_name) return 0;
  printf("[GRAPH] add_venue name=%s\n", venue_name);
  return venues_put(venue_name) != NULL;
}

int eh_add_path(const char* from_venue, const char* to_venue, int distance) {
  if (!from_venue || !to_venue || distance <= 0) return 0;
  printf("[GRAPH] add_path %s -> %s dist=%d\n", from_venue, to_venue, distance);
  Venue* a = venues_put(from_venue);
  Venue* b = venues_put(to_venue);
  if (!a || !b) return 0;
  // undirected: add both ways
  Edge* e1 = (Edge*)calloc(1, sizeof(Edge));
  Edge* e2 = (Edge*)calloc(1, sizeof(Edge));
  if (!e1 || !e2) { free(e1); free(e2); return 0; }
  e1->to = b; e1->w = distance; e1->next = a->adj; a->adj = e1;
  e2->to = a; e2->w = distance; e2->next = b->adj; b->adj = e2;
  return 1;
}

// Min-heap for Dijkstra
typedef struct HeapNode { int id; int dist; } HeapNode;
typedef struct MinHeap {
  HeapNode* arr;
  int size;
  int cap;
  int* pos; // id -> position
} MinHeap;

static MinHeap* heap_new(int cap) {
  MinHeap* h = (MinHeap*)calloc(1, sizeof(MinHeap));
  if (!h) return NULL;
  h->arr = (HeapNode*)calloc(cap+1, sizeof(HeapNode));
  h->pos = (int*)calloc(cap, sizeof(int));
  h->size = 0;
  h->cap = cap;
  return h;
}
static void heap_free(MinHeap* h) {
  if (!h) return;
  free(h->arr); free(h->pos); free(h);
}
static void heap_swap(MinHeap* h, int i, int j) {
  HeapNode t = h->arr[i];
  h->arr[i] = h->arr[j];
  h->arr[j] = t;
  h->pos[h->arr[i].id] = i;
  h->pos[h->arr[j].id] = j;
}
static void heap_up(MinHeap* h, int i) {
  while (i > 1 && h->arr[i].dist < h->arr[i/2].dist) {
    heap_swap(h, i, i/2);
    i /= 2;
  }
}
static void heap_down(MinHeap* h, int i) {
  while (1) {
    int l = i*2, r = l+1, m = i;
    if (l <= h->size && h->arr[l].dist < h->arr[m].dist) m = l;
    if (r <= h->size && h->arr[r].dist < h->arr[m].dist) m = r;
    if (m == i) break;
    heap_swap(h, i, m);
    i = m;
  }
}
static void heap_push(MinHeap* h, int id, int dist) {
  if (h->size == h->cap) return;
  h->size++;
  h->arr[h->size].id = id;
  h->arr[h->size].dist = dist;
  h->pos[id] = h->size;
  heap_up(h, h->size);
}
static int heap_empty(MinHeap* h) { return h->size == 0; }
static HeapNode heap_pop(MinHeap* h) {
  HeapNode top = h->arr[1];
  h->arr[1] = h->arr[h->size];
  h->pos[h->arr[1].id] = 1;
  h->size--;
  heap_down(h, 1);
  return top;
}
static void heap_decrease_key(MinHeap* h, int id, int newDist) {
  int i = h->pos[id];
  if (i <= 0 || i > h->size) return;
  if (newDist >= h->arr[i].dist) return;
  h->arr[i].dist = newDist;
  heap_up(h, i);
}

char* eh_shortest_path(const char* from_venue, const char* to_venue) {
  if (!from_venue || !to_venue) return NULL;
  printf("[GRAPH] shortest_path from=%s to=%s\n", from_venue, to_venue);
  Venue* src = venues_get(from_venue);
  Venue* dst = venues_get(to_venue);
  if (!src || !dst) return NULL;
  int n = venue_count;
  int* dist = (int*)malloc(sizeof(int)*n);
  int* prev = (int*)malloc(sizeof(int)*n);
  int* visited = (int*)calloc(n, sizeof(int));
  if (!dist || !prev || !visited) { free(dist); free(prev); free(visited); return NULL; }
  for (int i=0;i<n;i++){ dist[i]=INT_MAX; prev[i]=-1; }

  MinHeap* h = heap_new(n);
  if (!h) { free(dist); free(prev); free(visited); return NULL; }

  // push all nodes into heap with INF; then decrease for src
  // We need a way to iterate venues and insert; We'll build an array id->Venue* first
  Venue** id2v = (Venue**)calloc(n, sizeof(Venue*));
  if (!id2v) { heap_free(h); free(dist); free(prev); free(visited); return NULL; }
  // iterate hash table
  for (int b=0;b<VENUE_BUCKETS;b++) {
    Venue* v = venues_ht[b];
    while (v) {
      id2v[v->id] = v;
      v = v->next;
    }
  }
  for (int i=0;i<n;i++) {
    heap_push(h, i, (i==src->id)?0:INT_MAX/2);
    dist[i] = (i==src->id)?0:INT_MAX/2;
  }

  while (!heap_empty(h)) {
    HeapNode hn = heap_pop(h);
    int u = hn.id;
    if (visited[u]) continue;
    visited[u] = 1;
    if (u == dst->id) break;
    Venue* uv = id2v[u];
    Edge* e = uv->adj;
    while (e) {
      int v = e->to->id;
      if (!visited[v] && dist[u] != INT_MAX/2 && dist[u] + e->w < dist[v]) {
        dist[v] = dist[u] + e->w;
        prev[v] = u;
        heap_decrease_key(h, v, dist[v]);
      }
      e = e->next;
    }
  }

  if (dist[dst->id] >= INT_MAX/2) {
    heap_free(h); free(id2v); free(dist); free(prev); free(visited);
    return eh_strdup("{\"status\":\"unreachable\"}");
  }

  // reconstruct path
  int pathLen = 0;
  for (int at=dst->id; at!=-1; at=prev[at]) pathLen++;
  int* path = (int*)malloc(sizeof(int)*pathLen);
  int idx = pathLen-1;
  for (int at=dst->id; at!=-1; at=prev[at]) path[idx--] = at;

  // Build JSON
  size_t cap = 1024 + 64*pathLen;
  char* json = (char*)malloc(cap);
  if (!json) { heap_free(h); free(id2v); free(dist); free(prev); free(visited); free(path); return NULL; }
  size_t len = 0;
  #define APP(fmt, ...) do { \
    char tmp[512]; int n = snprintf(tmp, sizeof(tmp), fmt, __VA_ARGS__); \
    if (len + n + 1 >= cap) { cap = cap + n + 512; char* nj = (char*)realloc(json, cap); if (!nj){ free(json); json=NULL; } else { json=nj; } } \
    if (!json) { heap_free(h); free(id2v); free(dist); free(prev); free(visited); free(path); return NULL; } \
    memcpy(json+len, tmp, n); len += n; json[len] = '\0'; \
  } while(0)

  APP("{\"from\":\"%s\",\"to\":\"%s\",\"distance\":%d,\"path\":[", src->name, dst->name, dist[dst->id]);
  for (int i=0;i<pathLen;i++) {
    APP("%s\"%s\"", (i? ",":""), id2v[path[i]]->name);
  }
  APP("%s","]}");

  #undef APP

  heap_free(h); free(id2v); free(dist); free(prev); free(visited); free(path);
  return json;
}



/* =========================
   Lifecycle
   ========================= */
void eh_init(void) {
  users_ht_init();
  events_ht_init();
  categories_init();
  venues_init();
  printf("[LIFECYCLE] init\n");
}

void eh_shutdown(void) {
  printf("[LIFECYCLE] shutdown\n");
  // clear queue
  while (q_head) {
    BookingReq* t = q_head; q_head = q_head->next;
    free(t->user_id); free(t->event_id); free(t);
  }
  q_tail = NULL;
  // clear stack
  while (s_top) {
    CancelReq* t = s_top; s_top = s_top->next;
    free(t->user_id); free(t->event_id); free(t);
  }
  users_ht_free();
  events_ht_free();
  categories_free();
  venues_free();
}
