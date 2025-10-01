const rateLimit = require("express-rate-limit");

// Middleware vazio para testes
const noOpMiddleware = (req, res, next) => next();

// Rate limiter para autenticação (mais restritivo)
const authLimiter =
  process.env.NODE_ENV === "test"
    ? noOpMiddleware
    : rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
        max: 5, // máximo 5 tentativas por IP
        message: {
          success: false,
          message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
        },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true, // não contar requisições bem-sucedidas
      });

// Rate limiter geral para a API
const apiLimiter =
  process.env.NODE_ENV === "test"
    ? noOpMiddleware
    : rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
        message: {
          success: false,
          message: "Muitas requisições. Tente novamente em 15 minutos.",
        },
        standardHeaders: true,
        legacyHeaders: false,
      });

module.exports = {
  authLimiter,
  apiLimiter,
};
