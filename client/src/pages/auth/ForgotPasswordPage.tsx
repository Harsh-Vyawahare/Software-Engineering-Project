import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import spitLogo from '../../assets/spit-logo.png';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    try {
      const res = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
      if (res.devResetLink) setDevLink(res.devResetLink);
    } catch (err: any) {
      setError(err.message || 'Failed to submit password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <img src={spitLogo} alt="SPIT" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Reset Password</h1>
            <p className="text-xs text-slate-500">SPIT Attend Recovery Portal</p>
          </div>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Reset Link Dispatched</span>
              </div>
              <p>
                If an account matches <strong>{email}</strong>, a time-limited (30-minute) password reset link has been dispatched.
              </p>
            </div>

            {devLink && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold">Dev/Demo Mode Direct Link:</div>
                <a href={devLink} className="text-blue-600 dark:text-blue-400 underline break-all">
                  {devLink}
                </a>
              </div>
            )}

            <Link
              to="/login"
              className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-spit-maroon-700 dark:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Enter your registered SPIT email address. A time-limited (30-minute) reset link will be sent to your inbox.
            </p>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@spit.edu.in"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-spit-maroon-700"
                />
                <Mail className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-white bg-spit-maroon-700 hover:bg-spit-maroon-800 transition-all text-sm disabled:opacity-50"
            >
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </button>

            <Link
              to="/login"
              className="block text-center text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400"
            >
              Back to Login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
};
