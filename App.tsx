import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import SupplierPortal from './components/SupplierPortal';
import IQADashboard from './components/IQADashboard';
import SubmissionDetail from './components/SubmissionDetail';
import LoginPage from './components/LoginPage';
import ProfilePage from './components/ProfilePage';
import AccountManagement from './components/AccountManagement';
import SupplierDetail from './components/SupplierDetail';
import EmployeeDetail from './components/EmployeeDetail';
import RegistrationPage from './components/RegistrationPage';
import { FAISubmission, SubmissionStatus, User, SupplierAccount, EmployeeAccount, FAIFile } from './types';
import { analyzeFAISubmission } from './services/geminiService';
import { supabase, fetchFAIs, insertFAI, updateFAIStatus } from './services/supabase';

type ViewType = 'DASHBOARD' | 'PROFILE' | 'SUPPLIERS' | 'FAI_REQUESTS' | 'REGISTER_SUPPLIER' | 'REGISTER_EMPLOYEE';

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
  const [mgmtActiveTab, setMgmtActiveTab] = useState<'SUPPLIERS' | 'EMPLOYEES'>('SUPPLIERS');
  const [isLoading, setIsLoading] = useState(true);
  const [showForceStart, setShowForceStart] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowForceStart(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentView, selectedSubmissionId, selectedManagedSupplierId, selectedEmployeeId]);

  // Check for existing session on load
  useEffect(() => {
    const checkUser = async () => {
      console.log('Starting session check...');
      
      try {
        // Use a more generous timeout for the initial session check
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<any>((resolve) => 
          setTimeout(() => resolve({ data: { session: null }, error: new Error('Session check timed out') }), 8000)
        );

        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);

        if (sessionError) {
          console.warn('Session check encountered an issue (possibly timeout):', sessionError.message);
        }

        if (session?.user) {
          console.log('Session found, fetching profile...');
          const { data: profile, error: profileError } = await Promise.race([
            supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
            new Promise<any>((resolve) => setTimeout(() => resolve({ data: null, error: new Error('Profile fetch timed out') }), 5000))
          ]);

          if (profileError) {
            console.warn('Profile fetch error or timeout:', profileError.message);
          }

          if (profile) {
            setUser({
              id: session.user.id,
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
              role: profile.role.toUpperCase() as any,
              organization: session.user.user_metadata?.organization || (profile.role === 'supplier' ? 'Supplier Org' : 'IQA Office'),
            });
            console.log('User profile loaded successfully');
          }
        } else {
          console.log('No active session found');
        }
      } catch (err) {
        console.error('Unexpected error during session check:', err);
      } finally {
        console.log('Session check complete, clearing loading state');
        setIsLoading(false);
      }
    };

    checkUser();
    
    let subscription: any = null;
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session ? 'Session present' : 'No session');
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile, error: profileError } = await Promise.race([
            supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
            new Promise<any>((resolve) => setTimeout(() => resolve({ data: null, error: new Error('Profile fetch timed out') }), 5000))
          ]);

          if (profileError) {
            console.warn('Profile fetch error during auth change:', profileError.message);
          }

          if (profile) {
            setUser({
              id: session.user.id,
              name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
              role: profile.role.toUpperCase() as any,
              organization: session.user.user_metadata?.organization || (profile.role === 'supplier' ? 'Supplier Org' : 'IQA Office'),
            });
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      });
      subscription = data.subscription;
    } catch (err) {
      console.error('Error setting up auth state change listener:', err);
    }

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // Fetch data from Supabase
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        const faiRecords = await fetchFAIs();
        if (faiRecords) {
          const mappedSubmissions: FAISubmission[] = faiRecords.map((record: any) => ({
            id: record.id,
            supplierName: record.payload?.supplierName || 'Unknown',
            partNumber: record.payload?.partNumber || 'N/A',
            revision: record.payload?.revision || '-',
            timestamp: new Date(record.submission_date).getTime(),
            status: record.status === 'submitted' ? SubmissionStatus.PENDING_REVIEW : record.status.toUpperCase() as SubmissionStatus,
            files: record.payload?.files || [],
            iqaRemarks: record.remarks,
            aiAnalysis: record.payload?.aiAnalysis,
          }));
          setSubmissions(mappedSubmissions);
        }

        // For demo purposes, we still use dummy data for suppliers/employees management
        // In a real app, these would also come from Supabase tables
        const dummySuppliers: SupplierAccount[] = [
          { id: 'S1', name: 'John Supplier', organization: 'ABC Manufacturing', email: 'admin@abcmfg.com', status: 'ACTIVE', createdDate: Date.now() - 86400000 * 60 },
          { id: 'S2', name: 'Alice Tech', organization: 'Tech Components Ltd.', email: 'alice@techcomp.com', status: 'ACTIVE', createdDate: Date.now() - 86400000 * 55 }
        ];
        const dummyEmployees: EmployeeAccount[] = [
          { id: 'E1', name: 'Sarah Inspector', email: 'inspector@iqa.gov', role: 'IQA Lead', status: 'ACTIVE', createdDate: Date.now() - 86400000 * 60 }
        ];
        setSuppliers(dummySuppliers);
        setEmployees(dummyEmployees);
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };

    loadData();
  }, [user]);

  const runAnalysis = async (id: string, sub: FAISubmission) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: SubmissionStatus.AI_REVIEWING } : s));
    try {
      const analysisResult = await analyzeFAISubmission(sub);
      
      // Update local state
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: SubmissionStatus.PENDING_REVIEW, aiAnalysis: analysisResult } : s));
      
      // Update Supabase
      const target = submissions.find(s => s.id === id);
      if (target) {
        await supabase
          .from('fai')
          .update({ 
            status: 'pending_review',
            payload: { ...target.payload, aiAnalysis: analysisResult } 
          })
          .eq('id', id);
      }
    } catch (err) {
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: SubmissionStatus.REJECTED, iqaRemarks: 'System processing error during AI audit.' } : s));
    }
  };

  const handleNewSubmission = async (newSubmission: FAISubmission) => {
    if (!user) return;

    try {
      const submissionWithOrg = { ...newSubmission, supplierName: user.organization };
      
      // Save to Supabase
      const record = {
        supplier_id: user.id,
        title: `${submissionWithOrg.partNumber} Rev ${submissionWithOrg.revision}`,
        status: 'pending_ai',
        payload: {
          supplierName: submissionWithOrg.supplierName,
          partNumber: submissionWithOrg.partNumber,
          revision: submissionWithOrg.revision,
          files: submissionWithOrg.files
        }
      };
      
      const saved = await insertFAI(record);
      if (saved && saved[0]) {
        const finalSub = { ...submissionWithOrg, id: saved[0].id };
        setSubmissions(prev => [finalSub, ...prev]);
        await runAnalysis(finalSub.id, finalSub);
      }
    } catch (err) {
      console.error('Error saving submission:', err);
    }
  };

  const handleUpdateSubmission = async (submissionId: string, updatedFiles: FAIFile[]) => {
    setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, status: SubmissionStatus.PENDING_AI, files: updatedFiles, aiAnalysis: undefined, isNewVerdict: false } : s));
    const target = submissions.find(s => s.id === submissionId);
    if (target) {
      const updatedSub = { ...target, files: updatedFiles, status: SubmissionStatus.PENDING_AI };
      
      // Update Supabase
      await supabase
        .from('fai')
        .update({ 
          status: 'pending_ai',
          payload: { ...target, files: updatedFiles, aiAnalysis: undefined } 
        })
        .eq('id', submissionId);

      await runAnalysis(submissionId, updatedSub);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSelectedSubmissionId(null);
    setSelectedManagedSupplierId(null);
    setSelectedEmployeeId(null);
    setIsManagedEditMode(false);
    setCurrentView('DASHBOARD');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Synchronizing Vault...</p>
          {showForceStart && (
            <button 
              onClick={() => setIsLoading(false)}
              className="mt-4 px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-all animate-in fade-in slide-in-from-bottom-2"
            >
              Skip Synchronization
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage onLogin={setUser} />;

  const selectedSub = submissions.find(s => s.id === selectedSubmissionId);
  const selectedManagedSupplier = suppliers.find(s => s.id === selectedManagedSupplierId);
  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);
  const supplierSubmissions = user.role === 'SUPPLIER' ? submissions.filter(s => s.supplierName === user.organization) : submissions;

  const handleViewChange = (view: ViewType) => {
    setSelectedSubmissionId(null);
    setSelectedManagedSupplierId(null);
    setSelectedEmployeeId(null);
    setIsManagedEditMode(false);
    setCurrentView(view);
  };

  const renderContent = () => {
    if (selectedSub) {
      return (
        <SubmissionDetail 
          submission={selectedSub} 
          userRole={user.role}
          onClose={() => setSelectedSubmissionId(null)} 
          onDecision={async (decision, remarks) => {
            try {
              const status = decision === 'APPROVED' ? 'approved' : 'rejected';
              await updateFAIStatus(selectedSub.id, status, remarks);
              setSubmissions(prev => prev.map(s => s.id === selectedSub.id ? { ...s, status: decision === 'APPROVED' ? SubmissionStatus.APPROVED : SubmissionStatus.REJECTED, iqaRemarks: remarks, isNewVerdict: true } : s));
            } catch (err) {
              console.error('Error updating status:', err);
            }
          }}
          onUpdateSubmission={handleUpdateSubmission}
        />
      );
    }

    switch (currentView) {
      case 'PROFILE':
        return <ProfilePage user={user} onBack={() => handleViewChange('DASHBOARD')} />;
      case 'REGISTER_SUPPLIER':
        return <RegistrationPage type="SUPPLIER" onBack={() => handleViewChange('SUPPLIERS')} onSubmit={(data) => { setSuppliers(prev => [...prev, { ...data, id: `S-${Date.now()}`, createdDate: Date.now(), status: 'ACTIVE' }]); handleViewChange('SUPPLIERS'); }} />;
      case 'REGISTER_EMPLOYEE':
        return <RegistrationPage type="EMPLOYEE" onBack={() => handleViewChange('SUPPLIERS')} onSubmit={(data) => { setEmployees(prev => [...prev, { ...data, id: `E-${Date.now()}`, createdDate: Date.now(), status: 'ACTIVE' }]); handleViewChange('SUPPLIERS'); }} />;
      case 'SUPPLIERS':
        if (selectedManagedSupplier) {
          return <SupplierDetail supplier={selectedManagedSupplier} submissions={submissions} initialEditMode={isManagedEditMode} onBack={() => { setSelectedManagedSupplierId(null); setIsManagedEditMode(false); }} onToggleStatus={(id) => setSuppliers(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE' as any } : s))} onUpdate={(id, updates) => setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))} onDelete={(id) => { setSuppliers(prev => prev.filter(s => s.id !== id)); setSelectedManagedSupplierId(null); }} />;
        }
        if (selectedEmployee) {
          return <EmployeeDetail employee={selectedEmployee} initialEditMode={isManagedEditMode} onBack={() => { setSelectedEmployeeId(null); setIsManagedEditMode(false); }} onToggleStatus={(id) => setEmployees(prev => prev.map(e => e.id === id ? { ...e, status: e.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE' as any } : e))} onUpdate={(id, updates) => setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))} />;
        }
        return <AccountManagement activeTab={mgmtActiveTab} onTabChange={setMgmtActiveTab} suppliers={suppliers} employees={employees} onRegisterRequest={(tab) => handleViewChange(tab === 'SUPPLIERS' ? 'REGISTER_SUPPLIER' : 'REGISTER_EMPLOYEE')} onDeleteSupplier={(id) => setSuppliers(prev => prev.filter(s => s.id !== id))} onToggleSupplierStatus={(id) => setSuppliers(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE' as any } : s))} onUpdateSupplier={(id, updates) => setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))} onDeleteEmployee={(id) => setEmployees(prev => prev.filter(e => e.id !== id))} onToggleEmployeeStatus={(id) => setEmployees(prev => prev.map(e => e.id === id ? { ...e, status: e.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE' as any } : e))} onUpdateEmployee={(id, updates) => setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))} onViewSupplierDetail={(id) => { setSelectedManagedSupplierId(id); setIsManagedEditMode(false); }} onEditSupplierDetail={(id) => { setSelectedManagedSupplierId(id); setIsManagedEditMode(true); }} onViewEmployeeDetail={(id) => { setSelectedEmployeeId(id); setIsManagedEditMode(false); }} onEditEmployeeDetail={(id) => { setSelectedEmployeeId(id); setIsManagedEditMode(true); }} onBack={() => handleViewChange('DASHBOARD')} />;
      case 'FAI_REQUESTS':
        return <div className="space-y-8"><header className="space-y-2"><h1 className="text-3xl font-black text-slate-900 tracking-tight">FAI Request Ledger</h1><p className="text-slate-500 max-w-2xl font-medium">Detailed tracking and management of all active First Article Inspections.</p></header><IQADashboard submissions={submissions} onViewDetail={(id) => setSelectedSubmissionId(id)} onManageSuppliers={() => handleViewChange('SUPPLIERS')} viewMode="TABLE_ONLY" /></div>;
      default:
        if (user.role === 'SUPPLIER') {
          return <div className="space-y-12"><header className="space-y-2"><h1 className="text-3xl font-black text-slate-900 tracking-tight">Supplier Dashboard</h1><p className="text-slate-500 max-w-2xl font-medium">Welcome back, {user.name}. Track your FAI submissions and receive real-time audit feedback.</p></header><SupplierPortal onSubmit={handleNewSubmission} submissions={supplierSubmissions} onViewDetail={(id) => { setSubmissions(prev => prev.map(s => s.id === id ? { ...s, isNewVerdict: false } : s)); setSelectedSubmissionId(id); }} /></div>;
        }
        return <div className="space-y-8"><header className="space-y-2"><h1 className="text-3xl font-black text-slate-900 tracking-tight">IQA Command Center</h1><p className="text-slate-500 max-w-2xl font-medium">Hello {user.name}. Monitoring compliance across {submissions.length} active and archived packages.</p></header><IQADashboard submissions={submissions} onViewDetail={(id) => setSelectedSubmissionId(id)} onManageSuppliers={() => handleViewChange('SUPPLIERS')} /></div>;
    }
  };

  return (
    <Layout user={user} onLogout={handleLogout} onProfileClick={() => handleViewChange('PROFILE')} onLogoClick={() => handleViewChange('DASHBOARD')} currentView={currentView} onViewChange={handleViewChange}>
      {renderContent()}
    </Layout>
  );
};

export default App;