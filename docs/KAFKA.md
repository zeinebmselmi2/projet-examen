# Kafka — SmartReserve

## Broker

- **Version** : **Apache Kafka 4.0** (pas Kafka 3.x)
- **Image Docker** : `apache/kafka:4.0.0`
- **Mode** : KRaft (sans Zookeeper — standard Kafka 4)
- **Port** : 9092
- **Client Node.js** : kafkajs

## 4 topics Kafka (pas 3)

Le projet utilise **exactement 4 topics** :

| Topic | Producteur | Consommateur(s) | Scénario métier |
|-------|------------|-----------------|-----------------|
| `user.registered` | User Service | *(extensible)* | Un nouvel utilisateur s'inscrit |
| `booking.created` | Booking Service | Catalog Service | Une réservation est créée → décrémenter la disponibilité |
| `booking.confirmed` | Booking Service | User Service | Une réservation est confirmée → notifier l'utilisateur |
| `booking.cancelled` | Booking Service | Catalog Service | Une réservation est annulée → restaurer la disponibilité |

## Format des messages

Tous les messages sont en **JSON** avec un champ `timestamp` ajouté automatiquement.

### user.registered

**Déclencheur** : `POST /api/users` ou mutation GraphQL `createUser`

```json
{
  "event": "USER_REGISTERED",
  "userId": "uuid",
  "email": "alice@mail.fr",
  "fullName": "Alice Martin",
  "role": "client",
  "timestamp": "2026-06-21T10:00:00.000Z"
}
```

### booking.created

**Déclencheur** : `POST /api/bookings` ou mutation `createBooking`

```json
{
  "event": "BOOKING_CREATED",
  "bookingId": "uuid",
  "userId": "uuid",
  "resourceId": "uuid",
  "startDate": "2026-07-01",
  "endDate": "2026-07-05",
  "totalPrice": 600,
  "timestamp": "2026-06-21T10:05:00.000Z"
}
```

**Action consommateur (Catalog Service)** :
```javascript
resourceRepository.updateAvailability(event.resourceId, -1);
```

### booking.confirmed

**Déclencheur** : `PATCH /api/bookings/:id/status` avec `status: confirmed` ou mutation `confirmBooking`

```json
{
  "event": "BOOKING_CONFIRMED",
  "bookingId": "uuid",
  "userId": "uuid",
  "resourceId": "uuid",
  "totalPrice": 600,
  "timestamp": "2026-06-21T10:10:00.000Z"
}
```

**Action consommateur (User Service)** :
Log de notification : *"Réservation X confirmée pour l'utilisateur Y"*

### booking.cancelled

**Déclencheur** : `POST /api/bookings/:id/cancel` ou mutation `cancelBooking`

```json
{
  "event": "BOOKING_CANCELLED",
  "bookingId": "uuid",
  "userId": "uuid",
  "resourceId": "uuid",
  "timestamp": "2026-06-21T10:15:00.000Z"
}
```

**Action consommateur (Catalog Service)** :
```javascript
resourceRepository.updateAvailability(event.resourceId, +1);
```

## Scénario complet

```
1. Client crée une réservation
   └─► Booking Service publie booking.created
       └─► Catalog Service décrémente availability (-1)

2. Admin confirme la réservation
   └─► Booking Service publie booking.confirmed
       └─► User Service log une notification

3. Client annule la réservation
   └─► Booking Service publie booking.cancelled
       └─► Catalog Service restaure availability (+1)
```

## Groupes de consommateurs

| Service | Group ID | Topics |
|---------|----------|--------|
| Catalog Service | `catalog-service-group` | booking.created, booking.cancelled |
| User Service | `user-service-group` | booking.confirmed |

## Pertinence métier

Kafka n'est **pas** utilisé artificiellement. Il répond à un besoin réel :

1. **Découplage** : le Booking Service n'a pas besoin d'appeler directement le Catalog Service pour mettre à jour la disponibilité de manière synchrone après création.
2. **Événementiel** : la confirmation et l'annulation déclenchent des actions secondaires (notification, restauration stock) sans bloquer la requête principale.
3. **Extensibilité** : de nouveaux consommateurs (service de facturation, analytics) peuvent s'abonner aux mêmes topics sans modifier les producteurs.

## Démarrage Kafka

```bash
docker-compose up -d
docker ps  # Vérifier smartreserve-kafka et smartreserve-zookeeper
```

## Configuration

Variable d'environnement optionnelle :
```
KAFKA_BROKER=localhost:9092
```

Définie dans `shared/kafka.js`.
