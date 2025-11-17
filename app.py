from __future__ import annotations

import json
from pathlib import Path
import re
from typing import List, Dict, Any, Optional

from flask import Flask, jsonify, request, send_from_directory, Blueprint, render_template, send_file, session
from flask_cors import CORS

from scripts.eventhub_binding import EventHub

# Optional imports for PDF ticket generation
try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.colors import Color, red, white, black
    from reportlab.lib.units import inch, mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.pdfgen import canvas
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    import qrcode
    from PIL import Image
    import io
    import tempfile
    import random
    import string
    from datetime import datetime
    PDF_GENERATION_AVAILABLE = True
except ImportError:
    PDF_GENERATION_AVAILABLE = False
    print("PDF generation libraries not available - install with: pip install reportlab qrcode pillow")


ROOT = Path(__file__).resolve().parent

app = Flask(__name__, template_folder=str(ROOT))
# Secret key for session-based authentication
app.secret_key = "dev-secret-change-me"
CORS(app)

# Set up static folder configuration
app.static_folder = str(ROOT / 'static')
app.static_url_path = '/static'

eh = EventHub()
import logging
logger = logging.getLogger("EventHubServer")
if not logger.handlers:
    h = logging.StreamHandler()
    h.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(h)
logger.setLevel(logging.INFO)

# Route to serve HTML files
@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def serve_file(path):
    # First, try to serve static files
    if path.startswith('static/'):
        return send_from_directory(app.static_folder, path[7:])
    
    # Then try to serve from root directory
    try:
        return send_from_directory(str(ROOT), path)
    except:
        # If file not found, serve index.html for client-side routing
        return send_from_directory(str(ROOT), 'index.html')
    else:
        # Serve from root directory
        return send_from_directory(str(ROOT), filename)
        return app.send_static_file(path[7:])  # Remove "static/" prefix
    return send_from_directory(str(ROOT), path)
    return jsonify(error="not found"), 404


# --- Health ---
@app.get("/health")
def health():
    logger.info("HTTP GET /health")
    return jsonify(status="ok")


# --- Ticket Generation System ---

