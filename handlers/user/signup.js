import dotenv from 'dotenv'; // Importera dotenv
dotenv.config(); // Ladda .env-variabler

import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import AWS from 'aws-sdk';
import bcrypt from 'bcryptjs';
import statusCodes from '../../utils/statusCodes.js';

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE;

const signup = async (event) => {
  try {
    const { username, password } = event.body;

    if (!username || !password) {
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({ message: 'Username and password are required' }),
      };
    }

    // Kontrollera om användaren redan existerar
    const existingUser = await dynamoDb
      .get({
        TableName: USERS_TABLE,
        Key: { username },
      })
      .promise();

    if (existingUser.Item) {
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({ message: 'User already exists' }),
      };
    }

    // Hasha lösenordet
    const hashedPassword = await bcrypt.hash(password, 10);

    // Lägg till ny användare i databasen
    await dynamoDb
      .put({
        TableName: USERS_TABLE,
        Item: { username, password: hashedPassword },
      })
      .promise();

    return {
      statusCode: statusCodes.CREATED,
      body: JSON.stringify({ message: 'User created' }),
    };
  } catch (error) {
    console.error('Signup error:', error);
    return {
      statusCode: statusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: 'An error occurred during signup' }),
    };
  }
};

// Middleware med Middy
export const handler = middy(signup)
  .use(httpJsonBodyParser()) // Parsar JSON från body till ett JS-objekt
  .use(httpErrorHandler()); // Hanterar fel snyggt