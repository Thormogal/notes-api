import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import { authMiddleware } from '../../utils/authMiddleware.js';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import statusCodes from '../../utils/statusCodes.js';

// Ladda miljövariabler från .env
dotenv.config();

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const NOTES_TABLE = process.env.NOTES_TABLE;
const DELETED_NOTES_TABLE = process.env.DELETED_NOTES_TABLE;

const restoreNote = async (event) => {
  try {
    // Logga inkommande request för debugging
    console.log('restoreNote invoked with event:', JSON.stringify(event, null, 2));

    // Hämta userId från authMiddleware
    const { userId } = event.requestContext.authorizer;
    const { id } = event.body;

    // Validera att ID finns
    if (!id) {
      console.error('Missing note ID in request body');
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({ message: 'Note ID is required' }),
      };
    }

    console.log(`Restoring note with id: ${id} for userId: ${userId}`);

    // Kontrollera om anteckningen finns i DELETED_NOTES_TABLE
    const result = await dynamoDb
      .get({
        TableName: DELETED_NOTES_TABLE,
        Key: { id, userId },
      })
      .promise();

    if (!result.Item) {
      console.error(`Deleted note with id: ${id} not found for userId: ${userId}`);
      return {
        statusCode: statusCodes.NOT_FOUND,
        body: JSON.stringify({ message: 'Deleted note not found' }),
      };
    }

    const noteToRestore = result.Item;

    // Lägg tillbaka anteckningen i NOTES_TABLE
    console.log('Restoring note to NOTES_TABLE:', noteToRestore);

    await dynamoDb
      .put({
        TableName: NOTES_TABLE,
        Item: {
          ...noteToRestore,
          modifiedAt: new Date().toISOString(), // Uppdatera modifiedAt
          restoredAt: new Date().toISOString(), // Lägg till restoredAt
        },
      })
      .promise();

    // Ta bort anteckningen från DELETED_NOTES_TABLE
    console.log(`Removing note from DELETED_NOTES_TABLE with id: ${id}`);

    await dynamoDb
      .delete({
        TableName: DELETED_NOTES_TABLE,
        Key: { id, userId },
      })
      .promise();

    return {
      statusCode: statusCodes.OK,
      body: JSON.stringify({ message: 'Note restored successfully' }),
    };
  } catch (error) {
    console.error('Error during restoreNote:', error);
    return {
      statusCode: statusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: 'An error occurred while restoring the note' }),
    };
  }
};

export const handler = middy(restoreNote)
  .use(httpJsonBodyParser())
  .use(authMiddleware())
  .use(httpErrorHandler());