import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4 tracking-tight">
            Metrics Dashboard
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            Real-time campaign analytics and insights
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-12 mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Get Started
            </h2>
            <p className="text-gray-600 mb-6">
              Access your campaign dashboard by entering your campaign ID in the URL
            </p>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 font-mono text-sm text-gray-700">
              https://your-domain.com/<span className="text-blue-600 font-semibold">[campaign-id]</span>
            </div>
            <Link 
              href="/login"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200"
            >
              Admin Login
            </Link>
          </div>
        </div>

        <p className="text-gray-500 text-sm">
          Need help? Contact your administrator for campaign access
        </p>
      </div>
    </div>
  );
}
