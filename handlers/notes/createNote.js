const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const statusCodes = require('../../utils/statusCodes');
const authMiddleware = require('../../utils/authMiddleware');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const NOTES_TABLE = process.env.NOTES_TABLE;

const noteSchema = Joi.object({
  title: Joi.string().max(50).required(),
  text: Joi.string().max(300).required(),
});

module.exports.createNote = async (event) => {
  const authError = await authMiddleware(event);
  if (authError) return authError;

  try {
    const { userId } = event.requestContext.authorizer;
    const { title, text } = JSON.parse(event.body);

    const { error } = noteSchema.validate({ title, text });
    if (error) {
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({ message: error.details[0].message }),
      };
    }

    const newNote = {
      id: uuidv4(),
      userId,
      title,
      text,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    };

    await dynamoDb.put({ TableName: NOTES_TABLE, Item: newNote }).promise();

    return {
      statusCode: statusCodes.CREATED,
      body: JSON.stringify(newNote),
    };
  } catch (error) {
    console.error('Error during createNote:', error);
    return {
      statusCode: statusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: 'An error occurred' }),
    };
  }
};
