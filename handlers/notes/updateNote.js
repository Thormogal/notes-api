import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import { authMiddleware } from '../../utils/authMiddleware.js';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import statusCodes from '../../utils/statusCodes.js';
import formatNote from '../../utils/formatNote.js';

dotenv.config();

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const NOTES_TABLE = process.env.NOTES_TABLE;

const updateNote = async (event) => {
  try {
    console.log('updateNote invoked:', JSON.stringify(event, null, 2));

    const { userId } = event.requestContext.authorizer;

    if (!event.body || typeof event.body !== 'object') {
      console.error('Request body is missing or invalid');
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({
          message: 'Request body must be a valid JSON object with id, title, or text.',
        }),
      };
    }

    let { id, title, text } = event.body;

    if (!userId) {
      return {
        statusCode: statusCodes.UNAUTHORIZED,
        body: JSON.stringify({ message: 'Unauthorized: Missing userId' }),
      };
    }

    if (!id) {
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({ message: 'Bad Request: Missing note ID.' }),
      };
    }

    id = String(id).trim();
    if (id.length === 0) {
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({ message: 'Note ID must not be empty.' }),
      };
    }

    if (title === undefined && text === undefined) {
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({
          message: 'At least one field (title or text) must be provided for update.',
        }),
      };
    }

    if (title !== undefined) {
      title = String(title).trim();
      if (title.length === 0 || title.length > 50) {
        return {
          statusCode: statusCodes.BAD_REQUEST,
          body: JSON.stringify({
            message: 'Title must be between 1 and 50 characters.',
          }),
        };
      }
    }

    if (text !== undefined) {
      text = String(text).trim();
      if (text.length === 0 || text.length > 300) {
        return {
          statusCode: statusCodes.BAD_REQUEST,
          body: JSON.stringify({
            message: 'Text must be between 1 and 300 characters.',
          }),
        };
      }
    }

    const existingNote = await dynamoDb
      .get({
        TableName: NOTES_TABLE,
        Key: { id, userId },
      })
      .promise();

    if (!existingNote.Item) {
      return {
        statusCode: statusCodes.NOT_FOUND,
        body: JSON.stringify({
          message: 'Note not found or you do not have access to it.',
        }),
      };
    }

    console.log(`Updating note with id: ${id} for userId: ${userId}`);

    const modifiedAt = new Date().toISOString();

    let updateExpression = 'set modifiedAt = :modifiedAt';
    const expressionAttributeValues = { ':modifiedAt': modifiedAt };
    const expressionAttributeNames = {};

    if (title !== undefined) {
      updateExpression += ', title = :title';
      expressionAttributeValues[':title'] = title;
    }

    if (text !== undefined) {
      updateExpression += ', #text = :text';
      expressionAttributeValues[':text'] = text;
      expressionAttributeNames['#text'] = 'text';
    }

    const result = await dynamoDb
      .update({
        TableName: NOTES_TABLE,
        Key: { id, userId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length
          ? expressionAttributeNames
          : undefined,
        ReturnValues: 'ALL_NEW',
      })
      .promise();

    console.log('Update successful:', result.Attributes);

    const formattedNote = formatNote(result.Attributes);

    return {
      statusCode: statusCodes.OK,
      body: JSON.stringify(formattedNote),
    };
  } catch (error) {
    console.error('Error during updateNote:', error);

    return {
      statusCode: statusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({
        error: 'An error occurred while updating the note.',
      }),
    };
  }
};


export const handler = middy(updateNote)
  .use(httpJsonBodyParser())
  .use(authMiddleware())
  .use(httpErrorHandler());