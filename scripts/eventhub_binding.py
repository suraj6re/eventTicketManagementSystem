from __future__ import annotations

import os
from pathlib import Path
import sys
from cffi import FFI

ROOT = Path(__file__).resolve().parents[1]
# Ensure the project root (where the compiled _eventhub_cffi*.pyd is written) is importable
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
NATIVE_DIR = ROOT / "native"

_ffi = FFI()
_ffi.cdef(
    """
    void eh_init(void);
    void eh_shutdown(void);
    void eh_free(char* ptr);

    int eh_register_user(const char* user_id, const char* password_hash);
    int eh_login_user(const char* user_id, const char* password_hash);

    int   eh_add_event(const char* event_id, const char* name, const char* category, const char* venue, int total_tickets);
    int   eh_delete_event(const char* event_id);
    char* eh_search_event(const char* event_id);
    char* eh_list_categories_tree(void);

    int   eh_book_tickets(const char* user_id, const char* event_id, int quantity);
    char* eh_process_next_booking(void);

    int   eh_cancel_tickets(const char* user_id, const char* event_id, int quantity);
    char* eh_process_last_cancellation(void);

    int   eh_add_venue(const char* venue_name);
    int   eh_add_path(const char* from_venue, const char* to_venue, int distance);
    char* eh_shortest_path(const char* from_venue, const char* to_venue);
"""
)

_sources = [str(NATIVE_DIR / "eventhub.c")]
_include_dirs = [str(NATIVE_DIR)]

def _build_module():
    _ffi.set_source(
        "_eventhub_cffi",
        '#include "eventhub.h"',
        sources=_sources,
        include_dirs=_include_dirs,
        extra_compile_args=[],
    )
    _ffi.compile(verbose=True)

def get_lib():
    try:
        import _eventhub_cffi  # type: ignore
    except Exception:
        _build_module()
        import _eventhub_cffi  # type: ignore
    return _eventhub_cffi.ffi, _eventhub_cffi.lib

# Convenience helpers
def _cstr(ffi, s: str):
    return ffi.new("char[]", s.encode("utf-8"))

# Enhanced logging: print which functions are invoked so the terminal shows when
# frontend actions cause native EventHub calls. Passwords and sensitive
# data are not logged.
import logging
import sys
from datetime import datetime

# Create enhanced logger with colored output
logger = logging.getLogger("EventHub")
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    
    # Enhanced formatter with colors and function tracking
    class ColoredFormatter(logging.Formatter):
        COLORS = {
            'DEBUG': '\033[36m',    # Cyan
            'INFO': '\033[32m',     # Green
            'WARNING': '\033[33m',  # Yellow
            'ERROR': '\033[31m',    # Red
            'CRITICAL': '\033[35m', # Magenta
        }
        RESET = '\033[0m'
        BOLD = '\033[1m'
        
        def format(self, record):
            color = self.COLORS.get(record.levelname, '')
            timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
            
            # Enhanced format with function tracking
            formatted = f"{color}[{timestamp}] {self.BOLD}EVENTHUB.C{self.RESET}{color} → {record.getMessage()}{self.RESET}"
            return formatted
    
    handler.setFormatter(ColoredFormatter())
    logger.addHandler(handler)
    logger.propagate = False

logger.setLevel(logging.INFO)

# Function call tracker
def log_function_call(func_name, data_structure, params="", result=""):
    """Enhanced logging for C function calls with data structure info"""
    param_str = f" | params: {params}" if params else ""
    result_str = f" | result: {result}" if result else ""
    logger.info(f"🔧 {func_name}() → DS: {data_structure}{param_str}{result_str}")

def log_user_action(action, details=""):
    """Log user actions that trigger C functions"""
    detail_str = f" | {details}" if details else ""
    logger.info(f"👤 USER_ACTION: {action}{detail_str}")

