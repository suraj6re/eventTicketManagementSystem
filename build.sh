#!/bin/bash
# Build script for Render deployment

# Install system dependencies for C compilation
apt-get update && apt-get install -y gcc || true

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Try to compile C backend, but don't fail if it doesn't work
echo "Attempting to compile C backend..."
python -c "from scripts.eventhub_binding import _build_module; _build_module()" || echo "Warning: C backend compilation failed, will run in fallback mode"

# Create tickets directory
mkdir -p tickets

echo "Build completed successfully!"
