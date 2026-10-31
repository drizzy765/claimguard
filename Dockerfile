# Cloud build (Render/Railway/DO) — no local Docker Desktop required.
# Stage 1: frontend
FROM node:20-alpine AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Same-origin API in production (empty VITE_API_URL → relative URLs)
ENV VITE_API_URL=
RUN npm run build

# Stage 2: API + static UI
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
COPY --from=frontend /fe/dist /app/frontend/dist

EXPOSE 8000

# Render/Railway inject $PORT
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
