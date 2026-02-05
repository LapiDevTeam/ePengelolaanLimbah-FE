/**
 * Centralized Access Rights Configuration
 * Single source of truth for determining user permissions across the application.
 * 
 * This file handles:
 * 1. Daftar Ajuan (Permohonan) approval authority
 * 2. Berita Acara signing authority
 * 3. Role-based feature access
 * 4. Department-based access (KL/HSE team)
 * 
 * When modifying permissions, only update this file to ensure consistency
 * across all pages and components.
 */

// =============================================================================
// ROLE DEFINITIONS
// =============================================================================

/**
 * Roles that have approval authority for Daftar Ajuan (Permohonan)
 * These users can see Pending Approvals and Approved tabs
 */
export const DAFTAR_AJUAN_APPROVAL_ROLES = ["Manager", "HSE", "APJ"];

/**
 * Roles that have signing/approval authority for Berita Acara
 * Includes PL (Plant/Head of Plant) in addition to standard approval roles
 */
export const BERITA_ACARA_APPROVAL_ROLES = ["Manager", "HSE", "APJ", "QA", "PL"];

/**
 * Special user IDs with elevated permissions
 */
export const SPECIAL_USER_IDS = {
  PJKPO: "PJKPO", // Has approval authority regardless of role
};

/**
 * HSE Manager Jabatan for special access
 */
export const HSE_MANAGER_JABATAN = "Health,Safety & Environment Manager";

/**
 * Department ID for KL (HSE/Lingkungan team)
 */
export const KL_DEPARTMENT_ID = "KL";

/**
 * Department ID for QA (Quality Assurance)
 */
export const QA_DEPARTMENT_ID = "QA";

/**
 * Department ID for PN1 (Production/Plant 1)
 */
export const PN1_DEPARTMENT_ID = "PN1";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize user object for consistent access
 * @param {object} user - User object from AuthContext
 * @returns {object} Normalized user object with safe defaults
 */
const normalizeUser = (user) => {
  if (!user) return null;
  return {
    role: user.role || null,
    log_NIK: user.log_NIK || null,
    Jabatan: user.Jabatan || null,
    emp_DeptID: user.emp_DeptID ? String(user.emp_DeptID).toUpperCase() : null,
  };
};

// =============================================================================
// DAFTAR AJUAN (PERMOHONAN) PERMISSIONS
// =============================================================================

/**
 * Check if user has approval authority for Daftar Ajuan
 * Used in: Dashboard.jsx, DaftarAjuan.jsx, DataTable.jsx
 * 
 * @param {object} user - User object from AuthContext
 * @returns {boolean} True if user can approve Daftar Ajuan
 */
export const hasDaftarAjuanApprovalAuthority = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) return false;

  // Check if user is PJKPO (special access)
  if (normalizedUser.log_NIK === SPECIAL_USER_IDS.PJKPO) {
    return true;
  }

  // Check if user has an approval role
  if (normalizedUser.role && DAFTAR_AJUAN_APPROVAL_ROLES.includes(normalizedUser.role)) {
    return true;
  }

  return false;
};

// =============================================================================
// BERITA ACARA PERMISSIONS
// =============================================================================

/**
 * Check if user has approval/signing authority for Berita Acara
 * Used in: Dashboard.jsx, BeritaAcaraDataTable.jsx, DetailBeritaAcara.jsx
 * 
 * @param {object} user - User object from AuthContext
 * @returns {boolean} True if user can approve/sign Berita Acara
 */
export const hasBeritaAcaraApprovalAuthority = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) return false;

  // Check if user has an approval role for Berita Acara
  if (normalizedUser.role && BERITA_ACARA_APPROVAL_ROLES.includes(normalizedUser.role)) {
    return true;
  }

  return false;
};

// =============================================================================
// DEPARTMENT-BASED PERMISSIONS
// =============================================================================

/**
 * Check if user is from KL department (HSE/Lingkungan team)
 * KL users can view all permohonan data
 * Used in: Dashboard.jsx, DaftarAjuan.jsx
 * 
 * @param {object} user - User object from AuthContext
 * @returns {boolean} True if user is from KL department
 */
