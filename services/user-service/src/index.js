const { grpc, loadProto } = require('../../../shared/grpc-loader');
const { userServiceImpl, initKafka } = require('./grpc-server');
   
const PORT = process.env.USER_SERVICE_PORT || '50051';
const HOST = process.env.USER_SERVICE_HOST || '0.0.0.0';

async function start() {
  const UserService = loadProto('user.proto', 'user', 'UserService');
  const server = new grpc.Server();
  server.addService(UserService.service, userServiceImpl);

  server.bindAsync(
    `${HOST}:${PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('[User Service] Erreur démarrage gRPC:', err);
        process.exit(1);
      }
      server.start();
      console.log(`[User Service] gRPC actif sur ${HOST}:${port}`);
      console.log('[User Service] Base de données SQLite: services/user-service/data/users.db');
    }
  );

  initKafka().catch((err) => console.warn('[User Service] Kafka indisponible:', err.message));
}

start().catch((err) => {
  console.error('[User Service] Erreur fatale:', err);
  process.exit(1);
});
