export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          AgentFM
        </h1>
        <p className="text-sm text-center text-gray-500 mb-6">
          Authenticate to continue to your dashboard.
        </p>

        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Welcome back
        </h2>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 sm:text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md shadow hover:bg-blue-700 transition"
          >
            Login
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don’t have an account?{" "}
          <a href="/signup" className="text-blue-600 hover:underline">
            Create account
          </a>
        </p>
      </div>
    </div>
  );
}
