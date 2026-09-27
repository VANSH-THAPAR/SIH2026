FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt
RUN pip install --no-cache-dir "psycopg[binary]"

# Copy backend and engine folders
COPY backend/ ./backend/
COPY engine/ ./engine/

# Set Python path so backend can import engine
ENV PYTHONPATH=/app

# Change to backend directory so 'app' module is resolved correctly
WORKDIR /app/backend

# Expose port (Hugging Face Spaces requires port 7860)
EXPOSE 7860

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
