/**
 * Tests for auth middleware.
 *
 * Covers token extraction and basic verification.
 * Does NOT test: rate limiting, permission checks, optionalAuth, DB failures.
 */

jest.mock("../../src/config/database", () => ({
  query: jest.fn(),
}));

const jwt = require("jsonwebtoken");
const db = require("../../src/config/database");
const { authenticate, hasPermission, getPermissionsForRole, _resetRateLimits, RATE_LIMIT_MAX_REQUESTS } = require("../../src/middleware/auth");

const SECRET = process.env.JWT_SECRET || "fallback-secret-do-not-use";

function mockReqRes(token, extraHeaders = {}) {
  return {
    req: {
      headers: { authorization: token ? `Bearer ${token}` : undefined, ...extraHeaders },
      ip: "127.0.0.1",
      path: "/test",
      method: "GET",
    },
    res: {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    },
    next: jest.fn(),
  };
}

describe("auth middleware", () => {
  afterEach(() => {
    jest.clearAllMocks();
    _resetRateLimits();
  });

  describe("authenticate()", () => {
    it("should reject requests with no auth header", async () => {
      const { req, res, next } = mockReqRes(null);
      const middleware = authenticate();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("should reject invalid tokens", async () => {
      const { req, res, next } = mockReqRes("garbage-token");
      const middleware = authenticate();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("should accept valid token and attach user", async () => {
      const token = jwt.sign({ id: 1, email: "test@test.com", role: "admin" }, SECRET);
      db.query.mockResolvedValue({
        rows: [{ id: 1, email: "test@test.com", name: "Test", role: "admin", customer_tier: "gold", status: "active" }],
      });

      const { req, res, next } = mockReqRes(token);
      const middleware = authenticate();
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.id).toBe(1);
      expect(req.user.role).toBe("admin");
    });

    it("should reject inactive users", async () => {
      const token = jwt.sign({ id: 5, email: "inactive@test.com", role: "customer" }, SECRET);
      db.query.mockResolvedValue({
        rows: [{ id: 5, email: "inactive@test.com", name: "Inactive", role: "customer", customer_tier: "bronze", status: "inactive" }],
      });

      const { req, res, next } = mockReqRes(token);
      const middleware = authenticate();
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("hasPermission()", () => {
    it("should return true for admin with users:read", () => {
      expect(hasPermission("admin", "users:read")).toBe(true);
    });

    it("should return false for customer with users:read", () => {
      expect(hasPermission("customer", "users:read")).toBe(false);
    });

    it("should return false for unknown roles", () => {
      expect(hasPermission("superadmin", "users:read")).toBe(false);
    });
  });

  describe("getPermissionsForRole()", () => {
    it("should return all admin permissions", () => {
      const perms = getPermissionsForRole("admin");
      expect(perms).toHaveLength(14);
      expect(perms).toContain("settings:write");
    });

    it("should return empty for unknown role", () => {
      expect(getPermissionsForRole("hacker")).toEqual([]);
    });
  });

  describe("authenticate() — i18n", () => {
    it("responds in English by default (no Accept-Language header)", async () => {
      const { req, res, next } = mockReqRes(null);
      await authenticate()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: "Authentication required",
        message: "No authorization header provided",
        code: "AUTH_MISSING_HEADER",
      }));
    });

    it("responds in Filipino for AUTH_MISSING_HEADER", async () => {
      const { req, res, next } = mockReqRes(null, { "accept-language": "fil" });
      await authenticate()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: "Kinakailangan ang pagpapatunay",
        message: "Walang authorization header na ibinigay",
        code: "AUTH_MISSING_HEADER",
      }));
    });

    it("responds in Filipino for AUTH_TOKEN_EXPIRED", async () => {
      const expiredToken = jwt.sign(
        { id: 1, email: "test@test.com", role: "admin" },
        SECRET,
        { expiresIn: -1 }
      );
      const { req, res, next } = mockReqRes(expiredToken, { "accept-language": "fil" });
      await authenticate()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: "Nag-expire na ang token",
        message: "Nag-expire na ang iyong session. Mangyaring mag-login muli.",
        code: "AUTH_TOKEN_EXPIRED",
      }));
    });

    it("responds in Filipino for AUTH_ACCOUNT_INACTIVE", async () => {
      const token = jwt.sign({ id: 5, email: "inactive@test.com", role: "customer" }, SECRET);
      db.query.mockResolvedValue({
        rows: [{ id: 5, email: "inactive@test.com", name: "Inactive", role: "customer", customer_tier: "bronze", status: "inactive" }],
      });

      const { req, res, next } = mockReqRes(token, { "accept-language": "fil" });
      await authenticate()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: "Hindi aktibo ang account",
        message: "Na-deactivate ang iyong account. Makipag-ugnayan sa support.",
        code: "AUTH_ACCOUNT_INACTIVE",
      }));
    });

    it("responds in Filipino for AUTH_PERMISSION_DENIED (with role/permission interpolated)", async () => {
      const token = jwt.sign({ id: 6, email: "customer@test.com", role: "customer" }, SECRET);
      db.query.mockResolvedValue({
        rows: [{ id: 6, email: "customer@test.com", name: "Customer", role: "customer", customer_tier: "bronze", status: "active" }],
      });

      const { req, res, next } = mockReqRes(token, { "accept-language": "fil" });
      await authenticate("users:read")(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: "Hindi sapat ang mga pahintulot",
        message: "Ang iyong role (customer) ay walang pahintulot na 'users:read'",
        code: "AUTH_PERMISSION_DENIED",
      }));
    });

    it("responds in Filipino for AUTH_RATE_LIMITED (with maxRequests interpolated)", async () => {
      const token = jwt.sign({ id: 99, email: "rl@test.com", role: "customer" }, SECRET);
      db.query.mockResolvedValue({
        rows: [{ id: 99, email: "rl@test.com", name: "RateLimit", role: "customer", customer_tier: "bronze", status: "active" }],
      });

      const middleware = authenticate();
      let lastRes;
      for (let i = 0; i <= RATE_LIMIT_MAX_REQUESTS; i++) {
        const { req, res, next } = mockReqRes(token, { "accept-language": "fil" });
        await middleware(req, res, next);
        lastRes = res;
      }

      expect(lastRes.status).toHaveBeenCalledWith(429);
      expect(lastRes.json).toHaveBeenCalledWith(expect.objectContaining({
        error: "Nalampasan ang rate limit",
        message: `Maximum na ${RATE_LIMIT_MAX_REQUESTS} request bawat minuto`,
        code: "AUTH_RATE_LIMITED",
      }));
    });

    it("responds in Filipino for AUTH_MALFORMED_HEADER", async () => {
      const { req, res, next } = mockReqRes(null, { "accept-language": "fil" });
      // Override to send a non-Bearer format
      req.headers.authorization = "Token abc";
      await authenticate()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: "Kinakailangan ang pagpapatunay",
        message: "Ang authorization header ay dapat nasa format: Bearer <token>",
        code: "AUTH_MALFORMED_HEADER",
      }));
    });

    it("responds in Filipino for AUTH_TOKEN_INVALID", async () => {
      const { req, res, next } = mockReqRes("garbage-token", { "accept-language": "fil" });
      await authenticate()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: "Hindi wastong token",
        message: "Ang ibinigay na token ay hindi wasto",
        code: "AUTH_TOKEN_INVALID",
      }));
    });

    it("responds in Filipino for AUTH_USER_NOT_FOUND", async () => {
      const token = jwt.sign({ id: 99, email: "ghost@test.com", role: "customer" }, SECRET);
      db.query.mockResolvedValue({ rows: [] });

      const { req, res, next } = mockReqRes(token, { "accept-language": "fil" });
      await authenticate()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: "Hindi nahanap ang user",
        message: "Ang account na nauugnay sa token na ito ay wala na",
        code: "AUTH_USER_NOT_FOUND",
      }));
    });

    it("responds in Filipino for AUTH_DB_ERROR", async () => {
      const token = jwt.sign({ id: 99, email: "dberr@test.com", role: "customer" }, SECRET);
      db.query.mockRejectedValue(new Error("connection refused"));

      const { req, res, next } = mockReqRes(token, { "accept-language": "fil" });
      await authenticate()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: "Panloob na error ng server",
        message: "Hindi ma-verify ang user account",
        code: "AUTH_DB_ERROR",
      }));
    });

    it("responds in Filipino for AUTH_VERIFICATION_FAILED", async () => {
      const token = jwt.sign({ id: 99, email: "v@test.com", role: "customer" }, SECRET, { notBefore: "1h" });

      const { req, res, next } = mockReqRes(token, { "accept-language": "fil" });
      await authenticate()(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: "Nabigo ang pagpapatunay",
        message: "Hindi ma-verify ang token",
        code: "AUTH_VERIFICATION_FAILED",
      }));
    });

    it("responds in Filipino for AUTH_UNEXPECTED_ERROR", async () => {
      const token = jwt.sign({ id: 8, email: "boom@test.com", role: "customer" }, SECRET);
      db.query.mockResolvedValue({
        rows: [{ id: 8, email: "boom@test.com", name: "Boom", role: "customer",
                 customer_tier: "bronze", status: "active" }],
      });
      const { req, res } = mockReqRes(token, { "accept-language": "fil" });
      const throwingNext = jest.fn().mockImplementation(() => { throw new Error("unexpected"); });

      await authenticate()(req, res, throwingNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: "Panloob na error ng server",
        message: "May hindi inaasahang error na nangyari habang nagpapatunay",
        code: "AUTH_UNEXPECTED_ERROR",
      }));
    });
  });
});
