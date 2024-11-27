# Notes API

Ett API för att hantera anteckningar kopplade till en användare. Anteckningarna är skyddade och endast åtkomliga för den inloggade användaren. Perfekt för att hålla dina idéer organiserade och säkra! 🚀

---

## Funktioner

- **Skapa konto och logga in**: Hantera användare.
- **Hämta anteckningar**: Visa anteckningar kopplade till inloggad användare.
- **Skapa, uppdatera och ta bort**: Full CRUD-funktionalitet.
- **Återställ raderade anteckningar**: Extra funktion för att återställa borttagna anteckningar. *(VG-funktionalitet)*

---

## Teknologier

Detta projekt använder:
- 🛠 **API Gateway** för endpoint-hantering.
- 🖥 **AWS Lambda** för serverless-funktionalitet.
- 💾 **DynamoDB** för datalagring.
- 📦 **Middy** som middleware för att hantera autentisering och felhantering.

---

## Kom igång

### Installation

1. **Kloning och installation**:
   ```bash
   git clone <repository_url>
   cd notes-api
   npm install
