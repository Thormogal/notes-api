# Notes API

An API for managing user-specific notes. The notes are protected and accessible only to the logged-in user. Perfect for keeping your ideas organized and secure! 🚀

---

## Features

- **Sign up and log in**: Manage user accounts.
- **Fetch notes**: Retrieve notes associated with the logged-in user.
- **Create, update, and delete**: Full CRUD functionality.

---

## Technologies

This project utilizes:
- 🛠 **API Gateway** for endpoint management.
- 🖥 **AWS Lambda** for serverless functionality.
- 💾 **DynamoDB** for data storage.
- 📦 **Middy** as middleware for handling authentication and error management.

---

<p align="center">
  <img src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdXJrdXd4bWZjbzkyYnBzaTkwM204NWJxZm1leDk4OWNvZndwcG8ybiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/W4aEQJikcHHDDVeFL7/giphy.gif" alt="Header GIF">
</p>

| Endpoint                 | Description                                                                                               |
|--------------------------|-----------------------------------------------------------------------------------------------------------|
| **POST /api/user/signup** | Used to create a new user account.                                                                       |
| **POST /api/user/login**  | Used to log in and generate a JWT token for authentication.                                              |
| **POST /api/notes**       | Used to create a new note. <br>Requires a valid JWT token in the Authorization header.                       |
| **GET /api/notes**        | Used to fetch all notes for the logged-in user. <br>Notes are returned in descending order by creation date. |
| **PUT /api/notes**        | Used to edit an existing note. <br>Requires a valid JWT token in the Authorization header.                   |
| **DELETE /api/notes**     | Used to delete a note. <br>The note is moved to a deleted notes table and can be restored later.             |
| **GET /api/notes/deleted**| Used to fetch all deleted notes for the logged-in user. <br>Notes are returned in descending order by creation date. |
| **POST /api/notes/restore** | Used to restore a deleted note. <br>Requires a valid JWT token in the Authorization header.                |
