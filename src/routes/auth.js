const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { signToken } = require("../utils/jwt");
const logger = require("../utils/logger");
const { t, detectLocale } = require("../utils/i18n");

/**
 * POST /api/auth/register
 * Create a new user account and return a JWT.
 */
router.post("/register", async (req, res, next) => {
  try {
    const locale = detectLocale(req);
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        error: t("REGISTER_MISSING_FIELDS.message", locale),
      });
    }

    // Check for existing user
    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: t("REGISTER_EMAIL_TAKEN.message", locale) });
    }

    const user = await User.create({ email, password, name });
    const token = signToken({ id: user.id, email: user.email, role: user.role });

    logger.info("User registered", { userId: user.id, email: user.email });

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Authenticate with email/password and receive a JWT.
 */
router.post("/login", async (req, res, next) => {
  try {
    const locale = detectLocale(req);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: t("LOGIN_MISSING_FIELDS.message", locale),
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: t("LOGIN_INVALID_CREDENTIALS.message", locale) });
    }

    const valid = await User.verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: t("LOGIN_INVALID_CREDENTIALS.message", locale) });
    }

    if (user.status !== "active") {
      return res.status(403).json({ error: t("LOGIN_ACCOUNT_INACTIVE.message", locale) });
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info("User logged in", { userId: user.id });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        customerTier: user.customer_tier,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
