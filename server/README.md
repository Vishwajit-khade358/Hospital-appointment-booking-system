# Hospital Management Backend Server

Node.js + Express + MongoDB backend for the Hospital Bed Management System.

## 🚀 Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Create `.env` file:**
```bash
copy .env.example .env
```

3. **Add your MongoDB connection string to `.env`:**
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hospital-db
PORT=5000
NODE_ENV=development
```

4. **Start the server:**
```bash
npm run dev
```

## 📡 API Endpoints

### Health Check
- `GET /health` - Server health status

### Patients
- `GET /api/patients` - Get all patients
- `POST /api/patients` - Create new patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient
- `POST /api/patients/login` - Patient login

### Doctors
- `GET /api/doctors` - Get all doctors

### Appointments
- `GET /api/appointments` - Get all appointments
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment

### Bed Allocations
- `GET /api/beds` - Get all bed allocations
- `POST /api/beds` - Create bed allocation
- `PUT /api/beds/:id` - Update bed allocation
- `POST /api/beds/:id/visits` - Add doctor visit

## 🏗️ Project Structure

```
server/
├── src/
│   ├── config/
│   │   └── db.js              # MongoDB connection
│   ├── controllers/
│   │   └── index.js           # Business logic
│   ├── models/
│   │   └── index.js           # Mongoose schemas
│   ├── routes/
│   │   └── index.js           # API routes
│   └── server.js              # Entry point
├── .env                       # Environment variables (create this)
├── .env.example               # Environment template
├── .gitignore                 # Git ignore rules
└── package.json               # Dependencies
```

## 🔧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` or `production` |

## 📦 Dependencies

- **express** - Web framework
- **mongoose** - MongoDB ODM
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variables
- **bcryptjs** - Password hashing
- **nodemon** - Auto-restart (dev)

## 🧪 Testing

Test the server is running:
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{"status":"OK","message":"Hospital Backend Running"}
```

## 🔐 Security Features

- Password hashing with bcrypt (10 rounds)
- CORS enabled for frontend communication
- Environment-based configuration
- MongoDB connection with authentication
- Input validation with Mongoose schemas

## 📝 Notes

- Default doctors are auto-initialized on first run
- Passwords are hashed before storage
- All API responses are in JSON format
- Proper HTTP status codes are used
- Error messages are descriptive

## 🐛 Troubleshooting

**MongoDB connection fails:**
- Check connection string format
- Verify password doesn't have special characters
- Whitelist your IP in MongoDB Atlas

**Port already in use:**
- Change PORT in `.env` file
- Or kill the process using the port

**Module not found:**
- Run `npm install`
- Check Node.js version (v18+ required)

## 📚 Documentation

For more details, see the main project documentation:
- `../BACKEND_SETUP.md` - Setup guide
- `../BACKEND_CHECKLIST.md` - Implementation checklist
- `../QUICK_REFERENCE.md` - Quick reference
- `../ARCHITECTURE_BACKEND.md` - Architecture details

## 🎯 Development

```bash
# Start development server (auto-restart)
npm run dev

# Start production server
npm start
```

Server will run on: http://localhost:5000
