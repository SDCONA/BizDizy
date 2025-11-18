import { AlertCircle, Database, ExternalLink } from "lucide-react";
import { Button } from "./ui/button";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

export function DatabaseSetupRequired() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-purple-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center transform rotate-3">
              <Database className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-gray-900">Database Setup Required</h1>
              <p className="text-gray-600">One-time setup needed to get started</p>
            </div>
          </div>

          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-900">Action Required</AlertTitle>
            <AlertDescription className="text-yellow-800">
              The Supabase database tables haven't been created yet, or the schema is incomplete. This is a quick 2-minute setup that only needs to be done once.
              <br /><br />
              <strong>IMPORTANT:</strong> You must run the <strong>COMPLETE</strong> SQL script from start to finish.
            </AlertDescription>
          </Alert>

          <div className="space-y-4 mb-6">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-100">
              <h3 className="text-gray-900 mb-3">Quick Setup Steps</h3>
              <ol className="space-y-3 text-gray-700">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm">1</span>
                  <span>Open your Supabase Dashboard</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm">2</span>
                  <span>Navigate to <strong>SQL Editor</strong> → <strong>New query</strong></span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm">3</span>
                  <span>Open the <strong>SUPABASE_SCHEMA.md</strong> file from your project</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm">4</span>
                  <span>Copy the <strong>ENTIRE</strong> SQL script (from line 1 to the end) and paste it into the editor</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm">5</span>
                  <span>Click <strong>Run</strong> to create all tables, indexes, and triggers</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm">6</span>
                  <span>Refresh this page</span>
                </li>
              </ol>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <h4 className="text-blue-900 mb-2">What Gets Created?</h4>
              <ul className="text-blue-800 space-y-1 text-sm">
                <li>✅ 4 database tables (users, businesses, categories, reviews)</li>
                <li>✅ 76 business categories pre-loaded</li>
                <li>✅ Automatic rating calculations</li>
                <li>✅ Row Level Security policies</li>
                <li>✅ Full-text search indexes</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Supabase Dashboard
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="flex-1"
            >
              Refresh Page
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Need help?</strong> See these files in your project:
            </p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✅ <code className="bg-gray-100 px-2 py-1 rounded">DATABASE_SETUP_CHECKLIST.md</code> - Step-by-step checklist</li>
              <li>📖 <code className="bg-gray-100 px-2 py-1 rounded">DATABASE_SETUP.md</code> - Detailed setup guide</li>
              <li>📄 <code className="bg-gray-100 px-2 py-1 rounded">SUPABASE_SCHEMA.md</code> - SQL script to run</li>
              <li>🔧 <code className="bg-gray-100 px-2 py-1 rounded">TROUBLESHOOTING.md</code> - Fix common errors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
