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
  };
};

// =============================================================================
// LEGACY COMPATIBILITY ALIASES
// These are provided for backward compatibility during migration
// Consider removing after all components are updated
// =============================================================================

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
