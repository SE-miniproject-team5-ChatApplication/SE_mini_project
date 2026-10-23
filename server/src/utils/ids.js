// Validates MongoDB ids that arrive from clients before they reach a query.
const { Errors } = require('./errors');

const OBJECT_ID = /^[a-f0-9]{24}$/i;

function isValidId(value) {
  return typeof value === 'string' && OBJECT_ID.test(value);
}

function assertId(value, field = 'id') {
  if (!isValidId(value)) throw Errors.validation(`Invalid ${field}`, field);
  return value;
}

module.exports = { isValidId, assertId };
