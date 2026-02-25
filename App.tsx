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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentView, selectedSubmissionId, selectedManagedSupplierId, selectedEmployeeId]);

  useEffect(() => {
    const dummySubmissions: FAISubmission[] = [
      {
        id: 'SUB-10025',
        supplierName: 'ABC Manufacturing',
        partNumber: 'MOD-441-B',
        revision: '02',
        timestamp: Date.now() - 3600000 * 2,
        status: SubmissionStatus.PENDING_REVIEW,
        files: [
          { id: 'f1', type: 'Engineering Drawing' as any, name: 'DWG-441B.pdf', mimeType: 'application/pdf', lastModified: Date.now(), isMandatory: true },
          { id: 'f2', type: 'FAI Report (Supplier)' as any, name: 'FAI_Report_441B.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', lastModified: Date.now(), isMandatory: true }
        ],
        aiAnalysis: {
          overallVerdict: 'APPROVED',
          summary: 'Critical dimensions on Engineering Drawing match FAI data points. CPK > 1.33.',
          details: [
            { docType: 'Engineering Drawing' as any, result: 'PASS', notes: 'Features correctly ballooned' },
            { docType: 'FAI Report (Supplier)' as any, result: 'PASS', notes: 'All dimensions within 20% of center' }
          ]
        }
      },
      {
        id: 'SUB-10026',
        supplierName: 'Tech Components Ltd.',
        partNumber: 'CPU-V1-XT',
        revision: '01',
        timestamp: Date.now() - 3600000 * 5,
        status: SubmissionStatus.APPROVED,
        iqaRemarks: 'Excellent submission. Material certification is clear and dimensions are well within tolerance limits.',
        files: [
           { id: 'f3', type: 'Engineering Drawing' as any, name: 'CPU-V1.pdf', mimeType: 'application/pdf', lastModified: Date.now(), isMandatory: true },
           { id: 'f4', type: 'Material Certification & CoC' as any, name: 'MAT_CERT_001.pdf', mimeType: 'application/pdf', lastModified: Date.now(), isMandatory: true }
        ],
        aiAnalysis: {
          overallVerdict: 'APPROVED',
          summary: 'Full documentation set provided. Batch numbers match material certificate.',
          details: [{ docType: 'Material Certification & CoC' as any, result: 'PASS', notes: 'Verified authentic' }]
        }
      },
      {
        id: 'SUB-10028',
        supplierName: 'Tech Components Ltd.',
        partNumber: 'PSU-750W',
        revision: 'C',
        timestamp: Date.now() - 86400000 * 1.5,
        status: SubmissionStatus.REJECTED,
        iqaRemarks: 'Missing REACH compliance document. Dimension 4.2 in the FAI report exceeds drawing tolerance by 0.05mm. Please revise and resubmit.',
        files: [
          { id: 'f5', type: 'Engineering Drawing' as any, name: 'PSU_DRAWING.png', mimeType: 'image/png', lastModified: Date.now(), isMandatory: true },
          { id: 'f6', type: 'FAI Report (Supplier)' as any, name: 'DATA.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', lastModified: Date.now(), isMandatory: true }
        ],
        aiAnalysis: {
          overallVerdict: 'REJECTED',
          summary: 'Mandatory environmental documents missing. Potential out of spec dimension identified.',
          details: [{ docType: 'REACH Compliance' as any, result: 'FAIL', notes: 'Artifact not found' }]
        }
      },
      {
        id: 'SUB-10029',
        supplierName: 'ABC Manufacturing',
        partNumber: 'BRACKET-X',
        revision: '03',
        timestamp: Date.now() - 86400000 * 2,
        status: SubmissionStatus.APPROVED,
        iqaRemarks: 'Dimensions verified. Cleanliness report meets the new ISO requirements. Approved for production.',
        files: [],
        aiAnalysis: {
          overallVerdict: 'APPROVED',
          summary: 'Simple geometry verified against master drawing.',
          details: [{ docType: 'Engineering Drawing' as any, result: 'PASS', notes: 'Features verified' }]
        }
      },
      {
        id: 'SUB-10030',
        supplierName: 'Tech Components Ltd.',
        partNumber: 'SENSOR-H',
        revision: 'A2',
        timestamp: Date.now() - 86400000 * 3,
        status: SubmissionStatus.PENDING_REVIEW,
        files: [],
        aiAnalysis: {
          overallVerdict: 'APPROVED',
          summary: 'Calibration data looks accurate. Suggest approval.',
          details: [{ docType: 'FAI Report (Supplier)' as any, result: 'PASS', notes: 'Data points aligned' }]
        }
      }
    ];

    const dummySuppliers: SupplierAccount[] = [
      { id: 'S1', name: 'John Supplier', organization: 'ABC Manufacturing', email: 'admin@abcmfg.com', status: 'ACTIVE', createdDate: Date.now() - 86400000 * 60 },
      { id: 'S2', name: 'Alice Tech', organization: 'Tech Components Ltd.', email: 'alice@techcomp.com', status: 'ACTIVE', createdDate: Date.now() - 86400000 * 55 }
    ];

    const dummyEmployees: EmployeeAccount[] = [
      { id: 'E1', name: 'Sarah Inspector', email: 'inspector@iqa.gov', role: 'IQA Lead', status: 'ACTIVE', createdDate: Date.now() - 86400000 * 60 }
    ];

    setSubmissions(dummySubmissions);
    setSuppliers(dummySuppliers);
    setEmployees(dummyEmployees);
  }, []);

  const runAnalysis = async (id: string, sub: FAISubmission) => {
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: SubmissionStatus.AI_REVIEWING } : s));
    try {
      const analysisResult = await analyzeFAISubmission(sub);
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: SubmissionStatus.PENDING_REVIEW, aiAnalysis: analysisResult } : s));
    } catch (err) {
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: SubmissionStatus.REJECTED, iqaRemarks: 'System processing error during AI audit.' } : s));
    }
  };

  const handleNewSubmission = async (newSubmission: FAISubmission) => {
    const submissionWithOrg = { ...newSubmission, supplierName: user?.organization || 'Unknown Entity' };
    setSubmissions(prev => [submissionWithOrg, ...prev]);
    await runAnalysis(submissionWithOrg.id, submissionWithOrg);
  };

  const handleUpdateSubmission = async (submissionId: string, updatedFiles: FAIFile[]) => {
    setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, status: SubmissionStatus.PENDING_AI, files: updatedFiles, aiAnalysis: undefined, isNewVerdict: false } : s));
    const target = submissions.find(s => s.id === submissionId);
    if (target) {
      const updatedSub = { ...target, files: updatedFiles, status: SubmissionStatus.PENDING_AI };
      await runAnalysis(submissionId, updatedSub);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedSubmissionId(null);
    setSelectedManagedSupplierId(null);
    setSelectedEmployeeId(null);
    setIsManagedEditMode(false);
    setCurrentView('DASHBOARD');
  };

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
          onDecision={(decision, remarks) => {
            setSubmissions(prev => prev.map(s => s.id === selectedSub.id ? { ...s, status: decision === 'APPROVED' ? SubmissionStatus.APPROVED : SubmissionStatus.REJECTED, iqaRemarks: remarks, isNewVerdict: true } : s));
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