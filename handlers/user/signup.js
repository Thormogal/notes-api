import dotenv from 'dotenv';
import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import AWS from 'aws-sdk';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import statusCodes from '../../utils/statusCodes.js';

dotenv.config();

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE;

const signup = async (event) => {
  try {
    const { username, password } = event.body;

    // Kontrollera att både username och password skickas med
    if (!username || !password) {
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({ message: 'Username and password are required' }),
      };
    }

    // Generera ett unikt userId
    const userId = uuidv4();

    // Kontrollera om användaren redan existerar (med username som unik identifierare)
    const existingUser = await dynamoDb
      .scan({
        TableName: USERS_TABLE,
        FilterExpression: 'username = :username',
        ExpressionAttributeValues: { ':username': username },
      })
      .promise();

    if (existingUser.Items && existingUser.Items.length > 0) {
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({ message: 'User already exists' }),
      };
    }

    // Hasha lösenordet för säker lagring
    const hashedPassword = await bcrypt.hash(password, 10);

    // Lägg till ny användare i databasen
    await dynamoDb
      .put({
        TableName: USERS_TABLE,
        Item: {
          userId, // Unikt ID för användaren
          username, // Användarnamn för användaren
          password: hashedPassword, // Krypterat lösenord
        },
      })
      .promise();

    return {
      statusCode: statusCodes.CREATED,
      body: JSON.stringify({
        message: 'User created successfully',
        userId, // Returnera userId som bekräftelse
      }),
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