class StandardizedTicketGenerator:
    """
    Standardized PDF ticket generator matching the exact reference format.
    Creates uniform tickets for all event types with proper theming.
    """
    
    def __init__(self):
        # Standard ticket dimensions matching reference
        self.ticket_width = 7.5 * inch
        self.ticket_height = 3.5 * inch
        
        # Exact theme colors matching reference format
        self.theme_colors = {
            'movies': Color(0.8, 0.2, 0.2),      # Red theme
            'events': Color(0.4, 0.2, 0.8),      # Purple theme  
            'sports': Color(0.2, 0.7, 0.3),      # Green theme
            'play': Color(0.8, 0.6, 0.2),        # Gold theme (matching reference)
        }
        
        # Category labels
        self.category_labels = {
            'movies': 'Movie',
            'events': 'Concert', 
            'sports': 'Sports',
            'play': 'Play'
        }
    
    def generate_ticket_id(self) -> str:
        """Generate a unique 8-digit ticket ID."""
        return ''.join(random.choices(string.digits, k=8))
    
    def format_date(self, date_str: str) -> tuple:
        """Format date string to match reference format."""
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
            day_name = date_obj.strftime('%A').upper()
            month_day = date_obj.strftime('%B %d, %Y').upper()
            return day_name, month_day
        except:
            return "SATURDAY", "JANUARY 18, 2025"
    
    def generate_standardized_ticket(self, booking_data: dict, output_path: str) -> bool:
        """
        Generate a standardized PDF ticket matching the exact reference format.
        Layout: Left section (white) + Right section (colored) + Bottom info strip
        """
        if not PDF_GENERATION_AVAILABLE:
            return False
            
        try:
            # Create canvas with standard page size
            c = canvas.Canvas(output_path, pagesize=letter)
            
            # Get theme color for this category
            category = booking_data.get('category', 'movies').lower()
            theme_color = self.theme_colors.get(category, self.theme_colors['movies'])
            
            # Generate unique ticket ID
            ticket_id = self.generate_ticket_id()
            
            # Ticket positioning (centered on page)
            x_start = 1 * inch
            y_start = 4.5 * inch
            
            # Section dimensions
            left_width = 5 * inch
            right_width = 2.5 * inch
            ticket_height = 2.5 * inch
            
            # Draw main ticket border
            c.setStrokeColor(black)
            c.setLineWidth(2)
            c.rect(x_start, y_start, left_width + right_width, ticket_height, fill=0, stroke=1)
            
            # LEFT SECTION (White background)
            c.setFillColor(white)
            c.rect(x_start, y_start, left_width, ticket_height, fill=1, stroke=0)
            
            # RIGHT SECTION (Colored background)
            c.setFillColor(theme_color)
            c.rect(x_start + left_width, y_start, right_width, ticket_height, fill=1, stroke=0)
            
            # Draw perforated edge
            c.setStrokeColor(black)
            c.setLineWidth(1)
            # Vertical perforation line
            perf_x = x_start + left_width
            for i in range(15):
                y_perf = y_start + (i * 0.15 * inch) + 0.1 * inch
                c.circle(perf_x, y_perf, 0.03 * inch, fill=1)
            
            # LEFT SECTION CONTENT
            c.setFillColor(black)
            
            # Event Title (Large, centered)
            c.setFont("Helvetica-Bold", 24)
            event_title = booking_data.get('eventTitle', 'Event Name')
            title_width = c.stringWidth(event_title, "Helvetica-Bold", 24)
            title_x = x_start + (left_width - title_width) / 2
            c.drawString(title_x, y_start + ticket_height - 0.6 * inch, event_title)
            
            # Horizontal line under title
            c.setLineWidth(1)
            c.line(x_start + 0.3 * inch, y_start + ticket_height - 0.8 * inch, 
                   x_start + left_width - 0.3 * inch, y_start + ticket_height - 0.8 * inch)
            
            # Format date
            day_name, full_date = self.format_date(booking_data.get('date', '2025-01-18'))
            
            # Three column layout for details
            c.setFont("Helvetica-Bold", 10)
            
            # Column 1: Date
            col1_x = x_start + 0.3 * inch
            c.drawString(col1_x, y_start + ticket_height - 1.2 * inch, day_name)
            c.drawString(col1_x, y_start + ticket_height - 1.35 * inch, full_date)
            
            # Column 2: Price
            col2_x = x_start + 1.8 * inch
            c.drawString(col2_x, y_start + ticket_height - 1.2 * inch, "EVENT PRICE")
            price_text = f"₹{booking_data.get('price', 800)}"
            c.drawString(col2_x, y_start + ticket_height - 1.35 * inch, price_text)
            
            # Column 3: Door Open
            col3_x = x_start + 3.2 * inch
            c.drawString(col3_x, y_start + ticket_height - 1.2 * inch, "DOOR OPEN")
            time_text = booking_data.get('time', '6:30 PM')
            c.drawString(col3_x, y_start + ticket_height - 1.35 * inch, time_text)
            
            # Venue (centered)
            c.setFont("Helvetica", 12)
            venue = booking_data.get('venue', 'Event Venue')
            venue_width = c.stringWidth(venue, "Helvetica", 12)
            venue_x = x_start + (left_width - venue_width) / 2
            c.drawString(venue_x, y_start + ticket_height - 1.7 * inch, venue)
            
            # Barcode in left section
            self.draw_barcode(c, x_start + 0.3 * inch, y_start + 0.3 * inch, 4.4 * inch, 0.4 * inch)
            
            # Barcode number
            c.setFont("Helvetica", 8)
            barcode_num = ticket_id
            c.drawString(x_start + 2 * inch, y_start + 0.1 * inch, barcode_num)
            
            # RIGHT SECTION CONTENT
            c.setFillColor(white)
            
            # "ADMIT ONE TICKET" text
            c.setFont("Helvetica-Bold", 14)
            c.drawString(x_start + left_width + 0.2 * inch, y_start + ticket_height - 0.5 * inch, "ADMIT ONE")
            c.drawString(x_start + left_width + 0.3 * inch, y_start + ticket_height - 0.7 * inch, "TICKET")
            
            # Date in right section
            c.setFont("Helvetica-Bold", 10)
            c.drawString(x_start + left_width + 0.2 * inch, y_start + ticket_height - 1.0 * inch, full_date)
            
            # Gate and Seat info
            c.setFont("Helvetica-Bold", 9)
            gate = booking_data.get('gate', 'Main')
            row = booking_data.get('row', 'K')
            seat = booking_data.get('seatNumber', '04')
            
            c.drawString(x_start + left_width + 0.2 * inch, y_start + ticket_height - 1.3 * inch, f"GATE {gate}")
            c.drawString(x_start + left_width + 0.2 * inch, y_start + ticket_height - 1.45 * inch, f"ROW {row} • SEAT {seat}")
            
            # Barcode in right section
            self.draw_barcode(c, x_start + left_width + 0.2 * inch, y_start + 0.5 * inch, 2.1 * inch, 0.3 * inch)
            
            # Barcode number in right section
            c.setFont("Helvetica", 7)
            c.drawString(x_start + left_width + 0.8 * inch, y_start + 0.3 * inch, barcode_num)
            
            # BOTTOM INFO STRIP
            strip_y = y_start - 0.3 * inch
            c.setFillColor(Color(0.9, 0.9, 0.9))
            c.rect(x_start, strip_y, left_width + right_width, 0.25 * inch, fill=1, stroke=0)
            
            c.setFillColor(black)
            c.setFont("Helvetica", 8)
            
            # Category and mood
            category_label = self.category_labels.get(category, 'Event')
            mood = booking_data.get('mood', 'Entertainment')
            c.drawString(x_start + 0.2 * inch, strip_y + 0.1 * inch, f"■ {category_label} • #{mood.title()}")
            
            # Ticket ID on right
            c.drawString(x_start + left_width + right_width - 1.5 * inch, strip_y + 0.1 * inch, f"ID: {ticket_id}")
            
            # Save the PDF
            c.save()
            return True
            
        except Exception as e:
            logger.error(f"Error generating standardized ticket PDF: {e}")
            return False
    
    def draw_barcode(self, canvas, x, y, width, height):
        """Draw a simple barcode pattern."""
        canvas.setFillColor(black)
        bar_width = width / 40
        
        # Create barcode pattern
        for i in range(40):
            if i % 3 != 0:  # Create pattern
                bar_height = height if i % 2 == 0 else height * 0.7
                canvas.rect(x + (i * bar_width), y, bar_width * 0.8, bar_height, fill=1)


# Initialize standardized ticket generator
ticket_generator = StandardizedTicketGenerator()


# --- Events data layer ---

def _events_seed() -> List[Dict[str, Any]]:
    """
    A small explicit seed (kept minimal). Fields use the same keys the frontend
    and /events list expect: id, name, date, venue, available_seats, category, image_url, mood.
    """
    return [
        {
            "id": 1,
            "name": "Avengers: Endgame",
            "category": "movies",
            "location": "mumbai",
            "date": "2025-01-15",
            "time": "7:00 PM",
            "venue": "PVR Cinemas, Phoenix Mall",
            "price": 350,
            "image_url": "/static/images/movies1.jpg",
            "description": "The epic conclusion to the Infinity Saga",
            "available_seats": "100/100",
            "mood": "energetic",
        },
        {
            "id": 2,
            "name": "Coldplay Live Concert",
            "category": "events",
            "location": "mumbai",
            "date": "2025-01-20",
            "time": "8:00 PM",
            "venue": "DY Patil Stadium",
            "price": 2500,
            "image_url": "/static/images/events1.jpg",
            "description": "Experience the magic of Coldplay live",
            "available_seats": "400/400",
            "mood": "energetic",
        },
        {
            "id": 3,
            "name": "Romeo and Juliet",
            "category": "play",
            "location": "delhi",
            "date": "2025-01-18",
            "time": "6:30 PM",
            "venue": "National Centre for Performing Arts",
            "price": 800,
            "image_url": "/static/images/play1.jpg",
            "description": "Shakespeare's timeless love story",
            "available_seats": "200/200",
            "mood": "romantic",
        },
        {
            "id": 4,
            "name": "IPL Final Match",
            "category": "sports",
            "location": "mumbai",
            "date": "2025-01-25",
            "time": "7:30 PM",
            "venue": "Wankhede Stadium",
            "price": 1500,
            "image_url": "/static/images/sports1.jpg",
            "description": "The ultimate cricket showdown",
            "available_seats": "350/350",
            "mood": "energetic",
        },
    ]


