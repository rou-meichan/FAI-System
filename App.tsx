import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import SupplierDashboard from './components/SupplierDashboard';
import IQADashboard from './components/IQADashboard';
import SubmissionDetail from './components/SubmissionDetail';
import Login from './components/Login';
import Profile from './components/Profile';
import AccountManagement from './components/AccountManagement';
import SupplierDetail from './components/SupplierDetail';
import EmployeeDetail from './components/EmployeeDetail';
import Registration from './components/Registration';
import ResetPassword from './components/ResetPassword';
import { FAISubmission, SubmissionStatus, User, SupplierAccount, EmployeeAccount, FAIFile } from './types';
import { analyzeFAISubmission } from './services/geminiService';
import authService from './services/authService';
import { fetchFAISubmissions, insertFAISubmission, updateFAISubmission, fetchAllProfiles, updateProfile, fetchProfile } from './services/faiService';

type ViewType = 'DASHBOARD' | 'PROFILE' | 'SUPPLIERS' | 'FAI_REQUESTS' | 'REGISTER_SUPPLIER' | 'REGISTER_IQA';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [submissions, setSubmissions] = useState<FAISubmission[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierAccount[]>([]);
  const [employees, setEmployees] = useState<EmployeeAccount[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [selectedManagedSupplierId, setSelectedManagedSupplierId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isManagedEditMode, setIsManagedEditMode] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('DASHBOARD');
  const [mgmtActiveTab, setMgmtActiveTab] = useState<'SUPPLIERS' | 'IQA'>('SUPPLIERS');
  const [lastDetailView, setLastDetailView] = useState<'SUBMISSION' | 'SUPPLIER' | 'EMPLOYEE' | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentView, selectedSubmissionId, selectedManagedSupplierId, selectedEmployeeId]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await authService.getSession();
        if (session?.user) {
          let profileData: any = {};
          try {
            profileData = await fetchProfile(session.user.id);
          } catch (e) {
            console.error('Failed to fetch user profile:', e);
          }

          const userRole = profileData?.role || session.user.app_metadata?.role || session.user.user_metadata?.role || 'SUPPLIER';
          setUser({
            id: session.user.id,
            name: profileData?.name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
            email: session.user.email || '',
            role: userRole,
            organization: profileData?.organization || session.user.user_metadata?.organization || (userRole === 'SUPPLIER' ? 'Unknown Supplier' : 'IQA Dept'),
            createdDate: profileData?.created_at ? new Date(profileData.created_at).getTime() : new Date(session.user.created_at).getTime(),
            gender: profileData?.gender || session.user.user_metadata?.gender,
            date_of_birth: profileData?.date_of_birth || session.user.user_metadata?.date_of_birth,
            phone_number: profileData?.phone_number || session.user.user_metadata?.phone_number
          });
        }
      } catch (err) {
        console.error('Session check failed:', err);
      }
    };
    checkSession();
  }, []);

  const runAnalysis = async (id: string, sub: FAISubmission) => {
    // Optimistically update status to indicate retry is starting (if not already)
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: SubmissionStatus.AI_REVIEWING, aiAnalysis: undefined } : s));
    
    try {
      const analysisResult = await analyzeFAISubmission(sub);
      const updatedStatus = SubmissionStatus.PENDING_REVIEW;
      
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: updatedStatus, aiAnalysis: analysisResult } : s));
      
      // Update Supabase
      await updateFAISubmission(id, { 
        status: updatedStatus, 
        aiAnalysis: analysisResult 
      });
    } catch (err) {
      console.error('AI Analysis failed, scheduling retry:', err);
      // Schedule retry for 5 minutes later
      const retryTimestamp = Date.now() + 5 * 60 * 1000;
      const errorAnalysis = {
        overallVerdict: 'ERROR' as const,
        summary: 'System processing error (e.g., quota exceeded). Automatic retry scheduled.',
        retryTimestamp,
        error: err instanceof Error ? err.message : String(err)
      };

      // Keep status as AI_REVIEWING but update analysis with error info
      setSubmissions(prev => prev.map(s => s.id === id ? { 
        ...s, 
        status: SubmissionStatus.AI_REVIEWING, 
        aiAnalysis: errorAnalysis 
      } : s));
      
      await updateFAISubmission(id, { 
        status: SubmissionStatus.AI_REVIEWING, 
        aiAnalysis: errorAnalysis 
      });
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      submissions.forEach(sub => {
        if (sub.status === SubmissionStatus.AI_REVIEWING && 
            sub.aiAnalysis?.overallVerdict === 'ERROR' &&
            sub.aiAnalysis.retryTimestamp && 
            sub.aiAnalysis.retryTimestamp <= Date.now()) {
          console.log(`Retrying AI analysis for submission ${sub.id}`);
          runAnalysis(sub.id, sub);
        }
      });
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [submissions]);

  const refreshSubmissions = async () => {
    try {
      const data = await fetchFAISubmissions();
      if (data) {
        const sortedData = (data as FAISubmission[]).sort((a, b) => {
          const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
          const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
          return dateB - dateA;
        });
        setSubmissions(sortedData);
      }
    } catch (err) {
      console.error('Failed to refresh submissions:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        // Load Submissions
        const data = await fetchFAISubmissions();
        if (data && data.length > 0) {
          const sortedData = (data as FAISubmission[]).sort((a, b) => {
            const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
            const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
            return dateB - dateA;
          });
          setSubmissions(sortedData);

          // Check for pending retries
          sortedData.forEach(sub => {
            if (sub.status === SubmissionStatus.AI_REVIEWING && 
                sub.aiAnalysis?.overallVerdict === 'ERROR' &&
                sub.aiAnalysis.retryTimestamp && 
                sub.aiAnalysis.retryTimestamp <= Date.now()) {
              console.log(`Retrying AI analysis for submission ${sub.id}`);
              runAnalysis(sub.id, sub);
            }
          });
        }

        // Load Profiles if IQA
        if (user.role === 'IQA') {
          const allProfiles = await fetchAllProfiles();
          
          const supplierProfiles = allProfiles
            .filter(p => p.role === 'SUPPLIER')
            .map(p => ({
              id: p.id,
              name: p.name || 'Unknown',
              email: p.email || 'N/A',
              organization: p.organization || 'Unknown',
              status: (p.status as any) || 'ACTIVE',
              createdDate: new Date(p.created_at).getTime(),
              gender: p.gender,
              date_of_birth: p.date_of_birth,
              phone_number: p.phone_number
            }));
          setSuppliers(supplierProfiles);

          const employeeProfiles = allProfiles
            .filter(p => p.role === 'IQA' && p.id !== user.id)
            .map(p => ({
              id: p.id,
              name: p.name || 'Unknown',
              email: p.email || 'N/A',
              role: 'IQA Inspector',
              organization: p.organization || 'Unknown',
              status: (p.status as any) || 'ACTIVE',
              createdDate: new Date(p.created_at).getTime(),
              gender: p.gender,
              date_of_birth: p.date_of_birth,
              phone_number: p.phone_number
            }));
          setEmployees(employeeProfiles);
        }
      } catch (err) {
        console.error('Data load failed:', err);
      }
    };
    loadData();
  }, [user]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleNewSubmission = async (newSubmission: FAISubmission) => {
    const submissionWithOrg = { 
      ...newSubmission, 
      user_id: user?.id, // Add user_id for RLS
      lastUpdated: undefined, 
      created_at: new Date().toISOString(),
      revision: 0
    };
    
    try {
      // Save to Supabase first
      await insertFAISubmission(submissionWithOrg);
      setSubmissions(prev => [submissionWithOrg, ...prev]);
      await runAnalysis(submissionWithOrg.id, submissionWithOrg);
    } catch (err: any) {
      console.error('Detailed Supabase Save Error:', err);
      // Fallback to local state if DB fails (optional, depending on requirements)
      setSubmissions(prev => [submissionWithOrg, ...prev]);
      await runAnalysis(submissionWithOrg.id, submissionWithOrg);
    }
  };


  const handleUpdateSubmission = async (submissionId: string, updatedFiles: FAIFile[]) => {
    const status = SubmissionStatus.AI_REVIEWING;
    const lastUpdated = new Date().toISOString();
    
    // Calculate next revision and handle remarks
    const currentSubmission = submissions.find(s => s.id === submissionId);
    let nextRevision = 1;
    let newRemarks = currentSubmission?.iqaRemarks;

    if (currentSubmission) {
      const currentRev = currentSubmission.revision ?? 0;
      nextRevision = currentRev + 1;
      
      if (currentSubmission.iqaRemarks) {
        newRemarks = `[PREVIOUS REVIEW (Rev ${currentRev})]: ${currentSubmission.iqaRemarks}`;
      }
    }

    setSubmissions(prev => prev.map(s => s.id === submissionId ? { 
      ...s, 
      status, 
      files: updatedFiles, 
      aiAnalysis: undefined, 
      isNewVerdict: false, 
      lastUpdated,
      revision: nextRevision,
      iqaRemarks: newRemarks
    } : s));
    
    try {
      await updateFAISubmission(submissionId, { 
        status, 
        files: updatedFiles, 
        aiAnalysis: null, 
        isNewVerdict: false,
        lastUpdated,
        revision: nextRevision,
        iqaRemarks: newRemarks
      });
      
      const target = submissions.find(s => s.id === submissionId);
      if (target) {
        const updatedSub = { ...target, files: updatedFiles, status, revision: nextRevision };
        // Run analysis in background
        runAnalysis(submissionId, updatedSub);
      }
    } catch (err) {
      console.error('Update failed:', err);
      throw err;
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setSelectedSubmissionId(null);
    setSelectedManagedSupplierId(null);
    setSelectedEmployeeId(null);
    setIsManagedEditMode(false);
    setCurrentView('DASHBOARD');
  };

  const isResettingPassword = window.location.pathname === '/reset-password' || 
    window.location.pathname === '/auth/confirm' ||
    window.location.search.toLowerCase().includes('invite') ||
    window.location.hash.toLowerCase().includes('recovery') || 
    window.location.hash.toLowerCase().includes('invite');

  if (isResettingPassword) {
    return <ResetPassword />;
  }

  if (!user) return <Login onLogin={setUser} />;

  const selectedSub = submissions.find(s => s.id === selectedSubmissionId);
  const selectedManagedSupplier = suppliers.find(s => s.id === selectedManagedSupplierId);
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const supplierSubmissions = user.role === 'SUPPLIER' ? submissions.filter(s => s.user_id === user.id) : submissions;

  const handleViewChange = (view: ViewType) => {
    setSelectedSubmissionId(null);
    setSelectedManagedSupplierId(null);
    setSelectedEmployeeId(null);
    setIsManagedEditMode(false);
    setLastDetailView(null);
    setCurrentView(view);
  };

  const renderContent = () => {
    if (lastDetailView === 'SUPPLIER' && selectedManagedSupplier) {
      return (
        <SupplierDetail 
          supplier={selectedManagedSupplier} 
          submissions={submissions} 
          initialEditMode={isManagedEditMode} 
          onBack={() => { 
            setSelectedManagedSupplierId(null); 
            setIsManagedEditMode(false);
            setLastDetailView(selectedSubmissionId ? 'SUBMISSION' : null);
          }} 
          onToggleStatus={(id) => setSuppliers(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE' as any } : s))} 
          onUpdate={async (id, updates) => {
            setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
            try {
              await updateProfile(id, updates);
            } catch (err) {
              console.error('Failed to update supplier profile:', err);
            }
          }} 
          onDelete={(id) => { 
            setSuppliers(prev => prev.filter(s => s.id !== id)); 
            setSelectedManagedSupplierId(null); 
            setLastDetailView(selectedSubmissionId ? 'SUBMISSION' : null);
          }}
          onViewSubmission={(id) => {
            setSelectedSubmissionId(id);
            setLastDetailView('SUBMISSION');
          }}
        />
      );
    }

    if (lastDetailView === 'EMPLOYEE' && selectedEmployee) {
      return (
        <EmployeeDetail 
          employee={selectedEmployee} 
          initialEditMode={isManagedEditMode} 
          onBack={() => { 
            setSelectedEmployeeId(null); 
            setIsManagedEditMode(false);
            setLastDetailView(null); // Employees don't have deep links back usually
          }} 
          onToggleStatus={(id) => setEmployees(prev => prev.map(e => e.id === id ? { ...e, status: e.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE' as any } : e))} 
          onUpdate={async (id, updates) => {
            setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
            try {
              await updateProfile(id, updates);
            } catch (err) {
              console.error('Failed to update employee profile:', err);
            }
          }} 
        />
      );
    }

    if (lastDetailView === 'SUBMISSION' && selectedSub) {
      return (
        <SubmissionDetail 
          submission={selectedSub} 
          userRole={user.role}
          userId={user.id}
          suppliers={user.role === 'SUPPLIER' ? [{
            id: user.id,
            name: user.name,
            email: user.email || '',
            organization: user.organization,
            status: 'ACTIVE',
            createdDate: user.createdDate,
            gender: user.gender,
            date_of_birth: user.date_of_birth,
            phone_number: user.phone_number
          }] : suppliers}
          onClose={() => {
            setSelectedSubmissionId(null);
            setLastDetailView(selectedManagedSupplierId ? 'SUPPLIER' : null);
          }} 
          onDecision={async (decision, remarks) => {
            const status = decision === 'APPROVED' ? SubmissionStatus.APPROVED : SubmissionStatus.REJECTED;
            const lastUpdated = new Date().toISOString();
            setSubmissions(prev => prev.map(s => s.id === selectedSub.id ? { ...s, status, iqaRemarks: remarks, isNewVerdict: true, lastUpdated } : s));
            
            try {
              await updateFAISubmission(selectedSub.id, { 
                status, 
                iqaRemarks: remarks, 
                isNewVerdict: true,
                lastUpdated
              });
            } catch (err) {
              console.error('Decision update failed:', err);
            }
          }}
          onUpdateSubmission={handleUpdateSubmission}
          onRefreshSubmission={refreshSubmissions}
          onViewSupplierDetail={(id) => {
            setSelectedManagedSupplierId(id);
            setIsManagedEditMode(false);
            setLastDetailView('SUPPLIER');
          }}
        />
      );
    }

    // Fallback if IDs are set but lastDetailView is null (e.g. initial load or legacy state)
    if (selectedManagedSupplier) {
      return (
        <SupplierDetail 
          supplier={selectedManagedSupplier} 
          submissions={submissions} 
          initialEditMode={isManagedEditMode} 
          onBack={() => { setSelectedManagedSupplierId(null); setIsManagedEditMode(false); setLastDetailView(null); }} 
          onToggleStatus={(id) => setSuppliers(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE' as any } : s))} 
          onUpdate={async (id, updates) => {
            setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
            try {
              await updateProfile(id, updates);
            } catch (err) {
              console.error('Failed to update supplier profile:', err);
            }
          }} 
          onDelete={(id) => { setSuppliers(prev => prev.filter(s => s.id !== id)); setSelectedManagedSupplierId(null); setLastDetailView(null); }}
          onViewSubmission={(id) => { setSelectedSubmissionId(id); setLastDetailView('SUBMISSION'); }}
        />
      );
    }

    if (selectedSub) {
      return (
        <SubmissionDetail 
          submission={selectedSub} 
          userRole={user.role}
          userId={user.id}
          suppliers={user.role === 'SUPPLIER' ? [{
            id: user.id,
            name: user.name,
            email: user.email || '',
            organization: user.organization,
            status: 'ACTIVE',
            createdDate: user.createdDate,
            gender: user.gender,
            date_of_birth: user.date_of_birth,
            phone_number: user.phone_number
          }] : suppliers}
          onClose={() => { setSelectedSubmissionId(null); setLastDetailView(null); }} 
          onDecision={async (decision, remarks) => {
            const status = decision === 'APPROVED' ? SubmissionStatus.APPROVED : SubmissionStatus.REJECTED;
            const lastUpdated = new Date().toISOString();
            setSubmissions(prev => prev.map(s => s.id === selectedSub.id ? { ...s, status, iqaRemarks: remarks, isNewVerdict: true, lastUpdated } : s));
            
            try {
              await updateFAISubmission(selectedSub.id, { 
                status, 
                iqaRemarks: remarks, 
                isNewVerdict: true,
                lastUpdated
              });
            } catch (err) {
              console.error('Decision update failed:', err);
            }
          }}
          onUpdateSubmission={handleUpdateSubmission}
          onRefreshSubmission={refreshSubmissions}
          onViewSupplierDetail={(id) => {
            setSelectedManagedSupplierId(id);
            setIsManagedEditMode(false);
            setLastDetailView('SUPPLIER');
          }}
        />
      );
    }

    switch (currentView) {
      case 'PROFILE':
        return <Profile user={user} onBack={() => handleViewChange('DASHBOARD')} onUpdate={(updates) => setUser(prev => prev ? { ...prev, ...updates } : null)} />;
      case 'REGISTER_SUPPLIER':
        return <Registration type="SUPPLIER" onBack={() => handleViewChange('SUPPLIERS')} onSubmit={(data) => { setSuppliers(prev => [...prev, { ...data, id: `S-${Date.now()}`, createdDate: Date.now(), status: 'ACTIVE' }]); handleViewChange('SUPPLIERS'); }} />;
      case 'REGISTER_IQA':
        return <Registration type="IQA" onBack={() => handleViewChange('SUPPLIERS')} onSubmit={(data) => { setEmployees(prev => [...prev, { ...data, id: `E-${Date.now()}`, createdDate: Date.now(), status: 'ACTIVE' }]); handleViewChange('SUPPLIERS'); }} />;
      case 'SUPPLIERS':
        return <AccountManagement activeTab={mgmtActiveTab} onTabChange={setMgmtActiveTab} suppliers={suppliers} employees={employees} onRegisterRequest={(tab) => handleViewChange(tab === 'SUPPLIERS' ? 'REGISTER_SUPPLIER' : 'REGISTER_IQA')} onDeleteSupplier={(id) => setSuppliers(prev => prev.filter(s => s.id !== id))} onToggleSupplierStatus={async (id) => { const supplier = suppliers.find(s => s.id === id); if (supplier) { const newStatus = supplier.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE'; setSuppliers(prev => prev.map(s => s.id === id ? { ...s, status: newStatus as any } : s)); try { await updateProfile(id, { status: newStatus }); } catch (err) { console.error('Failed to update status:', err); } } }} onUpdateSupplier={(id, updates) => setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))} onDeleteEmployee={(id) => setEmployees(prev => prev.filter(e => e.id !== id))} onToggleEmployeeStatus={async (id) => { const employee = employees.find(e => e.id === id); if (employee) { const newStatus = employee.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE'; setEmployees(prev => prev.map(e => e.id === id ? { ...e, status: newStatus as any } : e)); try { await updateProfile(id, { status: newStatus }); } catch (err) { console.error('Failed to update status:', err); } } }} onUpdateEmployee={(id, updates) => setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))} onViewSupplierDetail={(id) => { setSelectedManagedSupplierId(id); setIsManagedEditMode(false); setLastDetailView('SUPPLIER'); }} onEditSupplierDetail={(id) => { setSelectedManagedSupplierId(id); setIsManagedEditMode(true); setLastDetailView('SUPPLIER'); }} onViewEmployeeDetail={(id) => { setSelectedEmployeeId(id); setIsManagedEditMode(false); setLastDetailView('EMPLOYEE'); }} onEditEmployeeDetail={(id) => { setSelectedEmployeeId(id); setIsManagedEditMode(true); setLastDetailView('EMPLOYEE'); }} onBack={() => handleViewChange('DASHBOARD')} />;
      case 'FAI_REQUESTS':
        return <div className="space-y-8"><header className="space-y-1"><h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">FAI Request Ledger</h1><p className="text-slate-500 font-medium text-[10px] md:text-xs mt-1">Detailed tracking and management of all active First Article Inspections.</p></header><IQADashboard submissions={submissions} onViewDetail={(id) => { setSelectedSubmissionId(id); setLastDetailView('SUBMISSION'); }} onManageSuppliers={() => handleViewChange('SUPPLIERS')} viewMode="TABLE_ONLY" /></div>;
      default:
        if (user.role === 'SUPPLIER') {
          return (
            <div className="space-y-12">
              <header className="space-y-1">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">Supplier Dashboard</h1>
                <p className="text-slate-500 font-medium text-[10px] md:text-xs mt-1">Welcome back, {user.name}. Track your FAI submissions and receive real-time audit feedback.</p>
              </header>
              <SupplierDashboard 
                onSubmit={handleNewSubmission} 
                submissions={supplierSubmissions} 
                userId={user.id} 
                onViewDetail={async (id) => { 
                  setSubmissions(prev => prev.map(s => s.id === id ? { ...s, isNewVerdict: false } : s)); 
                  setSelectedSubmissionId(id); 
                  setLastDetailView('SUBMISSION');
                  try {
                    await updateFAISubmission(id, { isNewVerdict: false });
                  } catch (err) {
                    console.error('Failed to update isNewVerdict status:', err);
                  }
                }} 
              />
            </div>
          );
        }
        return <div className="space-y-8"><header className="space-y-1"><h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">IQA Command Center</h1><p className="text-slate-500 font-medium text-[10px] md:text-xs mt-1">Hello {user.name}. Monitoring compliance across {submissions.length} active and archived packages.</p></header><IQADashboard submissions={submissions} onViewDetail={(id) => { setSelectedSubmissionId(id); setLastDetailView('SUBMISSION'); }} onManageSuppliers={() => handleViewChange('SUPPLIERS')} /></div>;
    }
  };

  return (
    <Layout user={user} onLogout={handleLogout} onProfileClick={() => handleViewChange('PROFILE')} onLogoClick={() => handleViewChange('DASHBOARD')} currentView={currentView} onViewChange={handleViewChange}>
      {renderContent()}
    </Layout>
  );
};

export default App;