import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';

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

    // Logga detaljer om methodArn
    console.log('methodArn for the request:', event.methodArn);

    // Skapa och returnera en IAM-policy
    const policy = {
      principalId: decoded.username, // Unik identifierare (t.ex. användarnamn eller ID)
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow', // Tillgång beviljad
            Resource: event.methodArn, // ARN för resursen som begärs
          },
        ],
      },
      context: {
        username: decoded.username, // Tillgänglig som `event.requestContext.authorizer.username`
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
