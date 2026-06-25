const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');

const restRoutes = require('./routes/rest');
const { typeDefs, resolvers } = require('./graphql/schema');

const PORT = process.env.GATEWAY_PORT || 3000;

async function start() {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'SmartReserve API Gateway',
      endpoints: {
        rest: '/api',
        graphql: '/graphql',
      },
    });
  });

  app.use('/api', restRoutes);

  const apolloServer = new ApolloServer({ typeDefs, resolvers });
  await apolloServer.start();
  app.use('/graphql', expressMiddleware(apolloServer));

  app.listen(PORT, () => {
    console.log(`[API Gateway] REST disponible sur http://localhost:${PORT}/api`);
    console.log(`[API Gateway] GraphQL disponible sur http://localhost:${PORT}/graphql`);
    console.log('[API Gateway] Communication interne via gRPC vers les microservices');
  });
}

start().catch((err) => {
  console.error('[API Gateway] Erreur fatale:', err);
  process.exit(1);
});