export const isFromKLDepartment = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) return false;

  return normalizedUser.emp_DeptID === KL_DEPARTMENT_ID;
};

/**
 * Check if user is HSE Manager (based on Jabatan)
 * HSE Manager has access to rejected items view
 * Used in: DaftarAjuan.jsx
 * 
 * @param {object} user - User object from AuthContext
 * @returns {boolean} True if user is HSE Manager
 */
export const isHSEManager = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) return false;

  return normalizedUser.Jabatan === HSE_MANAGER_JABATAN;
};

/**
 * Check if user is from QA department (Quality Assurance)
 * Used for department-specific filtering and access
 * 
 * @param {object} user - User object from AuthContext
 * @returns {boolean} True if user is from QA department
 */
export const isFromQADepartment = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) return false;

  return normalizedUser.emp_DeptID === QA_DEPARTMENT_ID;
};

/**
 * Check if user is from PN1 department (Production/Plant 1)
 * Used for department-specific filtering and access
 * 
 * @param {object} user - User object from AuthContext
 * @returns {boolean} True if user is from PN1 department
 */
export const isFromPN1Department = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) return false;

  return normalizedUser.emp_DeptID === PN1_DEPARTMENT_ID;
};

// =============================================================================
// ROLE-BASED PERMISSIONS
// =============================================================================

/**
 * Check if user is a Pemohon (applicant)
 * Used in: DataTable.jsx, BeritaAcaraDataTable.jsx, FormBeritaAcara.jsx
 * 
 * @param {object} user - User object from AuthContext
 * @returns {boolean} True if user role is Pemohon
 */
export const isPemohon = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) return false;
  return normalizedUser.role === "Pemohon";
};

/**
 * Check if user is a Manager
 * Used in: DataTable.jsx, BeritaAcaraDataTable.jsx, DetailAjuan.jsx
 * 
 * @param {object} user - User object from AuthContext
 * @returns {boolean} True if user role is Manager
 */
export const isManager = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) return false;
  return normalizedUser.role === "Manager";
};

/**
 * Check if user is HSE role
 * Used in: DataTable.jsx, DetailAjuan.jsx
 * 
 * @param {object} user - User object from AuthContext
 * @returns {boolean} True if user role is HSE
 */
export const isHSE = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) return false;
  return normalizedUser.role === "HSE";
};

/**
 * Check if user is APJ role
 * 
 * @param {object} user - User object from AuthContext
 * @returns {boolean} True if user role is APJ
 */
export const isAPJ = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) return false;
  return normalizedUser.role === "APJ";
};

/**
 * Check if user is QA role
 * 
 * @param {object} user - User object from AuthContext
 * @returns {boolean} True if user role is QA
 */
export const isQA = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) return false;
  return normalizedUser.role === "QA";
};

/**
 * Check if user is PL (Plant/Head of Plant) role
 * 
 * @param {object} user - User object from AuthContext
 * @returns {boolean} True if user role is PL
 */
export const isPL = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) return false;
  return normalizedUser.role === "PL";
};

/**
 * Check if user is PJKPO (special user)
 * 
 * @param {object} user - User object from AuthContext
 * @returns {boolean} True if user is PJKPO
 */
export const isPJKPO = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) return false;
  return normalizedUser.log_NIK === SPECIAL_USER_IDS.PJKPO;
};

// =============================================================================
// COMBINED/COMPLEX PERMISSIONS
// =============================================================================

/**
 * Check if user can see action buttons in DetailAjuan (Approve/Reject)
 * Used in: DetailAjuan.jsx
 * 
 * @param {object} user - User object from AuthContext
 * @param {object} data - Application data with status, isProdukPangan, currentStepLevel, processedByCurrentUser
 * @param {boolean} fromApprovedTab - Whether viewing from Approved tab
 * @returns {boolean} True if user can see action buttons
 */
