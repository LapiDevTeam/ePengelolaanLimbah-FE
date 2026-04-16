"use client"

import { useState, useEffect } from "react";
import { dataAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useConfigContext } from "../contexts/ConfigContext";
import RejectModal from "./RejectModal";
import ApproveModal from "./ApproveModal";
import DetailAjuan from "../pages/DetailAjuan";
import { formatDateID } from "../utils/time";
import { 
  getJenisDisplayName, 
  getStatusDisplayName, 
  DEFAULT_JENIS_OPTIONS,
  DEFAULT_GOLONGAN_OPTIONS
} from "../constants/referenceData";
import { showSuccess, showError, showConfirmation } from "../utils/sweetAlert";
import { 
  isPemohon as checkIsPemohon,
  isManager as checkIsManager,
  isHSE as checkIsHSE,
  canSubmitAjuan as checkCanSubmitAjuan,
  canDeleteAjuan as checkCanDeleteAjuan,
} from "../constants/accessRights";

// Simple CSS icons as components
const SearchIcon = () => (
  <div className="w-4 h-4 border border-gray-400 rounded-full relative">
    <div className="absolute top-2 left-2 w-1 h-1 border border-gray-400 transform rotate-45"></div>
  </div>
);

const FilterIcon = () => (
  <div className="w-4 h-4 relative">
    <div className="w-full h-0.5 bg-gray-400 mb-1"></div>
    <div className="w-3 h-0.5 bg-gray-400 mb-1 mx-auto"></div>
    <div className="w-2 h-0.5 bg-gray-400 mx-auto"></div>
  </div>
);

const ChevronLeftIcon = () => (
  <div className="w-4 h-4 flex items-center justify-center">
    <div className="w-2 h-2 border-l-2 border-b-2 border-gray-400 transform rotate-45"></div>
  </div>
);

const ChevronRightIcon = () => (
  <div className="w-4 h-4 flex items-center justify-center">
    <div className="w-2 h-2 border-r-2 border-t-2 border-gray-400 transform rotate-45"></div>
  </div>
);

const ChevronDownIcon = () => (
  <div className="w-4 h-4 flex items-center justify-center">
    <div className="w-2 h-2 border-b-2 border-r-2 border-gray-400 transform rotate-45"></div>
  </div>
);

// Use centralized Jakarta formatter so displayed date matches stored +07:00 values
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  return formatDateID(timestamp);
};

