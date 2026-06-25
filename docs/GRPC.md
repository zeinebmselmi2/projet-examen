# gRPC — SmartReserve

## Fichiers .proto

Les contrats d'interface sont centralisés dans le dossier `/proto` :

| Fichier | Package | Service | Port |
|---------|---------|---------|------|
| `user.proto` | user | UserService | 50051 |
| `catalog.proto` | catalog | CatalogService | 50052 |
| `booking.proto` | booking | BookingService | 50053 |

## Séparation contrat / implémentation

```
proto/                    ← Contrat (interface)
  user.proto
  catalog.proto
  booking.proto

services/
  user-service/src/       ← Implémentation serveur gRPC
  catalog-service/src/
  booking-service/src/

gateway/src/grpc-clients.js  ← Client gRPC (API Gateway)
```

Le chargement des `.proto` est factorisé dans `shared/grpc-loader.js` via `@grpc/proto-loader`.

## UserService

```protobuf
service UserService {
  rpc CreateUser (CreateUserRequest) returns (UserResponse);
  rpc GetUser (GetUserRequest) returns (UserResponse);
  rpc ListUsers (ListUsersRequest) returns (ListUsersResponse);
  rpc UpdateUser (UpdateUserRequest) returns (UserResponse);
  rpc DeleteUser (DeleteUserRequest) returns (DeleteUserResponse);
  rpc SearchUsers (SearchUsersRequest) returns (ListUsersResponse);
}
```

## CatalogService

```protobuf
service CatalogService {
  rpc CreateResource (CreateResourceRequest) returns (ResourceResponse);
  rpc GetResource (GetResourceRequest) returns (ResourceResponse);
  rpc ListResources (ListResourcesRequest) returns (ListResourcesResponse);
  rpc UpdateResource (UpdateResourceRequest) returns (ResourceResponse);
  rpc DeleteResource (DeleteResourceRequest) returns (DeleteResourceResponse);
  rpc SearchResources (SearchResourcesRequest) returns (ListResourcesResponse);
  rpc UpdateAvailability (UpdateAvailabilityRequest) returns (ResourceResponse);
}
```

## BookingService

```protobuf
service BookingService {
  rpc CreateBooking (CreateBookingRequest) returns (BookingResponse);
  rpc GetBooking (GetBookingRequest) returns (BookingResponse);
  rpc ListBookings (ListBookingsRequest) returns (ListBookingsResponse);
  rpc UpdateBookingStatus (UpdateBookingStatusRequest) returns (BookingResponse);
  rpc CancelBooking (CancelBookingRequest) returns (CancelBookingResponse);
  rpc ListUserBookings (ListUserBookingsRequest) returns (ListBookingsResponse);
}
```

## Communication inter-services

En plus de l'API Gateway, le **Booking Service** appelle le **Catalog Service** en gRPC pour :
- Vérifier l'existence et la disponibilité d'une ressource
- Récupérer le `price_per_day` pour calculer le total

```
Booking Service ──gRPC GetResource──► Catalog Service
```

## Gestion des erreurs gRPC

| Code gRPC | Nom | Usage |
|-----------|-----|-------|
| 3 | INVALID_ARGUMENT | Champs manquants ou invalides |
| 5 | NOT_FOUND | Entité introuvable |
| 6 | ALREADY_EXISTS | Email déjà utilisé |
| 9 | FAILED_PRECONDITION | Règle métier (indisponible, déjà annulé) |
| 13 | INTERNAL | Erreur interne |

L'API Gateway traduit ces codes en HTTP :
- 3 → 400, 5 → 404, 6 → 409, 9 → 422, 13 → 500

## Exemple d'appel (Node.js client)

```javascript
const { grpc, loadProto } = require('./shared/grpc-loader');

const UserService = loadProto('user.proto', 'user', 'UserService');
const client = new UserService('localhost:50051', grpc.credentials.createInsecure());

client.GetUser({ id: 'USER_ID' }, (err, response) => {
  if (err) console.error(err);
  else console.log(response.user);
});
```

## Technologies

- `@grpc/grpc-js` — Implémentation gRPC Node.js (HTTP/2)
- `@grpc/proto-loader` — Chargement dynamique des `.proto`
- Protocol Buffers v3 (proto3)

## Test manuel avec grpcurl (optionnel)

```bash
# Lister les services
grpcurl -plaintext localhost:50051 list

# Appeler ListUsers
grpcurl -plaintext -d '{"page":1,"limit":5}' localhost:50051 user.UserService/ListUsers
```
