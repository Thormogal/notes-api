import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import { authMiddleware } from '../../utils/authMiddleware.js'; // Importera authMiddleware
import AWS from 'aws-sdk';
import Ajv from 'ajv';
import dotenv from 'dotenv';
import statusCodes from '../../utils/statusCodes.js';

// Ladda miljövariabler
dotenv.config();

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const NOTES_TABLE = process.env.NOTES_TABLE;

// Huvudfunktionen för att uppdatera en anteckning
const updateNote = async (event) => {
  try {
    // Logga inkommande request för debugging
    console.log('updateNote invoked:', JSON.stringify(event, null, 2));

    // Hämta användarens ID från authMiddleware
    const { userId } = event.requestContext.authorizer;
    const { id, title, text } = event.body;

    // Kontrollera om userId eller id saknas
    if (!userId) {
      return {
        statusCode: statusCodes.UNAUTHORIZED,
        body: JSON.stringify({ message: 'Unauthorized: Missing userId' }),
      };
    }
    if (!id) {
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({ message: 'Bad Request: Missing note ID' }),
      };
    }

    console.log(`Updating note with id: ${id} for userId: ${userId}`);

    const modifiedAt = new Date().toISOString();

    // DynamoDB Update Query
    const result = await dynamoDb
      .update({
        TableName: NOTES_TABLE,
        Key: { id, userId },
        UpdateExpression:
          'set title = :title, #text = :text, modifiedAt = :modifiedAt',
        ExpressionAttributeValues: {
          ':title': title,
          ':text': text,
          ':modifiedAt': modifiedAt,
        },
        ExpressionAttributeNames: {
          '#text': 'text', // "text" är ett reserverat ord i DynamoDB
        },
        ReturnValues: 'ALL_NEW',
      })
      .promise();

    console.log('Update successful:', result.Attributes);

    return {
      statusCode: statusCodes.OK,
      body: JSON.stringify(result.Attributes), // Returnera den uppdaterade anteckningen
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

// Schema för validering
const updateNoteSchema = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1 }, // ID måste vara en sträng
        title: { type: 'string', minLength: 1, maxLength: 50 }, // Titel med max 50 tecken
        text: { type: 'string', minLength: 1, maxLength: 300 }, // Text med max 300 tecken
      },
      required: ['id', 'title', 'text'], // Alla fält är obligatoriska
    },
  },
};

// Anpassad middleware för validering
const validationMiddleware = () => {
  const ajv = new Ajv();
  const validate = ajv.compile(updateNoteSchema);

  return {
    before: async (request) => {
      const valid = validate(request.event);
      if (!valid) {
        throw new Error(
          `Validation error: ${JSON.stringify(validate.errors)}`
        );
      }
    },
  };
};

// Konfigurera hanterare med Middy
export const handler = middy(updateNote)
  .use(httpJsonBodyParser()) // Parsar JSON till objekt
  .use(authMiddleware()) // Autentisering
  .use(validationMiddleware()) // Anpassad validering
  .use(httpErrorHandler()); // Felhantering