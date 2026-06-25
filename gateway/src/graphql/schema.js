const gql = require('graphql-tag');
const {
  userClient,
  catalogClient,
  bookingClient,
  grpcCall,
} = require('../grpc-clients');

const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    full_name: String!
    phone: String
    role: String!
    created_at: String!
  }

  type Resource {
    id: ID!
    name: String!
    description: String
    category: String!
    price_per_day: Float!
    availability: Int!
    location: String
    created_at: String!
  }

  type Booking {
    id: ID!
    user_id: ID!
    resource_id: ID!
    start_date: String!
    end_date: String!
    total_price: Float!
    status: String!
    created_at: String!
    user: User
    resource: Resource
  }

  type UsersResult {
    users: [User!]!
    total: Int!
  }

  type ResourcesResult {
    resources: [Resource!]!
    total: Int!
  }

  type BookingsResult {
    bookings: [Booking!]!
    total: Int!
  }

  type Query {
    user(id: ID!): User
    users(page: Int, limit: Int): UsersResult!
    searchUsers(query: String!): UsersResult!

    resource(id: ID!): Resource
    resources(page: Int, limit: Int, category: String): ResourcesResult!
    searchResources(query: String!, category: String): ResourcesResult!

    booking(id: ID!): Booking
    bookings(page: Int, limit: Int, status: String): BookingsResult!
    userBookings(userId: ID!): BookingsResult!
  }

  type Mutation {
    createUser(email: String!, full_name: String!, phone: String, role: String): User!
    updateUser(id: ID!, email: String, full_name: String, phone: String, role: String): User!
    deleteUser(id: ID!): Boolean!

    createResource(
      name: String!
      description: String
      category: String!
      price_per_day: Float!
      availability: Int
      location: String
    ): Resource!

    createBooking(
      user_id: ID!
      resource_id: ID!
      start_date: String!
      end_date: String!
    ): Booking!

    confirmBooking(id: ID!): Booking!
    cancelBooking(id: ID!): Booking!
  }
`;

const resolvers = {
  Query: {
    user: async (_, { id }) => {
      const result = await grpcCall(userClient, 'GetUser', { id });
      return result.user;
    },
    users: async (_, { page, limit }) => {
      return grpcCall(userClient, 'ListUsers', { page: page || 1, limit: limit || 20 });
    },
    searchUsers: async (_, { query }) => {
      return grpcCall(userClient, 'SearchUsers', { query });
    },
    resource: async (_, { id }) => {
      const result = await grpcCall(catalogClient, 'GetResource', { id });
      return result.resource;
    },
    resources: async (_, { page, limit, category }) => {
      return grpcCall(catalogClient, 'ListResources', {
        page: page || 1,
        limit: limit || 20,
        category: category || '',
      });
    },
    searchResources: async (_, { query, category }) => {
      return grpcCall(catalogClient, 'SearchResources', {
        query,
        category: category || '',
      });
    },
    booking: async (_, { id }) => {
      const result = await grpcCall(bookingClient, 'GetBooking', { id });
      return result.booking;
    },
    bookings: async (_, { page, limit, status }) => {
      return grpcCall(bookingClient, 'ListBookings', {
        page: page || 1,
        limit: limit || 20,
        status: status || '',
      });
    },
    userBookings: async (_, { userId }) => {
      return grpcCall(bookingClient, 'ListUserBookings', { user_id: userId });
    },
  },

  Mutation: {
    createUser: async (_, args) => {
      const result = await grpcCall(userClient, 'CreateUser', args);
      return result.user;
    },
    updateUser: async (_, { id, ...args }) => {
      const result = await grpcCall(userClient, 'UpdateUser', { id, ...args });
      return result.user;
    },
    deleteUser: async (_, { id }) => {
      const result = await grpcCall(userClient, 'DeleteUser', { id });
      return result.success;
    },
    createResource: async (_, args) => {
      const result = await grpcCall(catalogClient, 'CreateResource', args);
      return result.resource;
    },
    createBooking: async (_, args) => {
      const result = await grpcCall(bookingClient, 'CreateBooking', args);
      return result.booking;
    },
    confirmBooking: async (_, { id }) => {
      const result = await grpcCall(bookingClient, 'UpdateBookingStatus', {
        id,
        status: 'confirmed',
      });
      return result.booking;
    },
    cancelBooking: async (_, { id }) => {
      const result = await grpcCall(bookingClient, 'CancelBooking', { id });
      return result.booking;
    },
  },

  Booking: {
    user: async (parent) => {
      try {
        const result = await grpcCall(userClient, 'GetUser', { id: parent.user_id });
        return result.user;
      } catch {
        return null;
      }
    },
    resource: async (parent) => {
      try {
        const result = await grpcCall(catalogClient, 'GetResource', { id: parent.resource_id });
        return result.resource;
      } catch {
        return null;
      }
    },
  },
};

module.exports = { typeDefs, resolvers };