class EventHub:
    def __init__(self):
        self.ffi, self.lib = get_lib()
        self.lib.eh_init()
        log_function_call("eh_init", "HashTable + BST + Queue + Stack + Graph", "", "system initialized")
        logger.info("🚀 EventHub C backend initialized - all data structures ready")

    def shutdown(self):
        log_function_call("eh_shutdown", "All Data Structures", "", "cleanup complete")
        self.lib.eh_shutdown()
        logger.info("🔴 EventHub C backend shutdown")

    # Users
    def register_user(self, user_id: str, password_hash: str) -> bool:
        log_user_action("REGISTER_USER", f"user_id={user_id}")
        result = bool(self.lib.eh_register_user(_cstr(self.ffi, user_id), _cstr(self.ffi, password_hash)))
        log_function_call("eh_register_user", "HashTable", f"user_id={user_id}", "success" if result else "failed")
        return result

    def login_user(self, user_id: str, password_hash: str) -> bool:
        log_user_action("LOGIN_USER", f"user_id={user_id}")
        result = bool(self.lib.eh_login_user(_cstr(self.ffi, user_id), _cstr(self.ffi, password_hash)))
        log_function_call("eh_login_user", "HashTable", f"user_id={user_id}", "success" if result else "failed")
        return result

    # Events
    def add_event(self, event_id: str, name: str, category: str, venue: str, total: int) -> bool:
        log_user_action("ADD_EVENT", f"event_id={event_id}, name={name}, category={category}")
        result = bool(self.lib.eh_add_event(_cstr(self.ffi, event_id), _cstr(self.ffi, name), _cstr(self.ffi, category), _cstr(self.ffi, venue), int(total)))
        log_function_call("eh_add_event", "HashTable + BST", f"event_id={event_id}, category={category}, total={total}", "success" if result else "failed")
        return result

    def delete_event(self, event_id: str) -> bool:
        log_user_action("DELETE_EVENT", f"event_id={event_id}")
        result = bool(self.lib.eh_delete_event(_cstr(self.ffi, event_id)))
        log_function_call("eh_delete_event", "HashTable + BST", f"event_id={event_id}", "success" if result else "failed")
        return result

    def search_event_json(self, event_id: str) -> str | None:
        log_user_action("SEARCH_EVENT", f"event_id={event_id}")
        p = self.lib.eh_search_event(_cstr(self.ffi, event_id))
        found = p != self.ffi.NULL
        log_function_call("eh_search_event", "HashTable", f"event_id={event_id}", "found" if found else "not found")
        if not found:
            return None
        try:
            return self.ffi.string(p).decode("utf-8")
        finally:
            self.lib.eh_free(p)

    def list_categories_json(self) -> str:
        log_user_action("LIST_CATEGORIES", "retrieving category tree")
        p = self.lib.eh_list_categories_tree()
        log_function_call("eh_list_categories_tree", "BST + Tree", "", "category tree retrieved")
        if p == self.ffi.NULL:
            return "[]"
        try:
            return self.ffi.string(p).decode("utf-8")
        finally:
            self.lib.eh_free(p)

    # Bookings Queue
    def book(self, user_id: str, event_id: str, qty: int) -> bool:
        log_user_action("BOOK_TICKETS", f"user_id={user_id}, event_id={event_id}, qty={qty}")
        result = bool(self.lib.eh_book_tickets(_cstr(self.ffi, user_id), _cstr(self.ffi, event_id), int(qty)))
        log_function_call("eh_book_tickets", "Queue (FIFO)", f"user={user_id}, event={event_id}, qty={qty}", "enqueued" if result else "failed")
        return result

    def process_next_booking_json(self) -> str:
        log_user_action("PROCESS_BOOKING", "processing next booking from queue")
        p = self.lib.eh_process_next_booking()
        result_str = self.ffi.string(p).decode("utf-8")
        import json
        try:
            result_data = json.loads(result_str)
            status = result_data.get('status', 'unknown')
            log_function_call("eh_process_next_booking", "Queue (FIFO)", "dequeue operation", f"status={status}")
        except:
            log_function_call("eh_process_next_booking", "Queue (FIFO)", "dequeue operation", "processed")
        try:
            return result_str
        finally:
            self.lib.eh_free(p)

    # Cancellations Stack
    def cancel(self, user_id: str, event_id: str, qty: int) -> bool:
        log_user_action("CANCEL_TICKETS", f"user_id={user_id}, event_id={event_id}, qty={qty}")
        result = bool(self.lib.eh_cancel_tickets(_cstr(self.ffi, user_id), _cstr(self.ffi, event_id), int(qty)))
        log_function_call("eh_cancel_tickets", "Stack (LIFO)", f"user={user_id}, event={event_id}, qty={qty}", "pushed" if result else "failed")
        return result

    def process_last_cancellation_json(self) -> str:
        log_user_action("PROCESS_CANCELLATION", "processing last cancellation from stack")
        p = self.lib.eh_process_last_cancellation()
        result_str = self.ffi.string(p).decode("utf-8")
        import json
        try:
            result_data = json.loads(result_str)
            status = result_data.get('status', 'unknown')
            log_function_call("eh_process_last_cancellation", "Stack (LIFO)", "pop operation", f"status={status}")
        except:
            log_function_call("eh_process_last_cancellation", "Stack (LIFO)", "pop operation", "processed")
        try:
            return result_str
        finally:
            self.lib.eh_free(p)

    # Venues Graph
    def add_venue(self, name: str) -> bool:
        log_user_action("ADD_VENUE", f"venue_name={name}")
        result = bool(self.lib.eh_add_venue(_cstr(self.ffi, name)))
        log_function_call("eh_add_venue", "Graph (Node)", f"venue={name}", "added" if result else "failed")
        return result

    def add_path(self, a: str, b: str, distance: int) -> bool:
        log_user_action("ADD_PATH", f"from={a}, to={b}, distance={distance}")
        result = bool(self.lib.eh_add_path(_cstr(self.ffi, a), _cstr(self.ffi, b), int(distance)))
        log_function_call("eh_add_path", "Graph (Edge)", f"{a} ↔ {b}, dist={distance}", "added" if result else "failed")
        return result

    def shortest_path_json(self, a: str, b: str) -> str | None:
        log_user_action("SHORTEST_PATH", f"from={a}, to={b}")
        p = self.lib.eh_shortest_path(_cstr(self.ffi, a), _cstr(self.ffi, b))
        found = p != self.ffi.NULL
        if found:
            try:
                result_str = self.ffi.string(p).decode("utf-8")
                import json
                try:
                    result_data = json.loads(result_str)
                    distance = result_data.get('distance', 'unknown')
                    path_len = len(result_data.get('path', []))
                    log_function_call("eh_shortest_path", "Graph + Dijkstra", f"{a} → {b}", f"found: dist={distance}, path_len={path_len}")
                except:
                    log_function_call("eh_shortest_path", "Graph + Dijkstra", f"{a} → {b}", "found")
                return result_str
            finally:
                self.lib.eh_free(p)
        else:
            log_function_call("eh_shortest_path", "Graph + Dijkstra", f"{a} → {b}", "no path found")
            return None

if __name__ == "__main__":
    eh = EventHub()
    # Smoke test
    eh.register_user("alice", "h_pwd")
    assert eh.login_user("alice","h_pwd")
    eh.add_event("E1","Inception","Movies","V1",100)
    print(eh.search_event_json("E1"))
    print(eh.list_categories_json())
    eh.add_venue("V1"); eh.add_venue("V2"); eh.add_path("V1","V2",7)
    print(eh.shortest_path_json("V1","V2"))
    eh.book("alice","E1",2)
    print(eh.process_next_booking_json())
    eh.cancel("alice","E1",1)
    print(eh.process_last_cancellation_json())
    eh.shutdown()
