const { grpc, loadProto } = require('../../../shared/grpc-loader');
const { catalogServiceImpl, startKafkaConsumer } = require('./grpc-server');

const PORT = process.env.CATALOG_SERVICE_PORT || '50052';
const HOST = process.env.CATALOG_SERVICE_HOST || '0.0.0.0';

async function start() {
  startKafkaConsumer().catch((err) =>
    console.warn('[Catalog Service] Kafka indisponible:', err.message)
  );

  const CatalogService = loadProto('catalog.proto', 'catalog', 'CatalogService');
  const server = new grpc.Server();
  server.addService(CatalogService.service, catalogServiceImpl);

  server.bindAsync(
    `${HOST}:${PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('[Catalog Service] Erreur démarrage gRPC:', err);
        process.exit(1);
      }
      server.start();
      console.log(`[Catalog Service] gRPC actif sur ${HOST}:${port}`);
      console.log('[Catalog Service] Base de données SQLite: services/catalog-service/data/catalog.db');
    }
  );
}

start().catch((err) => {
  console.error('[Catalog Service] Erreur fatale:', err);
  process.exit(1);
});
