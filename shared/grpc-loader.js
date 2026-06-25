const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_ROOT = path.resolve(__dirname, '..', 'proto');

const loaderOptions = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

function loadProto(protoFile, packageName, serviceName) {
  const packageDefinition = protoLoader.loadSync(
    path.join(PROTO_ROOT, protoFile),
    loaderOptions
  );
  const proto = grpc.loadPackageDefinition(packageDefinition);
  return proto[packageName][serviceName];
}

function createGrpcError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

module.exports = {
  grpc,
  loadProto,
  createGrpcError,
  PROTO_ROOT,
};
