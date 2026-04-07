const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
// Load environment variables
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();

// Middleware
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Appwrite initialization check (optional but good practice)
console.log('✅ Integrated with Appwrite');

const PORT = process.env.PORT || 5000;

// Basic Route
app.get('/', (req, res) => {
  res.send('🚀 Price Prediction API is running...');
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const predictionRoutes = require('./routes/predictionRoutes');

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/prediction', predictionRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`📡 Server listening on 0.0.0.0:${PORT}`);
});
