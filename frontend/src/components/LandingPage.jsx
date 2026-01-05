import React, { useState } from 'react';
// Removed useNavigate as we use window.location
import { Button } from './ui/button';
// Removed Badge import
import { Card, CardContent } from './ui/card';
import {
  Building2,
  Users,
  Calendar,
  BarChart3,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Loader2 } from 'lucide-react'; // <-- Added Loader

// Get Backend URL
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const LandingPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  // Removed navigate

  // --- MODIFIED LOGIN HANDLER ---
  const handleMicrosoftLogin = () => {
    setIsLoading(true);
    // Redirect the browser directly to the backend login endpoint
    // The backend will handle the redirect to Microsoft Azure AD
    window.location.href = `${BACKEND_URL}/api/auth/login`;
    // We don't set isLoading back to false because the page will navigate away
  };
  // --- END MODIFICATION ---

  // Removed getRoleDescription function

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center ">
            <div className="flex items-center">
              <img 
                src="/KL image.png" 
                alt="Kadel Labs" 
                className="h-12 md:h-20 flex-shrink-0 object-contain"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Hero Content */}
          <div className="space-y-8">
             {/* ... (Hero content - no changes needed) ... */}
              <div className="space-y-4">
              <h2 className="text-4xl font-bold text-gray-900 leading-tight">
                Streamline Your
                <span className="text-blue-600"> Timesheet Management</span>
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed">
                Efficiently track time, manage projects, and gain insights with our comprehensive
                timesheet management platform designed for modern teams.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Calendar className="h-8 w-8 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Smart Timesheets</h3>
                  <p className="text-sm text-gray-600">Easy daily time entry with project tracking</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-8 w-8 text-green-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Team Management</h3>
                  <p className="text-sm text-gray-600">Manage teams and approve timesheets</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BarChart3 className="h-8 w-8 text-purple-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Analytics</h3>
                  <p className="text-sm text-gray-600">Detailed reporting and insights</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="h-8 w-8 text-orange-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Administration</h3>
                  <p className="text-sm text-gray-600">Complete system administration</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-gray-700">Secure Microsoft Office 365 integration</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-gray-700">Role-based access control</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-gray-700">Real-time collaboration and approvals</span>
              </div>
            </div>
          </div>

          {/* Right Column - Login Card */}
          <div className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md shadow-2xl">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h3>
                    <p className="text-gray-600">Sign in to access your timesheet workspace</p>
                  </div>

                  <div className="space-y-4">
                    <Button
                      onClick={handleMicrosoftLogin} // <-- Still uses the updated handler
                      disabled={isLoading}
                      className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-3"
                    >
                      {isLoading ? (
                        <>
                          {/* --- UPDATED: Use Loader2 --- */}
                          <Loader2 className="animate-spin h-5 w-5 mr-2" />
                          Redirecting to Microsoft...
                        </>
                      ) : (
                        <>
                          <svg className="h-5 w-5" viewBox="0 0 23 23">
                            <path fill="#f25022" d="M1 1h10v10H1z"/>
                            <path fill="#00a4ef" d="M12 1h10v10H12z"/>
                            <path fill="#7fba00" d="M1 12h10v10H1z"/>
                            <path fill="#ffb900" d="M12 12h10v10H12z"/>
                          </svg>
                          Sign in with Microsoft
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>

                    <div className="text-xs text-gray-500 leading-relaxed">
                      By signing in, you agree to our terms of service and privacy policy.
                      Your data is protected with enterprise-grade security.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom Features */}
         {/* ... (Bottom features section - no changes needed) ... */}
         <div className="mt-20 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-12">Everything you need to manage time effectively</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900">Timesheet Entry</h4>
              <p className="text-gray-600">
                Quick and intuitive time entry with project allocation, holiday management, and validation rules.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900">Project Management</h4>
              <p className="text-gray-600">
                Comprehensive project tracking with team assignments, approvals, and progress monitoring.
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900">Analytics & Reports</h4>
              <p className="text-gray-600">
                Detailed insights and reports for productivity analysis, resource planning, and decision making.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;