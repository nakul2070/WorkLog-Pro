import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  BarChart3,
  Calendar
} from 'lucide-react';

const ProjectManagerDashboardPage = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      label: 'My Timesheet',
      icon: Calendar,
      description: 'Fill and manage your personal timesheet',
      route: '/pm/timesheet',
      accentColor: 'text-green-700',
      borderAccent: 'border-l-green-500',
      isActive: true
    },
    {
      label: 'Review Timesheets',
      icon: CheckCircle,
      description: 'Review and approve pending timesheets',
      route: '/pm/review-timesheets',
      accentColor: 'text-blue-700',
      borderAccent: 'border-l-blue-500',
      isActive: true
    }
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Project Manager Dashboard</h1>
        <p className="text-base text-gray-600 font-normal">Manage timesheets and project approvals</p>
      </div>

      {/* Quick Actions Section */}
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-2 pt-3 border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-600" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              const isPlaceholder = !action.isActive;
              
              const cardClassName = `group relative bg-white border border-gray-200 rounded-lg p-6 transition-all duration-200 text-left ${
                isPlaceholder
                  ? ''
                  : 'hover:border-gray-300 hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
              }`;
              
              const cardContent = (
                <>
                  {/* Left border accent */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${action.borderAccent} rounded-l-lg`} />
                  
                  {/* Content */}
                  <div className="flex flex-col space-y-2 text-left">
                    <div className="flex items-start justify-between">
                      <div className="p-2 bg-gray-50 rounded-md group-hover:bg-gray-100 transition-colors">
                        <Icon className={`h-5 w-5 ${action.accentColor}`} strokeWidth={2} />
                      </div>
                      {/* Top-right corner: View button for active cards, Upcoming Soon badge for placeholders */}
                      {isPlaceholder ? (
                        <Badge variant="secondary" className="text-xs font-medium bg-gray-100 text-gray-600 border-0">
                        Coming Soon
                        </Badge>
                      ) : (
                        <div className="text-xs text-black-600 font-medium group-hover:text-black-700 transition-colors">
                          View →
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5 text-left">
                      <h3 className="text-base font-semibold text-gray-900 group-hover:text-gray-950 transition-colors text-left">
                        {action.label}
                      </h3>
                      <p className="text-sm text-gray-500 font-normal leading-snug text-left">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </>
              );
              
              if (isPlaceholder) {
                return (
                  <div key={index} className={cardClassName}>
                    {cardContent}
                  </div>
                );
              }
              
              return (
                <button
                  key={index}
                  onClick={() => action.route && navigate(action.route)}
                  className={cardClassName}
                >
                  {cardContent}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectManagerDashboardPage;

