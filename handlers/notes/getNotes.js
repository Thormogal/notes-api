import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import { authMiddleware } from '../../utils/authMiddleware.js';
import AWS from 'aws-sdk';
import statusCodes from '../../utils/statusCodes.js';

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const NOTES_TABLE = process.env.NOTES_TABLE;

const getNotes = async (event) => {
  try {
    const { userId } = event.requestContext.authorizer;

    const result = await dynamoDb.query({
      TableName: NOTES_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
    }).promise();

    return {
      statusCode: statusCodes.OK,
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    console.error('Error during getNotes:', error);
    return {
      statusCode: statusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: 'An error occurred' }),
    };
  }
};

export const handler = middy(getNotes)
  .use(authMiddleware()) // Använd den nya authMiddleware
  .use(httpErrorHandler());