def _build_category_events(category: str, base_id: int, count: int = 9) -> List[Dict[str, Any]]:
    """
    Build `count` synthetic events for the given category.
    Produces consistent keys expected by the frontend.
    Maps event names to catalog images and assigns mood tags.
    """
    # Curated minimalistic names + consistent SVG icons shipped in /static/images
    name_pools = {
        "movies": [
            "Inception", "Interstellar", "The Dark Knight", "Dune",
            "La La Land", "Spider-Man: Homecoming", "Joker", "Tenet", "Arrival",
        ],
        "events": [
            "Coldplay Live", "Arijit Singh Tour", "Comedy Night",
            "Tech Conference", "Startup Summit", "Food Festival",
            "Art Expo", "Literature Fest", "City Marathon",
        ],
        "sports": [
            "IPL Match", "Football Championship", "Badminton Open",
            "Hockey Cup", "Kabaddi League", "Tennis Masters",
            "Table Tennis Open", "Basketball Finals", "Marathon",
        ],
        "play": [
            "Hamlet", "The Lion King", "Romeo and Juliet",
            "Macbeth", "The Phantom", "A Midsummer Night's Dream",
            "Cats", "Les Misérables", "Wicked",
        ],
    }

    # Specific mood mapping for each event (corrected according to user requirements)
    specific_mood_mapping = {
        # Movies
        "Inception": "learning",
        "Interstellar": "chill",
        "The Dark Knight": "adventure",
        "Dune": "adventure",
        "La La Land": "romantic",
        "Spider-Man: Homecoming": "energetic",
        "Joker": "intense",
        "Tenet": "learning",
        "Arrival": "thoughtful",
        
        # Events/Concerts
        "Coldplay Live": "energetic",
        "Arijit Singh Tour": "romantic",
        "Comedy Night": "chill",
        "Tech Conference": "learning",
        "Startup Summit": "ambitious",
        "Food Festival": "chill",
        "Art Expo": "creative",
        "Literature Fest": "thoughtful",
        "City Marathon": "energetic",
        
        # Sports
        "IPL Match": "energetic",
        "Football Championship": "energetic",
        "Badminton Open": "focused",
        "Hockey Cup": "energetic",
        "Kabaddi League": "intense",
        "Tennis Masters": "focused",
        "Table Tennis Open": "focused",
        "Basketball Finals": "energetic",
        "Marathon": "determined",
        
        # Plays
        "Hamlet": "intense",
        "The Lion King": "adventure",
        "Romeo and Juliet": "romantic",
        "Macbeth": "intense",
        "The Phantom": "mysterious",
        "A Midsummer Night's Dream": "romantic",
        "Cats": "chill",
        "Les Misérables": "emotional",
        "Wicked": "adventure",
    }

    # Direct mapping of event names to catalog image filenames
    catalog_mapping = {
        "Inception": "inception.jpg",
        "Interstellar": "interstellar.jpeg",
        "The Dark Knight": "the-dark-knight.jpeg",
        "Dune": "dune.jpeg",
        "La La Land": "la-la-land.jpeg",
        "Spider-Man: Homecoming": "spider-man-homecoming.jpeg",
        "Joker": "joker.png",
        "Tenet": "tenet.jpeg",
        "Arrival": "arrival.jpeg",
        "Coldplay Live": "coldplay-live.jpeg",
        "Arijit Singh Tour": "arijit-singh-tour.jpeg",
        "Comedy Night": "comedy-night.jpeg",
        "Tech Conference": "tech-conference.jpeg",
        "Startup Summit": "startup-summit.jpeg",
        "Food Festival": "food-festival.jpeg",
        "Art Expo": "art-expo.jpeg",
        "Literature Fest": "literature-fest.jpeg",
        "City Marathon": "city-marathon.jpeg",
        "IPL Match": "ipl-match.jpeg",
        "Football Championship": "football-championship.jpeg",
        "Badminton Open": "badminton-open.jpeg",
        "Hockey Cup": "hockey-cup.jpeg",
        "Kabaddi League": "kabaddi-league.jpeg",
        "Tennis Masters": "tennis-masters.jpeg",
        "Table Tennis Open": "table-tennis-open.jpeg",
        "Basketball Finals": "basketball-finalsbasketball-finals.jpeg",
        "Marathon": "marathon.jpeg",
        "Hamlet": "hamlet.jpeg",
        "The Lion King": "the-lion-king.jpeg",
        "Romeo and Juliet": "romeo-and-juliet.jpeg",
        "Macbeth": "macbeth.jpeg",
        "The Phantom": "the-phantom.jpeg",
        "A Midsummer Night's Dream": "a-midsummer-night-s-dream.jpeg",
        "Cats": "cats.jpeg",
        "Les Misérables": "les-miserables.jpg",
        "Wicked": "wicked.jpeg",
    }

    icon_map = {
        "movies": "/static/images/movies.svg",
        "events": "/static/images/concert.svg",
        "sports": "/static/images/sports.svg",
        "play": "/static/images/plays.svg",
    }

    locations = ["mumbai", "delhi", "bangalore", "chennai", "kolkata"]

    pool = name_pools.get(category, [])
    items: List[Dict[str, Any]] = []
    for i in range(count):
        idx = base_id + i + 1
        name = pool[i % len(pool)] if pool else f"{category.title()} {i+1}"
        
        # Get catalog image if available, otherwise use category icon
        catalog_img = catalog_mapping.get(name)
        if catalog_img:
            img = f"/static/images/catalog/{catalog_img}"
        else:
            img = icon_map.get(category, "/static/images/placeholder.svg")
        
        # Assign mood based on specific mapping or fallback to default
        mood = specific_mood_mapping.get(name, "chill")
        
        items.append({
            "id": idx,
            "name": name,
            "date": f"2025-02-{(i % 28) + 1:02d}",
            "venue": f"{category.title()} Venue {i+1}",
            "available_seats": f"{(i * 7) % 50 + 10}/60 seats available",
            "category": category if category != "play" else "play",
            "image_url": img,
            "description": f"{name} - {category} event",
            "price": ((i * 10) % 500) + 100,
            "location": locations[i % len(locations)],
            "mood": mood,
        })
    return items


