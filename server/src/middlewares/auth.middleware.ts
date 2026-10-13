import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedUser {
  id: string;
  loginId: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN';
  studentId?: string;
  facultyId?: string;
  batchId?: string;
  batchName?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<any> {
  const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. Please sign in.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'spit-attend-super-secret-key-2026-production';
    const payload = jwt.verify(token, secret) as any;

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      include: {
        student: { include: { batch: true } },
        faculty: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found. Please log in again.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ message: `Account is ${user.status.toLowerCase()}. Contact administrator.` });
    }

    req.user = {
      id: user.id,
      loginId: user.loginId,
      name: user.name,
      email: user.email,
      role: user.role as any,
      studentId: user.student?.id,
      facultyId: user.faculty?.id,
      batchId: user.student?.batchId,
      batchName: user.student?.batch?.name,
    };

    next();
  } catch (err: any) {
    return res.status(401).json({ message: 'Session expired or invalid token. Please log in again.' });
  }
}

export function requireRole(...allowedRoles: Array<'STUDENT' | 'FACULTY' | 'ADMIN'>) {
  return (req: Request, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Access restricted to ${allowedRoles.join(', ')}. Your role is ${req.user.role}.`,
      });
    }
    next();
  };
}
