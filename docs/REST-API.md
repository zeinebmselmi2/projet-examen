# API REST — SmartReserve

Base URL : `http://localhost:3000/api`

## Utilisateurs

### Créer un utilisateur
```
POST /users
Content-Type: application/json

{
  "email": "alice@mail.fr",
  "full_name": "Alice Martin",
  "phone": "0612345678",
  "role": "client"
}
```
**Réponse 201** : objet User

### Lister les utilisateurs
```
GET /users?page=1&limit=20
```
**Réponse 200** : `{ users: [...], total: N }`

### Rechercher des utilisateurs
```
GET /users/search?q=alice
```
**Réponse 200** : `{ users: [...], total: N }`

### Obtenir un utilisateur
```
GET /users/:id
```
**Réponse 200** : objet User | **404** si introuvable

### Modifier un utilisateur
```
PUT /users/:id
Content-Type: application/json

{
  "full_name": "Alice M.",
  "phone": "0698765432"
}
```
**Réponse 200** : objet User mis à jour

### Supprimer un utilisateur
```
DELETE /users/:id
```
**Réponse 200** : `{ success: true, message: "..." }`

---

## Ressources (Catalogue)

### Créer une ressource
```
POST /resources
Content-Type: application/json

{
  "name": "Salle B",
  "description": "Salle 30 places",
  "category": "salle",
  "price_per_day": 120,
  "availability": 2,
  "location": "Paris"
}
```
**Réponse 201** : objet Resource

### Lister les ressources
```
GET /resources?page=1&limit=20&category=salle
```
**Réponse 200** : `{ resources: [...], total: N }`

### Rechercher des ressources
```
GET /resources/search?q=studio&category=studio
```
**Réponse 200** : `{ resources: [...], total: N }`

### Obtenir une ressource
```
GET /resources/:id
```

### Modifier une ressource
```
PUT /resources/:id
```

### Supprimer une ressource
```
DELETE /resources/:id
```

---

## Réservations

### Créer une réservation
```
POST /bookings
Content-Type: application/json

{
  "user_id": "uuid-utilisateur",
  "resource_id": "uuid-ressource",
  "start_date": "2026-07-01",
  "end_date": "2026-07-05"
}
```
**Réponse 201** : objet Booking (statut `pending`, prix calculé automatiquement)

**Effet Kafka** : publication de `booking.created` → décrémentation disponibilité

### Lister les réservations
```
GET /bookings?page=1&limit=20&status=pending
```

### Réservations d'un utilisateur
```
GET /bookings/user/:userId
```

### Obtenir une réservation
```
GET /bookings/:id
```

### Modifier le statut
```
PATCH /bookings/:id/status
Content-Type: application/json

{ "status": "confirmed" }
```
Statuts valides : `pending`, `confirmed`, `cancelled`, `completed`

**Effet Kafka** : si `confirmed` → publication de `booking.confirmed`

### Annuler une réservation
```
POST /bookings/:id/cancel
```
**Effet Kafka** : publication de `booking.cancelled` → restauration disponibilité

---

## Codes d'erreur HTTP

| Code | Signification gRPC | Description |
|------|-------------------|-------------|
| 400 | INVALID_ARGUMENT | Données invalides |
| 404 | NOT_FOUND | Ressource introuvable |
| 409 | ALREADY_EXISTS | Conflit (ex: email existant) |
| 422 | FAILED_PRECONDITION | Règle métier (ex: indisponible) |
| 500 | INTERNAL | Erreur serveur |

## Modèles de données

### User
```json
{
  "id": "uuid",
  "email": "string",
  "full_name": "string",
  "phone": "string",
  "role": "client|admin",
  "created_at": "ISO8601"
}
```

### Resource
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "category": "salle|studio|vehicule|bureau",
  "price_per_day": 150.0,
  "availability": 3,
  "location": "string",
  "created_at": "ISO8601"
}
```

### Booking
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "resource_id": "uuid",
  "start_date": "2026-07-01",
  "end_date": "2026-07-05",
  "total_price": 600.0,
  "status": "pending|confirmed|cancelled|completed",
  "created_at": "ISO8601"
}
```
