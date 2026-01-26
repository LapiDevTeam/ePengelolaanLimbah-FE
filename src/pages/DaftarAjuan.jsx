import { useState, useEffect } from "react";
import DataTable from "../components/DataTable";
import { useAuth } from "../contexts/AuthContext";

const DaftarAjuan = ({ onNavigate, pageData }) => {
  const { user } = useAuth();
  
  // Map viewMode from Dashboard to activeTab
  const getInitialTab = () => {
    if (pageData?.viewMode) {
      // Support both direct tab IDs and legacy viewMode names
      const viewModeMap = {
        'userOnly': 'my-requests',
        'pendingApproval': 'pending-approvals',
        'processedBy': 'approved',
        'my-requests': 'my-requests',
        'pending-approvals': 'pending-approvals',
        'approved': 'approved',
        'all-permohonan': 'all-permohonan'
      };
      return viewModeMap[pageData.viewMode] || 'my-requests';
    }
    return 'my-requests';
  };
  
  const [activeTab, setActiveTab] = useState(getInitialTab());

  // State for status filter (passed from Dashboard). Use `null` when no filter
  const [statusFilter, setStatusFilter] = useState(pageData?.statusFilter || null);

  // Update activeTab and statusFilter when pageData changes
  useEffect(() => {
    if (pageData?.viewMode) {
      const viewModeMap = {
        'userOnly': 'my-requests',
        'pendingApproval': 'pending-approvals',
        'processedBy': 'approved',
        'my-requests': 'my-requests',
        'pending-approvals': 'pending-approvals',
        'approved': 'approved',
        'all-permohonan': 'all-permohonan'
      };
      const newTab = viewModeMap[pageData.viewMode];
      if (newTab) {
        setActiveTab(newTab);
      }
    }
    // Update status filter if provided (keep `null` when none)
    if (pageData?.statusFilter) {
      setStatusFilter(pageData.statusFilter);
    } else {
      setStatusFilter(null);
    }
  }, [pageData?.viewMode, pageData?.statusFilter]);

  // Clear the `statusFilter` when the user switches away from the
  // `all-permohonan` tab so the filter does not persist across tabs.
  useEffect(() => {
    if (activeTab !== 'all-permohonan' && statusFilter !== null) {
      setStatusFilter(null);
    }
  }, [activeTab]);
  
  // Check if user has approval authority (Manager, HSE, or other approval roles)
  // Also include PJKPO users based on their log_NIK
  const hasApprovalAuthority = (user?.role && ["Manager", "HSE", "APJ", "QA"].includes(user.role)) || 
                               (user?.log_NIK === "PJKPO");

  // Check if user is HSE Manager (based on Jabatan field)
  const isHSEManager = user?.Jabatan === "Health,Safety & Environment Manager";

  // Check if user is from KL department (HSE/KL team) based solely on department ID
  const isFromKL = user?.emp_DeptID && String(user.emp_DeptID).toUpperCase() === "KL";

  const handleAddApplication = () => {
    // Navigate to form page when implemented
    if (onNavigate) {
      onNavigate("tambah-ajuan-pemusnahan");
    } else {
      showInfo("Add application functionality will be implemented here");
    }
  };

  const tabs = [
    {
      id: "my-requests",
      label: "My Requests",
    }
  ];

  // Add pending approvals tab if user has approval authority
  if (hasApprovalAuthority) {
    tabs.push({
      id: "pending-approvals", 
      label: "Pending Approvals",
    });
    // Also add Approved tab to view items already approved
    tabs.push({
      id: "approved",
      label: "Approved",
    });
  }

  // Add verifikasi tab for HSE/KL team members
  // KL users see "All Permohonan" (can view all requests)
  if (isFromKL) {
    tabs.push({
      id: "all-permohonan",
      label: "All Permohonan",
    });
  }

  // Add rejected tab only for HSE Manager
  if (isHSEManager) {
    tabs.push({
      id: "rejected",
      label: "Rejected",
    });
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <nav className="text-sm text-gray-500 mb-2">
          <span>Limbah B3</span>
          <span className="mx-2">›</span>
          <span className="text-gray-900">Daftar Ajuan Pemusnahan</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Daftar Ajuan Pemusnahan</h1>
            <p className="mt-2 text-gray-600">
              {activeTab === "my-requests" && "Daftar ajuan pemusnahan yang telah Anda buat."}
              {activeTab === "pending-approvals" && "Daftar ajuan pemusnahan yang menunggu persetujuan Anda."}
              {activeTab === "approved" && "Daftar ajuan pemusnahan yang telah Anda setujui."}
              {activeTab === "verifikasi" && "Daftar ajuan pemusnahan yang menunggu verifikasi lapangan."}
              {activeTab === "all-permohonan" && "Daftar semua permohonan pemusnahan (KL dapat melihat seluruh data)."}
              {activeTab === "rejected" && "Daftar ajuan pemusnahan yang ditolak."}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation - show if user has approval authority, is HSE Manager, or from KL (HSE/KL team) */}
      {(hasApprovalAuthority || isHSEManager || isFromKL) && (
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      <DataTable 
        onNavigate={onNavigate} 
        viewMode={activeTab}
        userRole={user?.role}
        currentUser={user}
        statusFilter={statusFilter}
      />
    </div>
  );
};

export default DaftarAjuan;