export const canShowApprovalActions = (user, data, fromApprovedTab = false) => {
  if (!user || !data) return false;
  
  // Already viewed from approved tab - no actions
  if (fromApprovedTab) return false;
  
  // Not in progress - no actions
  if (data.status !== 'InProgress') return false;
  
  // Already processed by current user - no actions
  if (data.processedByCurrentUser) return false;

  // Manager or HSE can always approve if conditions met
  if (isManager(user) || isHSE(user)) {
    return true;
  }
  
  // PJKPO can approve produk pangan at APJ step (level 2)
  if (isPJKPO(user) && data.isProdukPangan === true && data.currentStepLevel === 2) {
    return true;
  }

  return false;
};

/**
 * Check if user can create new ajuan
 * Currently any logged-in user can create
 * Used in: FormAjuanPemusnahan.jsx
 * 
 * @param {object} user - User object from AuthContext
 * @returns {boolean} True if user can create ajuan
 */
export const canCreateAjuan = (user) => {
  return !!user;
};

/**
 * Check if user can see the tabs navigation in DaftarAjuan
 * Used in: DaftarAjuan.jsx
 * 
 * @param {object} user - User object from AuthContext
 * @returns {boolean} True if user should see tab navigation
 */
export const shouldShowDaftarAjuanTabs = (user) => {
  return hasDaftarAjuanApprovalAuthority(user) || isHSEManager(user) || isFromKLDepartment(user);
};

// =============================================================================
// VERIFIKASI LAPANGAN PERMISSIONS
// =============================================================================

/**
 * Group constants for golongan filtering
 */
export const GOLONGAN_GROUPS = {
  LIMBAH_B3: 'limbah-b3',
  RECALL: 'recall',
  RECALL_PRECURSOR: 'recall-precursor'
};

/**
 * Check if user can see Verifikasi Lapangan card on Dashboard
 * Approvers (Manager, HSE, APJ) don't need this card as they have Pending Approval
 * Used in: Dashboard.jsx
 * 
 * @param {object} user - User object from AuthContext
 * @returns {boolean} True if user can see verifikasi lapangan card
 */
export const canSeeVerifikasiLapanganCard = (user) => {
  if (!user) return false;
  
  // Approvers don't see this card - they have Pending Approval
  if (hasDaftarAjuanApprovalAuthority(user)) {
    return false;
  }
  
  return true;
};

/**
 * Get the verifikasi lapangan data scope for a user
 * Determines which data the user can see based on their department/role
 * 
 * @param {object} user - User object from AuthContext
 * @returns {object} { scope: 'own'|'group'|'all', allowedGroups: string[], filterByBagian: boolean }
 */
export const getVerifikasiLapanganScope = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) {
    return { scope: 'none', allowedGroups: [], filterByBagian: false };
  }

  // KL users can see all data (only KL, not approvers)
  if (normalizedUser.emp_DeptID === KL_DEPARTMENT_ID) {
    return { 
      scope: 'all', 
      allowedGroups: [GOLONGAN_GROUPS.LIMBAH_B3, GOLONGAN_GROUPS.RECALL, GOLONGAN_GROUPS.RECALL_PRECURSOR], 
      filterByBagian: false 
    };
  }

  // QA users can see their own bagian data + all 'recall' group data
  if (normalizedUser.emp_DeptID === QA_DEPARTMENT_ID) {
    return { 
      scope: 'bagian_plus_group', 
      allowedGroups: [GOLONGAN_GROUPS.LIMBAH_B3, GOLONGAN_GROUPS.RECALL, GOLONGAN_GROUPS.RECALL_PRECURSOR], 
      filterByBagian: true,
      additionalGroups: [GOLONGAN_GROUPS.RECALL]
    };
  }

  // PN1 users can see their own bagian data + all 'recall-precursor' group data
  if (normalizedUser.emp_DeptID === PN1_DEPARTMENT_ID) {
    return { 
      scope: 'bagian_plus_group', 
      allowedGroups: [GOLONGAN_GROUPS.LIMBAH_B3, GOLONGAN_GROUPS.RECALL, GOLONGAN_GROUPS.RECALL_PRECURSOR], 
      filterByBagian: true,
      additionalGroups: [GOLONGAN_GROUPS.RECALL_PRECURSOR]
    };
  }

  // Regular users can only see data from their own department (bagian)
  return { 
    scope: 'own', 
    allowedGroups: [GOLONGAN_GROUPS.LIMBAH_B3, GOLONGAN_GROUPS.RECALL, GOLONGAN_GROUPS.RECALL_PRECURSOR], 
    filterByBagian: true 
  };
};

