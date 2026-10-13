import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { GraduationCap, Briefcase, Shield, Eye, EyeOff, Lock, User, AlertCircle, Sparkles } from 'lucide-react';
import spitLogo from '../../assets/spit-logo.png';

export const LoginPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<'STUDENT' | 'FACULTY' | 'ADMIN'>('STUDENT');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRoleSelect = (role: 'STUDENT' | 'FACULTY' | 'ADMIN') => {
    setSelectedRole(role);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId || !password) {
      setError('Please enter both your identifier and password.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const user = await login({ loginId, password, selectedRole });
      if (user.role === 'STUDENT') navigate('/student');
      else if (user.role === 'FACULTY') navigate('/faculty');
      else if (user.role === 'ADMIN') navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickFill = (id: string, pass: string, role: 'STUDENT' | 'FACULTY' | 'ADMIN') => {
    setSelectedRole(role);
    setLoginId(id);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-50 dark:bg-slate-950 transition-colors relative">
      <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16">
        {/* Left Hero (Desktop) */}
        <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
          <div className="flex items-center gap-4">
            <img src={spitLogo} alt="SPIT Logo" className="w-20 h-20 object-contain drop-shadow-md" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-spit-maroon-700 via-rose-700 to-amber-600 bg-clip-text text-transparent dark:from-rose-400 dark:to-amber-400">
                SPIT Attend
              </h1>
              <p className="text-sm font-semibold text-spit-gold-600 dark:text-amber-400">
                Smart Attendance Management System
              </p>
            </div>
          </div>

          <p className="text-base text-slate-600 dark:text-slate-300 max-w-md leading-relaxed">
            Autonomous classroom attendance verification powered by rotating QR codes, GPS geofencing, and live facial biometrics.
          </p>

          {/* Quick Fill Demo Accounts */}
          <div className="w-full max-w-md p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>1-Click Demo Accounts (Password: Spit@2026)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => quickFill('2024300271', 'Spit@2026', 'STUDENT')}
                className="text-left px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
              >
                <div className="font-bold">Harsh Vyawahare</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Student · D3 (DSA)</div>
              </button>
              <button
                type="button"
                onClick={() => quickFill('2024300255', 'Spit@2026', 'STUDENT')}
                className="text-left px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 hover:bg-rose-100 transition-colors"
              >
                <div className="font-bold">Videsh Tambe</div>
                <div className="text-[10px] text-rose-600 dark:text-rose-400">Student · D2 (71% Red)</div>
              </button>
              <button
                type="button"
                onClick={() => quickFill('SK', 'Spit@2026', 'FACULTY')}
                className="text-left px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 hover:bg-blue-100 transition-colors"
              >
                <div className="font-bold">Prof. Swapnali (SK)</div>
                <div className="text-[10px] text-blue-600 dark:text-blue-400">Faculty · SE Theory</div>
              </button>
              <button
                type="button"
                onClick={() => quickFill('ADMIN001', 'Spit@2026', 'ADMIN')}
                className="text-left px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 hover:bg-purple-100 transition-colors"
              >
                <div className="font-bold">System Admin</div>
                <div className="text-[10px] text-purple-600 dark:text-purple-400">Admin Console</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="w-full lg:w-[440px] bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
          {/* Role selector tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
            <button
              type="button"
              onClick={() => handleRoleSelect('STUDENT')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
                selectedRole === 'STUDENT'
                  ? 'bg-white dark:bg-slate-900 text-spit-maroon-700 dark:text-rose-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Student</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('FACULTY')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
                selectedRole === 'FACULTY'
                  ? 'bg-white dark:bg-slate-900 text-spit-maroon-700 dark:text-rose-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Teacher</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('ADMIN')}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
                selectedRole === 'ADMIN'
                  ? 'bg-white dark:bg-slate-900 text-spit-maroon-700 dark:text-rose-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span>Admin</span>
            </button>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {selectedRole === 'STUDENT' ? 'Student Sign In' : selectedRole === 'FACULTY' ? 'Teacher Sign In' : 'Administrator Sign In'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {selectedRole === 'STUDENT'
                ? 'Enter your 10-digit SPIT UID or college email address'
                : selectedRole === 'FACULTY'
                ? 'Enter your faculty employee ID (e.g. ARN, SK) or email'
                : 'Enter your administrative credentials'}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                {selectedRole === 'STUDENT' ? 'UID / Roll Number / Email' : selectedRole === 'FACULTY' ? 'Employee ID / Email' : 'Admin ID / Email'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder={
                    selectedRole === 'STUDENT'
                      ? 'e.g. 2024300271'
                      : selectedRole === 'FACULTY'
                      ? 'e.g. SK or sk@spit.edu.in'
                      : 'e.g. ADMIN001'
                  }
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-spit-maroon-700"
                />
                <User className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-spit-maroon-700 dark:text-rose-400 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-spit-maroon-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl font-bold text-white bg-spit-maroon-700 hover:bg-spit-maroon-800 dark:bg-rose-700 dark:hover:bg-rose-800 transition-all shadow-md shadow-spit-maroon-900/20 disabled:opacity-50 text-sm"
            >
              {isSubmitting ? 'Verifying credentials...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
