const { grpc, loadProto } = require('../../../shared/grpc-loader');
const { bookingServiceImpl, initKafka } = require('./grpc-server');

const PORT = process.env.BOOKING_SERVICE_PORT || '50053';
const HOST = process.env.BOOKING_SERVICE_HOST || '0.0.0.0';

async function start() {
  const BookingService = loadProto('booking.proto', 'booking', 'BookingService');
  const server = new grpc.Server();
  server.addService(BookingService.service, bookingServiceImpl);

  server.bindAsync(
    `${HOST}:${PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('[Booking Service] Erreur démarrage gRPC:', err);
        process.exit(1);
      }
      server.start();
      console.log(`[Booking Service] gRPC actif sur ${HOST}:${port}`);
      console.log('[Booking Service] Base de données SQLite: services/booking-service/data/bookings.db');
    }
  );

  initKafka().catch((err) => console.warn('[Booking Service] Kafka indisponible:', err.message));
}

start().catch((err) => {
  console.error('[Booking Service] Erreur fatale:', err);
  process.exit(1);
});