def _all_catalog() -> List[Dict[str, Any]]:
    """
    Returns full catalog combining explicit seed and generated category events.
    Ensures there are at least 9 events per category.
    """
    all_items: List[Dict[str, Any]] = []

    # Keep explicit seed items first (unique small ids)
    all_items.extend(_events_seed())

    # Add generated items for each category (IDs chosen to avoid seed collision)
    all_items.extend(_build_category_events("movies", 1000, 9))
    all_items.extend(_build_category_events("events", 2000, 9))
    all_items.extend(_build_category_events("sports", 3000, 9))
    all_items.extend(_build_category_events("play", 4000, 9))

    return all_items


@app.get("/events")
def list_events():
    """
    Returns either:
      - all events (default), or
      - events filtered by ?category=<name>
    Categories supported: movies, events, sports, play
    """
    cat = (request.args.get("category") or "").strip().lower()
    logger.info("HTTP GET /events category=%s", cat or "all")
    if cat in {"movies", "events", "sports", "play"}:
        base = {"movies": 1000, "events": 2000, "sports": 3000, "play": 4000}[cat]
        return jsonify(_build_category_events(cat, base, 9))

    # Return full catalog (explicit seed + generated)
    return jsonify(_all_catalog())


@app.route("/search")
def search():
    """
    Search for events based on query and mood parameters.
    Renders HTML search results page.
    """
    query = request.args.get("query", "").strip().lower()
    mood = request.args.get("mood", "").strip().lower()
    logger.info("HTTP GET /search query=%s mood=%s", query, mood)
    
    # Get all events
    all_events = _all_catalog()
    results = []
    
    for event in all_events:
        # Check if event matches the search criteria
        matches = True
        
        # If query is provided, search in multiple fields
        if query:
            searchable_text = " ".join([
                event.get("name", ""),
                event.get("category", ""),
                event.get("venue", ""),
                event.get("description", ""),
                event.get("location", "")
            ]).lower()
            
            if query not in searchable_text:
                matches = False
        
        # If mood is provided, check mood match
        if mood and matches:
            event_mood = event.get("mood", "").lower()
            if mood != event_mood:
                matches = False
        
        if matches:
            results.append(event)
    
    # Limit results to prevent overwhelming the UI
    results = results[:20]
    
    logger.info("Search for query='%s' mood='%s' returned %d results", query, mood, len(results))
    return render_template("search_results.html", 
                         results=results, 
                         query=query, 
                         mood=mood,
                         total_results=len(results))


@app.route("/api/search")
def search_api():
    """
    JSON API endpoint for search (for AJAX requests).
    """
    query = request.args.get("query", "").strip().lower()
    mood = request.args.get("mood", "").strip().lower()
    logger.info("HTTP GET /api/search query=%s mood=%s", query, mood)
    
    # Get all events
    all_events = _all_catalog()
    results = []
    
    for event in all_events:
        # Check if event matches the search criteria
        matches = True
        
        # If query is provided, search in multiple fields
        if query:
            searchable_text = " ".join([
                event.get("name", ""),
                event.get("category", ""),
                event.get("venue", ""),
                event.get("description", ""),
                event.get("location", "")
            ]).lower()
            
            if query not in searchable_text:
                matches = False
        
        # If mood is provided, check mood match
        if mood and matches:
            event_mood = event.get("mood", "").lower()
            if mood != event_mood:
                matches = False
        
        if matches:
            results.append(event)
    
    # Limit results to prevent overwhelming the UI
    results = results[:20]
    
    logger.info("API Search for query='%s' mood='%s' returned %d results", query, mood, len(results))
    return jsonify(results)


