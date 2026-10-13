import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.routes.js';
import studentRoutes from './routes/student.routes.js';
import facultyRoutes from './routes/faculty.routes.js';
import adminRoutes from './routes/admin.routes.js';
import reportRoutes from './routes/report.routes.js';
import devRoutes, { initDevRoutes } from './routes/dev.routes.js';

import { VerificationService } from './services/verification.service.js';
import { SessionService } from './services/session.service.js';
import { initFacultyController } from './controllers/faculty.controller.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  },
});

// Services initialization
const verificationService = new VerificationService(prisma);
const sessionService = new SessionService(prisma, verificationService, io);
initFacultyController(sessionService);
initDevRoutes(io);

// Security & Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET || 'spit-attend-cookie-secret-2026'));

// General Rate Limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { message: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', generalLimiter);

// Auth Rate Limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { message: 'Too many authentication attempts. Please try again after 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dev', devRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    name: 'SPIT Attend API Server',
    version: '2.0.0',
    time: new Date().toISOString(),
  });
});

// Socket.IO event handling
io.on('connection', (socket) => {
  socket.on('join_session', (sessionId: string) => {
    socket.join(`session_${sessionId}`);
  });

  socket.on('leave_session', (sessionId: string) => {
    socket.leave(`session_${sessionId}`);
  });

  socket.on('disconnect', () => {
    // disconnected
  });
});

// Periodic background check: Auto-close expired sessions (FR-SESS-04)
setInterval(async () => {
  try {
    const openSessions = await prisma.attendanceSession.findMany({
      where: { status: 'OPEN' },
      include: {
        courseSection: {
          include: { enrollments: true },
        },
        records: true,
      },
    });

    const now = new Date();
    for (const sess of openSessions) {
      const scheduledEnd = new Date(`${sess.date}T${sess.courseSection.endTime}:00Z`);
      const autoCloseThreshold = scheduledEnd.getTime() + 15 * 60 * 1000;

      if (now.getTime() > autoCloseThreshold) {
        console.log(`Auto-closing session ${sess.id} per FR-SESS-04`);
        const recordedStudentIds = new Set(sess.records.map((r) => r.studentId));

        await prisma.$transaction(async (tx) => {
          for (const enroll of sess.courseSection.enrollments) {
            if (!recordedStudentIds.has(enroll.studentId)) {
              await tx.attendanceRecord.create({
                data: {
                  sessionId: sess.id,
                  studentId: enroll.studentId,
                  status: 'ABSENT',
                  method: 'MANUAL',
                  manualReason: 'Auto-closed session timeout (FR-SESS-04)',
                },
              });
            }
          }

          await tx.attendanceSession.update({
            where: { id: sess.id },
            data: { status: 'CLOSED', endTime: now },
          });
        });

        io.to(`session_${sess.id}`).emit('session_closed', { sessionId: sess.id });
      }
    }
  } catch (err) {
    console.error('Error during auto-close session interval:', err);
  }
}, 60 * 1000);

// Serve frontend production build if available
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  res.sendFile(path.join(clientDist, 'index.html'));
});

function getLocalNetworkIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const PORT = Number(process.env.PORT) || 5000;
server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalNetworkIp();
  console.log(`\nSPIT Attend Server running:`);
  console.log(`  ➜ Local:   http://localhost:${PORT}`);
  console.log(`  ➜ Network: http://${localIp}:${PORT}\n`);
});
