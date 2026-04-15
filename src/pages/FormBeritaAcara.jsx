import { useState, useEffect } from "react";
import { dataAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { toJakartaIsoFromLocal, formatDateID, formatDateTimeID, formatTimeID, formatTimeHHMM } from "../utils/time";
import { showSuccess, showError, showWarning, showInfo, showConfirmation } from "../utils/sweetAlert";
import { isPemohon as checkIsPemohon, canCreateBeritaAcaraByDeptLevel } from "../constants/accessRights";

// Simple CSS icons as components
const ChevronDownIcon = () => (
  <div className="w-4 h-4 flex items-center justify-center">
    <div className="w-2 h-2 border-b-2 border-r-2 border-current transform rotate-45"></div>
  </div>
);

function formatDateToDDMMYYYY(dateStr) {
  // Use centralized Jakarta formatter; if input is an ISO or date-like, format as DD/MM/YYYY
  if (!dateStr) return '';
  const f = formatDateID(dateStr);
  return f || String(dateStr);
}

function formatTime24Hour(timeStr) {
  if (!timeStr) return '';
  // If already an HH:MM:SS string, normalize; otherwise try to parse via Jakarta util
  if (timeStr.includes(':')) {
    const [h,m,s] = timeStr.split(':');
    return `${(h||'00').padStart(2,'0')}:${(m||'00').padStart(2,'0')}:${(s||'00').padStart(2,'0')}`;
  }
  // Fallback: try formatting as Jakarta time
  // formatTimeHHMM returns HH:MM; prefer formatTimeID which returns HH:MM:SS
  const f = formatTimeID(timeStr);
  return f || String(timeStr);
}

const FormBeritaAcara = ({ onNavigate, group }) => {
  const { user } = useAuth();

  const getLocalDateISO = () => {
    // Build Jakarta ISO from local now and take YYYY-MM-DD portion so date inputs match Jakarta date
    const iso = toJakartaIsoFromLocal();
    return iso.split('T')[0];
  };

  const getLocalTimeHHMMSS = () => {
    // Build Jakarta ISO and extract time components
    const iso = toJakartaIsoFromLocal();
    const timePart = iso.split('T')[1] || '';
    const hhmmss = timePart.split('+')[0] || '';
    return hhmmss || '00:00:00';
  };

  const [form, setForm] = useState({
    bagian: "", // Single department (string) - one BAP must belong to exactly one bagian
    startDate: getLocalDateISO(), // Start of date range in YYYY-MM-DD format
    endDate: getLocalDateISO(), // End of date range in YYYY-MM-DD format
    jam: getLocalTimeHHMMSS(), // Current local time in HH:MM:SS format
    lokasiVerifikasi: "Lapi Kav. 16,18",
    pelaksanaBagian: "",
    supervisorBagian: "",
    pelaksanaHSE: "",
    supervisorHSE: ""
  });

  const [showDaftarPemusnahan, setShowDaftarPemusnahan] = useState(false);
  const [daftarPemusnahan, setDaftarPemusnahan] = useState([]);
  const [daftarGenerated, setDaftarGenerated] = useState(false);
  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatorAllowed, setIsCreatorAllowed] = useState(false);
  const [creatorCheckLoading, setCreatorCheckLoading] = useState(true);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);

  // Fetch available departments from API
  useEffect(() => {
    const fetchDepartments = async () => {
      setDepartmentsLoading(true);
      try {
        const res = await dataAPI.getExternalApprovalList(null);
        if (res.data.success) {
          const items = (res.data.data || []).filter(i =>
            String(i.Appr_ApplicationCode || '') === 'ePengelolaan_Limbah_Berita_Acara' &&
            (Number(i.Appr_No) === 1 || Number(i.Appr_No) === 2)
          );
          // Extract unique department IDs (including 'KL' since HSE can also be pemohon)
          const deptSet = new Set();
          items.forEach(item => {
            const deptId = item.Appr_DeptID;
            if (deptId) {
              deptSet.add(String(deptId).toUpperCase());
            }
          });
          const sortedDepts = Array.from(deptSet).sort();
          setAvailableDepartments(sortedDepts);
        }
      } catch (err) {
        console.error('Error fetching departments:', err);
        setAvailableDepartments([]);
      } finally {
        setDepartmentsLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  // Update bagian when user changes
  useEffect(() => {
    if (user?.emp_DeptID) {
      // Use the department ID directly from user data
      const deptId = String(user.emp_DeptID).toUpperCase();
      
      setForm(prev => ({
        ...prev,
        bagian: deptId // Single string, not array
      }));
    }
  }, [user]);

  // Check if current user is allowed to create Berita Acara
  // 1. Dept+level+group check (QA->recall, PN1->recall-precursor)
  // 2. Fallback: KL officer via external approval API (all groups)
  useEffect(() => {
    let mounted = true;

    // Check centralized dept + job level + group permission first
    if (canCreateBeritaAcaraByDeptLevel(user, group)) {
      if (mounted) {
        setIsCreatorAllowed(true);
        setCreatorCheckLoading(false);
      }
      return () => { mounted = false; };
    }

    // Fallback: KL officer/manager via external approval API
    const checkCreator = async () => {
      setCreatorCheckLoading(true);
      try {
        const res = await dataAPI.getExternalApprovalList(null);
        if (res.data.success) {
          const items = res.data.data || [];
          const appItems = items.filter(i => String(i.Appr_ApplicationCode || '') === 'ePengelolaan_Limbah_Berita_Acara');
          const myNik = user && (user.log_NIK || user.emp_NIK || user.log_nik || user.NIK);
          const allowed = appItems.some(it =>
            String(it.Appr_DeptID || '').toUpperCase() === 'KL' &&
            String(it.Appr_ID) === String(myNik) &&
            (Number(it.Appr_No) === 1 || Number(it.Appr_No) === 2)
          );
          if (mounted) setIsCreatorAllowed(allowed);
        } else {
          if (mounted) setIsCreatorAllowed(false);
        }
      } catch (err) {
        console.error('Error checking creator permission:', err);
        if (mounted) setIsCreatorAllowed(false);
      } finally {
        if (mounted) setCreatorCheckLoading(false);
      }
    };

    checkCreator();
    return () => { mounted = false; };
  }, [user, group]);

  // Reset daftar pemusnahan when bagian or date range changes
  useEffect(() => {
    if (daftarGenerated) {
      setDaftarGenerated(false);
      setDaftarPemusnahan([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.bagian, form.startDate, form.endDate]);

  // Add beforeunload event listener to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      const userDeptId = user?.emp_DeptID ? String(user.emp_DeptID).toUpperCase() : '';
      const hasFormData = Object.entries(form).some(([key, value]) => {
        if (key === 'bagian') {
          // Check if bagian differs from default (user's department)
          return typeof value === 'string' && value !== '' && value !== userDeptId;
        }
        return typeof value === 'string' && value.trim() !== '' && value !== userDeptId;
      });
      
      if (hasFormData || daftarPemusnahan.length > 0) {
        const message = "Anda memiliki perubahan yang belum disimpan. Apakah Anda yakin ingin meninggalkan halaman ini?";
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [form, daftarPemusnahan, user]);

  // Precursor & OOT group uses a date RANGE; all other groups use a single date
  const isPrecursorGroup = group === 'recall-precursor';

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (!isPrecursorGroup && name === 'startDate') {
      // In single-date mode keep startDate and endDate in sync
      setForm({ ...form, startDate: value, endDate: value });
      return;
    }
    setForm({ ...form, [name]: value });
  };

  const fetchDaftarPemusnahan = async () => {
    // Business Rule: One BAP must belong to exactly one bagian
    if (!form.bagian || !form.startDate) {
      showWarning("Bagian dan tanggal verifikasi lapangan harus diisi terlebih dahulu");
      return;
    }
    if (isPrecursorGroup && !form.endDate) {
      showWarning("Bagian dan periode selesai verifikasi lapangan harus diisi terlebih dahulu");
      return;
    }
    if (isPrecursorGroup && new Date(form.startDate) > new Date(form.endDate)) {
      showWarning("Tanggal 'Dari' tidak boleh lebih besar dari tanggal 'Sampai'");
      return;
    }

    // In single-date mode send the same date as both start and end
    const effectiveEndDate = isPrecursorGroup ? form.endDate : form.startDate;

    setIsGenerating(true);
    try {
      // Request server to return only requests for this single bagian, date range, and group
      const response = await dataAPI.getAvailableRequestsForDailyLog({ 
        bagian: form.bagian, // Single string, not array
        startDate: form.startDate,
        endDate: effectiveEndDate,
        group: group || undefined
      });

      if (response.data.success) {
        setDaftarPemusnahan(response.data.data || []);
        setDaftarGenerated(true);

        if ((response.data.data || []).length === 0) {
          showInfo(`Tidak ada permohonan yang selesai diverifikasi untuk bagian ${form.bagian} pada ${isPrecursorGroup ? `periode ${form.startDate} s/d ${form.endDate}` : `tanggal ${form.startDate}`}`);
        }
      } else {
        setDaftarPemusnahan([]);
        setDaftarGenerated(false);
        showError("Error: " + (response.data.message || "Failed to fetch available requests"));
      }
      
    } catch (error) {
      console.error('Error fetching daftar pemusnahan:', error);
      setDaftarPemusnahan([]);
      setDaftarGenerated(false);
      showError("Terjadi kesalahan saat mengambil data pemusnahan");
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setForm({
      bagian: "", // Single department string
      startDate: getLocalDateISO(),
      endDate: getLocalDateISO(),
      jam: getLocalTimeHHMMSS(),
      lokasiVerifikasi: "Lapi Kav. 16,18",
      pelaksanaBagian: "",
      supervisorBagian: "",
      pelaksanaHSE: "",
      supervisorHSE: ""
    });
    setDaftarPemusnahan([]);
    setDaftarGenerated(false);
  };

  const handleCancel = async () => {
    const userDeptId = user?.emp_DeptID ? String(user.emp_DeptID).toUpperCase() : '';
    const hasFormData = Object.entries(form).some(([key, value]) => {
      if (key === 'bagian') {
        return typeof value === 'string' && value !== '' && value !== userDeptId;
      }
      return typeof value === 'string' && value.trim() !== '' && value !== userDeptId;
    });
    
    if (hasFormData || daftarPemusnahan.length > 0) {
      const result = await showConfirmation(
        "Apakah Anda yakin ingin membatalkan? Semua data yang belum disimpan akan hilang.",
        "Konfirmasi Batal"
      );
      
      if (!result.isConfirmed) {
        return;
      }
    }
    
    resetForm();
    
    if (onNavigate) {
      onNavigate("berita-acara");
    }
  };

  const handleKembali = async () => {
    const userDeptId = user?.emp_DeptID ? String(user.emp_DeptID).toUpperCase() : '';
    const hasFormData = Object.entries(form).some(([key, value]) => {
      if (key === 'bagian') {
        return typeof value === 'string' && value !== '' && value !== userDeptId;
      }
      return typeof value === 'string' && value.trim() !== '' && value !== userDeptId;
    });
    
    if (hasFormData || daftarPemusnahan.length > 0) {
      const result = await showConfirmation(
        "Apakah Anda yakin ingin kembali? Semua data yang belum disimpan akan hilang.",
        "Konfirmasi Kembali"
      );
      
      if (!result.isConfirmed) {
        return;
      }
    }
    
    resetForm();
    
    if (onNavigate) {
      onNavigate("berita-acara");
    }
  };

  const validateFormData = () => {
    const errors = [];

    // Business Rule: One BAP must belong to exactly one bagian
    if (!form.bagian || typeof form.bagian !== 'string' || form.bagian.trim() === '') {
      errors.push("Bagian harus diisi");
    }
    if (!form.startDate) {
      errors.push("Tanggal verifikasi lapangan harus diisi");
    }
    if (isPrecursorGroup && !form.endDate) {
      errors.push("Tanggal akhir periode verifikasi lapangan harus diisi");
    }
    if (!form.jam) {
      errors.push("Jam/Waktu harus diisi");
    }
    if (!form.lokasiVerifikasi?.trim()) {
      errors.push("Lokasi verifikasi harus diisi");
    }
    
    // Note: pelaksanaBagian, supervisorBagian, pelaksanaHSE, supervisorHSE
    // will be auto-filled from the selected disposal requests, so we don't validate them here

    if (daftarPemusnahan.length === 0) {
      errors.push("Silakan generate daftar pemusnahan terlebih dahulu");
    }

    // Ensure at least one row is selected when creating Berita Acara
    if (daftarPemusnahan.length > 0 && selectedRequestIds.length === 0) {
      errors.push("Silakan pilih minimal 1 baris dari daftar pemusnahan untuk dibuat Berita Acara");
    }

    return errors;
  };

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateFormData();
    if (validationErrors.length > 0) {
      showError("Mohon perbaiki kesalahan berikut:\n\n" + validationErrors.join("\n"));
      return;
    }
    if (!isCreatorAllowed) {
      showError('Anda tidak memiliki hak untuk membuat Berita Acara. Hanya Supervisor/Officer HSE yang dapat membuat.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Prepare data for API call according to backend BeritaAcara model
      // Build a timezone-aware ISO datetime for the selected local date+time
      // This ensures the backend receives an unambiguous UTC timestamp (with Z)
      // while preserving the original local date/time entered by the user.
      // Build Jakarta ISO from the local components (explicit +07:00 offset)
      const buildLocalIso = () => {
        try {
          // Prefer centralized builder from util by combining date and time into a Date then generating Jakarta ISO
          // Use startDate as the BAP date (represents the beginning of the verification date range)
          const [y, m, d] = (form.startDate || '').split('-').map(Number);
          const [hh, mm, ss] = (form.jam || '00:00:00').split(':').map(Number);
          const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0);
          return toJakartaIsoFromLocal(dt);
        } catch (e) {
          return toJakartaIsoFromLocal();
        }
      };

      // NOTE: bagian and tanggal are NOT sent to backend.
      // They are DERIVED from the selected requests:
      //   - bagian: from the requests themselves (validated for single-bagian)
      //   - tanggal: from ApprovalHistory.decision_date (latest verification completion)
      // This ensures data integrity and prevents user from manipulating these values.
      const beritaAcaraData = {
        waktu: buildLocalIso(), // send explicit Jakarta +07:00 ISO built from local inputs
        lokasi_verifikasi: form.lokasiVerifikasi,
        // Include selected request IDs - backend will derive bagian and tanggal from these
        selectedRequestIds: selectedRequestIds
      };
      
      
      const response = await dataAPI.createBeritaAcara(beritaAcaraData);
      
      if (response.data.success) {
        showSuccess(response.data.message || "Berita acara berhasil dibuat!");
        
        // Navigate back to berita acara list
        // Clear local daftar and selections then navigate
        setDaftarPemusnahan([]);
        setDaftarGenerated(false);
        setSelectedRequestIds([]);
        if (onNavigate) {
          onNavigate("berita-acara");
        }
      } else {
        showError("Error: " + (response.data.message || "Failed to create berita acara"));
      }
    } catch (error) {
      console.error('Error creating berita acara:', error);
      showError("Error saving berita acara.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role-based permission (using centralized accessRights)
  const isPemohon = checkIsPemohon(user);

  return (
    <div className="p-6">
      <div className="mb-6">
        <nav className="text-sm text-gray-500 mb-2">
          <span>Limbah B3</span>
          <span className="mx-2">›</span>
          <span>Berita Acara Pemusnahan</span>
          <span className="mx-2">›</span>
          <span className="text-gray-900">Tambah Berita Acara</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tambah Berita Acara Pemusnahan</h1>
            <p className="mt-2 text-gray-600">Form untuk menambah berita acara pemusnahan.</p>
          </div>
          <button
            className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            onClick={handleKembali}
          >
            Kembali
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bagian</label>
                {/* Business Rule: One BAP must belong to exactly one bagian */}
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                  name="bagian"
                  value={form.bagian}
                  onChange={handleFormChange}
                  disabled={departmentsLoading}
                >
                  <option value="">-- Pilih Bagian --</option>
                  {availableDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">Satu BAP hanya untuk satu bagian</p>
              </div>
              {isPrecursorGroup ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Periode Verifikasi Lapangan</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Dari</span>
                      <input
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        name="startDate"
                        type="date"
                        value={form.startDate}
                        onChange={handleFormChange}
                        title="Tanggal awal periode selesai verifikasi lapangan"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Data ditampilkan berdasarkan tanggal selesai verifikasi lapangan</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Sampai</span>
                      <input
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        name="endDate"
                        type="date"
                        value={form.endDate}
                        onChange={handleFormChange}
                        title="Tanggal akhir periode selesai verifikasi lapangan"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Verifikasi Lapangan</label>
                  <input
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={handleFormChange}
                    title="Tanggal selesai verifikasi lapangan"
                  />
                  <p className="mt-1 text-xs text-gray-500">Data ditampilkan berdasarkan tanggal selesai verifikasi lapangan</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jam/Waktu</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  name="jam"
                  type="time"
                  step="1"
                  value={form.jam}
                  onChange={handleFormChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi Verifikasi</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  name="lokasiVerifikasi"
                  value={form.lokasiVerifikasi}
                  onChange={handleFormChange}
                >
                  <option value="Lapi kav.16,18">Lapi Kav. 16,18</option>
                  <option value="Lapi kav. 22,24">Lapi Kav. 22,24</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pelaksana Bagian</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-600"
                  name="pelaksanaBagian"
                  type="text"
                  value={form.pelaksanaBagian}
                  disabled
                  placeholder="Auto-fetch from data pemusnahan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor Bagian</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-600"
                  name="supervisorBagian"
                  type="text"
                  value={form.supervisorBagian}
                  disabled
                  placeholder="Auto-fetch from data pemusnahan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pelaksana HSE</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-600"
                  name="pelaksanaHSE"
                  type="text"
                  value={form.pelaksanaHSE}
                  disabled
                  placeholder="Auto-fetch from data pemusnahan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor HSE</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-600"
                  name="supervisorHSE"
                  type="text"
                  value={form.supervisorHSE}
                  disabled
                  placeholder="Auto-fetch from data pemusnahan"
                />
              </div>
            </div>

            <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
              <button 
                type="button"
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors duration-200"
                onClick={() => setShowDaftarPemusnahan(!showDaftarPemusnahan)}
              >
                <h3 className="text-lg font-semibold text-gray-900">Daftar Pemusnahan</h3>
                <ChevronDownIcon className={`h-5 w-5 transform transition-transform duration-200 text-gray-500 ${showDaftarPemusnahan ? 'rotate-180' : ''}`} />
              </button>
              
              {showDaftarPemusnahan && (
                <div className="p-4">
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Informasi:</strong> Data ditampilkan berdasarkan bagian dan periode <em>selesai</em> verifikasi lapangan yang dipilih.
                    </p>
                  </div>

                  {/* Generate Button */}
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={fetchDaftarPemusnahan}
                      disabled={!form.bagian || !form.startDate || !form.endDate || isGenerating}
                      className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        "Generate Daftar Pemusnahan"
                      )}
                    </button>
                    {(!form.bagian || !form.startDate || !form.endDate) && (
                      <p className="mt-2 text-sm text-gray-500">
                        Pilih bagian dan periode selesai verifikasi lapangan terlebih dahulu untuk generate daftar pemusnahan.
                      </p>
                    )}
                  </div>

                  {/* Selection controls - placed outside the table */}
                  {daftarGenerated && daftarPemusnahan.length > 0 && (
                    <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <label className="inline-flex items-center text-sm text-gray-700">
                            <input
                              type="checkbox"
                              className="form-checkbox h-4 w-4 text-green-600 mr-2"
                              checked={selectedRequestIds.length === daftarPemusnahan.length && daftarPemusnahan.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRequestIds(daftarPemusnahan.map(i => i.request_id));
                                } else {
                                  setSelectedRequestIds([]);
                                }
                              }}
                            />
                            Select all ({daftarPemusnahan.length} items)
                          </label>
                        </div>
                        <div className="text-sm text-gray-600 font-medium">
                          Selected: {selectedRequestIds.length} / {daftarPemusnahan.length}
                        </div>
                      </div>
                    </div>
                  )}

                  {daftarGenerated && daftarPemusnahan.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-green-600">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider w-12">
                              {/* Select */}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                              No. Permohonan
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                              Bentuk Limbah
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                              Golongan Limbah
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                              Jenis Limbah
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                              Jumlah Item
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                              Bobot Total
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                              Alasan Pemusnahan
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {daftarPemusnahan.map((item, index) => (
                            <tr key={item.request_id || item.id || item.noPermohonan || index} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap text-center">
                                <input
                                  type="checkbox"
                                  className="form-checkbox h-4 w-4 text-green-600"
                                  checked={selectedRequestIds.includes(item.request_id)}
                                  onChange={(ev) => {
                                    const checked = ev.target.checked;
                                    setSelectedRequestIds(prev => {
                                      if (checked) return [...new Set([...prev, item.request_id])];
                                      return prev.filter(id => id !== item.request_id);
                                    });
                                  }}
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.noPermohonan}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.bentukLimbah}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.golonganLimbah}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.jenisLimbah}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.jumlahItem}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.bobotTotal}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.alasanPemusnahan}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : daftarGenerated && daftarPemusnahan.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Tidak ada data pemusnahan untuk bagian dan tanggal yang dipilih.</p>
                      <p className="text-sm mt-1">Silakan periksa kembali bagian dan tanggal yang dimasukkan.</p>
                    </div>
                  ) : !daftarGenerated ? (
                    <div className="text-center py-8 text-gray-400">
                      <p>Klik tombol "Generate Daftar Pemusnahan" untuk melihat data.</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </form>
        </div>
        
        {/* Main form action buttons */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              onClick={handleCancel}
            >
              Cancel
            </button>
            {isPemohon && (
              <button
                type="button"
                className="px-4 py-2 bg-green-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSaveDraft}
                disabled={isSubmitting || selectedRequestIds.length === 0}
                title={selectedRequestIds.length === 0 ? 'Pilih minimal 1 baris dari daftar pemusnahan' : ''}
              >
                {isSubmitting ? "Creating..." : "Create Berita Acara"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBeritaAcara;
