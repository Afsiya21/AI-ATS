# Smart Recruitment Tracking System

A full-stack web application developed to manage and simplify the recruitment process.  
The system provides an efficient platform for handling candidates, resume processing, and recruitment workflow management.

## Features

- User Authentication
- Candidate Profile Management
- Resume Upload and Processing
- Resume Analysis
- Recruitment Dashboard
- Application Tracking
- Secure Backend APIs
- Responsive User Interface

## Tech Stack

### Frontend
- React.js
- TypeScript
- Tailwind CSS
- Vite

### Backend
- Node.js
- Express.js
- MongoDB

### Tools
- Git
- GitHub
- VS Code
- Postman

## Installation and Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Start Frontend Server

```bash
npm run dev
```

### 4. Setup Backend

Move to the server directory:

```bash
cd server
```

Install backend dependencies:

```bash
npm install
```

Start backend server:

```bash
npm start
```

## Environment Variables

Create a `.env` file inside the server folder and add required configuration.

Example:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

## Project Structure

```
Smart-Recruitment-Tracking-System

├── src
│   ├── assets
│   ├── components
│   ├── hooks
│   ├── lib
│   └── routes
│
├── server
│   ├── config
│   ├── controllers
│   ├── middleware
│   ├── models
│   └── routes
│
├── package.json
└── README.md
```

## Future Enhancements

- Advanced candidate ranking
- Interview management
- Notification system
- Recruitment analytics

## About

This project demonstrates a MERN stack based recruitment management solution focusing on efficient hiring workflow and candidate management.
