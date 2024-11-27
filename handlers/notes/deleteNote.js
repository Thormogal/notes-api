import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import { authMiddleware } from '../../utils/authMiddleware.js';
import AWS from 'aws-sdk';
import statusCodes from '../../utils/statusCodes.js';

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const NOTES_TABLE = process.env.NOTES_TABLE;
const DELETED_NOTES_TABLE = process.env.DELETED_NOTES_TABLE;

const deleteNote = async (event) => {
  console.log('deleteNote invoked with event:', JSON.stringify(event, null, 2));

  try {
    const { userId } = event.requestContext.authorizer;
    const { id } = event.body;

    if (!id) {
      console.error('Missing note ID in request body');
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({ message: 'Note ID is required' }),
      };
    }

    console.log(`Deleting note with id: ${id} for userId: ${userId}`);

    // Hämta anteckningen för att säkerställa att den existerar
    const result = await dynamoDb.get({
      TableName: NOTES_TABLE,
      Key: { id, userId },
    }).promise();

    if (!result.Item) {
      console.error(`Note with id: ${id} not found for userId: ${userId}`);
      return {
        statusCode: statusCodes.NOT_FOUND,
        body: JSON.stringify({ message: 'Note not found' }),
      };
    }

    const noteToDelete = result.Item;

    // Lägg till anteckningen i DELETED_NOTES_TABLE
    console.log('Adding note to DELETED_NOTES_TABLE:', noteToDelete);

    await dynamoDb.put({
      TableName: DELETED_NOTES_TABLE,
      Item: {
        ...noteToDelete,
        deletedAt: new Date().toISOString(), // Lägger till när den togs bort
      },
    }).promise();

    // Ta bort anteckningen från NOTES_TABLE
    console.log(`Removing note from NOTES_TABLE with id: ${id}`);

    await dynamoDb.delete({
      TableName: NOTES_TABLE,
      Key: { id, userId },
    }).promise();

    return {
      statusCode: statusCodes.OK,
      body: JSON.stringify({ message: 'Note deleted successfully' }),
    };
  } catch (error) {
    console.error('Error during deleteNote:', error);
    return {
      statusCode: statusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: 'An error occurred while deleting the note' }),
    };
  }
};

export const handler = middy(deleteNote)
  .use(httpJsonBodyParser()) // För att parsa JSON i body
  .use(authMiddleware()) // Autentisering
  .use(httpErrorHandler()); // Felhantering