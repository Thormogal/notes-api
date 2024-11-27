import jwt from 'jsonwebtoken';
import statusCodes from './statusCodes.js';

export const authMiddleware = () => ({
    before: async (handler) => {
        try {
            const event = handler.event;
            const authHeader = event.headers.Authorization || event.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new Error('Unauthorized: No or invalid Authorization header');
            }

            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Skapa authorizer om den saknas
            if (!handler.event.requestContext) {
                handler.event.requestContext = {};
            }
            if (!handler.event.requestContext.authorizer) {
                handler.event.requestContext.authorizer = {};
            }

            // Sätt värdet
            handler.event.requestContext.authorizer.userId = decoded.username;
        } catch (err) {
            console.error('Error in authMiddleware before:', err);
            throw new Error('Unauthorized: Invalid token');
        }
    },
});
