jest.mock('../../src/config/database', () => ({ query: jest.fn() }));
jest.mock('../../src/models/User');

const express = require('express');
const request = require('supertest');
const authRouter = require('../../src/routes/auth');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', authRouter);
  return app;
}

describe('auth routes — i18n', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /register', () => {
    it('responds in Filipino when Accept-Language: fil is set (missing fields)', async () => {
      const res = await request(buildApp())
        .post('/register')
        .set('Accept-Language', 'fil')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Nawawala ang mga kinakailangang field: email, password, name');
    });

    it('responds in English by default (missing fields)', async () => {
      const res = await request(buildApp())
        .post('/register')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Missing required fields: email, password, name');
    });

    it("responds in Filipino when Accept-Language: fil is set (email taken)", async () => {
      const User = require("../../src/models/User");
      User.findByEmail.mockResolvedValue({ id: 1, email: "taken@test.com" });

      const res = await request(buildApp())
        .post("/register")
        .set("Accept-Language", "fil")
        .send({ email: "taken@test.com", password: "pass", name: "Test" });
      expect(res.status).toBe(409);
      expect(res.body.error).toBe("Ang email ay nairehistro na");
    });
  });

  describe('POST /login', () => {
    it('responds in Filipino when Accept-Language: fil is set (missing fields)', async () => {
      const res = await request(buildApp())
        .post('/login')
        .set('Accept-Language', 'fil')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Nawawala ang mga kinakailangang field: email, password');
    });

    it("responds in English by default (missing fields)", async () => {
      const res = await request(buildApp())
        .post("/login")
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing required fields: email, password");
    });

    it("responds in Filipino for invalid credentials", async () => {
      const User = require("../../src/models/User");
      User.findByEmail.mockResolvedValue({ id: 1, email: "u@test.com", password_hash: "hash" });
      User.verifyPassword.mockResolvedValue(false);

      const res = await request(buildApp())
        .post("/login")
        .set("Accept-Language", "fil")
        .send({ email: "u@test.com", password: "wrong" });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Hindi wastong email o password");
    });

    it("responds in Filipino for inactive account", async () => {
      const User = require("../../src/models/User");
      User.findByEmail.mockResolvedValue({ id: 2, email: "u@test.com", password_hash: "hash", status: "inactive" });
      User.verifyPassword.mockResolvedValue(true);

      const res = await request(buildApp())
        .post("/login")
        .set("Accept-Language", "fil")
        .send({ email: "u@test.com", password: "pass" });
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Hindi aktibo ang account");
    });
  });
});
