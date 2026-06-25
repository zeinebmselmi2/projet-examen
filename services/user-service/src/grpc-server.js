const { v4: uuidv4 } = require('uuid');
const { userRepository } = require('./database');
const { createGrpcError } = require('../../../shared/grpc-loader');
const { createProducer, createConsumer, sendEvent, TOPICS } = require('../../../shared/kafka');

let producer;

async function initKafka() {
  producer = await createProducer('user-service');

  const consumer = await createConsumer('user-service-group', [TOPICS.BOOKING_CONFIRMED]);
  if (consumer) {
    await consumer.run({
      eachMessage: async ({ message }) => {
        const event = JSON.parse(message.value.toString());
        console.log(
          `[User Service] Notification: réservation ${event.bookingId} confirmée pour l'utilisateur ${event.userId}`
        );
      },
    });
    console.log('[User Service] Consommateur Kafka actif (booking.confirmed)');
  }
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    phone: row.phone || '',
    role: row.role,
    created_at: row.created_at,
  };
}

const userServiceImpl = {
  async CreateUser(call, callback) {
    try {
      const { email, full_name, phone, role } = call.request;

      if (!email || !full_name) {
        return callback(createGrpcError(3, 'Email et nom complet sont requis'));
      }

      if (userRepository.findByEmail(email)) {
        return callback(createGrpcError(6, 'Un utilisateur avec cet email existe déjà'));
      }

      const user = userRepository.create({
        id: uuidv4(),
        email,
        full_name,
        phone: phone || '',
        role: role || 'client',
        created_at: new Date().toISOString(),
      });

      if (producer) {
        await sendEvent(producer, TOPICS.USER_REGISTERED, user.id, {
          event: 'USER_REGISTERED',
          userId: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
        });
      }

      callback(null, { user: mapUser(user) });
    } catch (err) {
      callback(createGrpcError(13, err.message));
    }
  },

  GetUser(call, callback) {
    try {
      const user = userRepository.findById(call.request.id);
      if (!user) {
        return callback(createGrpcError(5, 'Utilisateur introuvable'));
      }
      callback(null, { user: mapUser(user) });
    } catch (err) {
      callback(createGrpcError(13, err.message));
    }
  },

  ListUsers(call, callback) {
    try {
      const page = call.request.page || 1;
      const limit = call.request.limit || 20;
      const { users, total } = userRepository.findAll(page, limit);
      callback(null, { users: users.map(mapUser), total });
    } catch (err) {
      callback(createGrpcError(13, err.message));
    }
  },

  UpdateUser(call, callback) {
    try {
      const { id, email, full_name, phone, role } = call.request;
      const updated = userRepository.update(id, { email, full_name, phone, role });
      if (!updated) {
        return callback(createGrpcError(5, 'Utilisateur introuvable'));
      }
      callback(null, { user: mapUser(updated) });
    } catch (err) {
      callback(createGrpcError(13, err.message));
    }
  },

  DeleteUser(call, callback) {
    try {
      const success = userRepository.delete(call.request.id);
      if (!success) {
        return callback(createGrpcError(5, 'Utilisateur introuvable'));
      }
      callback(null, { success: true, message: 'Utilisateur supprimé' });
    } catch (err) {
      callback(createGrpcError(13, err.message));
    }
  },

  SearchUsers(call, callback) {
    try {
      const { users, total } = userRepository.search(call.request.query || '');
      callback(null, { users: users.map(mapUser), total });
    } catch (err) {
      callback(createGrpcError(13, err.message));
    }
  },
};

module.exports = { userServiceImpl, initKafka };
