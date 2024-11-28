import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import { authMiddleware } from '../../utils/authMiddleware.js'; // Importera authMiddleware
import AWS from 'aws-sdk';
import dotenv from 'dotenv'; // För att säkerställa att miljövariabler laddas
import statusCodes from '../../utils/statusCodes.js';

// Ladda miljövariabler
dotenv.config();

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const NOTES_TABLE = process.env.NOTES_TABLE; // Säkerställ att NOTES_TABLE hämtas korrekt

const getNotes = async (event) => {
  try {
    // Logga inkommande request för debugging
    console.log('getNotes invoked:', JSON.stringify(event, null, 2));

    // Hämta userId från authMiddleware
    const { userId } = event.requestContext.authorizer;

    // Kontrollera om userId saknas
    if (!userId) {
      return {
        statusCode: statusCodes.UNAUTHORIZED,
        body: JSON.stringify({ message: 'Unauthorized: Missing userId' }),
      };
    }

    // Logga userId för debugging
    console.log('Fetching notes for userId:', userId);

    // Hämta anteckningar från DynamoDB
    const result = await dynamoDb
      .query({
        TableName: NOTES_TABLE,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        ConsistentRead: true, // Säkerställ att läsningen är konsekvent
      })
      .promise();

    // Logga resultatet för debugging
    console.log('Notes fetched successfully:', result.Items);

    return {
      statusCode: statusCodes.OK,
      body: JSON.stringify(result.Items || []), // Returnera tom array om inga anteckningar hittas
    };
  } catch (error) {
    console.error('Error during getNotes:', error);
    return {
      statusCode: statusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({
        error: 'An error occurred while retrieving notes',
      }),
    };
  }
};

// Konfigurera med Middy
export const handler = middy(getNotes)
  .use(authMiddleware()) // Middleware för autentisering
  .use(httpErrorHandler()); // Middleware för att hantera fel
