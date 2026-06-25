const { grpc, loadProto } = require('../../shared/grpc-loader');

const USER_HOST = process.env.USER_SERVICE_HOST || 'localhost';
const USER_PORT = process.env.USER_SERVICE_PORT || '50051';
const CATALOG_HOST = process.env.CATALOG_SERVICE_HOST || 'localhost';
const CATALOG_PORT = process.env.CATALOG_SERVICE_PORT || '50052';
const BOOKING_HOST = process.env.BOOKING_SERVICE_HOST || 'localhost';
const BOOKING_PORT = process.env.BOOKING_SERVICE_PORT || '50053';

function createClient(protoFile, packageName, serviceName, host, port) {
  const Service = loadProto(protoFile, packageName, serviceName);
  return new Service(`${host}:${port}`, grpc.credentials.createInsecure());
}

const userClient = createClient('user.proto', 'user', 'UserService', USER_HOST, USER_PORT);
const catalogClient = createClient('catalog.proto', 'catalog', 'CatalogService', CATALOG_HOST, CATALOG_PORT);
const bookingClient = createClient('booking.proto', 'booking', 'BookingService', BOOKING_HOST, BOOKING_PORT);

function grpcCall(client, method, request) {
  return new Promise((resolve, reject) => {
    client[method](request, (err, response) => {
      if (err) {
        const error = new Error(err.details || err.message);
        error.grpcCode = err.code;
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}

function mapGrpcError(err, res) {
  const statusMap = {
    3: 400,
    5: 404,
    6: 409,
    9: 422,
  };
  const status = statusMap[err.grpcCode] || 500;
  return res.status(status).json({ error: err.message });
}

module.exports = {
  userClient,
  catalogClient,
  bookingClient,
  grpcCall,
  mapGrpcError,
};
