import rateLimit from "express-rate-limit"

const createRateLimiter = (limit, message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        message,
      })
    },
  })

export const authRateLimiter = createRateLimiter(
  10,
  "Too many authentication requests. Please try again later."
)

export const chatUploadRateLimiter = createRateLimiter(
  30,
  "Too many chat or attachment requests. Please try again later."
)
