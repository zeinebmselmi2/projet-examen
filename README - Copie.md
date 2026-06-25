# SmartReserve — Plateforme de réservation intelligente

Application microservices Node.js pour la gestion de réservations de ressources (salles, studios, véhicules, bureaux).

## Informations projet

| Élément | Détail |
|---------|--------|
| **Type de travail** | Monôme (réalisé seul) |
| **Sujet choisi** | **Plateforme de réservation intelligente** (idée n°2 du cahier des charges) |
| **Nom de l'application** | SmartReserve |
| **Auteur** | *(mettez votre nom ici)* |
| **Kafka** | **Apache Kafka 4.0** (4 topics, mode KRaft sans Zookeeper) |
| **Documentation complète** | [docs/APERCU-PROJET.md](docs/APERCU-PROJET.md) |

### Pourquoi ce sujet ?

Le professeur propose plusieurs idées. J'ai choisi la **plateforme de réservation** car elle permet naturellement d'utiliser :
- **REST** → créer/modifier/supprimer utilisateurs, ressources, réservations
- **GraphQL** → récupérer une réservation avec les infos utilisateur + ressource en une seule requête
- **gRPC** → communication entre l'API Gateway et les 3 microservices
- **Kafka** → événements quand une réservation est créée, confirmée ou annulée

---

## Guide pas à pas — Comment lancer le projet (débutant)

### Étape 0 — Vérifier les outils installés

Ouvrez **PowerShell** et tapez :

```powershell
node -v
npm -v
```

Vous devez avoir **Node.js 18 ou plus**. Si `node` n'est pas reconnu, installez Node.js depuis https://nodejs.org

Pour **Kafka** (optionnel mais recommandé pour la note) : installez **Docker Desktop** depuis https://www.docker.com/products/docker-desktop/

Pour **Postman** : installez depuis https://www.postman.com/downloads/

---

### Étape 1 — Installer les dépendances (une seule fois)

```powershell
cd "c:\PROJET SOA"
npm run install:all
```

Attendez la fin (peut prendre 2-3 minutes). Si une erreur apparaît, installez manuellement :

```powershell
cd "c:\PROJET SOA"
npm install
cd gateway; npm install; cd ..
cd services\user-service; npm install; cd ..\..
cd services\catalog-service; npm install; cd ..\..
cd services\booking-service; npm install; cd ..\..
```

---

### Étape 2 — Démarrer Kafka (avec Docker)

1. Ouvrez **Docker Desktop** et attendez qu'il soit démarré (icône verte).
2. Dans PowerShell :

```powershell
cd "c:\PROJET SOA"
npm run kafka:up
```

> **Sans Docker ?** Le projet fonctionne quand même pour REST, GraphQL et gRPC. Seuls les événements Kafka (mise à jour automatique du stock) ne marcheront pas.

---

### Étape 3 — Démarrer les 4 services

Vous devez ouvrir **4 fenêtres PowerShell** (ou 4 onglets dans le terminal).  
**Ne fermez pas ces fenêtres** tant que vous testez.

**Fenêtre 1 — User Service :**
```powershell
cd "c:\PROJET SOA"
npm run start:user
```
Vous devez voir : `[User Service] gRPC actif sur 0.0.0.0:50051`

**Fenêtre 2 — Catalog Service :**
```powershell
cd "c:\PROJET SOA"
npm run start:catalog
```
Vous devez voir : `[Catalog Service] gRPC actif sur 0.0.0.0:50052`

**Fenêtre 3 — Booking Service :**
```powershell
cd "c:\PROJET SOA"
npm run start:booking
```
Vous devez voir : `[Booking Service] gRPC actif sur 0.0.0.0:50053`

**Fenêtre 4 — API Gateway (le plus important pour Postman) :**
```powershell
cd "c:\PROJET SOA"
npm run start:gateway
```
Vous devez voir :
```
[API Gateway] REST disponible sur http://localhost:3000/api
[API Gateway] GraphQL disponible sur http://localhost:3000/graphql
```

**Alternative — tout en une commande** (1 seule fenêtre) :
```powershell
cd "c:\PROJET SOA"
npm run dev
```

---

### Étape 4 — Vérifier que ça marche

Ouvrez votre navigateur et allez sur :

```
http://localhost:3000/health
```

Vous devez voir un JSON comme :
```json
{"status":"ok","service":"SmartReserve API Gateway",...}
```

---

### Étape 5 — Test automatique (optionnel)

Dans une **5ème fenêtre** PowerShell :

```powershell
cd "c:\PROJET SOA"
npm run start:client
```

Si tout est OK, vous verrez : `=== Démonstration terminée avec succès ===`

---

## Tests avec Postman (REST)

Dans Postman, créez une collection **SmartReserve**.  
Base URL : `http://localhost:3000`

### Test 1 — Santé du système

| Champ | Valeur |
|-------|--------|
| Méthode | `GET` |
| URL | `http://localhost:3000/health` |

