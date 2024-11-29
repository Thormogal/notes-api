import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import { authMiddleware } from '../../utils/authMiddleware.js';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import Ajv from 'ajv';
import statusCodes from '../../utils/statusCodes.js';
import formatNote from '../../utils/formatNote.js';

// Ladda miljövariabler från .env
dotenv.config();

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const NOTES_TABLE = process.env.NOTES_TABLE;

const createNote = async (event) => {
  try {
    // Hämta användarens ID från token (via authorizer)
    const { userId } = event.requestContext.authorizer;
    const { title, text } = event.body;

    // Logga inkommande data (för debugging)
    console.log('Creating note for userId:', userId);
    console.log('Incoming note data:', { title, text });

    // Skapa anteckning
    const newNote = {
      id: uuidv4(),
      userId,
      title,
      text,
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
    };

    // Spara till DynamoDB
    await dynamoDb.put({ TableName: NOTES_TABLE, Item: newNote }).promise();

    // Formatera anteckningen med formatNote
    const formattedNote = formatNote(newNote);

    // Returnera det formaterade objektet
    return {
      statusCode: statusCodes.CREATED,
      body: JSON.stringify(formattedNote),
    };
  } catch (error) {
    console.error('Error during createNote:', error);
    return {
      statusCode: statusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: 'An error occurred during createNote' }),
    };
  }
};

// Schema för validering
const createNoteSchema = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      properties: {
        title: { type: 'string', maxLength: 50 },
        text: { type: 'string', maxLength: 300 },
      },
      required: ['title', 'text'],
    },
  },
};

// Anpassad middleware för validering
const validationMiddleware = () => {
  const ajv = new Ajv();
  const validate = ajv.compile(createNoteSchema);

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
export const handler = middy(createNote)
  .use(httpJsonBodyParser()) // Parsar JSON till objekt
  .use(authMiddleware()) // Autentisering
  .use(validationMiddleware()) // Anpassad validering
  .use(httpErrorHandler()); // Felhantering