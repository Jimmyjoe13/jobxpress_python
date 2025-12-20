"""
Configuration du logging structuré pour JobXpress.

Supporte:
- Format JSON pour production
- Format coloré pour développement  
- Transport HTTP vers Axiom (cloud logging)
"""
import logging
import sys
import os
import json
import threading
import queue
from datetime import datetime, timezone
from typing import Optional


class JSONFormatter(logging.Formatter):
    """Formateur JSON pour les logs structurés (production)."""
    
    def format(self, record):
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "service": "jobxpress-api"
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


class AxiomHandler(logging.Handler):
    """
    Handler HTTP asynchrone pour envoyer les logs vers Axiom.
    
    Axiom est un service de log management avec 500GB/mois gratuit.
    https://axiom.co
    
    Configuration via variables d'environnement:
    - AXIOM_TOKEN: Token API avec permission Ingest
    - AXIOM_DATASET: Nom du dataset (par défaut: jobxpress-logs)
    - AXIOM_ORG_ID: ID de l'organisation (optionnel pour les plans payants)
    
    Features:
    - Batching: Envoie par lots pour réduire les requêtes HTTP
    - Async: Ne bloque pas le thread principal
    - Fail-safe: Les erreurs d'envoi n'affectent pas l'application
    """
    
    # Endpoint Axiom Ingest API
    AXIOM_INGEST_URL = "https://api.axiom.co/v1/datasets/{dataset}/ingest"
    
    def __init__(
        self, 
        token: str, 
        dataset: str = "jobxpress-logs",
        org_id: Optional[str] = None,
        batch_size: int = 10,
        flush_interval: float = 5.0
    ):
        super().__init__()
        self.token = token
        self.dataset = dataset
        self.org_id = org_id
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        
        # Queue thread-safe pour les logs
        self.log_queue: queue.Queue = queue.Queue()
        self.batch: list = []
        
        # Thread d'envoi en background
        self._stop_event = threading.Event()
        self._flush_thread = threading.Thread(target=self._flush_worker, daemon=True)
        self._flush_thread.start()
    
    def emit(self, record):
        """Ajoute un log à la queue pour envoi asynchrone."""
        try:
            log_entry = {
                "_time": datetime.now(timezone.utc).isoformat(),
                "level": record.levelname,
                "message": record.getMessage(),
                "module": record.module,
                "function": record.funcName,
                "line": record.lineno,
                "service": "jobxpress-api",
                "environment": os.environ.get("ENVIRONMENT", "development")
            }
            
            # Ajouter les extras si présents
            if hasattr(record, 'extra_data'):
                log_entry["data"] = record.extra_data
            
            # Ajouter l'exception si présente
            if record.exc_info:
                log_entry["exception"] = self.formatException(record.exc_info)
            
            self.log_queue.put(log_entry)
            
        except Exception:
            # Jamais bloquer sur les logs
            pass
    
    def _flush_worker(self):
        """Thread worker qui envoie les logs par batch."""
        import time
        
        while not self._stop_event.is_set():
            try:
                # Récupérer les logs de la queue
                while not self.log_queue.empty() and len(self.batch) < self.batch_size:
                    try:
                        log_entry = self.log_queue.get_nowait()
                        self.batch.append(log_entry)
                    except queue.Empty:
                        break
                
                # Envoyer si batch plein ou après interval
                if self.batch:
                    self._send_batch()
                
            except Exception:
                pass
            
            time.sleep(self.flush_interval)
    
    def _send_batch(self):
        """Envoie le batch de logs vers Axiom."""
        if not self.batch:
            return
        
        try:
            import httpx
            
            url = self.AXIOM_INGEST_URL.format(dataset=self.dataset)
            
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
            
            if self.org_id:
                headers["X-Axiom-Org-Id"] = self.org_id
            
            # Envoi synchrone dans le thread worker
            with httpx.Client(timeout=10.0) as client:
                response = client.post(url, json=self.batch, headers=headers)
                
                if response.status_code == 200:
                    self.batch = []  # Succès, vider le batch
                else:
                    # Log local en cas d'échec (ne pas reboucler)
                    print(f"[Axiom] Erreur envoi: {response.status_code}", file=sys.stderr)
                    self.batch = []  # Éviter l'accumulation
                    
        except Exception as e:
            # Fail silently, ne pas bloquer l'app
            print(f"[Axiom] Exception: {e}", file=sys.stderr)
            self.batch = []  # Éviter l'accumulation en cas d'erreur réseau
    
    def close(self):
        """Arrête proprement le handler."""
        self._stop_event.set()
        if self._flush_thread.is_alive():
            self._flush_thread.join(timeout=2.0)
        
        # Flush final
        while not self.log_queue.empty():
            try:
                self.batch.append(self.log_queue.get_nowait())
            except queue.Empty:
                break
        
        if self.batch:
            self._send_batch()
        
        super().close()


def setup_logging(
    level: str = "INFO",
    json_format: bool = False,
    log_file: Optional[str] = None,
    axiom_token: Optional[str] = None,
    axiom_dataset: str = "jobxpress-logs"
) -> logging.Logger:
    """
    Configure le système de logging pour JobXpress.
    
    Args:
        level: Niveau de log (DEBUG, INFO, WARNING, ERROR)
        json_format: True pour format JSON (production), False pour coloré (dev)
        log_file: Chemin optionnel vers un fichier de log
        axiom_token: Token API Axiom (active le logging cloud si fourni)
        axiom_dataset: Nom du dataset Axiom (défaut: jobxpress-logs)
    
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
    
    # Handler Axiom (cloud logging)
    if axiom_token:
        try:
            axiom_handler = AxiomHandler(
                token=axiom_token,
                dataset=axiom_dataset,
                batch_size=10,
                flush_interval=5.0
            )
            axiom_handler.setLevel(logging.INFO)  # Pas de DEBUG vers Axiom
            logger.addHandler(axiom_handler)
            logger.info(f"☁️ Axiom logging activé -> dataset: {axiom_dataset}")
        except Exception as e:
            logger.warning(f"⚠️ Impossible d'activer Axiom: {e}")
    
    # Réduire le bruit des librairies tierces
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("trafilatura").setLevel(logging.WARNING)
    
    return logger


def get_logger() -> logging.Logger:
    """Récupère le logger JobXpress configuré."""
    return logging.getLogger("jobxpress")

