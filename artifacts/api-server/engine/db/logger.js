/**
 * logger.js
 * Structured logging with Winston.
 *
 * Logs to stdout/stderr by default — the right choice for serverless (Vercel)
 * and containers, where the filesystem is read-only/ephemeral. File transports
 * are opt-in via ORGNI_LOG_TO_FILE=true (useful for long-running local runs).
 */

const winston = require('winston');

const transports = [
  new winston.transports.Console({
    format:
      process.env.NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
  })
];

if (process.env.ORGNI_LOG_TO_FILE === 'true') {
  const path = require('path');
  const fs = require('fs');
  const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../../logs');
  fs.mkdirSync(LOG_DIR, { recursive: true });
  transports.push(
    new winston.transports.File({ filename: path.join(LOG_DIR, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(LOG_DIR, 'combined.log') })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'orgni' },
  transports
});

module.exports = logger;
