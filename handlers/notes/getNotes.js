// handlers/notes/getNotes.js

import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import { authMiddleware } from '../../utils/authMiddleware.js';
import AWS from 'aws-sdk';
import statusCodes from '../../utils/statusCodes.js';

// Konfigurera DynamoDB-klienten
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const NOTES_TABLE = process.env.NOTES_TABLE;

const getNotes = async (event) => {
  console.log('getNotes invoked with event:', JSON.stringify(event, null, 2));

  try {
    // Hämta userId från authMiddleware
    const { userId } = event.requestContext.authorizer;

    if (!userId) {
      console.error('Missing userId in requestContext.authorizer');
      return {
        statusCode: statusCodes.UNAUTHORIZED,
        body: JSON.stringify({ message: 'Unauthorized: Missing userId' }),
      };
    }

    console.log('Querying notes for userId:', userId);

    // Dynamisk Query för att hämta anteckningar
    const result = await dynamoDb
      .query({
        TableName: NOTES_TABLE,
        KeyConditionExpression: 'userId = :userId', // Partition Key: userId
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        ProjectionExpression: 'id, title, #noteText, createdAt, modifiedAt', // Hämta nödvändiga fält
        ExpressionAttributeNames: {
          '#noteText': 'text', // Alias för reserverat nyckelord
        },
      })
      .promise();

    console.log('Query result:', result);

    // Returnera anteckningarna
    return {
      statusCode: statusCodes.OK,
      body: JSON.stringify(result.Items || []), // Returnera tom array om inga anteckningar finns
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


// Exportera handler med Middy middleware
export const handler = middy(getNotes)
  .use(authMiddleware()) // Använd authMiddleware för autentisering
  .use(httpErrorHandler()); // Hantera fel