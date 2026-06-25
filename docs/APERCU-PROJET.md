# Aperçu du projet SmartReserve (monôme)

Document de compréhension rapide — à lire avant la soutenance.

---

## 1. C'est quoi ce projet ?

**SmartReserve** est une **plateforme de réservation** : un utilisateur peut s'inscrire, consulter des ressources (salle, studio, véhicule, bureau) et les réserver pour certaines dates.

Le projet est réalisé en **architecture microservices** : plusieurs petits services indépendants qui communiquent entre eux, au lieu d'une seule grosse application.

**Travail : monôme** (réalisé par un seul étudiant).

**Sujet :** Plateforme de réservation intelligente (idée n°2 du professeur).

---

## 2. Les 3 microservices (le cœur du projet)

Chaque microservice = **1 responsabilité** + **1 base de données SQLite** + **1 interface gRPC**.

### User Service (port 50051)

| Question | Réponse |
|----------|---------|
| **Rôle** | Gérer les **utilisateurs** |
| **Fait quoi ?** | Inscription, consultation, modification, suppression, recherche |
| **Base de données** | `services/user-service/data/users.db` |
| **Table** | `users` (id, email, nom, téléphone, rôle) |
| **Kafka** | **Producteur** de `user.registered` — **Consommateur** de `booking.confirmed` |

**Exemple métier :** Jean s'inscrit avec son email → enregistré dans la BDD → événement Kafka `user.registered` publié.

---

### Catalog Service (port 50052)

| Question | Réponse |
|----------|---------|
| **Rôle** | Gérer le **catalogue de ressources** réservables |
| **Fait quoi ?** | CRUD ressources, recherche, gestion du **stock** (disponibilité) |
| **Base de données** | `services/catalog-service/data/catalog.db` |
| **Table** | `resources` (nom, catégorie, prix/jour, disponibilité, lieu) |
| **Kafka** | **Consommateur** de `booking.created` et `booking.cancelled` |

**Exemple métier :** Il y a 3 salles disponibles. Quand quelqu'un réserve → Kafka informe ce service → disponibilité passe à 2.

**Données de démo :** 4 ressources créées automatiquement au premier démarrage.

---

### Booking Service (port 50053)

| Question | Réponse |
|----------|---------|
| **Rôle** | Gérer les **réservations** |
| **Fait quoi ?** | Créer, consulter, confirmer, annuler des réservations |
| **Base de données** | `services/booking-service/data/bookings.db` |
| **Table** | `bookings` (user_id, resource_id, dates, prix, statut) |
| **Kafka** | **Producteur** de 3 topics : `booking.created`, `booking.confirmed`, `booking.cancelled` |
| **gRPC client** | Appelle Catalog Service pour vérifier prix et disponibilité |

**Exemple métier :** Marie réserve une salle du 1er au 5 juillet → prix calculé (nb jours × prix/jour) → statut `pending` → événement `booking.created`.

**Statuts possibles :** `pending` → `confirmed` → `completed` ou `cancelled`

---

## 3. L'API Gateway (port 3000)

Ce n'est **pas** un microservice métier. C'est la **porte d'entrée** pour le client (Postman, navigateur, app).

| Protocole | URL | Rôle |
|-----------|-----|------|
| **REST** | `http://localhost:3000/api` | CRUD classique (POST, GET, PUT, DELETE) |
| **GraphQL** | `http://localhost:3000/graphql` | Requêtes flexibles |
| **Health** | `http://localhost:3000/health` | Vérifier que le système marche |

**Important :** La Gateway **ne contient pas la logique métier**. Elle reçoit la requête du client et la **transmet aux microservices via gRPC**.

```
Client (Postman) → API Gateway → gRPC → Microservice → SQLite
```

---

## 4. gRPC — c'est quoi ?

**gRPC** = communication **rapide et typée** entre services, utilisée **en interne** (pas visible dans Postman directement).

- **Contrat** : fichiers `.proto` dans le dossier `proto/`
- **Gateway → Microservices** : tous les appels REST/GraphQL passent par gRPC
- **Booking → Catalog** : le Booking Service appelle Catalog en gRPC pour vérifier une ressource

| Fichier | Service |
|---------|---------|
| `proto/user.proto` | UserService |
| `proto/catalog.proto` | CatalogService |
| `proto/booking.proto` | BookingService |

**Pour le prof :** gRPC = 5 points sur 20 → c'est le critère le plus important.

---

## 5. REST — c'est quoi ?

**REST** = API web classique avec des **URLs** et des **méthodes HTTP**.

| Méthode | Action | Exemple |
|---------|--------|---------|
| POST | Créer | `POST /api/users` |
| GET | Lire | `GET /api/resources` |
| PUT | Modifier | `PUT /api/users/{id}` |
| DELETE | Supprimer | `DELETE /api/users/{id}` |
| PATCH | Modifier partiellement | `PATCH /api/bookings/{id}/status` |

