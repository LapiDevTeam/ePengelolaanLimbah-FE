import { useState, useEffect } from "react";
import { authAPI } from "../api/auth";
import { dataAPI } from "../services/api";
import { toJakartaIsoFromLocal, formatDateID } from "../utils/time";
import { showWarning, showError } from "../utils/sweetAlert";

// Icons
const XIcon = () => (
  <div className="w-5 h-5 relative">
    <div className="absolute top-2 left-0 w-5 h-0.5 bg-current transform rotate-45 origin-center"></div>
    <div className="absolute top-2 left-0 w-5 h-0.5 bg-current transform -rotate-45 origin-center"></div>
  </div>
);

const CheckIcon = () => (
  <div className="w-5 h-5 text-white">
    <svg fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  </div>
);

const AlertTriangleIcon = () => (
  <div className="w-6 h-6 text-red-500">
    <svg fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  </div>
);

const FieldVerificationModal = ({ isOpen, onClose, onComplete, ajuanData, loading = false }) => {
  // Verification roles structure
  const verificationRoles = [
    { 
      id: 1, 
      role: "Pelaksana Pemohon", 
      title: "Pelaksana Pemohon",
      description: "Verifikasi dari pelaksana bagian pemohon",
      department: "pemohon",
      jobLevel: 7
    },
    { 
      id: 2, 
      role: "Supervisor/Officer Pemohon", 
      title: "Supervisor/Officer Pemohon",
      description: "Supervisi dari bagian pemohon",
      department: "pemohon",
      jobLevel: [5, 6]
    },
    { 
      id: 3, 
      role: "Pelaksana HSE", 
      title: "Pelaksana HSE",
      description: "Verifikasi dari pelaksana HSE",
      department: "KL",
      jobLevel: 7
    },
    { 
      id: 4, 
      role: "Supervisor/Officer HSE", 
      title: "Supervisor/Officer HSE",
      description: "Supervisi dari bagian HSE",
      department: "KL",
      jobLevel: [5, 6]
    }
  ];

  // Checklist items
  const checklistItems = [
    {
      id: 1,
      text: "Memastikan bahwa kemasan Limbah B3 tertutup dengan rapat, kemasan tidak rusak, tidak bocor, serta kelengkapan label identitas dan simbol limbah B3"
    },
    {
      id: 2,
      text: "Melengkapi seluruh kolom pada spreadsheet"
    }
  ];

  // State management
  const [verifications, setVerifications] = useState({});
  const [availableVerifiers, setAvailableVerifiers] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [authData, setAuthData] = useState({
    username: "",
    password: ""
  });
  const [checkedItems, setCheckedItems] = useState({});
  const [authError, setAuthError] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [currentUserInfo, setCurrentUserInfo] = useState(null);

  // AD1 and AD2 are treated as the same group for pemohon verification roles
  const isADGroup = (dept) => dept === 'AD1' || dept === 'AD2';

  // Helper function to determine user's eligible roles based on department and job level
  const getUserEligibleRoles = (user, permohonanDept) => {
    const eligibleRoles = [];
    const userDept = (user.Appr_DeptID || user.approver_dept_id || '').toString().toUpperCase();
    const jobLevel = parseInt(user.job_levelid || 0);
    const pemohonDept = (permohonanDept || '').toString().toUpperCase();

    // Determine if user belongs to HSE side (for verification purposes)
    const isHSEDept = userDept === "KL";
    // Determine if user is from pemohon department (must normalize both to uppercase for comparison)
    // Special case: AD1 and AD2 are treated as the same group - AD2 can verify AD1 requests and vice versa
    const isPemohonDept = pemohonDept && (userDept === pemohonDept || (isADGroup(userDept) && isADGroup(pemohonDept)));

    // HSE department users always have HSE roles (they verify from HSE side)
    if (isHSEDept) {
      // HSE roles
      if (jobLevel === 7) {
        eligibleRoles.push(3); // Pelaksana HSE
      }
      if (jobLevel === 5 || jobLevel === 6) {
        eligibleRoles.push(4); // Supervisor/Officer HSE
      }
    }

    // Users from pemohon department can have Pemohon roles
    // Important: When HSE is the pemohon (permohonanDept === 'KL'), 
    // HSE users get BOTH HSE and Pemohon roles, so they can verify from both sides
    if (isPemohonDept) {
      // Pemohon roles
      if (jobLevel === 7) {
        eligibleRoles.push(1); // Pelaksana Pemohon
      }
      if (jobLevel === 5 || jobLevel === 6) {
        eligibleRoles.push(2); // Supervisor/Officer Pemohon
      }
    }

    return eligibleRoles;
  };

  // Load verification data from backend only (no localStorage)
  useEffect(() => {
    let mounted = true;

    const loadVerificationData = async () => {
      if (!isOpen || !ajuanData || !ajuanData.id) return;

      try {
        // Get available verifiers from external approval list (Appr_No = 3)
        const externalResponse = await dataAPI.getExternalApprovalList(3);
        
        // Get workflow data - contains VerificationRoles with actual approval status
        const workflowResponse = await dataAPI.getApprovalWorkflows(ajuanData.id);

        if (!workflowResponse || !workflowResponse.data || !workflowResponse.data.success) {
          console.error('Failed to load approval workflows');
          return;
        }

        if (!mounted) return;

        const workflows = workflowResponse.data.data || [];
        
        // Find the verification step (step_level === 3)
        const verificationStep = workflows.find(step => step.step_level === 3);
        
        if (!verificationStep) {
          console.warn('Verification step not found in workflow');
          return;
        }

        // Get available verifiers from external API (with complete job_levelid)
        let availableUsers = [];
        if (externalResponse && externalResponse.data && externalResponse.data.success) {
          const externalApprovers = externalResponse.data.data || [];
          
          // Get permohonan department from permohonan_pemusnahan_limbah table
          const permohonanDept = ajuanData?.bagian;
          
          availableUsers = externalApprovers
            .filter(approver => {
              const apprNo = approver.Appr_No ?? approver.appr_no;
              return String(apprNo) === '3';
            })
            .map(approver => {
              const eligibleRoles = getUserEligibleRoles(
                {
                  Appr_DeptID: approver.Appr_DeptID,
                  job_levelid: approver.job_levelid
                },
                permohonanDept
              );
              
              const userInfo = {
                id: approver.Appr_ID,
                username: approver.Appr_ID,
                name: approver.emp_Name,
                department: approver.Appr_DeptID,
                jobLevel: parseInt(approver.job_levelid || 0),
                jobTitle: approver.Appr_CC,
                eligibleRoles: eligibleRoles
              };
              return userInfo;
            })
            .filter(user => user.eligibleRoles && user.eligibleRoles.length > 0);
        }

        // Deduplicate available users by username
        const seen = new Set();
        const deduped = [];
        availableUsers.forEach(u => {
          const key = String(u.username || u.id);
          if (!seen.has(key)) {
            seen.add(key);
            deduped.push(u);
          }
        });

        // Load verification status from VerificationRoles in backend response
        const verificationRolesFromBackend = verificationStep.VerificationRoles || [];
        const loadedVerifications = {};
        const loadedChecked = {};

        verificationRolesFromBackend.forEach(role => {
          if (role.approved) {
            // Role is completed
            loadedVerifications[role.id] = {
              status: 'approved',
              completedAt: role.approved_at,
              checklist: null,
              userInfo: {
                username: role.approver_id || 'Unknown',
                name: role.approver_name || 'Unknown',
                userId: role.approver_id,
                role: role.title
              }
            };

            // Mark all checklist items as checked for completed roles
            checklistItems.forEach(item => {
              loadedChecked[`${role.id}-${item.id}`] = true;
            });
          }
        });

        setVerifications(loadedVerifications);
        setAvailableVerifiers(deduped);
        setCheckedItems(loadedChecked);

      } catch (error) {
        console.error('Failed to load verification data:', error);
      }
    };

    loadVerificationData();
    return () => { mounted = false; };
  }, [isOpen, ajuanData]);

  // Check if current user can perform selected role
  const canUserPerformRole = (user, roleId) => {
    return user.eligibleRoles.includes(roleId);
  };

  // Check if role is already completed
  const isRoleCompleted = (roleId) => {
    return verifications[roleId]?.status === 'approved';
  };

  // Get completed roles count
  const getCompletedRolesCount = () => {
    return Object.values(verifications).filter(v => v.status === 'approved').length;
  };

  // Check if all roles are completed
  const areAllRolesCompleted = () => {
    return getCompletedRolesCount() === verificationRoles.length;
  };

  const handleRoleSelection = (roleId) => {
    if (isRoleCompleted(roleId)) return;
    setSelectedRole(roleId);
    setAuthData({ username: "", password: "" });
    setAuthError("");
    setCurrentUserInfo(null);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError("");

    try {
      // Find user in available verifiers
      const user = availableVerifiers.find(u => 
        u.username === authData.username || u.id === authData.username
      );

      if (!user) {
        setAuthError("User tidak ditemukan dalam daftar verifikator");
        setIsAuthenticating(false);
        return;
      }

      // Check if user can perform selected role
      if (!canUserPerformRole(user, selectedRole)) {
        setAuthError(`User tidak memiliki akses untuk role yang dipilih. Role yang dapat diakses: ${user.eligibleRoles.map(r => verificationRoles.find(vr => vr.id === r)?.title).join(', ')}`);
        setIsAuthenticating(false);
        return;
      }

      // Authenticate with backend
      const response = await authAPI.authenticateUser({
        username: authData.username,
        password: authData.password,
        role: verificationRoles.find(r => r.id === selectedRole)?.role,
        permohonanId: ajuanData?.id || ajuanData?.noPermohonan
      });

      if (response.success) {
        setCurrentUserInfo({
          ...user,
          authenticatedRole: selectedRole,
          timestamp: toJakartaIsoFromLocal()
        });
        setAuthData({ username: "", password: "" });
      } else {
        setAuthError(response.error || "Username atau password tidak valid");
      }
    } catch (error) {
      console.error('Field verification auth error:', error);
      setAuthError("Terjadi kesalahan saat autentikasi");
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleChecklistChange = (itemId, checked) => {
    if (!selectedRole) return;
    setCheckedItems(prev => ({
      ...prev,
      [`${selectedRole}-${itemId}`]: checked
    }));
  };

  const handleVerification = async () => {
    if (!selectedRole || !currentUserInfo) return;

    // Check if all checklist items are checked
    const allItemsChecked = checklistItems.every(item => 
      checkedItems[`${selectedRole}-${item.id}`] === true
    );

    if (!allItemsChecked) {
      showWarning("Mohon lengkapi semua checklist sebelum melakukan verifikasi");
      return;
    }

    try {
      const roleData = verificationRoles.find(r => r.id === selectedRole);
      const stepData = {
        roleId: selectedRole,
        role: roleData.role,
        userInfo: currentUserInfo,
        checklist: checklistItems.map(item => ({
          ...item,
          checked: checkedItems[`${selectedRole}-${item.id}`]
        })),
        completedAt: toJakartaIsoFromLocal()
      };

      // Send verification to backend with checklist as comments
      const commentsPayload = JSON.stringify(stepData.checklist);
      const response = await dataAPI.approveDestructionRequest(
        ajuanData?.id || ajuanData?.noPermohonan,
        commentsPayload,
        {
          verifierId: currentUserInfo.id || currentUserInfo.username,
          verifierName: currentUserInfo.name,
          verifierJabatan: currentUserInfo.jobTitle || currentUserInfo.jobTitle,
          roleId: selectedRole
        }
      );

      if (response.data && response.data.success) {
        // Update local verification state
        const newVerificationEntry = {
          status: 'approved',
          checklist: stepData.checklist,
          completedAt: stepData.completedAt,
          userInfo: {
            username: currentUserInfo.username,
            name: currentUserInfo.name,
            userId: currentUserInfo.id,
            role: roleData.role
          }
        };

        setVerifications(prev => {
          const updated = { ...prev, [selectedRole]: newVerificationEntry };
          return updated;
        });

        // Clear current selection
        setSelectedRole(null);
        setCurrentUserInfo(null);

        // Check if all roles are completed
        const updatedVerifications = {
          ...verifications,
          [selectedRole]: {
            status: 'approved',
            checklist: stepData.checklist,
            completedAt: stepData.completedAt,
            userInfo: {
              username: currentUserInfo.username,
              name: currentUserInfo.name,
              userId: currentUserInfo.id,
              role: roleData.role
            }
          }
        };

        const completedCount = Object.values(updatedVerifications).filter(v => v.status === 'approved').length;
        
        if (completedCount === verificationRoles.length) {
          // All roles completed - finalize verification
          const finalVerificationData = {
            verifications: updatedVerifications,
            completedAt: toJakartaIsoFromLocal(),
            status: 'field_verified'
          };
          onComplete && onComplete(finalVerificationData);
        }
      } else {
        showError("Gagal menyimpan verifikasi: " + (response.data?.message || "Terjadi kesalahan"));
      }
    } catch (error) {
      console.error('Verification error:', error);
      showError("Terjadi kesalahan saat menyimpan verifikasi");
    }
  };

  const handleReject = () => {
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    
    if (!rejectReason.trim()) {
      setRejectError("Alasan penolakan harus diisi");
      return;
    }

    if (rejectReason.trim().length < 10) {
      setRejectError("Alasan penolakan minimal 10 karakter");
      return;
    }

    try {
      const verifierMeta = currentUserInfo ? {
        verifierId: currentUserInfo.id || currentUserInfo.username,
        verifierName: currentUserInfo.name,
        verifierJabatan: currentUserInfo.jobTitle
      } : {};

      const response = await dataAPI.rejectDestructionRequest(
        ajuanData?.id || ajuanData?.noPermohonan,
        rejectReason.trim(),
        verifierMeta
      );

      if (response.data && response.data.success) {
        const finalVerificationData = {
          verifications: verifications,
          completedAt: toJakartaIsoFromLocal(),
          status: 'field_rejected',
          rejectedBy: currentUserInfo?.name || 'Unknown',
          rejectReason: rejectReason.trim(),
          newDraft: response.data.newDraft || null
        };
        onComplete && onComplete(finalVerificationData);
      } else {
        setRejectError(response.message || "Gagal menolak verifikasi");
      }
    } catch (error) {
      console.error('Reject verification error:', error);
      setRejectError("Terjadi kesalahan saat menolak verifikasi");
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedRole(null);
      setCurrentUserInfo(null);
      setAuthData({ username: "", password: "" });
      setAuthError("");
      setShowRejectModal(false);
      setRejectReason("");
      setRejectError("");
      onClose();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 opacity-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Verifikasi Lapangan
              </h3>
              <p className="text-sm text-gray-600">
                No. Permohonan: {ajuanData?.noPermohonan || 'N/A'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <XIcon />
          </button>
        </div>

        {/* Progress Overview */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">
              Progress Verifikasi ({getCompletedRolesCount()}/{verificationRoles.length})
            </h4>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Selesai</span>
              <div className="w-4 h-4 bg-blue-500 rounded-full ml-4"></div>
              <span className="text-sm text-gray-600">Sedang Dipilih</span>
              <div className="w-4 h-4 bg-gray-300 rounded-full ml-4"></div>
              <span className="text-sm text-gray-600">Belum Selesai</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {verificationRoles.map((role) => (
              <div 
                key={role.id}
                onClick={() => handleRoleSelection(role.id)}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  isRoleCompleted(role.id) 
                    ? 'bg-green-50 border-green-200 cursor-default'
                    : selectedRole === role.id 
                    ? 'bg-blue-50 border-blue-300 shadow-md' 
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h5 className={`font-medium ${
                    isRoleCompleted(role.id) 
                      ? 'text-green-700' 
                      : selectedRole === role.id 
                      ? 'text-blue-700' 
                      : 'text-gray-900'
                  }`}>
                    {role.title}
                  </h5>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isRoleCompleted(role.id) 
                      ? 'bg-green-500' 
                      : selectedRole === role.id 
                      ? 'bg-blue-500' 
                      : 'bg-gray-300'
                  }`}>
                    {isRoleCompleted(role.id) ? (
                      <CheckIcon />
                    ) : selectedRole === role.id ? (
                      <span className="text-white text-xs font-bold">•</span>
                    ) : (
                      <span className="text-white text-xs">{role.id}</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600">{role.description}</p>
                {isRoleCompleted(role.id) && verifications[role.id]?.userInfo && (
                  <div className="mt-2 text-xs text-green-600">
                    Verifikator: {verifications[role.id].userInfo.name || verifications[role.id].userInfo.username}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {!showRejectModal ? (
            <>
              {!selectedRole ? (
                /* Role Selection */
                <div className="text-center">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Pilih Role untuk Verifikasi
                  </h4>
                  <p className="text-gray-600 mb-6">
                    Pilih salah satu role di atas untuk memulai proses verifikasi
                  </p>
                  
                  {/* Available Verifiers */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h5 className="font-medium text-gray-900 mb-3">Verifikator yang Tersedia</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {availableVerifiers.map((user, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.jobTitle}</div>
                          <div className="text-xs text-gray-500">
                            ID: {user.username} | Dept: {user.department} | Level: {user.jobLevel}
                          </div>
                          <div className="mt-1 text-xs">
                            <span className="text-blue-600">Dapat mengakses: </span>
                            {user.eligibleRoles.map(roleId => 
                              verificationRoles.find(r => r.id === roleId)?.title
                            ).join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : !currentUserInfo ? (
                /* Authentication */
                <div className="max-w-md mx-auto">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h5 className="font-medium text-blue-900 mb-4">
                      Autentikasi untuk {verificationRoles.find(r => r.id === selectedRole)?.title}
                    </h5>
                    <form onSubmit={handleAuthSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Username/ID
                        </label>
                        <input
                          type="text"
                          value={authData.username}
                          onChange={(e) => {
                            setAuthData(prev => ({ ...prev, username: e.target.value }));
                            setAuthError("");
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                          disabled={isAuthenticating}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          value={authData.password}
                          onChange={(e) => {
                            setAuthData(prev => ({ ...prev, password: e.target.value }));
                            setAuthError("");
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                          disabled={isAuthenticating}
                        />
                      </div>
                      {authError && (
                        <p className="text-sm text-red-600">{authError}</p>
                      )}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedRole(null)}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                          Kembali
                        </button>
                        <button
                          type="submit"
                          disabled={isAuthenticating || !authData.username || !authData.password}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                        >
                          {isAuthenticating ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Memverifikasi...
                            </>
                          ) : (
                            'Login'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              ) : (
                /* Checklist Form */
                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      ✅ Login berhasil sebagai: <span className="font-medium">{currentUserInfo.name} </span> 
                      ({verificationRoles.find(r => r.id === selectedRole)?.title})
                    </p>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-4">
                      Checklist Verifikasi - {verificationRoles.find(r => r.id === selectedRole)?.title}
                    </h5>
                    
                    <div className="space-y-3">
                      {checklistItems.map((item) => (
                        <label key={item.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <div className="flex-shrink-0 pt-0.5">
                            <input
                              type="checkbox"
                              checked={checkedItems[`${selectedRole}-${item.id}`] || false}
                              onChange={(e) => handleChecklistChange(item.id, e.target.checked)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </div>
                          <span className="text-sm text-gray-700 leading-relaxed flex-1">
                            {item.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Verification Status Table */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h6 className="font-medium text-gray-900 mb-3">Status Verifikasi Keseluruhan</h6>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase" colSpan="2">
                              Bagian Pemohon
                            </th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase" colSpan="2">
                              Bagian HSE
                            </th>
                          </tr>
                          <tr>
                            <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-700"></th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700">Pelaksana</th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700">Supervisor/Officer</th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700">Pelaksana</th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700">Supervisor/Officer</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {checklistItems.map((item) => (
                            <tr key={item.id}>
                              <td className="border border-gray-300 px-3 py-2 text-sm text-gray-900">
                                {item.text}
                              </td>
                              {verificationRoles.map((role) => (
                                <td key={role.id} className="border border-gray-300 px-3 py-2">
                                  <div className="flex items-center justify-center">
                                    {isRoleCompleted(role.id) ? (
                                      <div className="inline-flex items-center justify-center w-6 h-6 bg-green-600 text-white rounded-full">
                                        <CheckIcon />
                                      </div>
                                    ) : role.id === selectedRole ? (
                                      <div className="w-6 h-6 bg-blue-100 border-2 border-blue-600 rounded"></div>
                                    ) : (
                                      <div className="w-6 h-6 bg-gray-100 border border-gray-300 rounded"></div>
                                    )}
                                  </div>
                                </td>
                              ))}
                            </tr>
                          ))}
                          <tr>
                            <td className="border border-gray-300 px-3 py-2 text-sm font-medium text-gray-900">
                              Paraf/Tgl
                            </td>
                            {verificationRoles.map((role) => (
                              <td key={role.id} className="border border-gray-300 px-3 py-2">
                                <div className="flex flex-col items-center justify-center text-xs text-gray-600">
                                  {isRoleCompleted(role.id) && verifications[role.id]?.completedAt ? (
                                    <>
                                      <div className="font-medium text-center">
                                        {verifications[role.id].userInfo?.name || verifications[role.id].userInfo?.username}
                                      </div>
                                      <div className="text-center">
                                        {formatDateID(verifications[role.id].completedAt)}
                                      </div>
                                    </>
                                  ) : (
                                    '-'
                                  )}
                                </div>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setSelectedRole(null);
                        setCurrentUserInfo(null);
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    >
                      Kembali ke Pilihan Role
                    </button>
                    
                    <div className="flex items-center gap-3">
                      {/* Render Reject only for HSE supervisor/officer (department 'KL' and job level 5 or 6) */}
                      {currentUserInfo && currentUserInfo.department === 'KL' && (currentUserInfo.jobLevel === 5 || currentUserInfo.jobLevel === 6) && (
                        <button
                          onClick={handleReject}
                          className="px-6 py-2 border border-red-300 text-red-700 bg-white rounded-lg hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                        >
                          Reject
                        </button>
                      )}

                      <button
                        onClick={handleVerification}
                        disabled={!checklistItems.every(item => checkedItems[`${selectedRole}-${item.id}`])}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Verifikasi
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Reject Modal */
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <AlertTriangleIcon />
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    Konfirmasi Penolakan
                  </h4>
                  <p className="text-sm text-gray-600">
                    Anda yakin ingin menolak verifikasi ini?
                  </p>
                </div>
              </div>

              <form onSubmit={handleRejectSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alasan Penolakan <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => {
                      setRejectReason(e.target.value);
                      if (rejectError) setRejectError("");
                    }}
                    placeholder="Masukkan alasan mengapa verifikasi ini ditolak..."
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none ${
                      rejectError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    rows={4}
                    maxLength={500}
                  />
                  <div className="flex justify-between mt-1">
                    {rejectError && (
                      <p className="text-sm text-red-600">{rejectError}</p>
                    )}
                    <div className="flex-1"></div>
                    <p className="text-xs text-gray-500">
                      {rejectReason.length}/500 karakter
                    </p>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangleIcon />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-red-800">
                        Perhatian
                      </h4>
                      <div className="mt-1 text-sm text-red-700">
                        <ul className="list-disc list-inside space-y-1">
                          <li>Verifikasi yang ditolak akan menghentikan proses</li>
                          <li>Ajuan perlu diperbaiki sebelum dapat diverifikasi ulang</li>
                          <li>Alasan penolakan akan tercatat dalam sistem</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectReason("");
                      setRejectError("");
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!rejectReason.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reject
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FieldVerificationModal;