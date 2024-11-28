import dotenv from 'dotenv';
dotenv.config();

import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import { authMiddleware } from '../../utils/authMiddleware.js';
import AWS from 'aws-sdk';
import statusCodes from '../../utils/statusCodes.js';

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const DELETED_NOTES_TABLE = process.env.DELETED_NOTES_TABLE;

const getDeletedNotes = async (event) => {
  console.log('getDeletedNotes invoked:', JSON.stringify(event, null, 2));

  try {
    // Hämta userId från authMiddleware
    const { userId } = event.requestContext.authorizer;

    if (!userId) {
      console.error('Unauthorized: Missing userId in request context');
      return {
        statusCode: statusCodes.UNAUTHORIZED,
        body: JSON.stringify({ message: 'Unauthorized: Missing userId' }),
      };
    }

    // Query för att hämta alla raderade anteckningar för användaren
    const result = await dynamoDb
      .query({
        TableName: DELETED_NOTES_TABLE,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
      })
      .promise();

    console.log('Deleted notes retrieved successfully:', result.Items);

    return {
      statusCode: statusCodes.OK,
      body: JSON.stringify(result.Items || []), // Returnera en tom array om inga anteckningar hittas
    };
  } catch (error) {
    console.error('Error during getDeletedNotes:', error);
    return {
      statusCode: statusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: 'An error occurred while retrieving deleted notes' }),
    };
  }
};

// Konfigurera hanterare med Middy
export const handler = middy(getDeletedNotes)
  .use(authMiddleware()) // Middleware för autentisering
  .use(httpErrorHandler()); // Middleware för att hantera fel
