import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import { authMiddleware } from '../../utils/authMiddleware.js';
import AWS from 'aws-sdk';
import statusCodes from '../../utils/statusCodes.js';

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const NOTES_TABLE = process.env.NOTES_TABLE;
const DELETED_NOTES_TABLE = process.env.DELETED_NOTES_TABLE;

const deleteNote = async (event) => {
  try {
    const { userId } = event.requestContext.authorizer;
    const { id } = JSON.parse(event.body);

    const result = await dynamoDb.get({
      TableName: NOTES_TABLE,
      Key: { id, userId },
    }).promise();

    if (!result.Item) {
      return {
        statusCode: statusCodes.NOT_FOUND,
        body: JSON.stringify({ message: 'Note not found' }),
      };
    }

    await dynamoDb.put({
      TableName: DELETED_NOTES_TABLE,
      Item: { ...result.Item, deletedAt: new Date().toISOString() },
    }).promise();

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
      body: JSON.stringify({ error: 'An error occurred' }),
    };
  }
};

export const handler = middy(deleteNote)
  .use(authMiddleware()) // Använd den nya authMiddleware
  .use(httpErrorHandler());