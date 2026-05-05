import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <div className="inline-block">
            <h1 className="text-9xl font-bold text-gray-300 mb-4">404</h1>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-12">
          <div className="mb-8">
            <svg 
              className="w-24 h-24 text-gray-400 mx-auto mb-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Page Not Found
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              The page you're looking for doesn't exist or the campaign ID is invalid.
            </p>
          </div>

          <div className="space-y-4">
            <Link 
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 w-full sm:w-auto"
            >
              Go to Homepage
            </Link>
            
            <div className="text-sm text-gray-500">
              <p>or</p>
            </div>

            <Link 
              href="/login"
              className="inline-block bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-8 rounded-lg border-2 border-gray-300 transition-colors duration-200 w-full sm:w-auto"
            >
              Admin Login
            </Link>
          </div>
        </div>

        <p className="text-gray-500 text-sm mt-8">
          If you believe this is an error, please contact your administrator
        </p>
      </div>
    </div>
  );
}

