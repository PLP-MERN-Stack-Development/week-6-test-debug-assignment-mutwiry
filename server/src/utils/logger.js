const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  })
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exitOnError: false
});

// Create a stream object for Morgan
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Helper methods for different types of logging
logger.logRequest = (req, res, responseTime) => {
  logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms`);
};

logger.logError = (error, req = null) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    url: req ? req.originalUrl : 'N/A',
    method: req ? req.method : 'N/A',
    ip: req ? req.ip : 'N/A',
    userAgent: req ? req.get('User-Agent') : 'N/A'
  };
  
  logger.error(JSON.stringify(errorInfo));
};

logger.logDatabase = (operation, collection, documentId = null, duration = null) => {
  const logMessage = `DB ${operation} on ${collection}${documentId ? ` (ID: ${documentId})` : ''}${duration ? ` - ${duration}ms` : ''}`;
  logger.debug(logMessage);
};

logger.logPerformance = (operation, duration, details = {}) => {
  const logMessage = `Performance: ${operation} took ${duration}ms${Object.keys(details).length ? ` - ${JSON.stringify(details)}` : ''}`;
  logger.info(logMessage);
};

logger.logSecurity = (event, details = {}) => {
  const logMessage = `Security: ${event}${Object.keys(details).length ? ` - ${JSON.stringify(details)}` : ''}`;
  logger.warn(logMessage);
};

// Middleware for request logging
logger.requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });
  
  next();
};

// Middleware for error logging
logger.errorLogger = (error, req, res, next) => {
  logger.logError(error, req);
  next(error);
};

module.exports = logger; 