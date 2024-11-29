import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import { authMiddleware } from '../../utils/authMiddleware.js';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import statusCodes from '../../utils/statusCodes.js';
import formatNote from '../../utils/formatNote.js';
import sortNotes from '../../utils/sortNotes.js';

dotenv.config();

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const NOTES_TABLE = process.env.NOTES_TABLE;

const getNotes = async (event) => {
  try {
    console.log('getNotes invoked:', JSON.stringify(event, null, 2));

    const { userId } = event.requestContext.authorizer;

    if (!userId) {
      return {
        statusCode: statusCodes.UNAUTHORIZED,
        body: JSON.stringify({ message: 'Unauthorized: Missing userId' }),
      };
    }

    console.log('Fetching notes for userId:', userId);

    const result = await dynamoDb
      .query({
        TableName: NOTES_TABLE,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        ConsistentRead: true,
      })
      .promise();

    const notes = sortNotes((result.Items || []).map((note) => formatNote(note)));

    console.log('Notes fetched, formatted, and sorted successfully:', notes);

    return {
      statusCode: statusCodes.OK,
      body: JSON.stringify(notes),
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

export const handler = middy(getNotes)
  .use(authMiddleware())
  .use(httpErrorHandler());
