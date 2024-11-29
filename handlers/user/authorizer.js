import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

// Huvudfunktion för Authorizer
const authorize = async (event) => {
  console.log('Authorizer invoked with event:', JSON.stringify(event, null, 2));

  // Kontrollera om authorizationToken finns
  const token = event.authorizationToken;

  if (!token) {
    console.error('Authorization token saknas.');
    throw new Error('Unauthorized');
  }

  // Kontrollera om token har rätt format (börjar med "Bearer ")
  if (!token.startsWith('Bearer ')) {
    console.error('Invalid token format:', token);
    throw new Error('Unauthorized');
  }

  try {
    // Extrahera token (efter "Bearer ")
    const tokenPart = token.split(' ')[1];
    console.log('Token part being verified:', tokenPart);

    // Kontrollera att JWT_SECRET finns
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET saknas i miljövariabler.');
      throw new Error('Unauthorized');
    }

    // Verifiera token
    const decoded = jwt.verify(tokenPart, process.env.JWT_SECRET);
    console.log('Token successfully decoded:', decoded);

    // Kontrollera att userId finns i token payload
    if (!decoded.userId) {
      console.error('Missing userId in token payload');
      throw new Error('Unauthorized');
    }

    // Logga detaljer om methodArn
    console.log('methodArn for the request:', event.methodArn);

    // Skapa och returnera en IAM-policy som täcker alla API-endpoints
    const apiArn = event.methodArn.split('/').slice(0, 2).join('/') + '/*'; // Tillåt alla endpoints i detta API
    const policy = {
      principalId: decoded.userId, // Unik identifierare baserad på userId
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow', // Tillgång beviljad
            Resource: apiArn, // Tillåt alla resurs-ARNs i detta API
          },
        ],
      },
      context: {
        userId: decoded.userId, // Tillgänglig som `event.requestContext.authorizer.userId`
        username: decoded.username || '', // Tillgänglig för debugging (om behövs)
      },
    };

    console.log('Generated IAM policy:', JSON.stringify(policy, null, 2));
    return policy;
  } catch (err) {
    console.error('Token verification failed:', err.message);

    // Logga hela felet om det är oväntat
    console.error('Full error stack:', err);

    throw new Error('Unauthorized'); // API Gateway förväntar sig ett undantag
  }
};

// Exportera handler-funktion
export const handler = authorize;