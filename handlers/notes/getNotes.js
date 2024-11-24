const AWS = require('aws-sdk');
const statusCodes = require('../../utils/statusCodes');
const authMiddleware = require('../../utils/authMiddleware');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const NOTES_TABLE = process.env.NOTES_TABLE;

module.exports.getNotes = async (event) => {
  const authError = await authMiddleware(event);
  if (authError) return authError;

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
