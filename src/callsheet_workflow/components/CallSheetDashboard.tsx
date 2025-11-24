import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Calendar, User } from 'lucide-react';
import { callSheetApi } from '../services/mockCallSheetApi';
import { useAuth } from '@/contexts/AuthContext';
import { useSignalR } from '@/contexts/SignalRContext';
import type { CallSheetRequest } from '../types/callsheet';

export const CallSheetDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { listen, isConnected } = useSignalR();
  const [callSheets, setCallSheets] = useState<CallSheetRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user has TechnicalStore role
  const isTechnicalStore = user?.roles?.includes('TechnicalStore') || false;

  const loadCallSheets = useCallback(async () => {
    setLoading(true);
    try {
      // Use different API endpoint based on role
      const data = isTechnicalStore
        ? await callSheetApi.getTechnicalStoreCallSheets()
        : await callSheetApi.getCallSheets();
      setCallSheets(data);
    } catch (error) {
      console.error('Failed to load call sheets:', error);
    } finally {
      setLoading(false);
    }
  }, [isTechnicalStore]);

  useEffect(() => {
    loadCallSheets();
  }, [loadCallSheets]);

  // SignalR listeners for real-time updates
  useEffect(() => {
    if (!isConnected) {
      return;
    }
    debugger
    // Listen for new call sheets created
    const unsubscribeCreated = listen('CallSheetCreated', (newCallSheet: CallSheetRequest) => {
      
      console.log('CallSheetCreated event received:', newCallSheet);

      // For TechnicalStore users, only add if it matches their filter criteria
      if (isTechnicalStore) {
        if (newCallSheet.status === 'With Technical Store' && newCallSheet.driverNeeded) {
          setCallSheets((prev) => {
            const exists = prev.some((cs) => cs.id === newCallSheet.id);
            if (exists) return prev;
            return [newCallSheet, ...prev];
          });
        }
      } else {
        // For regular users, add all new call sheets
        setCallSheets((prev) => {
          const exists = prev.some((cs) => cs.id === newCallSheet.id);
          if (exists) return prev;
          return [newCallSheet, ...prev];
        });
      }
    });

    // Listen for call sheets updated by Technical Store
    const unsubscribeUpdatedByTechnicalStore = listen('CallSheetUpdatedByTechnicalStore', (updatedCallSheet: CallSheetRequest) => {
      console.log('CallSheetUpdatedByTechnicalStore event received:', updatedCallSheet);

      setCallSheets((prev) => {
        // For TechnicalStore users, remove from list if no longer matches criteria
        if (isTechnicalStore) {
          if (updatedCallSheet.status !== 'Submitted' || !updatedCallSheet.driverNeeded) {
            return prev.filter((cs) => cs.id !== updatedCallSheet.id);
          }
        }

        // Update existing call sheet
        const exists = prev.some((cs) => cs.id === updatedCallSheet.id);
        if (exists) {
          return prev.map((cs) => (cs.id === updatedCallSheet.id ? updatedCallSheet : cs));
        }

        // For TechnicalStore, add if it now matches criteria
        if (isTechnicalStore && updatedCallSheet.status === 'Submitted' && updatedCallSheet.driverNeeded) {
          return [updatedCallSheet, ...prev];
        }

        return prev;
      });
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdatedByTechnicalStore();
    };
  }, [isConnected, listen, isTechnicalStore]);


  const statusColors: Record<string, string> = {
    'Draft': 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    'Pending Approval': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    'Approved': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    'In Progress': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    'Completed': 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    'Cancelled': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {/* <h1 className="text-2xl font-bold text-card-foreground">Call Sheets</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage call sheets, equipment requests, and transportation
          </p> */}
        </div>
        {!isTechnicalStore && (
          <button
            onClick={() => navigate('/callsheet/new')}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Plus size={18} />
            New Call Sheet
          </button>
        )}
      </div>

      {callSheets.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-lg border border-border">
          <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-card-foreground mb-2">
            {isTechnicalStore ? 'No call sheets available' : 'No call sheets yet'}
          </h3>
          <p className="text-muted-foreground mb-6">
            {isTechnicalStore
              ? 'No call sheets require technical store action at this time'
              : 'Create your first call sheet to get started'}
          </p>
          {!isTechnicalStore && (
            <button
              onClick={() => navigate('/callsheet/new')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Plus size={18} />
              Create Call Sheet
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {callSheets.map((callSheet) => (
            <div
              key={callSheet.id}
              onClick={() => navigate(`/callsheet/${callSheet.id}`)}
              className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-card-foreground group-hover:text-primary transition-colors mb-1">
                    {callSheet.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{callSheet.department}</p>
                </div>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${statusColors[callSheet.status]}`}>
                  {callSheet.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar size={14} />
                  <span>{new Date(callSheet.filmingDate).toLocaleDateString()}</span>
                </div>
                {callSheet.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText size={14} />
                    <span className="truncate">{callSheet.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User size={14} />
                  <span>{callSheet.createdBy}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {callSheet.crewAssignments.length > 0 && (
                    <span>{callSheet.crewAssignments.length} crew</span>
                  )}
                  {callSheet.equipment.length > 0 && (
                    <span>{callSheet.equipment.length} equipment</span>
                  )}
                  {callSheet.transportRequest && (
                    <span>Transport requested</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
