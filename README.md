# 🎓 CampusBuzz – College Event Management System

CampusBuzz is a web-based College Event Management System designed to simplify the process of organizing, managing, and participating in college events through a centralized platform.

The system provides separate interfaces for administrators and students, making event management and student participation easier and more organized.

## ✨ Key Features

### 👨‍💼 Main Admin
- Manage college events.
- Manage departments.
- Manage student accounts.
- Handle event registrations.
- Manage event results.
- Send notifications.
- Upload relevant event files.

### 🎓 Student
- Access the student portal.
- Browse available college events.
- Register for events.
- View event-related updates and notifications.
- Access event results.


## 🛠️ Technology Stack

| Area | Technologies |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| UI | Bootstrap 5 |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Authentication | JSON Web Tokens (JWT), bcryptjs |
| File Uploads | Multer |
| API Support | CORS |

## 📁 Project Structure

```text
CampusBuzz/
│
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── Department.js
│   │   ├── Event.js
│   │   ├── Notification.js
│   │   ├── Registration.js
│   │   ├── Result.js
│   │   └── User.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── departments.js
│   │   ├── events.js
│   │   ├── notifications.js
│   │   ├── registrations.js
│   │   ├── results.js
│   │   ├── upload.js
│   │   └── users.js
│   ├── server.js
│   └── package.json
│
├── css/
├── images/
├── js/
├── admin.html
├── student.html
├── index.html
└── README.md
```

## ⚙️ Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/analyzeWithHiba/CampusBuzz.git
```

### 2. Navigate to the project

```bash
cd CampusBuzz
```

### 3. Install backend dependencies

```bash
cd backend
npm install
```

### 4. Configure environment variables

MongoDB connection string:

MONGO_URI=mongodb://localhost:27017/college-events
```


### 5. Start the backend server

```bash
npm start
```

### 6. Run the frontend

Open `index.html` using a local development server such as VS Code Live Server, if the application is not already serving the frontend through Express.

## 🖼️ Screenshots

Screenshots of the application is here.

![CampusBuzz](screenshots/)

## 🎯 Project Objective

The objective of CampusBuzz is to provide a centralized digital platform for college event management, reducing manual coordination and improving communication between administrators and students.

## 👩‍💻 Developer

**Fathima Hiba NM**

- GitHub: [@analyzeWithHiba](https://github.com/analyzeWithHiba)
- Project: [CampusBuzz](https://github.com/analyzeWithHiba/CampusBuzz)

---

⭐ If you find this project interesting, consider giving the repository a star!