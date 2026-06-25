const express = require('express');
const {
  userClient,
  catalogClient,
  bookingClient,
  grpcCall,
  mapGrpcError,
} = require('../grpc-clients');

const router = express.Router();

// --- USERS ---
router.post('/users', async (req, res) => {
  try {
    const result = await grpcCall(userClient, 'CreateUser', req.body);
    res.status(201).json(result.user);
  } catch (err) {
    mapGrpcError(err, res);
  }
});

router.get('/users', async (req, res) => {
  try {
    const result = await grpcCall(userClient, 'ListUsers', {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20,
    });
    res.json(result);
  } catch (err) {
    mapGrpcError(err, res);
  }
});

router.get('/users/search', async (req, res) => {
  try {
    const result = await grpcCall(userClient, 'SearchUsers', { query: req.query.q || '' });
    res.json(result);
  } catch (err) {
    mapGrpcError(err, res);
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const result = await grpcCall(userClient, 'GetUser', { id: req.params.id });
    res.json(result.user);
  } catch (err) {
    mapGrpcError(err, res);
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const result = await grpcCall(userClient, 'UpdateUser', { id: req.params.id, ...req.body });
    res.json(result.user);
  } catch (err) {
    mapGrpcError(err, res);
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const result = await grpcCall(userClient, 'DeleteUser', { id: req.params.id });
    res.json(result);
  } catch (err) {
    mapGrpcError(err, res);
  }
});

// --- RESOURCES (CATALOG) ---
router.post('/resources', async (req, res) => {
  try {
    const result = await grpcCall(catalogClient, 'CreateResource', req.body);
    res.status(201).json(result.resource);
  } catch (err) {
    mapGrpcError(err, res);
  }
});

router.get('/resources', async (req, res) => {
  try {
    const result = await grpcCall(catalogClient, 'ListResources', {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20,
      category: req.query.category || '',
    });
    res.json(result);
  } catch (err) {
    mapGrpcError(err, res);
  }
});

router.get('/resources/search', async (req, res) => {
  try {
    const result = await grpcCall(catalogClient, 'SearchResources', {
      query: req.query.q || '',
      category: req.query.category || '',
    });
    res.json(result);
  } catch (err) {
    mapGrpcError(err, res);
  }
});

router.get('/resources/:id', async (req, res) => {
  try {
    const result = await grpcCall(catalogClient, 'GetResource', { id: req.params.id });
    res.json(result.resource);
  } catch (err) {
    mapGrpcError(err, res);
  }
});

router.put('/resources/:id', async (req, res) => {
  try {
    const result = await grpcCall(catalogClient, 'UpdateResource', { id: req.params.id, ...req.body });
    res.json(result.resource);
  } catch (err) {
    mapGrpcError(err, res);
  }
});

router.delete('/resources/:id', async (req, res) => {
  try {
    const result = await grpcCall(catalogClient, 'DeleteResource', { id: req.params.id });
    res.json(result);
  } catch (err) {
    mapGrpcError(err, res);
  }
});

// --- BOOKINGS ---
router.post('/bookings', async (req, res) => {
  try {
    const result = await grpcCall(bookingClient, 'CreateBooking', req.body);
    res.status(201).json(result.booking);
  } catch (err) {
    mapGrpcError(err, res);
  }
});

router.get('/bookings', async (req, res) => {
  try {
    const result = await grpcCall(bookingClient, 'ListBookings', {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 20,
      status: req.query.status || '',
    });
    res.json(result);
  } catch (err) {
    mapGrpcError(err, res);
  }
});

router.get('/bookings/user/:userId', async (req, res) => {
  try {
    const result = await grpcCall(bookingClient, 'ListUserBookings', { user_id: req.params.userId });
    res.json(result);
  } catch (err) {
    mapGrpcError(err, res);
  }
});

router.get('/bookings/:id', async (req, res) => {
  try {
    const result = await grpcCall(bookingClient, 'GetBooking', { id: req.params.id });
    res.json(result.booking);
  } catch (err) {
    mapGrpcError(err, res);
  }
});

router.patch('/bookings/:id/status', async (req, res) => {
  try {
    const result = await grpcCall(bookingClient, 'UpdateBookingStatus', {
      id: req.params.id,
      status: req.body.status,
    });
    res.json(result.booking);
  } catch (err) {
    mapGrpcError(err, res);
  }
});

router.post('/bookings/:id/cancel', async (req, res) => {
  try {
    const result = await grpcCall(bookingClient, 'CancelBooking', { id: req.params.id });
    res.json(result);
  } catch (err) {
    mapGrpcError(err, res);
  }
});

module.exports = router;
