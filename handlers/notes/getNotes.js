import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import { authMiddleware } from '../../utils/authMiddleware.js';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import statusCodes from '../../utils/statusCodes.js';
import formatNote from '../../utils/formatNote.js';
import sortNotes from '../../utils/sortNotes.js';

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

    // Omstrukturera anteckningar med formatNote och sortera dem med sortNotes
    const notes = sortNotes((result.Items || []).map((note) => formatNote(note)));

    // Logga resultatet för debugging
    console.log('Notes fetched, formatted, and sorted successfully:', notes);

    return {
      statusCode: statusCodes.OK,
      body: JSON.stringify(notes), // Returnera formaterade och sorterade anteckningar
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
  .use(authMiddleware())
  .use(httpErrorHandler());
