import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import routes from './routes/index.js';
import { initializeDoctors } from './controllers/index.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../public')));

// API routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// All other routes serve index.html (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

const startServer = async () => {
  await connectDB();
  await initializeDoctors();
  app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
};

startServer();
