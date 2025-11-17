import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, User, CheckCircle, Zap } from 'lucide-react';

interface AnalyticsData {
  totalAssignments: number;
  totalUniqueCrew: number;
  totalHoursWorked: number;
  completedCallsheets: number;
  averageDuration?: number;
  departmentBreakdown?: Record<string, number>;
}

interface CallsheetAnalyticsCardsProps {
  data: AnalyticsData;
  isLoading?: boolean;
}

export const CallsheetAnalyticsCards: React.FC<CallsheetAnalyticsCardsProps> = ({
  data,
  isLoading = false,
}) => {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const cards = [
    {
      title: 'Total Assignments',
      value: data.totalAssignments,
      icon: Zap,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Crew assignments across all call sheets',
    },
    {
      title: 'Unique Crew Members',
      value: data.totalUniqueCrew,
      icon: User,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Different individuals assigned',
    },
    {
      title: 'Total Hours Worked',
      value: formatDuration(data.totalHoursWorked || 0),
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Cumulative hours across assignments',
    },
    {
      title: 'Completed Call Sheets',
      value: data.completedCallsheets,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Successfully completed productions',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-20"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-2"></div>
              <div className="h-3 bg-muted rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