/**
 * Check if user can see Pembuatan BAP card on Dashboard
 * Approvers (Manager, HSE, APJ) don't need this card as they have Pending Approval
 * Used in: Dashboard.jsx
 * 
 * @param {object} user - User object from AuthContext
 * @returns {boolean} True if user can see pembuatan BAP card
 */
export const canSeePembuatanBAPCard = (user) => {
  if (!user) return false;
  
  // Approvers don't see this card - they have Pending Approval
  if (hasDaftarAjuanApprovalAuthority(user)) {
    return false;
  }
  
  return true;
};

/**
 * Get the Pembuatan BAP data scope for a user
 * Determines which data the user can see based on their department/role
 * 
 * @param {object} user - User object from AuthContext
 * @returns {object} { scope: 'own'|'group'|'all', allowedGroups: string[], filterByBagian: boolean }
 */
export const getPembuatanBAPScope = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) {
    return { scope: 'none', allowedGroups: [], filterByBagian: false };
  }

  // KL users can see all data (only KL, not approvers)
  if (normalizedUser.emp_DeptID === KL_DEPARTMENT_ID) {
    return { 
      scope: 'all', 
      allowedGroups: [GOLONGAN_GROUPS.LIMBAH_B3, GOLONGAN_GROUPS.RECALL, GOLONGAN_GROUPS.RECALL_PRECURSOR], 
      filterByBagian: false 
    };
  }

  // QA users can see their own bagian data + all 'recall' group data
  if (normalizedUser.emp_DeptID === QA_DEPARTMENT_ID) {
    return { 
      scope: 'bagian_plus_group', 
      allowedGroups: [GOLONGAN_GROUPS.LIMBAH_B3, GOLONGAN_GROUPS.RECALL, GOLONGAN_GROUPS.RECALL_PRECURSOR], 
      filterByBagian: true,
      additionalGroups: [GOLONGAN_GROUPS.RECALL]
    };
  }

  // PN1 users can see their own bagian data + all 'recall-precursor' group data
  if (normalizedUser.emp_DeptID === PN1_DEPARTMENT_ID) {
    return { 
      scope: 'bagian_plus_group', 
      allowedGroups: [GOLONGAN_GROUPS.LIMBAH_B3, GOLONGAN_GROUPS.RECALL, GOLONGAN_GROUPS.RECALL_PRECURSOR], 
      filterByBagian: true,
      additionalGroups: [GOLONGAN_GROUPS.RECALL_PRECURSOR]
    };
  }

  // Regular users can only see data from their own department (bagian)
  return { 
    scope: 'own', 
    allowedGroups: [GOLONGAN_GROUPS.LIMBAH_B3, GOLONGAN_GROUPS.RECALL, GOLONGAN_GROUPS.RECALL_PRECURSOR], 
    filterByBagian: true 
  };
};

// =============================================================================
// ALL PERMOHONAN TAB PERMISSIONS
// =============================================================================

/**
 * Check if user can see All Permohonan tab ("Verifikasi & Pembuatan BAP" for non-KL)
 * - KL users: see this tab ("All Permohonan") with all statuses
 * - Non-KL, non-approvers: see this tab ("Verifikasi & Pembuatan BAP") with limited statuses
 * - Approvers (Manager, HSE, APJ): DON'T see this tab - they have Pending Approval instead
 * Used in: DaftarAjuan.jsx
 * 
 * @param {object} user - User object from AuthContext
 * @returns {boolean} True if user can see All Permohonan tab
 */
export const canSeeAllPermohonanTab = (user) => {
  if (!user) return false;
  
  // KL users always see this tab (All Permohonan)
  if (isFromKLDepartment(user)) {
    return true;
  }
  
  // Approvers don't see this tab - they have Pending Approval
  if (hasDaftarAjuanApprovalAuthority(user)) {
    return false;
  }
  
  // All other users see this tab (Verifikasi & Pembuatan BAP)
  return true;
};

