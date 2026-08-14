/*!  GymHolic Register Page — Public registration page for new experts.
  This page is publicly accessible without authentication.
*/

import Layout from "@/app/layout";

export default function RegisterPage() {
  return (
    <Layout>
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md w-full max-w-md p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Sign Up
          </h2>
          
          <form className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Name
              </label>
              <input
                type="text"
                required
                className="shadow appearance-none rounded border border-gray-500 w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ahmed Mohamed"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Email
              </label>
              <input
                type="email"
                required
                className="shadow appearance-none rounded border border-gray-500 w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="expert@gymholic.com"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Password
              </label>
              <input
                type="password"
                required
                className="shadow appearance-none rounded border border-gray-500 w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Register
              </button>
            </div>
          </form>
        </div>
      </main>
    </Layout>
  );
}