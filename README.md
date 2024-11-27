📓 Notes API
Ett kraftfullt och användarvänligt API för att hantera anteckningar. Anteckningarna är skyddade och kopplade till en unik användare – perfekt för att hålla dina idéer säkra!

🚀 Funktionalitet
API:t erbjuder följande funktioner:

📝 Skapa ett konto och logga in.
📂 Hämta alla anteckningar kopplade till den inloggade användaren.
✏️ Skapa, uppdatera och ta bort anteckningar.
🗑️ Återställ raderade anteckningar (VG-funktionalitet).
🛠️ Teknologier
Detta projekt använder:

API Gateway
AWS Lambda
DynamoDB
Middy som middleware
📋 Kom igång
1. Installera beroenden
bash
Kopiera kod
npm install
2. Skapa en .env-fil
Lägg till följande miljövariabler:

bash
Kopiera kod
JWT_SECRET=din_secret_key
REGION=eu-north-1
USERS_TABLE=users-table-name
NOTES_TABLE=notes-table-name
DELETED_NOTES_TABLE=deleted-notes-table-name
3. Deploya API:t till AWS
bash
Kopiera kod
sls deploy
🌐 Endpoints
Alla endpoints (förutom /signup och /login) kräver en Authorization-header med en Bearer Token.

Endpoint	Metod	Beskrivning
/api/user/signup	POST	Skapa ett nytt användarkonto.
/api/user/login	POST	Logga in och få en JWT-token.
/api/notes	GET	Hämta alla anteckningar.
/api/notes	POST	Skapa en ny anteckning.
/api/notes	PUT	Uppdatera en befintlig anteckning.
/api/notes	DELETE	Ta bort en anteckning.
/api/notes/restore	POST	Återställ en borttagen anteckning.
✍️ Exempel: Användning i Insomnia
Följande är exempel på hur varje endpoint kan användas.

1. Skapa ett användarkonto
Endpoint: /api/user/signup
Metod: POST
Body:
json
Kopiera kod
{
  "username": "testuser",
  "password": "password123"
}
Response:
json
Kopiera kod
{
  "message": "User successfully created"
}
2. Logga in
Endpoint: /api/user/login
Metod: POST
Body:
json
Kopiera kod
{
  "username": "testuser",
  "password": "password123"
}
Response:
json
Kopiera kod
{
  "token": "eyJhbGciOiJIUzI1NiIsInR..."
}
3. Hämta anteckningar
Endpoint: /api/notes
Metod: GET
Headers:
css
Kopiera kod
Authorization: Bearer {din-token}
Response:
json
Kopiera kod
[
  {
    "id": "12345",
    "title": "My note",
    "text": "This is a note.",
    "createdAt": "2024-11-27T...",
    "modifiedAt": "2024-11-27T..."
  }
]
4. Skapa en anteckning
Endpoint: /api/notes
Metod: POST
Headers:
css
Kopiera kod
Authorization: Bearer {din-token}
Body:
json
Kopiera kod
{
  "title": "My new note",
  "text": "This is the content of my note."
}
Response:
json
Kopiera kod
{
  "id": "12345",
  "title": "My new note",
  "text": "This is the content of my note.",
  "createdAt": "2024-11-27T...",
  "modifiedAt": "2024-11-27T..."
}
5. Uppdatera en anteckning
Endpoint: /api/notes
Metod: PUT
Headers:
css
Kopiera kod
Authorization: Bearer {din-token}
Body:
json
Kopiera kod
{
  "id": "12345",
  "title": "Updated title",
  "text": "Updated text"
}
Response:
json
Kopiera kod
{
  "id": "12345",
  "title": "Updated title",
  "text": "Updated text",
  "createdAt": "2024-11-27T...",
  "modifiedAt": "2024-11-27T..."
}
6. Ta bort en anteckning
Endpoint: /api/notes
Metod: DELETE
Headers:
css
Kopiera kod
Authorization: Bearer {din-token}
Body:
json
Kopiera kod
{
  "id": "12345"
}
Response:
json
Kopiera kod
{
  "message": "Note successfully deleted"
}
🐛 Felhantering
HTTP Status	Beskrivning
200 OK	Operation lyckades.
400 Bad Request	Felaktig indata skickades.
401 Unauthorized	Giltig token saknas.
404 Not Found	Anteckning hittades inte.
500 Internal Server Error	Något gick fel på servern.
🧩 Konfigurationsfil för Insomnia
Om du har Insomnia installerat kan du importera den bifogade konfigurationsfilen för att snabbt testa API:t.
