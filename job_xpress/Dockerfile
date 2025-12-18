# ==================================================
# JobXpress V2 - Dockerfile Production
# ==================================================
# Image optimisée avec WeasyPrint et toutes les dépendances

FROM python:3.11-slim as base

# Variables d'environnement
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# ==================================================
# Stage 1: Builder - Installation des dépendances
# ==================================================
FROM base as builder

# Dépendances système pour WeasyPrint et compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    # WeasyPrint dependencies
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    # Fonts pour un rendu correct des PDF
    fonts-liberation \
    fonts-dejavu-core \
    # Build tools
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copier et installer les dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ==================================================
# Stage 2: Production - Image finale légère
# ==================================================
FROM base as production

# Copier les dépendances système minimales
RUN apt-get update && apt-get install -y --no-install-recommends \
    # WeasyPrint runtime dependencies
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi8 \
    shared-mime-info \
    # Fonts
    fonts-liberation \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copier les packages Python installés depuis le builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copier le code de l'application
COPY . .

# Créer les dossiers nécessaires
RUN mkdir -p output logs

# Créer un utilisateur non-root pour la sécurité
RUN useradd --create-home --shell /bin/bash appuser \
    && chown -R appuser:appuser /app
USER appuser

# Port exposé
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health')" || exit 1

# Commande de démarrage
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