Cliquez **Send**. Réponse attendue : `"status": "ok"`

---

### Test 2 — Créer un utilisateur

| Champ | Valeur |
|-------|--------|
| Méthode | `POST` |
| URL | `http://localhost:3000/api/users` |
| Headers | `Content-Type` = `application/json` |
| Body | Raw → JSON |

```json
{
  "email": "jean.dupont@mail.fr",
  "full_name": "Jean Dupont",
  "phone": "0612345678",
  "role": "client"
}
```

**Copiez l'`id`** de la réponse (ex: `"id": "abc-123-..."`). Vous en aurez besoin plus tard.

---

### Test 3 — Lister les ressources disponibles

| Champ | Valeur |
|-------|--------|
| Méthode | `GET` |
| URL | `http://localhost:3000/api/resources` |

Vous verrez 4 ressources de démo (salle, studio, véhicule, bureau).  
**Copiez l'`id`** d'une ressource.

---

### Test 4 — Créer une réservation

| Champ | Valeur |
|-------|--------|
| Méthode | `POST` |
| URL | `http://localhost:3000/api/bookings` |
| Body | Raw → JSON |

```json
{
  "user_id": "COLLEZ_ICI_L_ID_UTILISATEUR",
  "resource_id": "COLLEZ_ICI_L_ID_RESSOURCE",
  "start_date": "2026-07-01",
  "end_date": "2026-07-05"
}
```

Réponse : réservation avec `"status": "pending"` et `"total_price"` calculé automatiquement.

---

### Test 5 — Confirmer la réservation

| Champ | Valeur |
|-------|--------|
| Méthode | `PATCH` |
| URL | `http://localhost:3000/api/bookings/ID_DE_LA_RESERVATION/status` |
| Body | Raw → JSON |

```json
{
  "status": "confirmed"
}
```

---

### Test 6 — Autres endpoints REST utiles

| Action | Méthode | URL |
|--------|---------|-----|
| Voir un utilisateur | GET | `http://localhost:3000/api/users/{id}` |
| Rechercher utilisateurs | GET | `http://localhost:3000/api/users/search?q=jean` |
| Voir une ressource | GET | `http://localhost:3000/api/resources/{id}` |
| Rechercher ressources | GET | `http://localhost:3000/api/resources/search?q=salle` |
| Voir une réservation | GET | `http://localhost:3000/api/bookings/{id}` |
| Réservations d'un user | GET | `http://localhost:3000/api/bookings/user/{userId}` |
| Annuler réservation | POST | `http://localhost:3000/api/bookings/{id}/cancel` |
| Supprimer utilisateur | DELETE | `http://localhost:3000/api/users/{id}` |

---

## Tests GraphQL

GraphQL permet de demander **exactement les champs** que vous voulez.

### Option A — Postman

1. Nouvelle requête → onglet **GraphQL** (ou Body → GraphQL)
2. URL : `http://localhost:3000/graphql`
3. Collez une requête ci-dessous → **Send**

### Option B — Navigateur + Apollo Sandbox

Allez sur `http://localhost:3000/graphql` — une interface de test peut s'ouvrir.

### Option C — Extension Chrome "Altair GraphQL Client"

URL : `http://localhost:3000/graphql`

---

### Requête GraphQL 1 — Lister les ressources

```graphql
query {
  resources(limit: 5) {
    total
    resources {
      id
      name
      category
      price_per_day
      availability
      location
    }
  }
}
```

---

### Requête GraphQL 2 — Réservation complète (user + resource en une fois)

Remplacez `VOTRE_BOOKING_ID` par un vrai id :

```graphql
query {
  booking(id: "VOTRE_BOOKING_ID") {
    id
    status
    total_price
    start_date
    end_date
    user {
      full_name
      email
      phone
    }
    resource {
      name
      category
      location
      availability
    }
  }
}
```

> C'est **l'intérêt de GraphQL** : une seule requête au lieu de 3 appels REST séparés.

---

### Requête GraphQL 3 — Rechercher des salles

```graphql
query {
  searchResources(query: "salle", category: "salle") {
    total
    resources {
      name
      price_per_day
      availability
    }
  }
}
```

---

### Mutation GraphQL — Créer un utilisateur

```graphql
mutation {
  createUser(
    email: "marie@mail.fr"
    full_name: "Marie Durand"
    phone: "0698765432"
  ) {
    id
    email
    full_name
  }
}
```

---

### Mutation GraphQL — Créer une réservation

```graphql
mutation {
  createBooking(
    user_id: "ID_UTILISATEUR"
    resource_id: "ID_RESSOURCE"
    start_date: "2026-08-01"
    end_date: "2026-08-03"
  ) {
    id
    total_price
    status
  }
}
```

---

## Ordre recommandé pour la démo devant le prof

