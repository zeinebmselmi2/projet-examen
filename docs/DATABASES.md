# Bases de données — SmartReserve

Chaque microservice possède sa **propre base de données SQLite3**, conformément au principe *Database per Service*.

Technologie : **better-sqlite3** (driver SQLite synchrone pour Node.js)

## User Service — users.db

**Chemin** : `services/user-service/data/users.db`

### Table `users`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| email | TEXT | UNIQUE, NOT NULL | Email utilisateur |
| full_name | TEXT | NOT NULL | Nom complet |
| phone | TEXT | | Téléphone |
| role | TEXT | DEFAULT 'client' | Rôle (client, admin) |
| created_at | TEXT | NOT NULL | Date ISO8601 |

### Opérations
- CRUD complet via gRPC
- Recherche par email, nom, téléphone

---

## Catalog Service — catalog.db

**Chemin** : `services/catalog-service/data/catalog.db`

### Table `resources`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| name | TEXT | NOT NULL | Nom de la ressource |
| description | TEXT | | Description |
| category | TEXT | NOT NULL | salle, studio, vehicule, bureau |
| price_per_day | REAL | NOT NULL | Prix journalier (€) |
| availability | INTEGER | NOT NULL, DEFAULT 1 | Stock disponible |
| location | TEXT | | Ville / lieu |
| created_at | TEXT | NOT NULL | Date ISO8601 |

### Données de démonstration

Au premier démarrage, 4 ressources exemples sont insérées automatiquement :
- Salle de conférence A (Paris)
- Studio photo (Lyon)
- Véhicule utilitaire (Marseille)
- Espace coworking (Toulouse)

### Opérations
- CRUD complet via gRPC
- Mise à jour disponibilité via Kafka (booking.created / booking.cancelled)
- Recherche par nom, description, lieu, catégorie

---

## Booking Service — bookings.db

**Chemin** : `services/booking-service/data/bookings.db`

### Table `bookings`

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | UUID v4 |
| user_id | TEXT | NOT NULL | Référence utilisateur (logique) |
| resource_id | TEXT | NOT NULL | Référence ressource (logique) |
| start_date | TEXT | NOT NULL | Date début (YYYY-MM-DD) |
| end_date | TEXT | NOT NULL | Date fin (YYYY-MM-DD) |
| total_price | REAL | NOT NULL | Prix total calculé |
| status | TEXT | NOT NULL, DEFAULT 'pending' | pending, confirmed, cancelled, completed |
| created_at | TEXT | NOT NULL | Date ISO8601 |

### Calcul du prix

```
total_price = nombre_de_jours × price_per_day (récupéré via gRPC Catalog)
nombre_de_jours = ceil(end_date - start_date), minimum 1
```

### Opérations
- Création, lecture, liste, changement statut, annulation
- Liste par utilisateur
- Pas de clé étrangère vers les autres BDD (indépendance des services)

---

## Indépendance des bases

| Principe | Implémentation |
|----------|----------------|
| Pas de JOIN inter-services | Les jointures GraphQL sont résolues par l'API Gateway via appels gRPC multiples |
| Pas de clés étrangères cross-DB | `user_id` et `resource_id` sont des références logiques (UUID) |
| Propriété des données | Chaque service est seul responsable de sa base |

## Réinitialisation

Pour repartir de zéro, supprimer les fichiers `.db` :

```bash
rm services/user-service/data/users.db
rm services/catalog-service/data/catalog.db
rm services/booking-service/data/bookings.db
```

Les bases seront recréées au prochain démarrage (avec seed pour catalog).

## Choix SQLite3

SQLite3 est autorisé par le cahier des charges pour les bases SQL. Il permet :
- Zéro configuration (fichier local)
- Déploiement simple pour démonstration académique
- Isolation par microservice (un fichier par service)