/**
 * Get the allowed statuses for All Permohonan tab based on user
 * - KL: all statuses (null = no filter)
 * - Non-KL: only Verification and Pembuatan BAP
 * Used in: DaftarAjuan.jsx, DataTable.jsx
 * 
 * @param {object} user - User object from AuthContext
 * @returns {string[]|null} Array of allowed statuses, or null for all statuses
 */
export const getAllPermohonanAllowedStatuses = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) return [];
  
  // KL users can see all statuses
  if (normalizedUser.emp_DeptID === KL_DEPARTMENT_ID) {
    return null; // null means all statuses
  }
  
  // Non-KL users can only see Verification and Pembuatan BAP
  return ['Verification', 'Pembuatan BAP'];
};

/**
 * Get the All Permohonan data scope for a user
 * Same logic as Verifikasi/Pembuatan BAP scope
 * 
 * @param {object} user - User object from AuthContext
 * @returns {object} { scope, filterByBagian, additionalGroups, allowedStatuses }
 */
export const getAllPermohonanScope = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) {
    return { scope: 'none', filterByBagian: false, additionalGroups: [], allowedStatuses: [] };
  }

  // KL users can see all data and all statuses
  if (normalizedUser.emp_DeptID === KL_DEPARTMENT_ID) {
    return { 
      scope: 'all', 
      filterByBagian: false,
      additionalGroups: [],
      allowedStatuses: null // null = all statuses
    };
  }

  // QA users can see their own bagian data + all 'recall' group data
  // But only for Verification and Pembuatan BAP statuses
  if (normalizedUser.emp_DeptID === QA_DEPARTMENT_ID) {
    return { 
      scope: 'bagian_plus_group', 
      filterByBagian: true,
      additionalGroups: [GOLONGAN_GROUPS.RECALL],
      allowedStatuses: ['Verification', 'Pembuatan BAP']
    };
  }

  // PN1 users can see their own bagian data + all 'recall-precursor' group data
  // But only for Verification and Pembuatan BAP statuses
  if (normalizedUser.emp_DeptID === PN1_DEPARTMENT_ID) {
    return { 
      scope: 'bagian_plus_group', 
      filterByBagian: true,
      additionalGroups: [GOLONGAN_GROUPS.RECALL_PRECURSOR],
      allowedStatuses: ['Verification', 'Pembuatan BAP']
    };
  }

  // Regular users can only see data from their own department (bagian)
  // But only for Verification and Pembuatan BAP statuses
  return { 
    scope: 'own', 
    filterByBagian: true,
    additionalGroups: [],
    allowedStatuses: ['Verification', 'Pembuatan BAP']
  };
};

// =============================================================================
// UTILITY FUNCTIONS FOR UI
// =============================================================================

/**
 * Get all permissions for a user at once
 * Useful for components that need multiple permission checks
 * 
 * @param {object} user - User object from AuthContext
 * @returns {object} Object containing all permission flags
 */
export const getUserPermissions = (user) => {
  return {
    // Daftar Ajuan permissions
    hasDaftarAjuanApprovalAuthority: hasDaftarAjuanApprovalAuthority(user),
    
    // Berita Acara permissions
    hasBeritaAcaraApprovalAuthority: hasBeritaAcaraApprovalAuthority(user),
    
    // Department-based
    isFromKLDepartment: isFromKLDepartment(user),
    isFromQADepartment: isFromQADepartment(user),
    isFromPN1Department: isFromPN1Department(user),
    isHSEManager: isHSEManager(user),
    
    // Role-based
    isPemohon: isPemohon(user),
    isManager: isManager(user),
    isHSE: isHSE(user),
    isAPJ: isAPJ(user),
    isQA: isQA(user),
    isPL: isPL(user),
    isPJKPO: isPJKPO(user),
    
    // Combined
    canCreateAjuan: canCreateAjuan(user),
    shouldShowDaftarAjuanTabs: shouldShowDaftarAjuanTabs(user),
    
    // Verifikasi Lapangan & Pembuatan BAP
    canSeeVerifikasiLapanganCard: canSeeVerifikasiLapanganCard(user),
    verifikasiLapanganScope: getVerifikasiLapanganScope(user),
    canSeePembuatanBAPCard: canSeePembuatanBAPCard(user),
    pembuatanBAPScope: getPembuatanBAPScope(user),
  };
};

