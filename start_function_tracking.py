#!/usr/bin/env python3
"""
EventHub Function Tracking Startup Script
Run this to start the Flask server with enhanced function tracking
"""

import os
import sys
import subprocess
import webbrowser
import time
from pathlib import Path

def print_banner():
    banner = """
╔══════════════════════════════════════════════════════════════╗
║                 🔍 EventHub Function Tracker                 ║
║                                                              ║
║  Monitor which eventhub.c functions are called when users   ║
║  perform activities in the frontend                         ║
╚══════════════════════════════════════════════════════════════╝
"""
    print(banner)

def check_dependencies():
    """Check if required dependencies are available"""
    try:
        import flask
        import cffi
        print("✅ Flask and CFFI are available")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please install with: pip install flask cffi")
        return False

def compile_eventhub():
    """Compile the EventHub C library if needed"""
    print("🔧 Checking EventHub C library...")
    try:
        from scripts.eventhub_binding import EventHub
        # Try to create an instance to trigger compilation if needed
        eh = EventHub()
        eh.shutdown()
        print("✅ EventHub C library is ready")
        return True
    except Exception as e:
        print(f"❌ EventHub compilation failed: {e}")
        return False

def start_server():
    """Start the Flask server with function tracking"""
    print("🚀 Starting Flask server with function tracking...")
    
    # Set environment variables for better logging
    os.environ['FLASK_ENV'] = 'development'
    os.environ['FLASK_DEBUG'] = '1'
    
    try:
        # Start the Flask server
        subprocess.run([sys.executable, 'app.py'], check=True)
    except KeyboardInterrupt:
        print("\n🔴 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")

def open_tracker_page():
    """Open the function tracker page in browser"""
    tracker_url = "http://localhost:5000/eventhub_function_tracker.html"
    print(f"🌐 Opening function tracker: {tracker_url}")
    
    # Wait a moment for server to start
    time.sleep(2)
    
    try:
        webbrowser.open(tracker_url)
        print("✅ Function tracker opened in browser")
    except Exception as e:
        print(f"⚠️  Could not open browser automatically: {e}")
        print(f"Please manually open: {tracker_url}")

def show_instructions():
    """Show usage instructions"""
    instructions = """
📋 INSTRUCTIONS:

1. 🌐 Function Tracker Page: http://localhost:5000/eventhub_function_tracker.html
   - Interactive buttons to trigger C functions
   - Real-time terminal output display
   - Color-coded function call tracking

2. 🏠 Main Application: http://localhost:5000/
   - Use the regular frontend
   - Watch terminal for function calls

3. 📊 Test Script: python test_function_tracking.py
   - Automated demo of all functions
   - Detailed terminal output

4. 📖 Documentation: EVENTHUB_FUNCTION_MAPPING.md
   - Complete mapping guide
   - Frontend activity → C function mapping

🎯 WHAT TO WATCH FOR:
- 👤 USER_ACTION: Shows frontend activities
- 🔧 C Function calls with data structure info
- 📊 Real-time function execution tracking

🔍 TERMINAL OUTPUT LEGEND:
- 🚀 System initialization
- 👤 User actions (frontend activities)
- 🔧 C function calls
- 📊 Data structure operations
- ✅ Success operations
- ❌ Failed operations
- 🔴 System shutdown
"""
    print(instructions)

def main():
    print_banner()
    
    # Check if we're in the right directory
    if not Path('app.py').exists():
        print("❌ Please run this script from the project root directory")
        sys.exit(1)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Compile EventHub if needed
    if not compile_eventhub():
        sys.exit(1)
    
    # Show instructions
    show_instructions()
    
    # Ask user what they want to do
    print("\n🎮 Choose an option:")
    print("1. Start Flask server with function tracking")
    print("2. Run automated function demo")
    print("3. Show documentation only")
    
    try:
        choice = input("\nEnter choice (1-3): ").strip()
        
        if choice == '1':
            print("\n🚀 Starting server...")
            print("💡 Tip: Open another terminal to run the demo script while server is running")
            
            # Start server in a separate process and open browser
            import threading
            browser_thread = threading.Thread(target=open_tracker_page)
            browser_thread.daemon = True
            browser_thread.start()
            
            start_server()
            
        elif choice == '2':
            print("\n🎮 Running automated demo...")
            subprocess.run([sys.executable, 'test_function_tracking.py'])
            
        elif choice == '3':
            print("\n📖 Opening documentation...")
            doc_path = Path('EVENTHUB_FUNCTION_MAPPING.md')
            if doc_path.exists():
                if sys.platform.startswith('win'):
                    os.startfile(str(doc_path))
                elif sys.platform.startswith('darwin'):
                    subprocess.run(['open', str(doc_path)])
                else:
                    subprocess.run(['xdg-open', str(doc_path)])
            else:
                print("❌ Documentation file not found")
                
        else:
            print("❌ Invalid choice")
            
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()