import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import { authMiddleware } from '../../utils/authMiddleware.js';
import AWS from 'aws-sdk';
import statusCodes from '../../utils/statusCodes.js';

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const NOTES_TABLE = process.env.NOTES_TABLE;

const updateNote = async (event) => {
    console.log('updateNote invoked with event:', JSON.stringify(event, null, 2));
  
    try {
      const { userId } = event.requestContext.authorizer;
      const { id, title, text } = event.body;
  
      if (!id || !title || !text) {
        console.error('Missing required fields: id, title, or text');
        return {
          statusCode: statusCodes.BAD_REQUEST,
          body: JSON.stringify({ message: 'id, title, and text are required' }),
        };
      }
  
      console.log(`Updating note with id: ${id} for userId: ${userId}`);
  
      const result = await dynamoDb.update({
        TableName: NOTES_TABLE,
        Key: { userId, id },
        UpdateExpression: 'SET #title = :title, #textAlias = :text, modifiedAt = :modifiedAt',
        ExpressionAttributeNames: {
          '#title': 'title',
          '#textAlias': 'text', // Alias för reserverat nyckelord
        },
        ExpressionAttributeValues: {
          ':title': title,
          ':text': text,
          ':modifiedAt': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      }).promise();
  
      console.log('Update result:', result);
  
      return {
        statusCode: statusCodes.OK,
        body: JSON.stringify(result.Attributes),
      };
    } catch (error) {
      console.error('Error during updateNote:', error);
  
      return {
        statusCode: statusCodes.INTERNAL_SERVER_ERROR,
        body: JSON.stringify({
          error: 'An error occurred while updating the note',
        }),
      };
    }
  };
  

export const handler = middy(updateNote)
  .use(httpJsonBodyParser()) // Parsar JSON till objekt
  .use(authMiddleware()) // Autentisering
  .use(httpErrorHandler()); // Felhantering
