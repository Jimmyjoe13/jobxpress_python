# ==================================================
# JobXpress V2 - Dockerfile Production
# ==================================================
# Image optimisÃ©e avec WeasyPrint et toutes les dÃ©pendances

FROM python:3.11-slim as base

# Variables d'environnement
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PLAYWRIGHT_BROWSERS_PATH=/app/pw-browsers

WORKDIR /app

# ==================================================
# Stage 1: Builder - Installation des dÃ©pendances
# ==================================================
FROM base as builder

# DÃ©pendances systÃ¨me pour WeasyPrint et compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    # WeasyPrint dependencies
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    # Fonts pour un rendu correct des PDF
    fonts-liberation \
    fonts-dejavu-core \
    # Build tools
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copier et installer les dÃ©pendances Python (build reproductible via lock Ã©pinglÃ© + hashes)
COPY requirements.txt requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock

# ==================================================
# Stage 2: Production - Image finale lÃ©gÃ¨re
# ==================================================
FROM base as production

# Copier les dÃ©pendances systÃ¨me minimales
RUN apt-get update && apt-get install -y --no-install-recommends \
    # WeasyPrint runtime dependencies
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libffi8 \
    shared-mime-info \
    # Fonts
    fonts-liberation \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copier les packages Python installÃ©s depuis le builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copier le code de l'application
COPY . .

# CrÃ©er les dossiers nÃ©cessaires
RUN mkdir -p output logs

# CrÃ©er un utilisateur non-root pour la sÃ©curitÃ©
RUN useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app
USER appuser

# Port exposÃ© (Render utilise 10000 par dÃ©faut)
EXPOSE 10000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:10000/health')" || exit 1

# Commande de dÃ©marrage avec port dynamique
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
