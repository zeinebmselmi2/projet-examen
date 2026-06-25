const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { bookingRepository, calculateDays } = require('./database');
const { grpc, loadProto, createGrpcError } = require('../../../shared/grpc-loader');
const { createProducer, sendEvent, TOPICS } = require('../../../shared/kafka');

const CATALOG_HOST = process.env.CATALOG_SERVICE_HOST || 'localhost';
const CATALOG_PORT = process.env.CATALOG_SERVICE_PORT || '50052';

let producer;
let catalogClient;

function getCatalogClient() {
  if (!catalogClient) {
    const CatalogService = loadProto('catalog.proto', 'catalog', 'CatalogService');
    catalogClient = new CatalogService(
      `${CATALOG_HOST}:${CATALOG_PORT}`,
      grpc.credentials.createInsecure()
    );
  }
  return catalogClient;
}

function promisifyGrpc(client, method, request) {
  return new Promise((resolve, reject) => {
    client[method](request, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}

function mapBooking(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    resource_id: row.resource_id,
    start_date: row.start_date,
    end_date: row.end_date,
    total_price: row.total_price,
    status: row.status,
    created_at: row.created_at,
  };
}

async function initKafka() {
  producer = await createProducer('booking-service');
}

const bookingServiceImpl = {
  async CreateBooking(call, callback) {
    try {
      const { user_id, resource_id, start_date, end_date } = call.request;

      if (!user_id || !resource_id || !start_date || !end_date) {
        return callback(createGrpcError(3, 'Tous les champs sont requis'));
      }

      const catalog = getCatalogClient();
      let resourceResponse;
      try {
        resourceResponse = await promisifyGrpc(catalog, 'GetResource', { id: resource_id });
      } catch {
        return callback(createGrpcError(5, 'Ressource introuvable'));
      }

      const resource = resourceResponse.resource;
      if (resource.availability <= 0) {
        return callback(createGrpcError(9, 'Ressource non disponible'));
      }

      const days = calculateDays(start_date, end_date);
      const totalPrice = days * resource.price_per_day;

      const booking = bookingRepository.create({
        id: uuidv4(),
        user_id,
        resource_id,
        start_date,
        end_date,
        total_price: totalPrice,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      if (producer) {
        await sendEvent(producer, TOPICS.BOOKING_CREATED, booking.id, {
          event: 'BOOKING_CREATED',
          bookingId: booking.id,
          userId: user_id,
          resourceId: resource_id,
          startDate: start_date,
          endDate: end_date,
          totalPrice,
        });
      }

      callback(null, { booking: mapBooking(booking) });
    } catch (err) {
      callback(createGrpcError(13, err.message));
    }
  },

  GetBooking(call, callback) {
    try {
      const booking = bookingRepository.findById(call.request.id);
      if (!booking) {
        return callback(createGrpcError(5, 'Réservation introuvable'));
      }
      callback(null, { booking: mapBooking(booking) });
    } catch (err) {
      callback(createGrpcError(13, err.message));
    }
  },

  ListBookings(call, callback) {
    try {
      const page = call.request.page || 1;
      const limit = call.request.limit || 20;
      const status = call.request.status || '';
      const { bookings, total } = bookingRepository.findAll(page, limit, status);
      callback(null, { bookings: bookings.map(mapBooking), total });
    } catch (err) {
      callback(createGrpcError(13, err.message));
    }
  },

  async UpdateBookingStatus(call, callback) {
    try {
      const { id, status } = call.request;
      const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];

      if (!validStatuses.includes(status)) {
        return callback(createGrpcError(3, 'Statut invalide'));
      }

      const existing = bookingRepository.findById(id);
      if (!existing) {
        return callback(createGrpcError(5, 'Réservation introuvable'));
      }

      const updated = bookingRepository.updateStatus(id, status);

      if (producer && status === 'confirmed') {
        await sendEvent(producer, TOPICS.BOOKING_CONFIRMED, id, {
          event: 'BOOKING_CONFIRMED',
          bookingId: id,
          userId: existing.user_id,
          resourceId: existing.resource_id,
          totalPrice: existing.total_price,
        });
      }

      callback(null, { booking: mapBooking(updated) });
    } catch (err) {
      callback(createGrpcError(13, err.message));
    }
  },

  async CancelBooking(call, callback) {
    try {
      const existing = bookingRepository.findById(call.request.id);
      if (!existing) {
        return callback(createGrpcError(5, 'Réservation introuvable'));
      }

      if (existing.status === 'cancelled') {
        return callback(createGrpcError(9, 'Réservation déjà annulée'));
      }

      const updated = bookingRepository.updateStatus(call.request.id, 'cancelled');

      if (producer) {
        await sendEvent(producer, TOPICS.BOOKING_CANCELLED, updated.id, {
          event: 'BOOKING_CANCELLED',
          bookingId: updated.id,
          userId: updated.user_id,
          resourceId: updated.resource_id,
        });
      }

      callback(null, {
        success: true,
        message: 'Réservation annulée',
        booking: mapBooking(updated),
      });
    } catch (err) {
      callback(createGrpcError(13, err.message));
    }
  },

  ListUserBookings(call, callback) {
    try {
      const { bookings, total } = bookingRepository.findByUserId(call.request.user_id);
      callback(null, { bookings: bookings.map(mapBooking), total });
    } catch (err) {
      callback(createGrpcError(13, err.message));
    }
  },
};

module.exports = { bookingServiceImpl, initKafka };
