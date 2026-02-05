import { useState, useEffect } from "react";
import { dataAPI } from "../services/api";
import { formatDateTimeID, formatDateID, toJakartaIsoFromLocal } from "../utils/time";
import { getBaseUrl } from "../utils/urlHelper";
import { TokenManager } from "../utils/tokenManager";
import { useAuth } from "../contexts/AuthContext";
import { useConfigContext } from "../contexts/ConfigContext";
import DownloadLabelModal from "../components/DownloadLabelModal";
import FieldVerificationModal from "../components/FieldVerificationModal";
import RejectModal from "../components/RejectModal";
import ApproveModal from "../components/ApproveModal";
import WorkflowSteps from "../components/WorkflowSteps";
import { showSuccess, showError, showInfo } from "../utils/sweetAlert";
import { 
  getJenisDisplayName, 
  getStatusDisplayName, 
  DEFAULT_JENIS_OPTIONS,
  DEFAULT_GOLONGAN_OPTIONS
} from "../constants/referenceData";
import { canShowApprovalActions } from "../constants/accessRights";

// Use centralized Jakarta formatters so displayed timestamps match stored Jakarta wall-clock
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  return formatDateTimeID(timestamp);
};

const DetailAjuan = ({ onNavigate, applicationId, navigationData = {} }) => {
  const { user } = useAuth();
  const { getStatusStyle } = useConfigContext();
  const [data, setData] = useState(null);
  const [rawApiData, setRawApiData] = useState(null); // Store raw API data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showFieldVerificationModal, setShowFieldVerificationModal] = useState(false);
  const [permohonanLoading, setPermohonanLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState({ isOpen: false, itemId: null, loading: false });
  const [approveModal, setApproveModal] = useState({ isOpen: false, loading: false });
  const [jenisOptions, setJenisOptions] = useState([]);
  const [golonganOptions, setGolonganOptions] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0); // Add refresh key
  const [lampiranFilter, setLampiranFilter] = useState({
    namaLimbah: '',
    bobot: '',
    nomorAnalisa: ''
  });

  // Function to force refresh data
  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Filter lampiran berdasarkan kriteria
  const getFilteredLampiran = () => {
    if (!data?.lampiran) return [];
    
    return data.lampiran.filter(item => {
      return (
        (lampiranFilter.namaLimbah === '' || item.namaLimbah.toLowerCase().includes(lampiranFilter.namaLimbah.toLowerCase())) &&
        (lampiranFilter.bobot === '' || (item.bobot || '').toString().includes(lampiranFilter.bobot)) &&
        (lampiranFilter.nomorAnalisa === '' || (item.nomorAnalisa || '').toLowerCase().includes(lampiranFilter.nomorAnalisa.toLowerCase()))
      );
    });
  };

  // If navigationData.fromView === 'approved', hide approve/reject actions
  const fromApprovedTab = navigationData?.fromView === 'approved';

  // Mock data for development - replace with API call
  useEffect(() => {
    const fetchApplicationDetail = async () => {
      setLoading(true);
      try {
        // Fetch reference data first
        const referenceResponse = await dataAPI.getReferenceData();
        if (referenceResponse.data.success) {
          setJenisOptions(referenceResponse.data.data.jenisLimbah || []);
          setGolonganOptions(referenceResponse.data.data.golonganLimbah || []);
        }
        
        if (!applicationId) {
          setError("ID permohonan tidak tersedia. Kembali ke daftar ajuan.");
          setLoading(false);
          return;
        }

        // Use real API call
        const response = await dataAPI.getDestructionRequestById(applicationId);
        if (response.data.success) {
          const apiData = response.data.data;
          setRawApiData(apiData); // Store raw data for later transformation
        } else {
          setError(response.data.message || "Gagal memuat detail ajuan");
        }
      } catch (err) {
        setError("Gagal memuat detail ajuan");
        console.error("Error fetching application detail:", err);
        setLoading(false);
      }
    };

    fetchApplicationDetail();
  }, [applicationId, refreshKey]);

  // Transform raw API data once reference data is available
  useEffect(() => {
    if (rawApiData && golonganOptions.length > 0) {
      const apiData = rawApiData;
      
      // Transform API data to match component structure
      const transformedData = {
        id: apiData.request_id,
        noPermohonan: apiData.nomor_permohonan || apiData.request_id,
        status: apiData.status || "Draft",
        alasanPenolakan: apiData.alasan_penolakan, // Add rejection reason
        currentStepLevel: apiData.CurrentStep?.step_level || null, // Add current step level
        processedByCurrentUser: apiData.processedByCurrentUser || false,
        pemohon: {
          name: apiData.requester_name || "Unknown",
          // Only set submittedAt when the request has been submitted (not Draft)
          // Prefer backend-provided `submitted_at` (set on submit). If missing, use Jakarta now
          submittedAt: (apiData.status && apiData.status !== 'Draft') ? (apiData.submitted_at || toJakartaIsoFromLocal()) : null,
          deptId: apiData.requester_dept_id || null // Add department ID for workflow step labeling
        },
        // Workflow steps will be handled by WorkflowSteps component
        details: {
          bentuk: apiData.bentuk_limbah || "Unknown",
          bagian: apiData.bagian || "Unknown",
          tanggalPengajuan: apiData.created_at ? formatDateID(apiData.created_at) : "",
          jumlahItem: (apiData.jumlah_item !== undefined && apiData.jumlah_item !== null)
            ? apiData.jumlah_item.toString()
            : (apiData.DetailLimbahs ? apiData.DetailLimbahs.length.toString() : "0"),
          jumlahWadah: apiData.DetailLimbahs ? (() => {
            const uniqueWadah = new Set();
            apiData.DetailLimbahs.forEach(detail => {
              if (detail.nomor_wadah && detail.nomor_wadah.toString().trim() !== '') {
                uniqueWadah.add(detail.nomor_wadah.toString().trim());
              }
            });
            return uniqueWadah.size.toString();
          })() : "0",
          bobotTotal: apiData.DetailLimbahs ? apiData.DetailLimbahs.reduce((sum, detail) => sum + (parseFloat(detail.bobot) || 0), 0).toString() : "0",
          golongan_limbah_id: apiData.golongan_limbah_id,
          jenis_limbah_b3_id: apiData.jenis_limbah_b3_id,
          // Add golongan limbah name for WorkflowSteps
          golonganLimbah: golonganOptions.find(g => g.id === apiData.golongan_limbah_id)?.label || 'Unknown'
        },
        isProdukPangan: apiData.is_produk_pangan || false,
        lampiran: apiData.DetailLimbahs ? apiData.DetailLimbahs.map((detail, index) => ({
          no: index + 1,
          jenis_limbah_b3_id: apiData.jenis_limbah_b3_id,
          nomorReferensi: detail.nomor_referensi || "-",
          namaLimbah: detail.nama_limbah || "Unknown",
          nomorAnalisa: detail.nomor_analisa || "-",
          nomorWadah: detail.nomor_wadah || "-",
          jumlahBarang: detail.jumlah_barang || "-",
          satuan: detail.satuan || "Unknown",
          bobot: detail.bobot || "0",
          alasanPemusnahan: detail.alasan_pemusnahan || "Unknown"
        })) : []
      };
      
  // Transformed data ready for rendering
      setData(transformedData);
      setLoading(false);
    }
  }, [rawApiData, golonganOptions]);

  // Listen for custom refresh events (e.g., after edit save)
  useEffect(() => {
    const handleRefresh = (event) => {
      if (event.detail?.applicationId === applicationId) {
        refreshData();
      }
    };

    window.addEventListener('refreshDetailAjuan', handleRefresh);
    return () => {
      window.removeEventListener('refreshDetailAjuan', handleRefresh);
    };
  }, [applicationId]);

  const handleBack = () => {
    if (onNavigate) {
      // Use navigation context if available, otherwise fallback to default
      const fromContext = navigationData?.from;
      if (fromContext && fromContext.page) {
        onNavigate(fromContext.page, {
          pageAlias: fromContext.pageAlias,
          viewMode: fromContext.viewMode,
          group: fromContext.group,
          pageNumber: fromContext.pageNumber
        });
      } else {
        onNavigate("daftar-ajuan");
      }
    }
  };

  // Approve/Reject handlers (mirrors DataTable logic)
  // Open approve confirmation modal
  const handleApprove = (id) => {
    setApproveModal({ isOpen: true, loading: false, id });
  };

  // Confirm approval from modal
  const handleApproveConfirm = async () => {
    const id = approveModal.id || applicationId || data?.id;
    setApproveModal(prev => ({ ...prev, loading: true }));
    try {
      const response = await dataAPI.approveDestructionRequest(id);
      if (response.data.success) {
        showSuccess(response.data.message);
        
        // IMPORTANT: Force refresh the request data to get updated status
        const updatedRequest = await dataAPI.getDestructionRequestById(id);
          if (updatedRequest.data.success) {
          // Update the raw API data which will trigger the transform effect
          setRawApiData(updatedRequest.data.data);
        }
        
        // Refresh events for other components
        window.dispatchEvent(new CustomEvent('ajuanDataRefresh'));
        window.dispatchEvent(new CustomEvent('refreshPendingApprovals'));
        
        // Navigate back to daftar-ajuan after successful approval
        if (onNavigate) {
          onNavigate('daftar-ajuan');
        } else {
          window.location.href = '/daftar-ajuan';
        }
      } else {
        showError("Failed to approve: " + response.data.message);
      }
    } catch (error) {
      console.error("Error approving request:", error);
      showError("Error approving request.");
    } finally {
      setApproveModal({ isOpen: false, loading: false });
    }
  };

  const handleReject = (id) => {
    setRejectModal({ isOpen: true, itemId: id, loading: false });
  };

  const handleRejectConfirm = async (id, reason) => {
    setRejectModal(prev => ({ ...prev, loading: true }));
    try {
      const response = await dataAPI.rejectDestructionRequest(id, reason);
      if (response.data.success) {
        showSuccess(response.data.message);
        setRejectModal({ isOpen: false, itemId: null, loading: false });
        refreshData();
        window.dispatchEvent(new CustomEvent('ajuanDataRefresh'));
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat detail ajuan...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading screen when generating permohonan PDF
  if (permohonanLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Generating Form Permohonan...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button 
            onClick={handleBack}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Kembali ke Daftar Ajuan
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">Data tidak ditemukan</p>
          <button 
            onClick={handleBack}
            className="mt-2 text-green-600 hover:text-green-800 underline"
          >
            Kembali ke Daftar Ajuan
          </button>
        </div>
      </div>
    );
  }

  // Determine if item is a 'Recall'
  const isRecall = (data.details.golonganLimbah || '').toLowerCase().includes('recall');

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="text-sm text-gray-500 mb-2">
          <button 
            onClick={handleBack}
            className="text-gray-500 hover:text-gray-700"
          >
            Limbah B3
          </button>
          <span className="mx-2">›</span>
          <span className="text-gray-900">Detail Ajuan Pemusnahan</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Detail Ajuan Pemusnahan</h1>
            <p className="mt-2 text-gray-600">Detail informasi ajuan pemusnahan limbah B3.</p>
          </div>
          <div className="flex gap-3">
            {/* Show Download Label together with Verifikasi Lapangan when verification step is active */}
            {data?.currentStepLevel === 3 && (
              <>
                <button
                  onClick={() => setShowDownloadModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  Download Label
                </button>

                <button
                  onClick={() => setShowFieldVerificationModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Verifikasi Lapangan
                </button>
              </>
            )}

            {/* Show download button when status is Completed */}
            {data?.status === 'Completed' && (
              <>
                <button
                  onClick={async () => {
                    // Download Excel lampiran
                    const id = applicationId || data?.id;
                    if (!id) {
                      showError('ID permohonan tidak tersedia');
                      return;
                    }

                    try {
                      setExcelLoading(true);
                      const response = await dataAPI.downloadPermohonanExcel(id);
                      
                      if (response.data.success && response.data.data) {
                        // Create and download Excel file
                        const arrayBuffer = response.data.data;
                        const blob = new Blob([arrayBuffer], { 
                          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                        });
                        
                        // Create download link
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `detail-limbah-${data?.noPermohonan || id}.xlsx`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        
                        console.log('Excel file downloaded successfully');
                      } else {
                        showError('Gagal mengunduh lampiran Excel: ' + (response.data.message || 'Unknown error'));
                      }
                    } catch (err) {
                      console.error('Error downloading Excel:', err);
                      showError('Gagal mengunduh lampiran Excel');
                    } finally {
                      setExcelLoading(false);
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                  disabled={excelLoading}
                >
                  {excelLoading ? 'Downloading...' : 'Download Lampiran'}
                </button>

                <button
                  onClick={async () => {
                    // Directly generate PDF without opening modal
                    const id = applicationId || data?.id;
                  if (!id) return;
                  try {
                    setPermohonanLoading(true);
                    
                    // Fetch permohonan data first to get the required info
                    const res = await dataAPI.getPermohonanDataForDoc(id);
                    if (!res.data.success) {
                      showError(res.data?.message || 'Gagal memuat data permohonan');
                      return;
                    }
                    
                    const permohonanData = res.data.data;
                    const BASE_URL_FE = getBaseUrl();
                    const link = `${BASE_URL_FE}/permohonan-pemusnahan/print/${id}`;
                    const createdAt = permohonanData?.tanggal_pengajuan || new Date().toISOString();

                    // Try to call the print API directly with authentication
                    try {
                      const printRes = await dataAPI.printPermohonanPemusnahan({ requestId: id, link, createdAt });
                      if (printRes?.data?.success && printRes.data.data) {
                        // response.data.data is an ArrayBuffer
                        const arrayBuffer = printRes.data.data;
                        const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
                        const url = window.URL.createObjectURL(blob);
                        window.open(url, '_blank');
                        console.log('PDF generated successfully');
                      } else {
                        console.warn('Print request failed:', printRes?.data?.message);
                        // Fallback to direct URL with token
                        const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
                        const printUrl = `${BASE_URL}/document-generation/print-permohonan-pemusnahan?link=${encodeURIComponent(link)}&createdAt=${encodeURIComponent(createdAt)}`;
                        window.open(TokenManager.addTokenToUrl(printUrl), '_blank');
                      }
                    } catch (printErr) {
                      console.warn('Print API call failed:', printErr.message);
                      // Fallback to direct URL with token
                      const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
                      const printUrl = `${BASE_URL}/document-generation/print-permohonan-pemusnahan?link=${encodeURIComponent(link)}&createdAt=${encodeURIComponent(createdAt)}`;
                      window.open(TokenManager.addTokenToUrl(printUrl), '_blank');
                    }
                  } catch (err) {
                    console.error('Error generating PDF:', err);
                    showError('Gagal membuat PDF permohonan');
                  } finally {
                    setPermohonanLoading(false);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                disabled={permohonanLoading}
              >
                {permohonanLoading ? 'Generating...' : 'Generate Form Permohonan'}
              </button>
              </>
            )}

            {/* Approve/Reject buttons moved below the Lampiran table */}

            <button
              onClick={handleBack}
              className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                No. Permohonan : {data.noPermohonan}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-500">Status :</span>
              <span
                className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={getStatusStyle(data.status)}
              >
                {getStatusDisplayName(data.status, data.currentStepLevel)}
              </span>
            </div>
          </div>
        </div>

        {/* Approval Workflow */}
        <div className="p-6 border-b border-gray-200">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Status Persetujuan</h3>
          </div>
          <WorkflowSteps 
            requestId={data.id}
            currentStatus={data.status}
            requesterName={data.pemohon.name}
            submittedAt={data.pemohon.submittedAt}
            golonganLimbahId={data.details.golongan_limbah_id}
            golonganLimbahName={data.details.golonganLimbah}
            currentStepLevel={data.currentStepLevel}
            isProdukPangan={data.isProdukPangan}
            pemohonDeptId={data.pemohon.deptId}
          />
        </div>

        {/* Manager Feedback Section - Show if draft with rejection reason */}
        {data.status === "Draft" && data.alasanPenolakan && (
          <div className="p-6 border-b border-gray-200">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 text-yellow-400">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Dikembalikan oleh Manager
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p className="font-medium">Feedback Manager:</p>
                    <p className="mt-1">{data.alasanPenolakan}</p>
                    <p className="mt-2 font-medium">Silakan perbaiki permohonan dan submit ulang.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Rejection Reason Section - Only show if status is Rejected */}
        {data.status === "Rejected" && data.alasanPenolakan && (
          <div className="p-6 border-b border-gray-200">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 text-red-400">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Permohonan Ditolak
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p className="font-medium">Alasan Penolakan:</p>
                    <p className="mt-1">{data.alasanPenolakan}</p>
                    <p className="mt-2 font-medium">Permohonan ini telah ditolak secara permanen dan tidak dapat diperbaiki.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detail Ajuan Section */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail Ajuan</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bentuk</label>
              <p className="text-gray-900">{data.details.bentuk}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bagian</label>
              <p className="text-gray-900">{data.details.bagian}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pengajuan</label>
              <p className="text-gray-900">{data.details.tanggalPengajuan}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Item</label>
              <p className="text-gray-900">{data.details.jumlahItem}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Wadah</label>
              <p className="text-gray-900">{data.details.jumlahWadah}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bobot Total (gram)</label>
              <p className="text-gray-900">{data.details.bobotTotal}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Golongan</label>
              <p className="text-gray-900">
                {golonganOptions.find(g => g.id === data.details.golongan_limbah_id)?.label || 'Unknown'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jenis</label>
              <p className="text-gray-900">
                {(() => {
                  const jenisData = jenisOptions.find(j => j.id === data.details.jenis_limbah_b3_id);
                  return jenisData?.jenis_limbah || 'Unknown'; // Use the separated jenis_limbah field
                })()}
              </p>
            </div>

            {isRecall && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produk Pangan</label>
                <p className="text-gray-900">{data.isProdukPangan ? 'Ya' : 'Tidak'}</p>
              </div>
            )}
            
          </div>
        </div>

        {/* Lampiran Section */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lampiran</h3>
          
          {/* Filter Controls */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter Nama Limbah
              </label>
              <input
                type="text"
                placeholder="Cari nama limbah..."
                value={lampiranFilter.namaLimbah}
                onChange={(e) => setLampiranFilter({ ...lampiranFilter, namaLimbah: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter Bobot (gram)
              </label>
              <input
                type="text"
                placeholder="Cari bobot..."
                value={lampiranFilter.bobot}
                onChange={(e) => setLampiranFilter({ ...lampiranFilter, bobot: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter No. Bets/No. Analisa
              </label>
              <input
                type="text"
                placeholder="Cari no. analisa..."
                value={lampiranFilter.nomorAnalisa}
                onChange={(e) => setLampiranFilter({ ...lampiranFilter, nomorAnalisa: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          
          {/* Results count */}
          <div className="mb-3 text-sm text-gray-600">
            Menampilkan {getFilteredLampiran().length} dari {data?.lampiran?.length || 0} data
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-green-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    No. Dokumen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Jenis Limbah
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Kode Limbah
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Nama Limbah
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    No. Bets/No. Analisa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Jumlah Barang
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Satuan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    No. Wadah
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Bobot (gram)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                    Alasan Pemusnahan
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getFilteredLampiran().length > 0 ? getFilteredLampiran().map((item, idx) => {
                  const jenisData = jenisOptions.find(j => j.id === item.jenis_limbah_b3_id);
                  
                  return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.nomorReferensi || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {jenisData?.jenis_limbah || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {jenisData?.kode_limbah || item.kodeLimbah || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.namaLimbah}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.nomorAnalisa || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.jumlahBarang || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.satuan}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.nomorWadah || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {parseFloat(item.bobot || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.alasanPemusnahan || '-'}
                    </td>
                  </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="11" className="px-6 py-4 text-center text-sm text-gray-500">
                      Tidak ada data yang sesuai dengan filter
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
            {/* Action buttons for approvers - placed below Lampiran table */}
            {/* Using centralized access rights check (see src/constants/accessRights.js) */}
            {canShowApprovalActions(user, data, fromApprovedTab) && (
              <div className="p-6 border-t border-gray-200 flex items-center gap-3 justify-end">
                <button
                  onClick={() => handleApprove(applicationId || data.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(applicationId || data.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  Reject
                </button>
              </div>
            )}
      </div>
      
      {/* Download Label Modal */}
      <DownloadLabelModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        requestId={applicationId || data?.id}
      />

      <FieldVerificationModal
        isOpen={showFieldVerificationModal}
        onClose={() => setShowFieldVerificationModal(false)}
        onComplete={(verificationData) => {
          setShowFieldVerificationModal(false);
          showSuccess(`Verifikasi lapangan selesai dengan status: ${verificationData.status}`);
          refreshData();
        }}
        ajuanData={{ 
          id: applicationId || data?.id, 
          noPermohonan: data?.noPermohonan,
          bagian: data?.details?.bagian || rawApiData?.bagian
        }}
      />
      <ApproveModal
        isOpen={approveModal.isOpen}
        onClose={() => setApproveModal({ isOpen: false, loading: false })}
        onConfirm={handleApproveConfirm}
        loading={approveModal.loading}
      />
      <RejectModal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, itemId: null, loading: false })}
        onConfirm={handleRejectConfirm}
        itemId={rejectModal.itemId}
        loading={rejectModal.loading}
      />
    </div>
  );
};

export default DetailAjuan;
