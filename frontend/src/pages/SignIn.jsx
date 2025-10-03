import { useState } from 'react';
import { api } from '../api';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await api('/auth/login', { method: 'POST', body: { email, password } });
      window.location.href = '/'; // success → reload
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-2">AgentFM</h1>
        <p className="text-gray-600 text-center mb-6">
          Authenticate to continue to your dashboard.
        </p>

        <h2 className="text-xl font-semibold mb-4">Welcome back</h2>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm 
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {err && <div className="text-red-600 text-sm">{err}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg 
                       hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-6 text-center">
          Don’t have an account?{' '}
          <a href="/signup" className="text-blue-600 hover:underline">
            Create account
          </a>
        </p>
      </div>
    </div>
  );
}