1. Montrer l'architecture (`docs/ARCHITECTURE.md`)
2. Démarrer les 4 services + Kafka
3. **Postman** : créer user → lister resources → créer booking → confirmer
4. **GraphQL** : requête `booking` avec user + resource
5. Montrer les fichiers `.proto` dans `proto/`
6. Expliquer Kafka : `docs/KAFKA.md` (topics, producteurs, consommateurs)
7. Montrer les 3 bases SQLite dans `services/*/data/`

---

## Architecture

```
                    ┌─────────────────┐
                    │  Client / Tests │
                    └────────┬────────┘
                             │ REST + GraphQL
                    ┌────────▼────────┐
                    │   API Gateway   │ :3000
                    │  (Express +     │
                    │   Apollo)       │
                    └────────┬────────┘
                             │ gRPC
         ┌───────────────────┼───────────────────┐
         │                   │                   │
  ┌──────▼──────┐    ┌───────▼──────┐   ┌───────▼──────┐
  │ User Service│    │Catalog Service│   │Booking Service│
  │   :50051    │    │    :50052     │   │    :50053     │
  │  SQLite3    │    │   SQLite3     │   │   SQLite3     │
  └──────┬──────┘    └───────┬──────┘   └───────┬──────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │ Kafka (async)
                    ┌────────▼────────┐
                    │  Kafka Broker   │ :9092
                    └─────────────────┘
```

## Prérequis

- **Node.js** >= 18 → https://nodejs.org
- **Postman** (pour tester REST/GraphQL) → https://www.postman.com/downloads/
- **Docker Desktop** (pour Kafka, optionnel mais recommandé) → https://www.docker.com/products/docker-desktop/

## Installation rapide

Voir le **Guide pas à pas** en haut de ce fichier.

```powershell
cd "c:\PROJET SOA"
npm run install:all
npm run kafka:up
```

## Exécution rapide

4 terminaux (ou `npm run dev`) — voir **Étape 3** du guide ci-dessus.

## Test rapide

```powershell
npm run start:client
```

## Endpoints principaux

| Type | URL |
|------|-----|
| Santé | `GET http://localhost:3000/health` |
| REST API | `http://localhost:3000/api` |
| GraphQL | `http://localhost:3000/graphql` |

### Exemple REST

```bash
# Créer un utilisateur
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@mail.fr","full_name":"Jean Dupont","phone":"0600000000"}'

# Lister les ressources
curl http://localhost:3000/api/resources

# Créer une réservation
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<USER_ID>","resource_id":"<RESOURCE_ID>","start_date":"2026-07-01","end_date":"2026-07-05"}'
```

### Exemple GraphQL

```graphql
query {
  resources(category: "salle") {
    total
    resources {
      name
      price_per_day
      availability
    }
  }
}
```

## Structure du projet

```
PROJET SOA/
├── proto/                  # Contrats gRPC (.proto)
├── shared/                 # Utilitaires Kafka et gRPC
├── gateway/                # API Gateway (REST + GraphQL)
├── services/
│   ├── user-service/       # Microservice utilisateurs
│   ├── catalog-service/    # Microservice catalogue
│   └── booking-service/    # Microservice réservations
├── client/                 # Client de test
├── docs/                   # Documentation technique
├── docker-compose.yml      # Kafka 4 (Apache)
└── README.md
```

## Documentation complète

| Document | Description |
|----------|-------------|
| [docs/APERCU-PROJET.md](docs/APERCU-PROJET.md) | **Comprendre tout le projet** (microservices, Kafka, GraphQL) |
| [docs/REST-API.md](docs/REST-API.md) | Endpoints REST |
| [docs/GRAPHQL.md](docs/GRAPHQL.md) | Schéma GraphQL |
| [docs/KAFKA.md](docs/KAFKA.md) | Topics et événements Kafka |
| [docs/DATABASES.md](docs/DATABASES.md) | Bases de données SQLite |
| [docs/GRPC.md](docs/GRPC.md) | Services gRPC et fichiers .proto |

## Technologies utilisées

| Composant | Technologie |
|-----------|-------------|
| Runtime | Node.js |
| API Gateway REST | Express |
| API Gateway GraphQL | Apollo Server |
| Communication sync | gRPC + Protocol Buffers |
| Communication async | **Apache Kafka 4.0** (kafkajs) |
| Bases de données | SQLite3 (better-sqlite3) |
| Conteneurisation | Docker Compose |

## Scénario métier

1. Un **client** s'inscrit sur la plateforme (User Service).
2. Il consulte le **catalogue** de ressources disponibles (Catalog Service).
3. Il crée une **réservation** pour une ressource (Booking Service).
4. Kafka notifie le Catalog Service qui **décrémente la disponibilité**.
5. La réservation est **confirmée** → événement Kafka → notification côté User Service.

## Arrêt des services

```bash
npm run kafka:down
```

## Licence

Projet académique — A.U. 2025-26 — Dr. Salah Gontara
