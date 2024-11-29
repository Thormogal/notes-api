import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import AWS from 'aws-sdk';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Ajv from 'ajv';
import statusCodes from '../../utils/statusCodes.js';

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE;

// Huvudfunktion för login
const login = async (event) => {
  try {
    const { username, password } = event.body;

    // Kontrollera att både username och password finns
    if (!username || !password) {
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({ message: 'Username and password are required' }),
      };
    }

    // Hämta användare från DynamoDB baserat på username
    const user = await dynamoDb
      .scan({
        TableName: USERS_TABLE,
        FilterExpression: 'username = :username',
        ExpressionAttributeValues: { ':username': username },
      })
      .promise();

    if (!user.Items || user.Items.length === 0) {
      return {
        statusCode: statusCodes.UNAUTHORIZED,
        body: JSON.stringify({ message: 'Invalid credentials' }),
      };
    }

    const userData = user.Items[0]; // Eftersom username ska vara unikt

    // Validera lösenord
    const valid = await bcrypt.compare(password, userData.password);
    if (!valid) {
      return {
        statusCode: statusCodes.UNAUTHORIZED,
        body: JSON.stringify({ message: 'Invalid credentials' }),
      };
    }

    // Skapa JWT-token med userId
    const token = jwt.sign(
      { userId: userData.userId }, // Inkludera endast userId i token
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Token giltig i 1 timme
    );

    return {
      statusCode: statusCodes.OK,
      body: JSON.stringify({ token }), // Returnera token till klienten
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: statusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: 'An error occurred during login' }),
    };
  }
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
  .use(httpJsonBodyParser()) // Parsar JSON från body till ett JS-objekt
  .use({
    before: validateInput, // Validering före huvudfunktionen
  })
  .use(httpErrorHandler()); // Felhantering