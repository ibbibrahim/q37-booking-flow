import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Clock, AlertTriangle, CheckCircle2, Users, Radio, UserCircle } from 'lucide-react';
import type { WorkflowRequest, WorkflowStatus } from '../types/workflow';

interface AdminDashboardProps {
  requests: WorkflowRequest[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ requests }) => {
  const stats = useMemo(() => {
    const statusCounts: Record<WorkflowStatus, number> = {
      'Draft': 0,
      'Submitted': 0,
      'With NOC': 0,
      'Clarification Requested': 0,
      'Resources Added': 0,
      'With Ingest': 0,
      'Completed': 0,
      'Not Done': 0
    };

    const priorityCounts = { Normal: 0, High: 0, Urgent: 0 };
    const typeCounts = { 'Incoming Feed': 0, 'Guest for iNEWS Rundown': 0 };
    let nocRequiredCount = 0;

    requests.forEach(req => {
      statusCounts[req.status]++;
      priorityCounts[req.priority]++;
      typeCounts[req.bookingType]++;
      if (req.nocRequired === 'Yes') nocRequiredCount++;
    });

    const completionRate = requests.length > 0
      ? ((statusCounts.Completed / requests.length) * 100).toFixed(1)
      : '0';

    const activeRequests = requests.length - statusCounts.Completed - statusCounts['Not Done'];

    return {
      total: requests.length,
      statusCounts,
      priorityCounts,
      typeCounts,
      nocRequiredCount,
      completionRate,
      activeRequests
    };
  }, [requests]);

  const recentRequests = useMemo(() => {
    return [...requests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [requests]);

  const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
    <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        <p className="text-sm font-medium text-slate-600">{title}</p>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-slate-300">Live Business Channel · HR Workflow Analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Requests"
          value={stats.total}
          subtitle="All time"
          icon={BarChart3}
          color="bg-blue-600"
        />
        <StatCard
          title="Active Requests"
          value={stats.activeRequests}
          subtitle="In progress"
          icon={TrendingUp}
          color="bg-yellow-600"
        />
        <StatCard
          title="Completed"
          value={stats.statusCounts.Completed}
          subtitle={`${stats.completionRate}% completion rate`}
          icon={CheckCircle2}
          color="bg-green-600"
        />
        <StatCard
          title="Urgent Priority"
          value={stats.priorityCounts.Urgent}
          subtitle="Needs attention"
          icon={AlertTriangle}
          color="bg-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Clock size={20} />
            Workflow Status Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.statusCounts).map(([status, count]) => {
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{status}</span>
                    <span className="text-sm text-slate-600">{count}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Users size={20} />
            Request Analytics
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded">
                  <Radio size={18} className="text-blue-600" />
                </div>
                <span className="text-sm font-medium text-slate-700">Incoming Feed</span>
              </div>
              <span className="text-lg font-bold text-slate-900">{stats.typeCounts['Incoming Feed']}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded">
                  <UserCircle size={18} className="text-green-600" />
                </div>
                <span className="text-sm font-medium text-slate-700">Guest Rundown</span>
              </div>
              <span className="text-lg font-bold text-slate-900">{stats.typeCounts['Guest for iNEWS Rundown']}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded">
                  <AlertTriangle size={18} className="text-orange-600" />
                </div>
                <span className="text-sm font-medium text-slate-700">NOC Required</span>
              </div>
              <span className="text-lg font-bold text-slate-900">{stats.nocRequiredCount}</span>
            </div>

            <div className="pt-3 border-t border-slate-200">
              <h4 className="text-xs font-semibold text-slate-500 mb-2 uppercase">Priority Breakdown</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-slate-100 rounded">
                  <p className="text-lg font-bold text-slate-700">{stats.priorityCounts.Normal}</p>
                  <p className="text-xs text-slate-500">Normal</p>
                </div>
                <div className="text-center p-2 bg-orange-100 rounded">
                  <p className="text-lg font-bold text-orange-700">{stats.priorityCounts.High}</p>
                  <p className="text-xs text-orange-600">High</p>
                </div>
                <div className="text-center p-2 bg-red-100 rounded">
                  <p className="text-lg font-bold text-red-700">{stats.priorityCounts.Urgent}</p>
                  <p className="text-xs text-red-600">Urgent</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Requests</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">ID</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Title</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Priority</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Created</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.map(req => (
                <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm text-slate-600 font-mono">{req.id}</td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-800">{req.title}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    <span className="bg-slate-100 px-2 py-1 rounded text-xs">
                      {req.bookingType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                      {req.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      req.priority === 'Urgent' ? 'bg-red-100 text-red-700' :
                      req.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {req.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
