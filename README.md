# waw-be  

### Overview
This project serves as the backend service for the scheduling application, `waw`. 
It aims to deliver a comprehensive suite of features such as user management, calendar integration, availability scheduling, event management, and booking systems, 
complemented by timely notifications through email or SMS.  

### Current Progress  

The available features include:

- User Management: Basic user registration and retrieval are currently supported.  
  - Basic user registration and retrieval using email & password.  
  - Authentication processes, including login and logout operations.  
  - Email verification and management, enabling users to verify their email addresses using a secret token.  
  - User profile updates, allowing for basic information, email, and password changes.  
  - OAuth signup/login - WIP  
  
Future components to be developed:  

- Calendar Integration  
- Availability Scheduler  
- Event Management  
- Booking System  
- Notifications  

### Technology Stack  
  
- `Fastify`  
- `PostgreSQL` Database  
- `Zod` for schema validation  
- `Japa` for unit testing, with `Sinon` for assertions  
- `nodemailer` for email sending capabilities  
- `winston` for logging  

### Getting Started  

#### Prerequisites:

Before you begin, ensure you have the following installed on your system:  
- Node.js (Japa requires Node.js >= 18 and works only with the ES module system)  
- npm (version 6 or higher)  
- PostgreSQL 
  
#### Installation:

1. **Clone the repository**
```
git clone https://github.com/nuhman/waw-be.git
cd waw-be  
```  
  
2. **Install dependencies**  
```
npm install
```  
  
3. **Configure environment variables**

Copy the `.env.example` file to a new file named `.env` and update it with your database connection details and other environment-specific settings.  
```  
cp .env.example .env  
```  
  
4. **Run migrations - Set up the PostgreSQL database**  
- Create a new PostgreSQL database.  
- Execute the scripts found in the `migrations` folder to set up the required tables.  
```  
npm run migrate  
```  
  
### Building and Running the Application  
```  
npm run build  
npm run dev  
```  
  
### Testing  
  
To run the unit tests:  
```
npm run test  
```  
  
This uses the Japa test runner configured in the `bin` folder. Tests are located in the `tests` directory and can be expanded as the application grows.  
  