**Testé avec : Postman**

---

## 6. GraphQL — c'est quoi ?

**GraphQL** = le client **choisit exactement** les champs qu'il veut recevoir, en **une seule requête**.

### Différence avec REST

**REST** — 3 appels séparés pour une réservation complète :
1. GET booking
2. GET user
3. GET resource

**GraphQL** — 1 seul appel :
```graphql
query {
  booking(id: "xxx") {
    status
    total_price
    user { full_name email }
    resource { name location }
  }
}
```

**Testé avec :** Postman (onglet GraphQL), Altair, ou navigateur sur `/graphql`

**Pour le prof :** GraphQL = requêtes flexibles, pas de sur-fetching.

---

## 7. Kafka 4 — c'est quoi ?

**Kafka** = **messagerie asynchrone**. Les services envoient des **événements** (messages) sans s'appeler directement.

### Version utilisée : **Apache Kafka 4.0** (pas Kafka 3)

- Docker : `apache/kafka:4.0.0`
- Mode **KRaft** (sans Zookeeper — nouveauté Kafka 4)
- Port : **9092**

### Les 4 topics (pas 3)

| # | Topic | Qui envoie ? | Qui reçoit ? | Pourquoi ? |
|---|-------|--------------|--------------|------------|
| 1 | `user.registered` | User Service | *(extensible)* | Un user vient de s'inscrire |
| 2 | `booking.created` | Booking Service | Catalog Service | Décrémenter le stock |
| 3 | `booking.confirmed` | Booking Service | User Service | Notifier l'utilisateur |
| 4 | `booking.cancelled` | Booking Service | Catalog Service | Remettre le stock (+1) |

### Schéma simplifié

```
                    ┌─────────────┐
  user.registered   │ User Service│
        ◄───────────│  (producteur)│
                    └─────────────┘

  booking.created   ┌───────────────┐   booking.created   ┌────────────────┐
  ─────────────────►│Booking Service│────────────────────►│ Catalog Service│
  booking.confirmed│  (producteur) │   booking.cancelled │  (consommateur)│
  booking.cancelled └───────────────┘────────────────────►└────────────────┘
                              │
                              │ booking.confirmed
                              ▼
                    ┌─────────────┐
                    │ User Service│
                    │(consommateur)│
                    └─────────────┘
```

### Pourquoi Kafka ici ?

Sans Kafka, quand on crée une réservation, le Booking Service devrait **appeler directement** le Catalog Service pour mettre à jour le stock → **couplage fort**.

Avec Kafka → le Booking Service **publie un événement** et continue. Le Catalog Service **écoute** et met à jour quand il veut → **découplage**.

---

## 8. Vue d'ensemble — tout ensemble

```
┌──────────────────────────────────────────────────────────────┐
│                        VOUS (Postman)                         │
└─────────────────────────┬────────────────────────────────────┘
                          │ REST + GraphQL
                          ▼
                 ┌─────────────────┐
                 │   API Gateway   │ :3000
                 └────────┬────────┘
                          │ gRPC (sync)
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌────────────┐  ┌────────────┐  ┌────────────┐
   │User Service│  │Catalog Svc │  │Booking Svc │
   │   :50051   │  │   :50052   │  │   :50053   │
   │ users.db   │  │ catalog.db │  │bookings.db │
   └─────┬──────┘  └─────▲──────┘  └─────┬──────┘
         │               │               │
         └───────────────┼───────────────┘
                         │ Kafka 4 (async)
                         ▼
                 ┌───────────────┐
                 │ Kafka :9092   │
                 │ 4 topics      │
                 └───────────────┘
```

---

## 9. Fichiers importants à connaître

| Dossier/Fichier | Contenu |
|-----------------|---------|
| `proto/` | Contrats gRPC (.proto) |
| `gateway/` | API Gateway REST + GraphQL |
| `services/user-service/` | Microservice utilisateurs |
| `services/catalog-service/` | Microservice catalogue |
| `services/booking-service/` | Microservice réservations |
| `shared/kafka.js` | Config Kafka + 4 topics |
| `docker-compose.yml` | Lance Kafka 4 |
| `client/test-client.js` | Test automatique |
| `docs/` | Documentation technique |

---

## 10. Phrases pour la soutenance

> « Mon projet SmartReserve est une plateforme de réservation en microservices Node.js, réalisée en monôme. »

> « J'ai 3 microservices indépendants, chacun avec sa propre base SQLite : User, Catalog et Booking. »

> « L'API Gateway expose REST pour le CRUD et GraphQL pour les requêtes composées. Elle communique avec les microservices via gRPC. »

> « Kafka 4 gère 4 topics pour la communication asynchrone : inscription, création, confirmation et annulation de réservation. »

> « gRPC est le protocole principal entre la Gateway et les microservices, avec des contrats définis dans les fichiers .proto. »
