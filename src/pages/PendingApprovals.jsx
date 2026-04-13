import { useState, useEffect } from "react";
import { dataAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useConfigContext } from "../contexts/ConfigContext";
import RejectModal from "../components/RejectModal";
import ApproveModal from "../components/ApproveModal";
import DetailAjuan from "./DetailAjuan";
import { formatDateID } from "../utils/time";
import { 
  getJenisDisplayName, 
  getStatusDisplayName, 
  DEFAULT_JENIS_OPTIONS,
  DEFAULT_GOLONGAN_OPTIONS
} from "../constants/referenceData";
import { showSuccess, showError } from "../utils/sweetAlert";

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

// Use Jakarta formatter to display date as DD/MM/YYYY
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  return formatDateID(timestamp).replace(/\//g, '-').split('/').join('-');
};

const PendingApprovals = ({ onNavigate }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColumn, setSelectedColumn] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jenisOptions, setJenisOptions] = useState(DEFAULT_JENIS_OPTIONS);
  const [golonganOptions, setGolonganOptions] = useState(DEFAULT_GOLONGAN_OPTIONS);
  const [referenceLoading, setReferenceLoading] = useState(true);
  
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

  useEffect(() => {
    const fetchPendingApprovals = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch pending approvals for this user
        const response = await dataAPI.getPendingApprovals({
          page: currentPage,
          limit: itemsPerPage,
          searchTerm: searchTerm,
          selectedColumn: selectedColumn,
        });
        
        if (response.data.success) {
          setData(response.data.data);
          setTotalItems(response.data.pagination.total);
        } else {
      {/* Approve Modal */}
      <ApproveModal
        isOpen={approveModal.isOpen}
        onClose={() => setApproveModal({ isOpen: false, itemId: null, loading: false })}
        onConfirm={handleApproveConfirm}
        loading={approveModal.loading}
      />
          setError(response.data.message || "Failed to fetch pending approvals.");
        }
      } catch (err) {
        console.error("Error fetching pending approvals:", err);
        setError("Error fetching pending approvals.");
      } finally {
        setLoading(false);
      }
    };

    fetchPendingApprovals();
  }, [currentPage, searchTerm, selectedColumn, user]);

  // Define column mappings
  const columnOptions = [
    { value: "tanggal", label: "Tgl. Pengajuan" },
    { value: "noPermohonan", label: "No. Permohonan" },
    { value: "requesterName", label: "Pemohon" },
    { value: "bagian", label: "Bagian" },
    { value: "golongan", label: "Golongan" },
    { value: "jenis", label: "Jenis" },
    { value: "status", label: "Status" }
  ];

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

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
        // Re-fetch data to update the list
        const updatedResponse = await dataAPI.getPendingApprovals({
          page: currentPage,
          limit: itemsPerPage,
          searchTerm: searchTerm,
          selectedColumn: selectedColumn,
        });
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
        // Re-fetch data to update the list
        const updatedResponse = await dataAPI.getPendingApprovals({
          page: currentPage,
          limit: itemsPerPage,
          searchTerm: searchTerm,
          selectedColumn: selectedColumn,
        });
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <nav className="text-sm text-gray-500 mb-2">
          <span>Limbah B3</span>
          <span className="mx-2">›</span>
          <span className="text-gray-900">Pending Approvals</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pending Approvals</h1>
            <p className="mt-2 text-gray-600">Daftar ajuan yang menunggu persetujuan Anda. Hanya menampilkan ajuan yang memerlukan tindakan dari Anda saat ini.</p>
          </div>
        </div>
      </div>

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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-4">
              {/* Filter Icon */}
              <button className="p-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                <FilterIcon />
              </button>

              {/* Column Filter Dropdown */}
              <div className="relative">
                <select
                  value={selectedColumn}
                  onChange={handleColumnChange}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">- All Columns -</option>
                  {columnOptions.map((column) => (
                    <option key={column.value} value={column.value}>
                      {column.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tgl. Pengajuan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No. Permohonan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56 min-w-[14rem]">
                  Pemohon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bagian
                </th>
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
                  <td colSpan="8" className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">
                    Loading data...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 whitespace-nowrap text-sm text-center text-red-600">
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
                  
                  return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTimestamp(item.tanggal)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-[11rem]">
                        <div className="truncate" title={item.noPermohonan || '-'}>{item.noPermohonan || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 w-56 min-w-[14rem] max-w-[14rem]">
                        <div className="truncate" title={item.requesterName || '-'}>{item.requesterName || '-'}</div>
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.bagian}</td>
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <button
                          className="px-3 py-1 text-xs bg-sky-100 text-sky-700 rounded hover:bg-sky-200 transition-colors"
                          onClick={() => setDetailModal({ isOpen: true, itemId: item.id })}
                          title="View Details"
                        >
                          View
                        </button>
                        
                        {/* InProgress status - show approve/reject for authorized users */}
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
                            {/* Manager can also edit at first step level */}
                            {item.currentStepLevel === 1 && (
                              <button
                                className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                                onClick={() => onNavigate && onNavigate('edit-ajuan-pemusnahan', { id: item.id })}
                                title="Edit Request"
                              >
                                Edit
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-gray-400 mb-2">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-sm">No pending approvals.</p>
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
                  className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
        {/* Detail Ajuan Modal */}
        {detailModal.isOpen && (
          <DetailAjuan
            asModal={true}
            onClose={() => {
              setDetailModal({ isOpen: false, itemId: null });
              // Trigger refresh of pending approvals list
              window.dispatchEvent(new CustomEvent('refreshPendingApprovals'));
            }}
            applicationId={detailModal.itemId}
            navigationData={{}}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </div>
  );
};

export default PendingApprovals;