const DataTable = ({ 
  onNavigate, 
  viewMode = "my-requests", 
  userRole, 
  currentUser, 
  statusFilter = '',
  allPermohonanAllowedStatuses = null,
  allPermohonanScope = null
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("noPermohonan");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState("desc");
  const [data, setData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jenisOptions, setJenisOptions] = useState(DEFAULT_JENIS_OPTIONS);
  const [golonganOptions, setGolonganOptions] = useState(DEFAULT_GOLONGAN_OPTIONS);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Get config context for status styling
  const { getStatusStyle } = useConfigContext();
  
  // Reject modal state
  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    itemId: null,
    loading: false
  });
  // Approve modal state
  const [approveModal, setApproveModal] = useState({ isOpen: false, itemId: null, loading: false });
  // Detail ajuan modal state
  const [detailModal, setDetailModal] = useState({ isOpen: false, itemId: null });

  
  const itemsPerPage = 8;
  const { user } = useAuth();
  
  // Read group from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const groupFilter = urlParams.get('group') || null;

  // Fetch reference data on component mount
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        setReferenceLoading(true);
        const response = await dataAPI.getReferenceData();
        if (response.data.success) {
          setJenisOptions(response.data.data.jenisLimbah || []);
          setGolonganOptions(response.data.data.golonganLimbah || []);
        } else {
          console.error("Failed to fetch reference data:", response.data.message);
        }
      } catch (error) {
        console.error("Error fetching reference data:", error);
      } finally {
        setReferenceLoading(false);
      }
    };

    fetchReferenceData();
  }, []);

  // Reset page when viewMode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode]);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let response;
        
        if (viewMode === "pending-approvals") {
          // Fetch pending approvals for this user
          response = await dataAPI.getPendingApprovals({
            page: currentPage,
            limit: itemsPerPage,
            searchTerm: searchTerm,
            selectedColumn: selectedColumn,
            group: groupFilter,
            sortOrder: sortOrder
          });
        } else if (viewMode === "all-permohonan") {
          // All Permohonan tab - different scope based on user
          // - KL: fetch all requests across users (no userOnly filter)
          // - Non-KL: fetch only Verification and Pembuatan BAP, filtered by bagian/group
          
          // Determine the status filter to use
          let effectiveStatusFilter = statusFilter || undefined;
          
          // If user is non-KL and no specific status filter from dashboard click,
          // we need to pass the allowed statuses to backend
          const isKLUser = allPermohonanScope?.scope === 'all';
          
          // Build request params
          const requestParams = {
            page: currentPage,
            limit: itemsPerPage,
            searchTerm: searchTerm,
            selectedColumn: selectedColumn,
            userOnly: false,
            group: groupFilter,
            sortOrder: sortOrder
          };
          
          // Add status filter
          if (effectiveStatusFilter) {
            // Specific status from dashboard click
            requestParams.statusFilter = effectiveStatusFilter;
          } else if (!isKLUser && allPermohonanAllowedStatuses) {
            // Non-KL user without specific filter - restrict to allowed statuses
            requestParams.statusFilter = allPermohonanAllowedStatuses.join(',');
          }
          
          // Add bagian/scope filtering for non-KL users
          if (allPermohonanScope && allPermohonanScope.filterByBagian) {
            requestParams.filterByBagian = true;
            requestParams.userBagian = currentUser?.emp_DeptID;
            
            // Add additional groups for QA/PN1
            if (allPermohonanScope.additionalGroups && allPermohonanScope.additionalGroups.length > 0) {
              requestParams.additionalGroups = allPermohonanScope.additionalGroups.join(',');
            }
          }
          
          response = await dataAPI.getDestructionRequests(requestParams);
        } else if (viewMode === "approved") {
          // Fetch requests processed (approved/rejected) by this user
          response = await dataAPI.getProcessedByUser({
            page: currentPage,
            limit: itemsPerPage,
            searchTerm: searchTerm,
            selectedColumn: selectedColumn,
            group: groupFilter,
            sortOrder: sortOrder
          });
        } else if (viewMode === "rejected") {
          // Fetch rejected requests (only for HSE Manager)
          response = await dataAPI.getRejectedRequests({
            page: currentPage,
            limit: itemsPerPage,
            searchTerm: searchTerm,
            selectedColumn: selectedColumn,
            group: groupFilter,
            sortOrder: sortOrder
          });
        } else if (viewMode === "verifikasi") {
          // Fetch verification requests (for HSE/KL team)
          response = await dataAPI.getVerificationRequests({
            page: currentPage,
            limit: itemsPerPage,
            searchTerm: searchTerm,
            selectedColumn: selectedColumn,
            group: groupFilter,
            sortOrder: sortOrder
          });
        } else {
          // Dept. Requests tab - show all requests from user's department,
          // including Completed ones (BAP complete remains visible).
          const deptId = currentUser?.emp_DeptID || user?.emp_DeptID || '';
          response = await dataAPI.getDestructionRequests({
            page: currentPage,
            limit: itemsPerPage,
            searchTerm: searchTerm,
            selectedColumn: selectedColumn,
            userOnly: false,
            deptOnly: !!deptId,
            userDept: deptId,
            excludeCompleted: false,
            group: groupFilter,
            sortOrder: sortOrder
          });
        }
        
        if (response.data.success) {
          setData(response.data.data);
          setTotalItems(response.data.pagination.total);
        } else {
          setError(response.data.message || "Failed to fetch data.");
        }
      } catch (err) {
        console.error("Error fetching destruction requests:", err);
        setError("Error fetching data.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [currentPage, searchTerm, selectedColumn, user, refreshKey, viewMode, statusFilter, groupFilter, sortOrder]);

  // Add event listener for data refresh
  useEffect(() => {
    const handleDataRefresh = () => {
      console.log("DataTable: Received refresh event");
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('ajuanDataRefresh', handleDataRefresh);
    
    return () => {
      window.removeEventListener('ajuanDataRefresh', handleDataRefresh);
    };
  }, []);

  // Define column mappings
  const columnOptions = [
    { value: "noPermohonan", label: "No. Permohonan" },
    { value: "tanggal", label: "Tgl. Pengajuan" },
    { value: "golongan", label: "Golongan" },
    { value: "jenis", label: "Jenis" },
    { value: "status", label: "Status" },
    { value: "bagian", label: "Bagian" },
    { value: "namaLimbah", label: "Nama Limbah" },
    { value: "nomorAnalisa", label: "No. Bets/Analisa" },
    { value: "bobot", label: "Bobot (gram)" }
  ];

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const isApproverView = viewMode === 'pending-approvals' || viewMode === 'approved';

  // Render action buttons for a row. Keep logic centralized for readability.
  const renderActions = (item, isSameDept) => {
    if (viewMode === "pending-approvals") {
      return (
        <>
          {item.status === "InProgress" && (
            <>
              <button
                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                onClick={() => handleApprove(item.id)}
                title="Approve"
              >
                Approve
              </button>
              <button
                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                onClick={() => handleReject(item.id)}
                title="Reject"
              >
                Reject
              </button>
            </>
          )}
        </>
      );
    }

    // Dept. Requests: anyone in the same department may edit a Draft.
    // Submit and Delete are further restricted by Job_LevelID (see accessRights.js).
    return (
      <>
        {item.status === "Draft" && isSameDept && (
          <>
            <button
              className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
              onClick={() => onNavigate && onNavigate('edit-ajuan-pemusnahan', { id: item.id })}
              title="Edit Draft"
            >
              Edit
            </button>
            {canSubmitData && (
              <button
                className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                onClick={() => handleSubmit(item.id)}
                title="Submit for Approval"
              >
                Submit
              </button>
            )}
            {canDeleteData && (
              <button
                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                onClick={() => handleDelete(item.id)}
                title="Delete Request"
              >
                Delete
              </button>
            )}
          </>
        )}
      </>
    );
  };

  // Reset to first page when filters change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleColumnChange = (e) => {
    setSelectedColumn(e.target.value);
    setCurrentPage(1);
  };

  const handleApprove = (id) => {
    setApproveModal({ isOpen: true, itemId: id, loading: false });
  };

  const handleApproveConfirm = async () => {
    const id = approveModal.itemId;
    setApproveModal(prev => ({ ...prev, loading: true }));
    try {
      const response = await dataAPI.approveDestructionRequest(id);
      if (response.data.success) {
        showSuccess(response.data.message);
        // Re-fetch data to update the list based on current viewMode
        let updatedResponse;
        if (viewMode === "pending-approvals") {
          updatedResponse = await dataAPI.getPendingApprovals({
            page: currentPage,
            limit: itemsPerPage,
            searchTerm: searchTerm,
            selectedColumn: selectedColumn
          });
        } else {
          updatedResponse = await dataAPI.getDestructionRequests({
            page: currentPage,
            limit: itemsPerPage,
            searchTerm: searchTerm,
            selectedColumn: selectedColumn,
            userOnly: false,
            deptOnly: !!(currentUser?.emp_DeptID || user?.emp_DeptID),
            userDept: currentUser?.emp_DeptID || user?.emp_DeptID || '',
            excludeCompleted: false
          });
        }
        if (updatedResponse.data.success) {
          setData(updatedResponse.data.data);
          setTotalItems(updatedResponse.data.pagination.total);
        }
      } else {
        showError("Failed to approve: " + response.data.message);
      }
    } catch (error) {
      console.error("Error approving request:", error);
      showError("Error approving request.");
    } finally {
      setApproveModal({ isOpen: false, itemId: null, loading: false });
    }
  };

  const handleReject = (id) => {
    setRejectModal({
      isOpen: true,
      itemId: id,
      loading: false
    });
  };

  const handleRejectConfirm = async (id, reason) => {
    setRejectModal(prev => ({ ...prev, loading: true }));
    
    try {
      const response = await dataAPI.rejectDestructionRequest(id, reason);
      if (response.data.success) {
        const newDraft = response.data.newDraft;
        if (newDraft) {
          showSuccess(`${response.data.message} Draft baru (ID: ${newDraft.request_id}) telah dibuat untuk pemohon.`);
        } else {
          showSuccess(response.data.message);
        }
        // Re-fetch data to update the list based on current viewMode
        let updatedResponse;
        if (viewMode === "pending-approvals") {
          updatedResponse = await dataAPI.getPendingApprovals({
            page: currentPage,
            limit: itemsPerPage,
            searchTerm: searchTerm,
            selectedColumn: selectedColumn
          });
        } else {
          updatedResponse = await dataAPI.getDestructionRequests({
            page: currentPage,
            limit: itemsPerPage,
            searchTerm: searchTerm,
            selectedColumn: selectedColumn,
            userOnly: false,
            deptOnly: !!(currentUser?.emp_DeptID || user?.emp_DeptID),
            userDept: currentUser?.emp_DeptID || user?.emp_DeptID || '',
            excludeCompleted: false
          });
        }
        if (updatedResponse.data.success) {
          setData(updatedResponse.data.data);
          setTotalItems(updatedResponse.data.pagination.total);
        }
        // Close modal
        setRejectModal({ isOpen: false, itemId: null, loading: false });
      } else {
        showError("Failed to reject: " + response.data.message);
        setRejectModal(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      showError("Error rejecting request.");
      setRejectModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleRejectCancel = () => {
    setRejectModal({ isOpen: false, itemId: null, loading: false });
  };

  const handleDelete = async (id) => {
    const result = await showConfirmation("Are you sure you want to delete this request? This action cannot be undone.", "Confirm Delete");
    if (result.isConfirmed) {
      try {
        const response = await dataAPI.deleteDestructionRequest(id);
        if (response.data.success) {
          showSuccess(response.data.message);
          // Re-fetch dept data to update the list consistently with Dept. Requests tab
          const deptId = currentUser?.emp_DeptID || user?.emp_DeptID || '';
          const updatedResponse = await dataAPI.getDestructionRequests({
            page: currentPage,
            limit: itemsPerPage,
            searchTerm: searchTerm,
            selectedColumn: selectedColumn,
            userOnly: false,
            deptOnly: !!deptId,
            userDept: deptId,
            excludeCompleted: false
          });
          if (updatedResponse.data.success) {
            setData(updatedResponse.data.data);
            setTotalItems(updatedResponse.data.pagination.total);
          }
        } else {
          showError("Failed to delete: " + response.data.message);
        }
      } catch (error) {
        console.error("Error deleting request:", error);
        showError("Error deleting request.");
      }
    }
  };

  const handleSubmit = async (id) => {
    const result = await showConfirmation("Are you sure you want to submit this request for approval?", "Confirm Submit");
    if (result.isConfirmed) {
      try {
        const response = await dataAPI.submitDestructionRequest(id);
        if (response.data.success) {
          showSuccess(response.data.message);
          // Re-fetch dept data to update the list consistently with Dept. Requests tab
          const deptId = currentUser?.emp_DeptID || user?.emp_DeptID || '';
          const updatedResponse = await dataAPI.getDestructionRequests({
            page: currentPage,
            limit: itemsPerPage,
            searchTerm: searchTerm,
            selectedColumn: selectedColumn,
            userOnly: false,
            deptOnly: !!deptId,
            userDept: deptId,
            excludeCompleted: false
          });
          if (updatedResponse.data.success) {
            setData(updatedResponse.data.data);
            setTotalItems(updatedResponse.data.pagination.total);
          }
        } else {
          showError("Failed to submit: " + response.data.message);
        }
      } catch (error) {
        console.error("Error submitting request:", error);
        showError("Error submitting request.");
      }
    }
  };

  // Role-based permissions (using centralized accessRights)
  const isPemohon = checkIsPemohon(user);
  const isManager = checkIsManager(user);
  const isHSE = checkIsHSE(user);

  // Job-level-based data action permissions (centralized in accessRights)
  // Job_LevelID >= 7 (operator/pelaksana) can only create draft, view, edit
  // Job_LevelID 1-6 can also submit and delete
  const canSubmitData = checkCanSubmitAjuan(user);
  const canDeleteData = checkCanDeleteAjuan(user);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Search and Filter Controls */}
      <div className="p-6 border-b border-gray-200 space-y-4">
        <div className="flex items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder={selectedColumn ? `Search in ${columnOptions.find(col => col.value === selectedColumn)?.label}...` : "Search across all columns..."}
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-4">
            {/* Column Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedColumn}
                onChange={handleColumnChange}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {columnOptions.map((column) => (
                  <option key={column.value} value={column.value}>
                    {column.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <ChevronDownIcon />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Status Display */}
        {(searchTerm || (selectedColumn && selectedColumn !== 'noPermohonan')) && (
          <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
            <span>Filtering:</span>
            {selectedColumn && selectedColumn !== 'noPermohonan' && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                Column: {columnOptions.find(col => col.value === selectedColumn)?.label}
              </span>
            )}
            {searchTerm && (
              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                Search: "{searchTerm}"
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedColumn("noPermohonan");
                setCurrentPage(1);
              }}
              className="text-red-600 hover:text-red-800 text-xs underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tgl. Pengajuan
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100 transition-colors"
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              >
                <span className="flex items-center gap-1">
                  No. Permohonan
                  <span className="inline-flex flex-col text-[10px] leading-none">
                    <span className={sortOrder === 'asc' ? 'text-green-600' : 'text-gray-300'}>▲</span>
                    <span className={sortOrder === 'desc' ? 'text-green-600' : 'text-gray-300'}>▼</span>
                  </span>
                </span>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bagian
              </th>
              {isApproverView && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56 min-w-[14rem]">
                  Pemohon
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Golongan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading || referenceLoading ? (
              <tr>
                <td colSpan={isApproverView ? "8" : "7"} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                  Loading data...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={isApproverView ? "8" : "7"} className="px-6 py-4 whitespace-nowrap text-sm text-center text-red-600">
                  {error}
                </td>
              </tr>
            ) : data.length > 0 ? (
              data.map((item) => {
                // Find golongan name by ID
                const golonganName = golonganOptions.find(g => g.id === item.golongan_limbah_id)?.label || 'N/A';
                // Find jenis data by ID (now includes separated kode and jenis)
                const jenisData = jenisOptions.find(j => j.id === item.jenis_limbah_b3_id);
                const jenisName = jenisData?.jenis_limbah || 'N/A'; // Use the separated jenis_limbah field
                
                // Check if current user is in the same department as the request.
                // This governs who can edit/submit/delete a Draft (anyone in the same dept).
                const itemBagian = (item.bagian || '').toString().trim().toUpperCase();
                const userDeptID = (currentUser?.emp_DeptID || user?.emp_DeptID || '').toString().trim().toUpperCase();
                const isSameDept = itemBagian !== '' && userDeptID !== '' && itemBagian === userDeptID;
                
                return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTimestamp(item.tanggal)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-[11rem]">
                    <div className="truncate" title={item.noPermohonan || '-'}>{item.noPermohonan || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.bagian || '-'}</td>
                  {isApproverView && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-56 min-w-[14rem] max-w-[14rem]">
                      <div className="truncate" title={item.requesterName || 'Unknown'}>{item.requesterName || 'Unknown'}</div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{golonganName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-[12rem]">
                    <div className="truncate" title={jenisName}>{jenisName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span
                      className="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      style={getStatusStyle(item.status)}
                    >
                      {getStatusDisplayName(item.status, item.currentStepLevel)}
                    </span>
                    {viewMode === 'my-requests' && item.status === 'Completed' && item.bap_status && item.bap_status !== 'Completed' && (
                      <button
                        className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors cursor-pointer"
                        title="Klik untuk melihat detail Berita Acara"
                        onClick={() => {
                          if (onNavigate && item.berita_acara_id) {
                            onNavigate('detail-berita-acara', {
                              id: item.berita_acara_id,
                              from: {
                                page: 'daftar-ajuan',
                                pageAlias: groupFilter ? `daftar-ajuan-${groupFilter === 'limbah-b3' ? 'b3' : groupFilter === 'recall-precursor' ? 'recall-precursor-oot' : groupFilter}` : 'daftar-ajuan-b3',
                                viewMode: viewMode,
                                group: groupFilter,
                                pageNumber: currentPage
                              }
                            });
                          }
                        }}
                      >
                        BAP: {item.bap_status}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1 text-xs bg-sky-100 text-sky-700 rounded hover:bg-sky-200 transition-colors"
                        onClick={() => {
                          setDetailModal({ isOpen: true, itemId: item.id });
                        }}
                        title="View Details"
                      >
                        View
                      </button>

                      {renderActions(item, isSameDept)}
                    </div>
                  </td>
                </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={isApproverView ? "8" : "7"} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">No data available.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {totalItems > 0 ? startIndex + 1 : 0} - {Math.min(endIndex, totalItems)} results of {totalItems}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Page</span>
              <select
                value={currentPage}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                disabled={totalPages === 0}
              >
                {Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1).map((page) => (
                  <option key={page} value={page}>
                    {page.toString().padStart(2, "0")}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      <RejectModal
        isOpen={rejectModal.isOpen}
        onClose={handleRejectCancel}
        onConfirm={handleRejectConfirm}
        itemId={rejectModal.itemId}
        loading={rejectModal.loading}
      />
      {/* Approve Modal */}
      <ApproveModal
        isOpen={approveModal.isOpen}
        onClose={() => setApproveModal({ isOpen: false, itemId: null, loading: false })}
        onConfirm={handleApproveConfirm}
        loading={approveModal.loading}
      />
      {/* Detail Ajuan Modal */}
      {detailModal.isOpen && (
        <DetailAjuan
          asModal={true}
          onClose={() => {
            setDetailModal({ isOpen: false, itemId: null });
            setRefreshKey(prev => prev + 1);
          }}
          applicationId={detailModal.itemId}
          navigationData={{ fromView: viewMode, group: groupFilter }}
          onNavigate={onNavigate}
        />
      )}

    </div>
  );
};

export default DataTable;
