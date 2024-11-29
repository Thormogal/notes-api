import dotenv from 'dotenv';
import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import { authMiddleware } from '../../utils/authMiddleware.js';
import AWS from 'aws-sdk';
import statusCodes from '../../utils/statusCodes.js';
import formatNote from '../../utils/formatNote.js';
import sortNotes from '../../utils/sortNotes.js';

dotenv.config();

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const DELETED_NOTES_TABLE = process.env.DELETED_NOTES_TABLE;

const getDeletedNotes = async (event) => {
  console.log('getDeletedNotes invoked:', JSON.stringify(event, null, 2));

  try {
    const { userId } = event.requestContext.authorizer;

    if (!userId) {
      console.error('Unauthorized: Missing userId in request context');
      return {
        statusCode: statusCodes.UNAUTHORIZED,
        body: JSON.stringify({ message: 'Unauthorized: Missing userId' }),
      };
    }

    const result = await dynamoDb
      .query({
        TableName: DELETED_NOTES_TABLE,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
      })
      .promise();

    console.log('Deleted notes retrieved successfully:', result.Items);

    const formattedAndSortedNotes = sortNotes(
      (result.Items || []).map((note) => {
        const formattedNote = formatNote(note);
        delete formattedNote.restoredAt;
        return formattedNote;
      })
    );

    return {
      statusCode: statusCodes.OK,
      body: JSON.stringify(formattedAndSortedNotes),
    };
  } catch (error) {
    console.error('Error during getDeletedNotes:', error);
    return {
      statusCode: statusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: 'An error occurred while retrieving deleted notes' }),
    };
  }
};

export const handler = middy(getDeletedNotes)
  .use(authMiddleware())
  .use(httpErrorHandler());