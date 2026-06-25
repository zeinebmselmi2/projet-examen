# Schéma GraphQL — SmartReserve

Endpoint : `http://localhost:3000/graphql`

## Justification de GraphQL

GraphQL est utilisé pour des **requêtes flexibles** où le client choisit exactement les champs nécessaires. Cas d'usage principal : obtenir une réservation avec les détails de l'utilisateur et de la ressource en **une seule requête**, sans sur-fetching.

## Types

```graphql
type User {
  id: ID!
  email: String!
  full_name: String!
  phone: String
  role: String!
  created_at: String!
}

type Resource {
  id: ID!
  name: String!
  description: String
  category: String!
  price_per_day: Float!
  availability: Int!
  location: String
  created_at: String!
}

type Booking {
  id: ID!
  user_id: ID!
  resource_id: ID!
  start_date: String!
  end_date: String!
  total_price: Float!
  status: String!
  created_at: String!
  user: User          # Résolu via gRPC → User Service
  resource: Resource  # Résolu via gRPC → Catalog Service
}
```

## Queries

### Utilisateurs

```graphql
# Un utilisateur par ID
query {
  user(id: "USER_ID") {
    email
    full_name
    role
  }
}

# Liste paginée
query {
  users(page: 1, limit: 10) {
    total
    users {
      id
      full_name
      email
    }
  }
}

# Recherche
query {
  searchUsers(query: "martin") {
    total
    users { full_name email }
  }
}
```

### Ressources

```graphql
# Ressources par catégorie (champs sélectionnés)
query {
  resources(category: "salle", limit: 5) {
    total
    resources {
      name
      price_per_day
      availability
      location
    }
  }
}

# Recherche flexible
query {
  searchResources(query: "photo", category: "studio") {
    resources {
      name
      description
      price_per_day
    }
  }
}
```

### Réservations (requête composée)

```graphql
query GetFullBooking($id: ID!) {
  booking(id: $id) {
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

Variables :
```json
{ "id": "BOOKING_ID" }
```

### Réservations d'un utilisateur

```graphql
query {
  userBookings(userId: "USER_ID") {
    total
    bookings {
      id
      status
      total_price
      resource { name location }
    }
  }
}
```

## Mutations

```graphql
# Créer un utilisateur
mutation {
  createUser(
    email: "bob@mail.fr"
    full_name: "Bob Dupont"
    phone: "0600000000"
  ) {
    id
    email
  }
}

# Créer une ressource
mutation {
  createResource(
    name: "Studio C"
    category: "studio"
    price_per_day: 180
    availability: 1
    location: "Lyon"
  ) {
    id
    name
  }
}

# Créer une réservation
mutation {
  createBooking(
    user_id: "USER_ID"
    resource_id: "RESOURCE_ID"
    start_date: "2026-08-01"
    end_date: "2026-08-03"
  ) {
    id
    total_price
    status
  }
}

# Confirmer une réservation
mutation {
  confirmBooking(id: "BOOKING_ID") {
    id
    status
  }
}

# Annuler une réservation
mutation {
  cancelBooking(id: "BOOKING_ID") {
    id
    status
  }
}
```

## Test avec curl

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ resources(limit:3) { total resources { name price_per_day } } }"}'
```

## Apollo Sandbox

Ouvrir `http://localhost:3000/graphql` dans un navigateur pour accéder à l'interface Apollo Sandbox (si disponible) ou utiliser un client GraphQL (Insomnia, Postman, Altair).
