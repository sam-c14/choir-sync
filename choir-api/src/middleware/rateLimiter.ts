import rateLimit from 'express-rate-limit';

// Authentication rate limiter: 15 minutes window, 20 requests per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

// AI endpoints rate limiter: 1 minute window, 15 requests per IP
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Please wait a moment before trying again.' },
});

// Email dispatch rate limiter: 5 minutes window, 10 requests per IP
export const dispatchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Roster notifications dispatched too frequently. Please wait before retrying.' },
});

// General API rate limiter: 1 minute window, 300 requests per IP
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});
