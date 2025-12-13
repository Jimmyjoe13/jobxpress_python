"""
Configuration du logging structuré pour JobXpress.
Supporte JSON format pour production et format lisible pour développement.
"""
import logging
import sys
import os
from datetime import datetime
from typing import Optional


class JSONFormatter(logging.Formatter):
    """Formateur JSON pour les logs structurés (production)."""
    
    def format(self, record):
        import json
        
        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Ajouter les extras si présents
        if hasattr(record, 'extra_data'):
            log_entry["data"] = record.extra_data
        
        # Ajouter l'exception si présente
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_entry, ensure_ascii=False)


class ColorFormatter(logging.Formatter):
    """Formateur coloré pour le développement local."""
    
    COLORS = {
        'DEBUG': '\033[36m',     # Cyan
        'INFO': '\033[32m',      # Green
        'WARNING': '\033[33m',   # Yellow
        'ERROR': '\033[31m',     # Red
        'CRITICAL': '\033[41m',  # Red background
    }
    RESET = '\033[0m'
    
    def format(self, record):
        color = self.COLORS.get(record.levelname, self.RESET)
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        # Formatage lisible
        message = f"{color}[{timestamp}] {record.levelname:8}{self.RESET} | {record.getMessage()}"
        
        if record.exc_info:
            message += f"\n{self.formatException(record.exc_info)}"
        
        return message


def setup_logging(
    level: str = "INFO",
    json_format: bool = False,
    log_file: Optional[str] = None
) -> logging.Logger:
    """
    Configure le système de logging pour JobXpress.
    
    Args:
        level: Niveau de log (DEBUG, INFO, WARNING, ERROR)
        json_format: True pour format JSON (production), False pour coloré (dev)
        log_file: Chemin optionnel vers un fichier de log
    
    Returns:
        Logger configuré
    """
    logger = logging.getLogger("jobxpress")
    logger.setLevel(getattr(logging, level.upper()))
    
    # Supprimer les handlers existants
    logger.handlers.clear()
    
    # Handler Console
    console_handler = logging.StreamHandler(sys.stdout)
    if json_format:
        console_handler.setFormatter(JSONFormatter())
    else:
        console_handler.setFormatter(ColorFormatter())
    logger.addHandler(console_handler)
    
    # Handler Fichier (optionnel)
    if log_file:
        # Créer le dossier logs si nécessaire
        log_dir = os.path.dirname(log_file)
        if log_dir:
            os.makedirs(log_dir, exist_ok=True)
        
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setFormatter(JSONFormatter())  # Toujours JSON pour les fichiers
        logger.addHandler(file_handler)
    
    # Réduire le bruit des librairies tierces
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("trafilatura").setLevel(logging.WARNING)
    
    return logger


def get_logger() -> logging.Logger:
    """Récupère le logger JobXpress configuré."""
    return logging.getLogger("jobxpress")
