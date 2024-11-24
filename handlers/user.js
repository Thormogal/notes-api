const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const statusCodes = require('../utils/statusCodes');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE;

// Registrera en ny användare
exports.signup = async (event) => {
  try {
    console.log('USERS_TABLE:', USERS_TABLE); // Loggar tabellnamnet
    const { username, password } = JSON.parse(event.body);

    console.log('Received signup data:', { username });

    if (!username || !password) {
      console.error('Validation error: Missing username or password');
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
      console.error('User already exists:', username);
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({ message: 'User already exists' }),
      };
    }

    // Hasha lösenordet
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Spara användaren i databasen
    await dynamoDb
      .put({
        TableName: USERS_TABLE,
        Item: { username, password: hashedPassword },
      })
      .promise();

    console.log('User created successfully:', username);

    return {
      statusCode: statusCodes.CREATED,
      body: JSON.stringify({ message: 'User created' }),
    };
  } catch (error) {
    console.error('Error during signup execution:', error);
    return {
      statusCode: statusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: 'An error occurred during signup' }),
    };
  }
};

// Logga in en användare
exports.login = async (event) => {
  try {
    console.log('USERS_TABLE:', USERS_TABLE); // Loggar tabellnamnet
    const { username, password } = JSON.parse(event.body);

    console.log('Received login data:', { username });

    if (!username || !password) {
      console.error('Validation error: Missing username or password');
      return {
        statusCode: statusCodes.BAD_REQUEST,
        body: JSON.stringify({ message: 'Username and password are required' }),
      };
    }

    // Hämta användaren från databasen
    const user = await dynamoDb
      .get({
        TableName: USERS_TABLE,
        Key: { username },
      })
      .promise();

    if (!user.Item) {
      console.error('User not found:', username);
      return {
        statusCode: statusCodes.UNAUTHORIZED,
        body: JSON.stringify({ message: 'Invalid credentials' }),
      };
    }

    // Kontrollera lösenordet
    const valid = await bcrypt.compare(password, user.Item.password);
    if (!valid) {
      console.error('Password mismatch for user:', username);
      return {
        statusCode: statusCodes.UNAUTHORIZED,
        body: JSON.stringify({ message: 'Invalid credentials' }),
      };
    }

    // Skapa en JWT-token
    const token = jwt.sign(
      { username: user.Item.username },
      process.env.JWT_SECRET, // Signera token med JWT_SECRET
      { expiresIn: '1h' } // Token giltig i 1 timme
    );

    console.log('Login successful, token created for user:', username);

    return {
      statusCode: statusCodes.OK,
      body: JSON.stringify({ token }),
    };
  } catch (error) {
    console.error('Error during login execution:', error);
    return {
      statusCode: statusCodes.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: 'An error occurred during login' }),
    };
  }
};