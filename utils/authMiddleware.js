const middy = require('@middy/core');
const httpErrorHandler = require('@middy/http-error-handler');
const jwt = require('jsonwebtoken');
const statusCodes = require('./statusCodes'); // Importera statuskoderna

/**
 * Middleware för att verifiera JWT-token och skydda skyddade endpoints.
 * @param {Object} event - AWS Lambda event objekt.
 * @returns {Object|null} - Felmeddelande om verifiering misslyckas, annars null.
 */
const authMiddleware = async (event) => {
  try {
    // Kontrollera om Authorization-header finns
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      throw new Error('Authorization header is missing');
    }

    // Extrahera token från Authorization-header
    const token = authHeader.split(' ')[1]; // Förväntat format: "Bearer <token>"
    if (!token) {
      throw new Error('Token is missing');
    }

    // Verifiera token med JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.username) {
      throw new Error('Invalid token payload');
    }

    // Lägg decoded data i requestContext för senare användning
    event.requestContext.authorizer = { userId: decoded.username };

    // Verifiering lyckades
    return event;
  } catch (err) {
    // Specifik hantering för olika JWT-fel
    if (err.name === 'TokenExpiredError') {
      return {
        statusCode: statusCodes.UNAUTHORIZED,
        body: JSON.stringify({ message: 'Token has expired' }),
      };
    }

    if (err.name === 'JsonWebTokenError') {
      return {
        statusCode: statusCodes.UNAUTHORIZED,
        body: JSON.stringify({ message: 'Invalid token' }),
      };
    }

    // Annat oväntat fel
    console.error('AuthMiddleware Error:', err);
    return {
      statusCode: statusCodes.UNAUTHORIZED,
      body: JSON.stringify({ message: 'Unauthorized' }),
    };
  }
};

// Exportera middleware med Middy och felhantering
module.exports = middy(authMiddleware).use(httpErrorHandler());