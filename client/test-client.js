const BASE_URL = process.env.GATEWAY_URL || 'http://localhost:3000';

async function request(method, path, body) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || JSON.stringify(data));
  }
  return data;
}

async function graphql(query, variables = {}) {
  const response = await fetch(`${BASE_URL}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors[0].message);
  }
  return result.data;
}

async function runDemo() {
  console.log('=== SmartReserve - Client de test ===\n');

  console.log('1. Vérification santé API Gateway...');
  const health = await request('GET', '/health');
  console.log('   OK:', health.service);

  console.log('\n2. Création utilisateur (REST)...');
  const user = await request('POST', '/api/users', {
    email: `demo.${Date.now()}@smartreserve.fr`,
    full_name: 'Alice Martin',
    phone: '0612345678',
    role: 'client',
  });
  console.log('   Utilisateur créé:', user.id, '-', user.full_name);

  console.log('\n3. Liste des ressources (REST)...');
  const resources = await request('GET', '/api/resources?limit=5');
  console.log(`   ${resources.total} ressource(s) disponible(s)`);
  const resource = resources.resources[0];
  console.log('   Première ressource:', resource.name, `(${resource.availability} dispo)`);

  console.log('\n4. Création réservation (REST)...');
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 3);

  const booking = await request('POST', '/api/bookings', {
    user_id: user.id,
    resource_id: resource.id,
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
  });
  console.log('   Réservation créée:', booking.id, '- Prix:', booking.total_price, '€');

  console.log('\n5. Confirmation réservation (REST)...');
  const confirmed = await request('PATCH', `/api/bookings/${booking.id}/status`, {
    status: 'confirmed',
  });
  console.log('   Statut:', confirmed.status);

  console.log('\n6. Requête GraphQL flexible...');
  const gqlData = await graphql(
    `query GetBookingDetails($id: ID!) {
      booking(id: $id) {
        id
        status
        total_price
        user { full_name email }
        resource { name category location availability }
      }
    }`,
    { id: booking.id }
  );
  const details = gqlData.booking;
  console.log('   Réservation GraphQL:');
  console.log('   - Client:', details.user.full_name, `(${details.user.email})`);
  console.log('   - Ressource:', details.resource.name, 'à', details.resource.location);
  console.log('   - Disponibilité restante:', details.resource.availability);

  console.log('\n7. Recherche ressources (GraphQL)...');
  const searchData = await graphql(`
    query {
      searchResources(query: "salle", category: "salle") {
        total
        resources { name price_per_day availability }
      }
    }
  `);
  console.log('   Résultats recherche:', searchData.searchResources.total);

  console.log('\n=== Démonstration terminée avec succès ===');
}

runDemo().catch((err) => {
  console.error('\nErreur:', err.message);
  console.error('\nAssurez-vous que Kafka et tous les services sont démarrés.');
  console.error('Voir README.md pour les instructions.');
  process.exit(1);
});
