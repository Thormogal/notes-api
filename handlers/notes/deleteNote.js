import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import { authMiddleware } from '../../utils/authMiddleware.js';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import statusCodes from '../../utils/statusCodes.js';

dotenv.config();

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const NOTES_TABLE = process.env.NOTES_TABLE;
const DELETED_NOTES_TABLE = process.env.DELETED_NOTES_TABLE;

const deleteNote = async (event) => {
  try {
    console.log('deleteNote invoked with event:', JSON.stringify(event, null, 2));

    const { userId } = event.requestContext.authorizer;

    let body = event.body;

    if (!body) {
      console.error('Bad Request: Body is missing');
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({
          message: 'Request body must contain a valid "id" field.',
        }),
      };
    }

    try {
      body = typeof body === 'string' ? JSON.parse(body) : body;
    } catch (error) {
      console.error('Bad Request: Invalid JSON body');
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({
          message: 'Request body must be valid JSON.',
        }),
      };
    }

    const { id } = body;

    if (!id) {
      console.error('Bad Request: Missing "id" field');
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({ message: 'Note ID is required' }),
      };
    }

    if (typeof id !== 'string' || id.trim().length === 0) {
      console.error('Bad Request: "id" field is invalid');
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({
          message: 'Note ID must be a non-empty string.',
        }),
      };
    }

    console.log(`Deleting note with id: ${id} for userId: ${userId}`);

    const result = await dynamoDb
      .get({
        TableName: NOTES_TABLE,
        Key: { id, userId },
      })
      .promise();

    if (!result.Item) {
      console.error(`Note with id: ${id} not found for userId: ${userId}`);
      return {
        statusCode: statusCodes.NOT_FOUND,
        body: JSON.stringify({ message: 'Note not found' }),
      };
    }

    const noteToDelete = result.Item;

    console.log('Adding note to DELETED_NOTES_TABLE:', noteToDelete);

    await dynamoDb
      .put({
        TableName: DELETED_NOTES_TABLE,
        Item: {
          ...noteToDelete,
          deletedAt: new Date().toISOString(),
        },
      })
      .promise();

    console.log(`Removing note from NOTES_TABLE with id: ${id}`);

    await dynamoDb
      .delete({
        TableName: NOTES_TABLE,
        Key: { id, userId },
      })
      .promise();

    return {
      statusCode: statusCodes.OK,
      body: JSON.stringify({
        message: `Note with title "${noteToDelete.title}" deleted successfully`,
      }),
    };
  } catch (error) {
    console.error('Error during deleteNote:', error);
    return {
      statusCode: statusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({
        error: 'An error occurred while deleting the note',
      }),
    };
  }
};

export const handler = middy(deleteNote)
  .use(httpJsonBodyParser())
  .use(authMiddleware())
  .use(httpErrorHandler());