@app.route("/chatbot", methods=["POST"])
def chatbot():
    """
    EventMate AI chatbot endpoint - processes natural language queries
    and returns contextual event recommendations.
    """
    data = request.get_json(force=True)
    user_message = data.get("message", "").strip().lower()
    context = data.get("context", {})  # For conversation context
    
    logger.info("HTTP POST /chatbot message=%s", user_message)
    
    if not user_message:
        return jsonify({
            "response": "Hi! 👋 I'm EventMate AI — your event guide. What kind of show are you in the mood for today?",
            "events": [],
            "actions": ["Show Featured Events", "Find Shows Near Me", "Recommended for My Mood"]
        })
    
    # Get all events for processing
    all_events = _all_catalog()
    
    # Natural language processing for event recommendations
    response_text = ""
    recommended_events = []
    actions = []
    
    # Mood-based queries
    mood_keywords = {
        "chill": ["chill", "relax", "calm", "peaceful", "laid back", "easy"],
        "energetic": ["energetic", "exciting", "high energy", "pumped", "active", "intense action"],
        "romantic": ["romantic", "love", "date", "couple", "romance", "intimate"],
        "adventure": ["adventure", "thrilling", "exciting", "action", "epic"],
        "learning": ["learn", "educational", "documentary", "informative", "knowledge"],
        "creative": ["creative", "artistic", "art", "creative expression"],
        "thoughtful": ["thoughtful", "deep", "meaningful", "philosophical"],
        "intense": ["intense", "dramatic", "serious", "powerful"],
        "focused": ["focused", "competitive", "precision", "skill"],
        "determined": ["determined", "challenging", "endurance", "perseverance"]
    }
    
    # Category-based queries
    category_keywords = {
        "movies": ["movie", "film", "cinema", "watch", "screening"],
        "events": ["concert", "music", "festival", "show", "performance", "live"],
        "sports": ["sport", "game", "match", "tournament", "championship", "athletic"],
        "play": ["play", "theater", "theatre", "drama", "stage", "acting"]
    }
    
    # Detect mood from user message
    detected_mood = None
    for mood, keywords in mood_keywords.items():
        if any(keyword in user_message for keyword in keywords):
            detected_mood = mood
            break
    
    # Detect category from user message
    detected_category = None
    for category, keywords in category_keywords.items():
        if any(keyword in user_message for keyword in keywords):
            detected_category = category
            break
    
    # Handle specific queries
    if "featured" in user_message or "popular" in user_message or "recommend" in user_message:
        # Show featured/popular events
        featured_events = [e for e in all_events if e.get("id", 0) <= 10][:5]
        recommended_events = featured_events
        response_text = "Here are some featured events you might enjoy! ✨"
        actions = ["🎟 Book Now", "📖 More Info", "🔄 Show More"]
        
    elif detected_mood and detected_category:
        # Both mood and category specified
        filtered_events = [
            e for e in all_events 
            if e.get("mood", "").lower() == detected_mood 
            and e.get("category", "").lower() == detected_category
        ][:5]
        recommended_events = filtered_events
        response_text = f"Perfect! Here are some {detected_mood} {detected_category} for you 🎯"
        actions = ["🎟 Book Now", "📖 More Info", "🔄 Show Similar"]
        
    elif detected_mood:
        # Mood-based recommendations
        mood_events = [e for e in all_events if e.get("mood", "").lower() == detected_mood][:5]
        recommended_events = mood_events
        mood_emoji = {
            "chill": "🌿", "energetic": "⚡", "romantic": "💕", 
            "adventure": "🗺️", "learning": "📚", "creative": "🎨",
            "thoughtful": "🤔", "intense": "🔥", "focused": "🎯", "determined": "💪"
        }
        emoji = mood_emoji.get(detected_mood, "🎭")
        response_text = f"Here are some {detected_mood} picks for you {emoji}"
        actions = ["🎟 Book Now", "📖 More Info", "🔄 Show More"]
        
    elif detected_category:
        # Category-based recommendations
        category_events = [e for e in all_events if e.get("category", "").lower() == detected_category][:5]
        recommended_events = category_events
        category_emoji = {"movies": "🎬", "events": "🎵", "sports": "🏆", "play": "🎭"}
        emoji = category_emoji.get(detected_category, "🎪")
        response_text = f"Here are some great {detected_category} for you {emoji}"
        actions = ["🎟 Book Now", "📖 More Info", "🔄 Show More"]
        
    elif any(word in user_message for word in ["today", "tonight", "this weekend", "now"]):
        # Time-based queries
        recent_events = all_events[:6]
        recommended_events = recent_events
        response_text = "Here's what's happening soon! 📅"
        actions = ["🎟 Book Now", "📖 More Info", "📍 Show Venues"]
        
    elif any(word in user_message for word in ["near", "location", "venue", "where"]):
        # Location-based queries
        mumbai_events = [e for e in all_events if e.get("location", "").lower() == "mumbai"][:5]
        recommended_events = mumbai_events
        response_text = "Here are events near you in Mumbai 📍"
        actions = ["🎟 Book Now", "📖 More Info", "🗺️ Directions"]
        
    else:
        # General search in event names and descriptions
        search_results = []
        for event in all_events:
            searchable_text = " ".join([
                event.get("name", ""),
                event.get("description", ""),
                event.get("category", "")
            ]).lower()
            
            if any(word in searchable_text for word in user_message.split()):
                search_results.append(event)
        
        if search_results:
            recommended_events = search_results[:5]
            response_text = f"I found some events matching '{user_message}' 🔍"
            actions = ["🎟 Book Now", "📖 More Info", "🔄 Show Similar"]
        else:
            # No matches found
            recommended_events = all_events[:3]  # Show some popular events
            response_text = "I couldn't find exact matches, but here are some popular events you might like! 🌟"
            actions = ["🎟 Book Now", "📖 More Info", "🔄 Try Different Search"]
    
    # Format events for response
    formatted_events = []
    for event in recommended_events:
        formatted_events.append({
            "id": event.get("id"),
            "name": event.get("name"),
            "category": event.get("category", "").title(),
            "mood": event.get("mood", "").title(),
            "venue": event.get("venue"),
            "date": event.get("date"),
            "time": event.get("time", "TBD"),
            "price": f"₹{event.get('price', 0)}",
            "image_url": event.get("image_url"),
            "description": event.get("description", ""),
            "available_seats": event.get("available_seats", "Available")
        })
    
    return jsonify({
        "response": response_text,
        "events": formatted_events,
        "actions": actions,
        "context": {
            "last_query": user_message,
            "detected_mood": detected_mood,
            "detected_category": detected_category
        }
    })


@app.post("/events")
def add_event():
    """Add or upsert an event into the native store.
    Body: { id, name, category, venue, total }
    Categories expected by native: Movies | Plays | Sports | Concerts
    """
    data = request.get_json(force=True)
    event_id = str(data.get("id") or "").strip()
    name = (data.get("name") or "").strip()
    category = (data.get("category") or "").strip()
    venue = (data.get("venue") or "").strip()
    total = int(data.get("total") or 0)
    if not (event_id and name and category and venue and total >= 0):
        return jsonify(error="missing/invalid fields"), 400
    logger.info("HTTP POST /events id=%s name=%s cat=%s venue=%s total=%s", event_id, name, category, venue, total)
    ok = eh.add_event(event_id, name, category, venue, total)
    return jsonify(ok=bool(ok)), (200 if ok else 400)


