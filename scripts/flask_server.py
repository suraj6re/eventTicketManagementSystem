from __future__ import annotations

from flask import Flask, request, jsonify
from flask_cors import CORS
from eventhub_binding import EventHub

app = Flask(__name__)
CORS(app)
eh = EventHub()

import logging
logger = logging.getLogger("EventHubServer")
if not logger.handlers:
    h = logging.StreamHandler()
    h.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(h)
logger.setLevel(logging.INFO)

@app.route("/health", methods=["GET"])
def health():
    logger.info("HTTP GET /health")
    return jsonify(status="ok")

# Users
@app.route("/users/register", methods=["POST"])
def register_user():
    data = request.get_json(force=True)
    logger.info("HTTP POST /users/register user_id=%s", data.get("user_id"))
    ok = eh.register_user(data["user_id"], data["password_hash"])
    return jsonify(ok=bool(ok)), (200 if ok else 400)

@app.route("/users/login", methods=["POST"])
def login_user():
    data = request.get_json(force=True)
    logger.info("HTTP POST /users/login user_id=%s", data.get("user_id"))
    ok = eh.login_user(data["user_id"], data["password_hash"])
    return jsonify(ok=bool(ok)), (200 if ok else 401)

# Events
@app.route("/events", methods=["POST"])
def add_event():
    data = request.get_json(force=True)
    logger.info("HTTP POST /events add_event id=%s name=%s", data.get("id"), data.get("name"))
    ok = eh.add_event(data["id"], data["name"], data["category"], data["venue"], int(data["total"]))
    return jsonify(ok=bool(ok)), (200 if ok else 400)

@app.route("/events/<event_id>", methods=["DELETE"])
def delete_event(event_id: str):
    logger.info("HTTP DELETE /events/%s", event_id)
    ok = eh.delete_event(event_id)
    return jsonify(ok=bool(ok)), (200 if ok else 404)

@app.route("/events/<event_id>", methods=["GET"])
def get_event(event_id: str):
    logger.info("HTTP GET /events/%s (search)", event_id)
    js = eh.search_event_json(event_id)
    if js is None:
        return jsonify(error="not found"), 404
    return app.response_class(response=js, mimetype="application/json")

@app.route("/categories", methods=["GET"])
def categories_tree():
    logger.info("HTTP GET /categories")
    js = eh.list_categories_json()
    return app.response_class(response=js, mimetype="application/json")

# Bookings (Queue)
@app.route("/book", methods=["POST"])
def enqueue_booking():
    data = request.get_json(force=True)
    logger.info("HTTP POST /book enqueue user_id=%s event_id=%s qty=%s", data.get("user_id"), data.get("event_id"), data.get("quantity"))
    ok = eh.book(data["user_id"], data["event_id"], int(data["quantity"]))
    return jsonify(ok=bool(ok)), (200 if ok else 400)

@app.route("/book/process", methods=["POST"])
def process_booking():
    logger.info("HTTP POST /book/process")
    js = eh.process_next_booking_json()
    return app.response_class(response=js, mimetype="application/json")

# Cancellations (Stack)
@app.route("/cancel", methods=["POST"])
def push_cancellation():
    data = request.get_json(force=True)
    logger.info("HTTP POST /cancel push user_id=%s event_id=%s qty=%s", data.get("user_id"), data.get("event_id"), data.get("quantity"))
    ok = eh.cancel(data["user_id"], data["event_id"], int(data["quantity"]))
    return jsonify(ok=bool(ok)), (200 if ok else 400)

@app.route("/cancel/process", methods=["POST"])
def process_cancellation():
    logger.info("HTTP POST /cancel/process")
    js = eh.process_last_cancellation_json()
    return app.response_class(response=js, mimetype="application/json")

# Venues Graph
@app.route("/venues", methods=["POST"])
def add_venue():
    data = request.get_json(force=True)
    logger.info("HTTP POST /venues add name=%s", data.get("name"))
    ok = eh.add_venue(data["name"])
    return jsonify(ok=bool(ok)), (200 if ok else 400)

@app.route("/paths", methods=["POST"])
def add_path():
    data = request.get_json(force=True)
    logger.info("HTTP POST /paths add from=%s to=%s distance=%s", data.get("from"), data.get("to"), data.get("distance"))
    ok = eh.add_path(data["from"], data["to"], int(data["distance"]))
    return jsonify(ok=bool(ok)), (200 if ok else 400)

@app.route("/venues/shortest", methods=["GET"])
def shortest_path():
    a = request.args.get("from")
    b = request.args.get("to")
    logger.info("HTTP GET /venues/shortest from=%s to=%s", a, b)
    js = eh.shortest_path_json(a, b)
    if js is None:
        return jsonify(error="invalid venues"), 400
    return app.response_class(response=js, mimetype="application/json")

@app.route("/shutdown", methods=["POST"])
def shutdown():
    logger.info("HTTP POST /shutdown invoked - shutting down EventHub")
    eh.shutdown()
    return jsonify(ok=True)

if __name__ == "__main__":
    # Note: In v0 preview you won't run a long-lived server;
    # this script is provided for running locally.
    app.run(host="0.0.0.0", port=5000, debug=True)