// =============================================================================
// LEGACY COMPATIBILITY ALIASES
// These are provided for backward compatibility during migration
// Consider removing after all components are updated
// =============================================================================

// =============================================================================
// DOWNLOAD LAMPIRAN PERMISSIONS
// =============================================================================

/**
 * Get the download lampiran scope for a user based on selected golongan group
 * Determines which bagian filter applies for each golongan group
 * 
 * Rules:
 * - KL: All bagian for all golongan groups
 * - QA: All bagian for 'recall', own bagian for 'limbah-b3' and 'recall-precursor'
 * - PN1: All bagian for 'recall-precursor', own bagian for 'limbah-b3' and 'recall'
 * - Others: Own bagian for all golongan groups
 * 
 * @param {object} user - User object from AuthContext
 * @param {string} golonganGroup - The selected golongan group ('limbah-b3', 'recall', 'recall-precursor')
 * @returns {object} { canAccessAllBagian: boolean, filterByBagian: boolean }
 */
export const getDownloadLampiranScopeForGroup = (user, golonganGroup) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) {
    return { canAccessAllBagian: false, filterByBagian: true };
  }

  // KL users can access all bagian for all groups
  if (normalizedUser.emp_DeptID === KL_DEPARTMENT_ID) {
    return { canAccessAllBagian: true, filterByBagian: false };
  }

  // QA users: all bagian for 'recall', own bagian for others
  if (normalizedUser.emp_DeptID === QA_DEPARTMENT_ID) {
    if (golonganGroup === GOLONGAN_GROUPS.RECALL) {
      return { canAccessAllBagian: true, filterByBagian: false };
    }
    return { canAccessAllBagian: false, filterByBagian: true };
  }

  // PN1 users: all bagian for 'recall-precursor', own bagian for others
  if (normalizedUser.emp_DeptID === PN1_DEPARTMENT_ID) {
    if (golonganGroup === GOLONGAN_GROUPS.RECALL_PRECURSOR) {
      return { canAccessAllBagian: true, filterByBagian: false };
    }
    return { canAccessAllBagian: false, filterByBagian: true };
  }

  // All other users: own bagian for all groups
  return { canAccessAllBagian: false, filterByBagian: true };
};

/**
 * Get available golongan groups for download lampiran
 * KL can multi-select, others single-select
 * 
 * @param {object} user - User object from AuthContext
 * @returns {object} { availableGroups: string[], canMultiSelect: boolean }
 */
export const getDownloadLampiranOptions = (user) => {
  const normalizedUser = normalizeUser(user);
  if (!normalizedUser) {
    return { availableGroups: [], canMultiSelect: false };
  }

  const allGroups = [GOLONGAN_GROUPS.LIMBAH_B3, GOLONGAN_GROUPS.RECALL, GOLONGAN_GROUPS.RECALL_PRECURSOR];

  // KL users can multi-select and have access to all groups
  if (normalizedUser.emp_DeptID === KL_DEPARTMENT_ID) {
    return { availableGroups: allGroups, canMultiSelect: true };
  }

  // All other users have single-select but can see all groups
  return { availableGroups: allGroups, canMultiSelect: false };
};

/**
 * @deprecated Use hasDaftarAjuanApprovalAuthority instead
 */
export const hasApprovalAuthority = hasDaftarAjuanApprovalAuthority;

/**
 * @deprecated Use hasBeritaAcaraApprovalAuthority instead  
 */
export const hasBeritaAcaraAuthority = hasBeritaAcaraApprovalAuthority;

/**
 * @deprecated Use isFromKLDepartment instead
 */
export const isFromKL = isFromKLDepartment;