@app.delete("/events/<event_id>")
def delete_event(event_id: str):
    logger.info("HTTP DELETE /events/%s", event_id)
    ok = eh.delete_event(event_id)
    return jsonify(ok=bool(ok)), (200 if ok else 404)


@app.get("/event/<int:event_id>")
def get_event(event_id: int):
    """
    Try native store first via EventHub binding; if not found, search the
    combined catalog (seed + generated). This ensures lookups succeed for
    synthetic events too.
    """
    logger.info("HTTP GET /event/%s requested", event_id)
    # Try native store first
    try:
        js = eh.search_event_json(str(event_id))
        if js:
            return app.response_class(response=js, mimetype="application/json")
    except Exception:
        # non-fatal: move on to catalog search
        pass

    # Search the combined catalog
    catalog = _all_catalog()
    for e in catalog:
        try:
            if int(e.get("id")) == event_id:
                return jsonify(e)
        except Exception:
            continue

    return jsonify(error="not found"), 404


# Keep optional category endpoints for backward compatibility (frontend no longer needs to use them)
@app.get("/events/movies")
def events_movies():
    return jsonify(_build_category_events("movies", 1000, 9))


@app.get("/events/events")
def events_events():
    return jsonify(_build_category_events("events", 2000, 9))


@app.get("/events/sports")
def events_sports():
    return jsonify(_build_category_events("sports", 3000, 9))


@app.get("/events/play")
def events_play():
    return jsonify(_build_category_events("play", 4000, 9))


# Categories tree from native store
@app.get("/categories")
def categories_tree():
    logger.info("HTTP GET /categories")
    try:
        js = eh.list_categories_json()
        return app.response_class(response=js, mimetype="application/json")
    except Exception:
        return jsonify([])


# --- Auth ---
@app.post("/signup")
def signup():
    data = request.get_json(force=True)
    name = (data.get("name") or "").strip()
    user_id = (data.get("email") or data.get("user_id") or "").strip().lower()
    password = (data.get("password") or data.get("password_hash") or "").strip()

    # Validation
    if not name or not user_id or not password:
        return jsonify(error="missing name/email/password"), 400
    if not re.match(r"^[A-Za-z ]+$", name):
        return jsonify(error="invalid name: use letters and spaces only"), 400
    if not re.match(r"^[\w\.-]+@[\w\.-]+\.[A-Za-z]{2,}$", user_id):
        return jsonify(error="invalid email format"), 400
    if len(password) < 6:
        return jsonify(error="password must be at least 6 characters"), 400

    logger.info("HTTP POST /signup user_id=%s", user_id)
    ok = eh.register_user(user_id, password)
    if not ok:
        return jsonify(error="account already exists or could not be created"), 400

    # Do not log the user in here; frontend should redirect to sign-in
    return jsonify(ok=True, user_id=user_id, name=name), 200


@app.post("/login")
def login():
    data = request.get_json(force=True)
    name = (data.get("name") or "").strip()
    user_id = (data.get("email") or data.get("user_id") or "").strip().lower()
    password = (data.get("password") or data.get("password_hash") or "").strip()

    if not user_id or not password:
        return jsonify(error="missing email/password"), 400
    logger.info("HTTP POST /login user_id=%s", user_id)
    ok = eh.login_user(user_id, password)
    if not ok:
        return jsonify(error="invalid credentials"), 401

    # Establish session
    session["user"] = {
        "user_id": user_id,
        "email": user_id,
        # Prefer provided name, otherwise derive from email
        "name": name or user_id.split("@")[0],
    }
    return jsonify(ok=True, user=session["user"]), 200


@app.get("/me")
def me():
    user = session.get("user")
    if not user:
        return jsonify(error="unauthenticated"), 401
    return jsonify(ok=True, user=user), 200


@app.post("/logout")
def logout():
    session.pop("user", None)
    return jsonify(ok=True), 200


# --- Booking ---
@app.post("/book")
def book():
    data = request.get_json(force=True)
    user_id = data.get("user_id") or data.get("email")
    event_id = data.get("event_id") or data.get("id")
    quantity = int(data.get("quantity") or data.get("qty") or 1)
    if not user_id or not event_id:
        return jsonify(error="missing user_id/event_id"), 400
    logger.info("HTTP POST /book user_id=%s event_id=%s qty=%s", user_id, event_id, quantity)
    ok = eh.book(str(user_id), str(event_id), quantity)
    return jsonify(ok=bool(ok)), (200 if ok else 400)


@app.post("/book/process")
def process_book():
    logger.info("HTTP POST /book/process called")
    js = eh.process_next_booking_json()
    return app.response_class(response=js, mimetype="application/json")


@app.post("/cancel")
def cancel():
    data = request.get_json(force=True)
    user_id = data.get("user_id") or data.get("email")
    event_id = data.get("event_id") or data.get("id")
    quantity = int(data.get("quantity") or data.get("qty") or 1)
    if not user_id or not event_id:
        return jsonify(error="missing user_id/event_id"), 400
    logger.info("HTTP POST /cancel user_id=%s event_id=%s qty=%s", user_id, event_id, quantity)
    ok = eh.cancel(str(user_id), str(event_id), quantity)
    return jsonify(ok=bool(ok)), (200 if ok else 400)


@app.post("/cancel/process")
def process_cancel():
    logger.info("HTTP POST /cancel/process called")
    js = eh.process_last_cancellation_json()
    return app.response_class(response=js, mimetype="application/json")


@app.post("/shutdown")
def shutdown():
    logger.info("HTTP POST /shutdown invoked - shutting down EventHub")
    eh.shutdown()
    return jsonify(ok=True)


