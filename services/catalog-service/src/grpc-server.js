const { v4: uuidv4 } = require('uuid');
const { resourceRepository } = require('./database');
const { createGrpcError } = require('../../../shared/grpc-loader');
const { createConsumer, TOPICS } = require('../../../shared/kafka');

function mapResource(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.category,
    price_per_day: row.price_per_day,
    availability: row.availability,
    location: row.location || '',
    created_at: row.created_at,
  };
}

const catalogServiceImpl = {
  CreateResource(call, callback) {
    try {
      const { name, description, category, price_per_day, availability, location } = call.request;

      if (!name || !category || price_per_day == null) {
        return callback(createGrpcError(3, 'Nom, catégorie et prix sont requis'));
      }

      const resource = resourceRepository.create({
        id: uuidv4(),
        name,
        description: description || '',
        category,
        price_per_day,
        availability: availability ?? 1,
        location: location || '',
        created_at: new Date().toISOString(),
      });

      callback(null, { resource: mapResource(resource) });
    } catch (err) {
      callback(createGrpcError(13, err.message));
    }
  },

  GetResource(call, callback) {
    try {
      const resource = resourceRepository.findById(call.request.id);
      if (!resource) {
        return callback(createGrpcError(5, 'Ressource introuvable'));
      }
      callback(null, { resource: mapResource(resource) });
    } catch (err) {
      callback(createGrpcError(13, err.message));
    }
  },

  ListResources(call, callback) {
    try {
      const page = call.request.page || 1;
      const limit = call.request.limit || 20;
      const category = call.request.category || '';
      const { resources, total } = resourceRepository.findAll(page, limit, category);
      callback(null, { resources: resources.map(mapResource), total });
    } catch (err) {
      callback(createGrpcError(13, err.message));
    }
  },

  UpdateResource(call, callback) {
    try {
      const { id, name, description, category, price_per_day, availability, location } = call.request;
      const updated = resourceRepository.update(id, {
        name,
        description,
        category,
        price_per_day,
        availability,
        location,
      });
      if (!updated) {
        return callback(createGrpcError(5, 'Ressource introuvable'));
      }
      callback(null, { resource: mapResource(updated) });
    } catch (err) {
      callback(createGrpcError(13, err.message));
    }
  },

  DeleteResource(call, callback) {
    try {
      const success = resourceRepository.delete(call.request.id);
      if (!success) {
        return callback(createGrpcError(5, 'Ressource introuvable'));
      }
      callback(null, { success: true, message: 'Ressource supprimée' });
    } catch (err) {
      callback(createGrpcError(13, err.message));
    }
  },

  SearchResources(call, callback) {
    try {
      const { resources, total } = resourceRepository.search(
        call.request.query || '',
        call.request.category || ''
      );
      callback(null, { resources: resources.map(mapResource), total });
    } catch (err) {
      callback(createGrpcError(13, err.message));
    }
  },

  UpdateAvailability(call, callback) {
    try {
      const { id, delta } = call.request;
      const updated = resourceRepository.updateAvailability(id, delta);
      if (!updated) {
        return callback(createGrpcError(5, 'Ressource introuvable'));
      }
      callback(null, { resource: mapResource(updated) });
    } catch (err) {
      if (err.message === 'Disponibilité insuffisante') {
        return callback(createGrpcError(9, err.message));
      }
      callback(createGrpcError(13, err.message));
    }
  },
};

async function startKafkaConsumer() {
  const consumer = await createConsumer('catalog-service-group', [
    TOPICS.BOOKING_CREATED,
    TOPICS.BOOKING_CANCELLED,
  ]);

  if (!consumer) return;

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        console.log(`[Catalog Service] Événement Kafka reçu: ${topic}`, event);

        if (topic === TOPICS.BOOKING_CREATED) {
          resourceRepository.updateAvailability(event.resourceId, -1);
          console.log(`[Catalog Service] Disponibilité décrémentée pour ${event.resourceId}`);
        }

        if (topic === TOPICS.BOOKING_CANCELLED) {
          resourceRepository.updateAvailability(event.resourceId, 1);
          console.log(`[Catalog Service] Disponibilité restaurée pour ${event.resourceId}`);
        }
      } catch (err) {
        console.error('[Catalog Service] Erreur traitement Kafka:', err.message);
      }
    },
  });

  console.log('[Catalog Service] Consommateur Kafka actif');
}

module.exports = { catalogServiceImpl, startKafkaConsumer };
