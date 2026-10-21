
const request = require('supertest');

function createApiClient(app, token) {
  const client = request(app);

  return {
    get: (path) => {
      const req = client.get(path);
      return token ? req.set('Authorization', `Bearer ${token}`) : req;
    },

    post: (path, body) => {
      const req = client.post(path);
      if (token) req.set('Authorization', `Bearer ${token}`);
      return req.send(body);
    },

    put: (path, body) => {
      const req = client.put(path);
      if (token) req.set('Authorization', `Bearer ${token}`);
      return req.send(body);
    },

    delete: (path) => {
      const req = client.delete(path);
      return token ? req.set('Authorization', `Bearer ${token}`) : req;
    },
  };
}

module.exports = { createApiClient };