@app.post("/trace")
def trace_action():
    """Simple tracing endpoint: accepts JSON { action: str, details: dict }
    and logs it to the server terminal. This is intended for non-sensitive
    client-side indicators (UI clicks, feature usage)."""
    data = request.get_json(force=True)
    action = data.get("action")
    details = data.get("details")
    # Map common actions to DS concepts (keep mapping small and editable)
    ds_map = {
        "add_to_cart": "HashTable/Array",      # cart insert/update uses local storage (keyed by user)
        "proceed_to_payment": "Queue/BookingQueue", # booking queue enqueue
        "complete_booking": "Queue/BookingQueue",  # booking processing (dequeue)
        "login": "HashTable",
        "register": "HashTable",
        "search_event": "BST/Trie/HashTable",
        "shortest_path": "Graph/Dijkstra",
        "add_path": "Graph",
        "add_venue": "Graph/NodeInsert",
        "cancel": "Stack/CancelStack",
    }

    ds_part = ds_map.get(action, "unknown")
    # Map actions to typical client and server function names for clarity
    func_map = {
        "add_to_cart": {"client": "Cart.add / addToBookingCart", "server": "(localStorage) / optional eh.book"},
        "proceed_to_payment": {"client": "seatSelectionSystem.proceedToPayment", "server": "/book -> eh.book (enqueue)"},
        "complete_booking": {"client": "bookingConfirmationSystem.completeBooking", "server": "/book/process -> eh.process_next_booking"},
        "login": {"client": "AuthSystem.handleLogin", "server": "/login -> eh.login_user"},
        "register": {"client": "AuthSystem.handleRegistration", "server": "/signup -> eh.register_user"},
        "search_event": {"client": "ehApi.getEvent", "server": "/event/<id> -> eh.search_event_json"},
        "shortest_path": {"client": "ehApi.shortest", "server": "/venues/shortest -> eh.shortest_path_json"},
        "add_path": {"client": "ehApi.addPath", "server": "/paths -> eh.add_path"},
        "add_venue": {"client": "ehApi.addVenue", "server": "/venues -> eh.add_venue"},
        "cancel": {"client": "ehApi.cancel", "server": "/cancel -> eh.cancel"},
    }

    funcs = func_map.get(action, {"client": "unknown", "server": "unknown"})
    logger.info("TRACE action=%s ds=%s client_fn=%s server_fn=%s details=%s", action, ds_part, funcs["client"], funcs["server"], details)
    return jsonify(ok=True)


# --- Venues Graph (optional DS demo) ---
@app.post("/venues")
def add_venue():
    data = request.get_json(force=True)
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify(error="missing name"), 400
    ok = eh.add_venue(name)
    return jsonify(ok=bool(ok)), (200 if ok else 400)


@app.post("/paths")
def add_path():
    data = request.get_json(force=True)
    a = (data.get("from") or "").strip()
    b = (data.get("to") or "").strip()
    try:
        d = int(data.get("distance") or 0)
    except Exception:
        d = 0
    if not a or not b or d <= 0:
        return jsonify(error="missing/invalid from/to/distance"), 400
    ok = eh.add_path(a, b, d)
    return jsonify(ok=bool(ok)), (200 if ok else 400)


@app.get("/venues/shortest")
def shortest_path():
    a = (request.args.get("from") or "").strip()
    b = (request.args.get("to") or "").strip()
    js = eh.shortest_path_json(a, b)
    if not js:
        return jsonify(error="invalid venues"), 400
    return app.response_class(response=js, mimetype="application/json")

@app.route("/booking_details/<booking_id>")
def booking_details(booking_id: str):
    """
    Get booking details for the modal display.
    Returns JSON with booking and show information.
    """
    logger.info("HTTP GET /booking_details/%s", booking_id)
    
    # Sample booking data (in real app, this would come from database)
    sample_bookings = {
        "BK001": {
            "bookingId": "BK001",
            "eventTitle": "Avengers: Endgame",
            "category": "movies",
            "date": "2025-01-15",
            "time": "7:00 PM",
            "venue": "PVR Cinemas, Phoenix Mall",
            "tickets": 2,
            "totalAmount": 700,
            "status": "confirmed",
            "bookingDate": "2025-01-01",
            "mood": "adventure",
            "description": "The epic conclusion to the Infinity Saga that brings together all Marvel heroes for the ultimate battle.",
            "price": 350,
            "seatNumber": "15",
            "row": "A",
            "gate": "Main"
        },
        "BK002": {
            "bookingId": "BK002",
            "eventTitle": "Coldplay Live Concert",
            "category": "events",
            "date": "2025-01-20",
            "time": "8:00 PM",
            "venue": "DY Patil Stadium",
            "tickets": 1,
            "totalAmount": 2500,
            "status": "confirmed",
            "bookingDate": "2025-01-02",
            "mood": "energetic",
            "description": "Experience the magic of Coldplay live with their spectacular Music of the Spheres World Tour.",
            "price": 2500,
            "seatNumber": "42",
            "row": "B",
            "gate": "East"
        },
        "BK003": {
            "bookingId": "BK003",
            "eventTitle": "Romeo and Juliet",
            "category": "play",
            "date": "2025-01-18",
            "time": "6:30 PM",
            "venue": "National Centre for Performing Arts",
            "tickets": 2,
            "totalAmount": 1600,
            "status": "confirmed",
            "bookingDate": "2025-01-03",
            "mood": "romantic",
            "description": "Shakespeare's timeless love story brought to life with stunning performances and beautiful staging.",
            "price": 800,
            "seatNumber": "04",
            "row": "K",
            "gate": "Main"
        },
        "BK004": {
            "bookingId": "BK004",
            "eventTitle": "IPL Final Match",
            "category": "sports",
            "date": "2025-01-25",
            "time": "7:30 PM",
            "venue": "Wankhede Stadium",
            "tickets": 3,
            "totalAmount": 4500,
            "status": "confirmed",
            "bookingDate": "2025-01-04",
            "mood": "energetic",
            "description": "The ultimate cricket showdown between the top two teams of the season.",
            "price": 1500,
            "seatNumber": "55",
            "row": "D",
            "gate": "North"
        }
    }
    
    booking = sample_bookings.get(booking_id)
    if not booking:
        return jsonify({'error': 'Booking not found'}), 404
    
    # Create show data from booking info
    show_data = {
        'name': booking['eventTitle'],
        'category': booking['category'],
        'date': booking['date'],
        'time': booking['time'],
        'venue': booking['venue'],
        'description': booking['description'],
        'price': booking['price'],
        'mood': booking['mood']
    }
    
    return jsonify({
        'booking': booking,
        'show': show_data
    })


