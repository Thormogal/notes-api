import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import { authMiddleware } from '../../utils/authMiddleware.js';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import statusCodes from '../../utils/statusCodes.js';
import formatNote from '../../utils/formatNote.js';

dotenv.config();

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const NOTES_TABLE = process.env.NOTES_TABLE;

const createNote = async (event) => {
  try {
    const { userId } = event.requestContext.authorizer;

    if (!event.body || typeof event.body !== 'object') {
      console.error('Request body is missing or invalid');
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({
          message: 'Request body must be a valid JSON object with title and text.',
        }),
      };
    }

    let { title, text } = event.body;

    if (title === undefined || text === undefined) {
      console.error('Missing title or text in request body');
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({
          message: 'Both title and text are required.',
        }),
      };
    }

    title = String(title);
    text = String(text);

    const existingNote = await dynamoDb
      .scan({
        TableName: NOTES_TABLE,
        FilterExpression: 'userId = :userId AND title = :title',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':title': title,
        },
      })
      .promise();

    if (existingNote.Items && existingNote.Items.length > 0) {
      console.warn(`Note with title "${title}" already exists for userId ${userId}`);
      return {
        statusCode: statusCodes.CONFLICT,
        body: JSON.stringify({
          message: `A note with the title "${title}" already exists. Please use a different name.`,
        }),
      };
    }

    const newNote = {
      id: uuidv4(),
      userId,
      title,
      text,
      createdAt: new Date().toISOString(),
    };

    await dynamoDb.put({ TableName: NOTES_TABLE, Item: newNote }).promise();
    const formattedNote = formatNote(newNote);

    return {
      statusCode: statusCodes.CREATED,
      body: JSON.stringify(formattedNote),
    };
  } catch (error) {
    console.error('Error during createNote:', error);

    return {
      statusCode: statusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({
        error: 'Failed to create note. Please try again later.',
      }),
    };
  }
};

export const handler = middy(createNote)
  .use(httpJsonBodyParser())
  .use(authMiddleware())
  .use(httpErrorHandler());