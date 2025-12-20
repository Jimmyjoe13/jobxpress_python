#!/bin/bash
# ==================================================
# JobXpress - Script de Tests CI/CD
# ==================================================
# Ce script est exécuté avant chaque déploiement sur Render.
# Si les tests échouent, le déploiement est annulé.
#
# Usage: ./scripts/run-tests.sh
# ==================================================

set -e  # Arrêter à la première erreur

echo "======================================"
echo "🧪 JobXpress - Tests CI/CD"
echo "======================================"

# Aller dans le dossier du backend
cd "$(dirname "$0")/../job_xpress"

echo ""
echo "📦 Installation des dépendances de test..."
pip install pytest pytest-asyncio --quiet

echo ""
echo "🔍 Exécution des tests unitaires..."
echo "--------------------------------------"

# Lancer les tests avec output verbeux
python -m pytest tests/ \
    -v \
    --tb=short \
    -x \
    --color=yes \
    2>&1

TEST_EXIT_CODE=$?

echo ""
echo "--------------------------------------"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ Tous les tests passent ! Déploiement autorisé."
    exit 0
else
    echo "❌ Tests échoués ! Déploiement BLOQUÉ."
    echo ""
    echo "Corrigez les erreurs avant de re-push."
    exit 1
fi
