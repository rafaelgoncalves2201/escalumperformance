import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import { router as authRoutes } from './routes/auth.js';
import { router as businessRoutes } from './routes/business.js';
import { router as categoryRoutes } from './routes/category.js';
import { router as productRoutes } from './routes/product.js';
import { router as orderRoutes } from './routes/order.js';
import { router as menuRoutes } from './routes/menu.js';
import { router as paymentRoutes } from './routes/payment.js';
import { router as promotionRoutes } from './routes/promotion.js';
import { setupWebSocket } from './websocket.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const corsOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins.length ? corsOrigins : ["http://localhost:5173"],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware CORS: aceita FRONTEND_URL única ou várias separadas por vírgula (ex.: Render, www)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const allowed = corsOrigins.length ? corsOrigins : ["http://localhost:5173"];
    const ok = allowed.some((o) => origin === o || origin === o.replace(/\/$/, ""));
    cb(null, ok ? true : false);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploads estáticos
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/promotions', promotionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Setup WebSocket
setupWebSocket(io);

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  if (corsOrigins.length) {
    console.log(`   CORS permitido para: ${corsOrigins.join(", ")}`);
  }
});

export { io };
