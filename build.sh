#!/bin/bash
# Build script for Render deployment

# Install system dependencies for C compilation
apt-get update && apt-get install -y gcc || true

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Compile C backend
python -c "from scripts.eventhub_binding import _build_module; _build_module()"

# Create tickets directory
mkdir -p tickets

echo "Build completed successfully!"
