import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { EmailService } from '../services/email.service.js';

const prisma = new PrismaClient();
const emailService = new EmailService();

export class AuthController {
  /**
   * User login with 5-attempt lockout and role redirect hints (FR-AUTH-02, FR-AUTH-03)
   */
  async login(req: Request, res: Response): Promise<any> {
    const { loginId, password, selectedRole } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ message: 'Login ID/Email and password are required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { loginId: loginId.trim() },
          { email: loginId.trim().toLowerCase() },
        ],
      },
      include: {
        student: {
          include: {
            division: true,
            batch: true,
            mdmBatch: true,
          },
        },
        faculty: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials. Please verify your ID and password.' });
    }

    // Check account lockout (FR-AUTH-03)
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      return res.status(423).json({
        message: `Account is temporarily locked due to 5 consecutive failed login attempts. Please try again in ${remainingMinutes} minute(s).`,
        lockedUntil: user.lockedUntil,
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      const attempts = user.failedLoginAttempts + 1;
      let updateData: any = { failedLoginAttempts: attempts };

      if (attempts >= 5) {
        // Lock for 15 minutes
        updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        updateData.failedLoginAttempts = 0;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      // Log auth failure
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          actorName: user.name,
          action: 'AUTH_FAILED_LOGIN',
          targetType: 'USER',
          targetId: user.id,
          details: `Failed login attempt #${attempts}`,
          ipAddress: req.ip,
        },
      });

      if (attempts >= 5) {
        return res.status(423).json({
          message: 'Account locked for 15 minutes after 5 consecutive failed login attempts.',
          lockedUntil: updateData.lockedUntil,
        });
      }

      return res.status(401).json({
        message: 'Invalid credentials. Please verify your ID and password.',
        attemptsRemaining: 5 - attempts,
      });
    }

    // Role check and friendly redirect hint (Section 5.1)
    if (selectedRole && user.role !== selectedRole) {
      const roleLabelMap: Record<string, string> = {
        STUDENT: 'Student Login',
        FACULTY: 'Teacher Login',
        ADMIN: 'Admin Login',
      };
      return res.status(400).json({
        message: `Role mismatch: This account belongs to a ${user.role.toLowerCase()}. Please use the "${roleLabelMap[user.role] || user.role}" tab to sign in.`,
        suggestedRole: user.role,
      });
    }

    // Reset failed attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const jwtSecret = process.env.JWT_SECRET || 'spit-attend-super-secret-key-2026-production';
    const token = jwt.sign(
      {
        id: user.id,
        loginId: user.loginId,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: '1d' }
    );

    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorName: user.name,
        action: 'AUTH_SUCCESS_LOGIN',
        targetType: 'USER',
        targetId: user.id,
        ipAddress: req.ip,
      },
    });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        loginId: user.loginId,
        name: user.name,
        email: user.email,
        role: user.role,
        forcePasswordChange: user.forcePasswordChange,
        student: user.student
          ? {
              rollNumber: user.student.rollNumber,
              division: user.student.division.name,
              batch: user.student.batch.name,
              mdmElective: user.student.mdmElective,
              mdmBatch: user.student.mdmBatch?.name,
              hasReferencePhoto: !!user.student.referencePhotoUrl,
            }
          : undefined,
        faculty: user.faculty
          ? {
              employeeId: user.faculty.employeeId,
              department: user.faculty.department,
            }
          : undefined,
      },
    });
  }

  /**
   * Get authenticated user profile
   */
  async getMe(req: Request, res: Response): Promise<any> {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        student: {
          include: {
            division: true,
            batch: true,
            mdmBatch: true,
          },
        },
        faculty: true,
      },
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({
      user: {
        id: user.id,
        loginId: user.loginId,
        name: user.name,
        email: user.email,
        role: user.role,
        forcePasswordChange: user.forcePasswordChange,
        student: user.student
          ? {
              id: user.student.id,
              rollNumber: user.student.rollNumber,
              division: user.student.division.name,
              batch: user.student.batch.name,
              mdmElective: user.student.mdmElective,
              mdmBatch: user.student.mdmBatch?.name,
              hasReferencePhoto: !!user.student.referencePhotoUrl,
              referencePhotoUrl: user.student.referencePhotoUrl,
            }
          : undefined,
        faculty: user.faculty
          ? {
              id: user.faculty.id,
              employeeId: user.faculty.employeeId,
              department: user.faculty.department,
            }
          : undefined,
      },
    });
  }

  /**
   * Logout user and clear cookies
   */
  async logout(req: Request, res: Response): Promise<any> {
    res.clearCookie('auth_token');
    return res.json({ message: 'Logged out successfully' });
  }

  /**
   * Change password with validation rules (min 8 chars, 1 number, 1 special char)
   */
  async changePassword(req: Request, res: Response): Promise<any> {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const { oldPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    if (!hasNumber || !hasSpecial) {
      return res.status(400).json({ message: 'Password must contain at least one number and one special character.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Verify old password if not first login
    if (oldPassword && !(await bcrypt.compare(oldPassword, user.passwordHash))) {
      return res.status(400).json({ message: 'Incorrect old password.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        forcePasswordChange: false,
      },
    });

    return res.json({ message: 'Password changed successfully.' });
  }

  /**
   * Request password reset link (FR-AUTH-04)
   */
  async forgotPassword(req: Request, res: Response): Promise<any> {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) {
      // Don't leak existence, return success generic message
      return res.json({ message: 'If an account exists with this email, a 30-minute password reset link has been dispatched.' });
    }

    const resetToken = jwt.sign(
      { id: user.id, type: 'pwd_reset' },
      process.env.JWT_SECRET || 'spit-attend-super-secret-key-2026-production',
      { expiresIn: '30m' }
    );

    const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;
    await emailService.sendEmail({
      to: user.email,
      subject: 'SPIT Attend — Password Reset Request',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>You requested to reset your password. Click the link below to set a new password (valid for 30 minutes):</p>
          <p><a href="${resetUrl}" style="background-color: #7B1113; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px;">Reset Password</a></p>
          <p>Or paste this URL in your browser: ${resetUrl}</p>
        </div>
      `,
    });

    return res.json({
      message: 'If an account exists with this email, a 30-minute password reset link has been dispatched.',
      devResetLink: resetUrl,
    });
  }

  /**
   * Reset password with token (FR-AUTH-04)
   */
  async resetPassword(req: Request, res: Response): Promise<any> {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ message: 'Token and new password are required' });

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'spit-attend-super-secret-key-2026-production') as any;
      if (payload.type !== 'pwd_reset') {
        return res.status(400).json({ message: 'Invalid reset token' });
      }

      if (newPassword.length < 8 || !/\d/.test(newPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
        return res.status(400).json({ message: 'Password must be at least 8 characters with 1 number and 1 special character.' });
      }

      const hash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: payload.id },
        data: { passwordHash: hash, forcePasswordChange: false },
      });

      return res.json({ message: 'Password has been reset successfully. You can now log in.' });
    } catch {
      return res.status(400).json({ message: 'Reset token is invalid or has expired (30-minute limit).' });
    }
  }
}
