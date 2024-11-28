import jwt from 'jsonwebtoken';
import statusCodes from './statusCodes.js';

export const authMiddleware = () => ({
  before: async (handler) => {
    try {
      const event = handler.event;

      // Kontrollera Authorization-header
      const authHeader = event.headers.Authorization || event.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          statusCode: statusCodes.UNAUTHORIZED,
          body: JSON.stringify({ message: 'Unauthorized: Missing or invalid Authorization header' }),
        };
      }

      // Extrahera token och verifiera den
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Kontrollera att userId finns i tokenens payload
      if (!decoded.userId) {
        return {
          statusCode: statusCodes.UNAUTHORIZED,
          body: JSON.stringify({ message: 'Unauthorized: Missing userId in token' }),
        };
      }

      // Skapa requestContext och authorizer om de saknas
      if (!handler.event.requestContext) {
        handler.event.requestContext = {};
      }
      if (!handler.event.requestContext.authorizer) {
        handler.event.requestContext.authorizer = {};
      }

      // Lägg till userId i authorizer
      handler.event.requestContext.authorizer.userId = decoded.userId;

      // Logga userId för debugging
      console.log('Authenticated userId:', decoded.userId);
    } catch (err) {
      console.error('Error in authMiddleware before:', err);

      // Returnera ett lämpligt svar om token är ogiltigt
      handler.response = {
        statusCode: statusCodes.UNAUTHORIZED,
        body: JSON.stringify({ message: 'Unauthorized: Invalid or expired token' }),
      };
      throw new Error('Unauthorized'); // Nödvändigt för att stoppa vidare exekvering
    }
  },
});