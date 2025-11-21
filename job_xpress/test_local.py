import requests

# Simulation des données brutes que Tally envoie (copié depuis ton JSON n8n)
payload = {
  "eventId": "test-event-123",
  "createdAt": "2025-11-20T10:00:00Z",
  "data": {
    "responseId": "resp123",
    "submissionId": "sub123",
    "fields": [
      {"key": "question_l6NAep", "label": "Prénom", "type": "INPUT_TEXT", "value": "Jimmy"},
      {"key": "question_Y4ZO06", "label": "Nom", "type": "INPUT_TEXT", "value": "Gay"},
      {"key": "question_D7V1kj", "label": "Email", "type": "INPUT_EMAIL", "value": "jimmygay13180@gmail.com"},
      {"key": "question_a26zVy", "label": "Emploi", "type": "INPUT_TEXT", "value": "Commercial"},
      # ID pour 'CDI' d'après ton mapping
      {"key": "question_7NWEGz", "label": "Contrat", "type": "DROPDOWN", "value": ["5bdc568d-a217-464e-af74-bf1a5add3c9c"]},
      # ID pour 'Junior' d'après ton mapping
      {"key": "question_6Z7Po5", "label": "Experience", "type": "DROPDOWN", "value": ["df23bccc-d7ea-4f63-a91b-cff4f63b5369"]},
      {"key": "question_4K2egY", "label": "Lieu", "type": "INPUT_TEXT", "value": "Marseille"}
    ]
  }
}

try:
    response = requests.post("http://127.0.0.1:8000/webhook/tally", json=payload)
    print(f"Statut: {response.status_code}")
    print(f"Réponse: {response.json()}")
except Exception as e:
    print(f"Erreur: {e}")