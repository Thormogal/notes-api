import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import AWS from 'aws-sdk';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Ajv from 'ajv'; // Importera Ajv
import statusCodes from '../../utils/statusCodes.js';

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE;

// Huvudfunktion för login
const login = async (event) => {
  const { username, password } = event.body;

  // Hämta användare från DynamoDB
  const user = await dynamoDb
    .get({
      TableName: USERS_TABLE,
      Key: { username },
    })
    .promise();

  if (!user.Item) {
    return {
      statusCode: statusCodes.UNAUTHORIZED,
      body: JSON.stringify({ message: 'Invalid credentials' }),
    };
  }

  // Validera lösenord
  const valid = await bcrypt.compare(password, user.Item.password);
  if (!valid) {
    return {
      statusCode: statusCodes.UNAUTHORIZED,
      body: JSON.stringify({ message: 'Invalid credentials' }),
    };
  }

  // Skapa JWT-token
  const token = jwt.sign(
    { username: user.Item.username },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  return {
    statusCode: statusCodes.OK,
    body: JSON.stringify({ token }),
  };
};

// Schema för validering
const loginSchema = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 50 },
        password: { type: 'string', minLength: 6 },
      },
      required: ['username', 'password'],
    },
  },
  required: ['body'],
};

// Middleware för validering
const validateInput = async (request) => {
  const ajv = new Ajv();
  const validate = ajv.compile(loginSchema);

  const isValid = validate(request.event);
  if (!isValid) {
    throw new Error(`Validation Error: ${JSON.stringify(validate.errors)}`);
  }
};

// Konfigurera hanterare med Middy
export const handler = middy(login)
  .use(httpJsonBodyParser()) // Parsar JSON till objekt
  .use({
    before: validateInput, // Validering före huvudfunktionen
  })
  .use(httpErrorHandler()); // Felhantering