@app.post("/download_ticket")
def download_ticket_post():
    """
    Generate and download a ticket PDF from real booking data posted by the client.
    Expects JSON with at least: bookingId, eventTitle, category, date, time, venue, price, seatNumber, row
    """
    logger.info("HTTP POST /download_ticket (real booking data)")

    if not PDF_GENERATION_AVAILABLE:
        return jsonify({
            "error": "PDF generation not available",
            "message": "Please install required packages: pip install reportlab qrcode pillow"
        }), 503

    try:
        data = request.get_json(force=True) or {}
        booking_data = data.get("booking") or data

        # Basic validation
        required = ["bookingId", "eventTitle", "category", "date", "time", "venue"]
        missing = [k for k in required if not booking_data.get(k)]
        if missing:
            return jsonify(error=f"missing fields: {', '.join(missing)}"), 400

        # Create tickets directory
        tickets_dir = ROOT / "tickets"
        tickets_dir.mkdir(exist_ok=True)

        # Generate filename based on real data
        safe_title = re.sub(r"[^\w\s-]", "", booking_data["eventTitle"]).strip()
        safe_title = re.sub(r"[-\s]+", "_", safe_title)
        booking_id = booking_data.get("bookingId") or "TICKET"
        filename = f"{safe_title}_ticket_{booking_id}.pdf"
        filepath = tickets_dir / filename

        # Generate standardized ticket
        success = ticket_generator.generate_standardized_ticket(booking_data, str(filepath))
        if not success:
            return jsonify(error="Failed to generate ticket"), 500

        return send_file(
            str(filepath),
            as_attachment=True,
            download_name=filename,
            mimetype="application/pdf",
        )
    except Exception as e:
        logger.error(f"Error in POST /download_ticket: {e}")
        return jsonify(error="Internal server error"), 500


@app.route("/download_ticket/<booking_id>")
def download_ticket(booking_id: str):
    """
    Generate and download a simple PDF ticket for the specified booking.
    """
    logger.info("HTTP GET /download_ticket/%s", booking_id)
    
    if not PDF_GENERATION_AVAILABLE:
        return jsonify({
            "error": "PDF generation not available",
            "message": "Please install required packages: pip install reportlab qrcode pillow",
            "manual_ticket": {
                "booking_id": booking_id,
                "instructions": "Screenshot this page as your ticket"
            }
        }), 503
    
    # Sample booking data (in real app, this would come from database)
    sample_bookings = {
        "BK001": {
            "bookingId": "BK001",
            "eventTitle": "Avengers: Endgame",
            "category": "movies",
            "date": "2025-01-15",
            "time": "7:00 PM",
            "venue": "PVR Cinemas, Phoenix Mall",
            "price": 350,
            "seatNumber": "15",
            "row": "A",
            "gate": "Main",
            "mood": "adventure"
        },
        "BK002": {
            "bookingId": "BK002",
            "eventTitle": "Coldplay Live Concert",
            "category": "events",
            "date": "2025-01-20",
            "time": "8:00 PM",
            "venue": "DY Patil Stadium",
            "price": 2500,
            "seatNumber": "42",
            "row": "B",
            "gate": "East",
            "mood": "energetic"
        },
        "BK003": {
            "bookingId": "BK003",
            "eventTitle": "Romeo and Juliet",
            "category": "play",
            "date": "2025-01-18",
            "time": "6:30 PM",
            "venue": "National Centre for Performing Arts",
            "price": 800,
            "seatNumber": "04",
            "row": "K",
            "gate": "Main",
            "mood": "romantic"
        },
        "BK004": {
            "bookingId": "BK004",
            "eventTitle": "IPL Final Match",
            "category": "sports",
            "date": "2025-01-25",
            "time": "7:30 PM",
            "venue": "Wankhede Stadium",
            "price": 1500,
            "seatNumber": "55",
            "row": "D",
            "gate": "North",
            "mood": "energetic"
        }
    }
    
    booking_data = sample_bookings.get(booking_id)
    if not booking_data:
        return jsonify(error="Booking not found"), 404
    
    try:
        # Create tickets directory if it doesn't exist
        tickets_dir = ROOT / 'tickets'
        tickets_dir.mkdir(exist_ok=True)
        
        # Generate filename
        event_name = re.sub(r'[^\w\s-]', '', booking_data['eventTitle']).strip()
        event_name = re.sub(r'[-\s]+', '_', event_name)
        filename = f"{event_name}_ticket_{booking_id}.pdf"
        filepath = tickets_dir / filename
        
        # Generate the standardized PDF ticket
        success = ticket_generator.generate_standardized_ticket(booking_data, str(filepath))
        
        if not success:
            return jsonify(error="Failed to generate ticket"), 500
        
        # Return the file for download
        return send_file(
            str(filepath),
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
        
    except Exception as e:
        logger.error(f"Error in download_ticket: {e}")
        return jsonify(error="Internal server error"), 500


@app.route("/ticket_success")
def ticket_success():
    """
    Endpoint to show ticket download success message.
    """
    return jsonify({
        "message": "✅ Ticket downloaded successfully!",
        "status": "success"
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
