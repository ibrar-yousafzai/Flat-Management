require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./db');
const { seedDatabase } = require('./seed');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

// Initialize DB and Seed default data
initDatabase();
seedDatabase();

// Sync live state from Supabase Cloud Database
const { syncFromSupabase } = require('./supabase');
syncFromSupabase().catch(err => console.error('Supabase initial sync error:', err.message));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admins', require('./routes/admins'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/members', require('./routes/members').router);
app.use('/api/bills', require('./routes/bills'));
app.use('/api/food', require('./routes/food'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/import', require('./routes/import'));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    isVercel: Boolean(process.env.VERCEL),
    time: new Date().toISOString()
  });
});

// Cloud Sync endpoint
app.post('/api/sync-supabase', async (req, res) => {
  const result = await syncFromSupabase();
  res.json(result);
});

// Serve uploaded bill photos / receipts
const uploadsStaticDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '../uploads');
try {
  if (!require('fs').existsSync(uploadsStaticDir)) {
    require('fs').mkdirSync(uploadsStaticDir, { recursive: true });
  }
} catch (e) {}
app.use('/uploads', express.static(uploadsStaticDir));

// Serve Frontend Static Files
app.use(express.static(path.join(__dirname, '../public')));

// Fallback to index.html for Single Page Application
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, '../public/index.html'));
  }
  next();
});

// Start Server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🏢 Flat Management System is LIVE!`);
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`🔑 Super Admin login: superadmin / admin123`);
    console.log(`👤 Member sample login: MEM-001 / flat123`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
