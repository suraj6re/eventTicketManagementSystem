#!/bin/bash
# Build script for Render deployment

# Install Python dependencies
pip install -r requirements.txt

# Compile C backend
python -c "from scripts.eventhub_binding import _build_module; _build_module()"

# Create tickets directory
mkdir -p tickets
