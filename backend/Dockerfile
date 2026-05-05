FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY app ./app

# Ensure we have a place for data
RUN mkdir -p /app/data

# Default port
ENV PORT=8000

# Start command
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT"]
