import { useState, useEffect, useMemo } from "react";
import { dataAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { toJakartaIsoFromLocal, formatDateID } from "../utils/time";
import { showSuccess, showError, showWarning, showInfo, showConfirmation } from "../utils/sweetAlert";

// Simple CSS icons as components
const PlusIcon = () => (
  <div className="w-4 h-4 flex items-center justify-center">
    <div className="w-3 h-0.5 bg-current"></div>
    <div className="w-0.5 h-3 bg-current absolute"></div>
  </div>
);

const ChevronDownIcon = () => (
  <div className="w-4 h-4 flex items-center justify-center">
    <div className="w-2 h-2 border-b-2 border-r-2 border-current transform rotate-45"></div>
  </div>
);

const SearchIcon = () => (
  <div className="w-4 h-4 border border-current rounded-full relative">
    <div className="absolute top-2 left-2 w-1 h-1 border border-current transform rotate-45"></div>
  </div>
);

// Import reference data options from DataTable
import { 
  getJenisDisplayName, 
  getStatusDisplayName, 
  DEFAULT_JENIS_OPTIONS,
  DEFAULT_GOLONGAN_OPTIONS,
  getFilteredJenisOptions,
  GOLONGAN_NAMA_LIMBAH_SELECT,
  NAMA_LIMBAH_BB_OPTIONS,
  NAMA_LIMBAH_PRODUK_OPTIONS
} from "../constants/referenceData";
import { useConfigContext } from "../contexts/ConfigContext";

const initialDetail = {
  noDokumen: "", // maps to nomor_referensi
  jenisLimbah: "", // for display only, not sent to backend
  kodeLimbah: "", // for display only, not sent to backend
  no: "", // for display only, row number
  namaLimbah: "", // maps to nama_limbah (required)
  noBets: "", // maps to nomor_analisa (No. Bets/No. Analisa)
  noWadah: "", // maps to nomor_wadah
  jumlahBarang: "", // maps to jumlah_barang
  satuan: "", // maps to satuan (required)
  bobot: "", // maps to bobot (required)
  alasan: "" // maps to alasan_pemusnahan (required)
};

function formatDateToDDMMYYYY(dateStr) {
  if (!dateStr) return '';
  return formatDateID(dateStr) || String(dateStr);
}

const FormAjuanPemusnahan = ({ onNavigate, editId = null }) => {
  const { user } = useAuth();
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(!!editId);
  const [originalData, setOriginalData] = useState(null);
  const [loadingEditData, setLoadingEditData] = useState(!!editId);
  const [editError, setEditError] = useState(null);

  const getLocalDateISO = () => {
    // Use Jakarta-local date components by generating from current local date but producing YYYY-MM-DD
    const iso = toJakartaIsoFromLocal();
    // iso is like 2025-09-28T15:04:05+07:00 - take date portion
    return iso.split('T')[0];
  };

  const [form, setForm] = useState({
    bagian: user?.emp_DeptID || user?.Bagian || user?.bagian || user?.department || user?.Department || "", // Auto-set from logged in user's department
    tanggalPengajuan: getLocalDateISO(), // Current local date in YYYY-MM-DD format
    noPermohonan: "", // Will be same as request_id from backend
    jumlahItem: "",
    jumlahWadah: "",
    bobotTotal: "",
    golonganLimbah: "",
    jenisLimbah: "",
    bentuk: "",
    isProdukPangan: false
  });
  
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState([initialDetail]);
  const [golonganOptions, setGolonganOptions] = useState(DEFAULT_GOLONGAN_OPTIONS);
  const [jenisOptions, setJenisOptions] = useState(DEFAULT_JENIS_OPTIONS);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  
  // Static bentuk limbah options - these are the only two enum values in database
  // No need for API call since these values are fixed in the database schema
  const bentukOptions = [
    { value: 'Padat', label: 'Padat' },
    { value: 'Cair', label: 'Cair' }
  ];

  // Update bagian when user changes (for authentication state changes)
  useEffect(() => {
    if (user?.emp_DeptID) {
      setForm(prev => ({
        ...prev,
        bagian: user.emp_DeptID
      }));
    }
  }, [user]);

  // Add beforeunload event listener to warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      const hasFormData = form.bentuk || form.golonganLimbah || form.jenisLimbah;
      const hasDetailData = details.some(detail => 
        detail.namaLimbah || detail.satuan || detail.bobot || detail.alasan
      );
      
      if (hasFormData || hasDetailData) {
        const message = "Anda memiliki perubahan yang belum disimpan. Apakah Anda yakin ingin meninggalkan halaman ini?";
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [form, details]);

  // Fetch reference data on component mount
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        setReferenceLoading(true);
        setUsingFallbackData(false);
        
        // Fetch reference data using combined endpoint
        const referenceResponse = await dataAPI.getReferenceData();
        
        if (referenceResponse.data.success) {
          setJenisOptions(referenceResponse.data.data.jenisLimbah || DEFAULT_JENIS_OPTIONS);
          setGolonganOptions(referenceResponse.data.data.golonganLimbah || DEFAULT_GOLONGAN_OPTIONS);
          
          if (referenceResponse.data.fallback) {
            setUsingFallbackData(true);
          }
        } else {
          console.error("Failed to fetch reference data:", referenceResponse.data.message);
          setJenisOptions(DEFAULT_JENIS_OPTIONS);
          setGolonganOptions(DEFAULT_GOLONGAN_OPTIONS);
          setUsingFallbackData(true);
        }
        
      } catch (error) {
        console.error("Error fetching reference data:", error);
        // Keep default options if API fails
        setJenisOptions(DEFAULT_JENIS_OPTIONS);
        setGolonganOptions(DEFAULT_GOLONGAN_OPTIONS);
        setUsingFallbackData(true);
      } finally {
        setReferenceLoading(false);
      }
    };

    fetchReferenceData();
  }, []);

  // Update all detail rows when jenis limbah in main form changes
  useEffect(() => {
    if (form.jenisLimbah && details.length > 0) {
      const selectedJenisData = jenisOptions.find(opt => opt.value === form.jenisLimbah);
      
      if (selectedJenisData) {
        const updatedDetails = details.map(detail => ({
          ...detail,
          jenisLimbah: selectedJenisData.jenis_limbah,
          kodeLimbah: selectedJenisData.kode_limbah
        }));
        
        setDetails(updatedDetails);
      }
    }
  }, [form.jenisLimbah, jenisOptions]); // Don't include details in dependency to avoid infinite loop

  // Load edit data if in edit mode
  useEffect(() => {
    const loadEditData = async () => {
      if (!editId) {
        setLoadingEditData(false);
        return;
      }

      try {
        setLoadingEditData(true);
        setEditError(null);
        
        const response = await dataAPI.getDestructionRequestDetail(editId);
        
        if (response?.data?.success && response.data.data) {
          const data = response.data.data;
          
          // Debug log to check data structure
          console.log('Edit data received:', data);
          
          // Safe access to data properties with fallbacks
          const status = data?.status || 'Draft';
          const currentStepId = data?.current_step_id;
          const alasanPenolakan = data?.alasan_penolakan;
          
          // Check if request is rejected - prevent editing only if permanently rejected
          if (status === 'Rejected') {
            setEditError('Permohonan ini telah ditolak secara permanen oleh HSE dan tidak dapat diedit lagi.');
            setLoadingEditData(false);
            return;
          }
          
          // Allow editing drafts (including those returned from manager rejection)
          if (status !== 'Draft' && currentStepId !== null && currentStepId !== 1) {
            setEditError('Permohonan ini tidak dapat diedit pada tahap saat ini.');
            setLoadingEditData(false);
            return;
          }
          
          setOriginalData(data);
          
          // Populate form with existing data with safe access
          setForm({
            bagian: data?.bagian || "",
            tanggalPengajuan: data?.created_at ? (data.created_at.split('T')[0]) : getLocalDateISO(),
            noPermohonan: data?.request_id?.toString() || "",
            jumlahItem: data?.DetailLimbahs?.length?.toString() || (data?.jumlah_item?.toString() || "0"),
            jumlahWadah: "", // Will be calculated
            bobotTotal: "", // Will be calculated
            golonganLimbah: getValueFromId(data?.golongan_limbah_id, golonganOptions),
            jenisLimbah: getValueFromId(data?.jenis_limbah_b3_id, jenisOptions),
            bentuk: data?.bentuk_limbah || "",
            isProdukPangan: data?.is_produk_pangan || false
          });
          
          // Populate details with safe access
          if (data?.DetailLimbahs && Array.isArray(data.DetailLimbahs) && data.DetailLimbahs.length > 0) {
            const mappedDetails = data.DetailLimbahs.map((detail, index) => ({
              no: index + 1,
              noDokumen: detail?.nomor_referensi || "",
              jenisLimbah: data?.JenisLimbahB3?.nama || "",
              kodeLimbah: data?.JenisLimbahB3?.kode || "",
              namaLimbah: detail?.nama_limbah || "",
              noBets: detail?.nomor_analisa || "",
              noWadah: detail?.nomor_wadah?.toString() || "",
              jumlahBarang: detail?.jumlah_barang?.toString() || "",
              satuan: detail?.satuan || "",
              bobot: detail?.bobot?.toString() || "",
              alasan: detail?.alasan_pemusnahan || ""
            }));
            setDetails(mappedDetails);
            updateSummaryFields(mappedDetails);
          }
          
          // Check if this is a draft returned from manager rejection
          if (status === 'Draft' && alasanPenolakan) {
            setEditError(`Permohonan dikembalikan oleh Manager untuk diperbaiki. Alasan: ${alasanPenolakan}`);
          }
          
        } else {
          setEditError(response.data.message || 'Gagal memuat data permohonan');
        }
        
      } catch (error) {
        console.error("Error loading edit data:", error);
        setEditError('Terjadi kesalahan saat memuat data permohonan');
      } finally {
        setLoadingEditData(false);
      }
    };

    // Only load edit data after reference data is loaded
    if (!referenceLoading) {
      loadEditData();
    }
  }, [editId, referenceLoading]);

  // Compute filtered jenis options based on currently selected golongan
  const selectedGolonganLabel = useMemo(() => {
    const match = golonganOptions.find(g => g.value === form.golonganLimbah);
    return match ? match.label : '';
  }, [form.golonganLimbah, golonganOptions]);

  const filteredJenisOptions = useMemo(
    () => getFilteredJenisOptions(selectedGolonganLabel, jenisOptions),
    [selectedGolonganLabel, jenisOptions]
  );

  const handleFormChange = e => {
    const { name, value } = e.target;

    if (name === 'golonganLimbah') {
      // When golongan changes, check if the currently selected jenis is still
      // valid for the new golongan. If not, reset it.
      const newGolonganLabel = golonganOptions.find(g => g.value === value)?.label || '';
      const newFiltered = getFilteredJenisOptions(newGolonganLabel, jenisOptions);
      const currentJenisStillValid = newFiltered.some(opt => opt.value === form.jenisLimbah);

      setForm(prev => ({
        ...prev,
        golonganLimbah: value,
        // Reset jenis if no longer valid in the new golongan
        ...(currentJenisStillValid ? {} : { jenisLimbah: '' }),
        // Also reset isProdukPangan when golongan changes away from Recall
        ...(newGolonganLabel !== 'Recall' ? { isProdukPangan: false } : {})
      }));
      // Reset namaLimbah on all detail rows when golongan changes
      setDetails(prev => prev.map(d => ({ ...d, namaLimbah: '' })));
      return;
    }

    if (name === 'jenisLimbah') {
      // Reset namaLimbah on all detail rows when jenis changes
      setDetails(prev => prev.map(d => ({ ...d, namaLimbah: '' })));
    }

    setForm({ ...form, [name]: value });
  };

  const handleBentukChange = selectedBentuk => {
    setForm(prevForm => ({
      ...prevForm,
      bentuk: selectedBentuk
    }));
  };

  const handleDetailChange = (idx, e) => {
    const newDetails = [...details];
    newDetails[idx][e.target.name] = e.target.value;
    setDetails(newDetails);
    
    // Auto-calculate summary fields
    updateSummaryFields(newDetails);
  };

  const addDetailRow = () => {
    // Validate that jenis limbah is selected in main form
    if (!form.jenisLimbah) {
      return;
    }
    
    // Get current selected jenis limbah data for auto-fill
    const selectedJenisData = jenisOptions.find(opt => opt.value === form.jenisLimbah);
    
    const newDetailItem = {
      noDokumen: "",
      jenisLimbah: selectedJenisData ? selectedJenisData.jenis_limbah : "", // Auto-fill from form
      kodeLimbah: selectedJenisData ? selectedJenisData.kode_limbah : "", // Auto-fill from form
      no: details.length + 1,
      namaLimbah: "",
      noBets: "",
      noWadah: "",
      jumlahBarang: "",
      satuan: "",
      bobot: "",
      alasan: ""
    };
    const newDetails = [...details, newDetailItem];
    setDetails(newDetails);
    updateSummaryFields(newDetails);
  };

  const removeDetailRow = idx => {
    const newDetails = details.filter((_, i) => i !== idx).map((detail, i) => ({ ...detail, no: i + 1 }));
    setDetails(newDetails);
    updateSummaryFields(newDetails);
  };

  // Auto-calculate summary fields based on detail items
  const updateSummaryFields = (detailItems) => {
    // jumlahItem is the total number of detail/lampiran rows
    const jumlahItem = detailItems.length;
    
    // Calculate jumlahWadah from unique noWadah values
    const uniqueWadah = new Set();
    detailItems.forEach(detail => {
      if (detail.noWadah && detail.noWadah.toString().trim() !== '') {
        uniqueWadah.add(detail.noWadah.toString().trim());
      }
    });
    const jumlahWadah = uniqueWadah.size;
    
    const bobotTotal = detailItems.reduce((sum, detail) => {
      return sum + (parseFloat(detail.bobot) || 0);
    }, 0);

    setForm(prev => ({
      ...prev,
      jumlahItem: jumlahItem.toString(),
      jumlahWadah: jumlahWadah.toString(),
      bobotTotal: bobotTotal.toString()
    }));
  };

  const resetForm = () => {
    // Reset main form to initial state
    setForm({
      bagian: user?.emp_DeptID || user?.Bagian || user?.bagian || user?.department || user?.Department || "",
      tanggalPengajuan: getLocalDateISO(),
      noPermohonan: "",
      jumlahItem: "",
      jumlahWadah: "",
      bobotTotal: "",
      golonganLimbah: "",
      jenisLimbah: "",
      bentuk: "",
      isProdukPangan: false
    });
    
    // Reset details to initial state with a fresh copy
    const freshInitialDetail = {
      noDokumen: "",
      jenisLimbah: "",
      kodeLimbah: "",
      no: "",
      namaLimbah: "",
      noBets: "",
      noWadah: "",
      jumlahBarang: "",
      satuan: "",
      bobot: "",
      alasan: ""
    };
    setDetails([freshInitialDetail]);
    
    // Clear any temporary data from localStorage
    localStorage.removeItem('lampiranData');
    localStorage.removeItem('formDraftData');
    
    // Force clear any other potential storage keys
    Object.keys(localStorage).forEach(key => {
      if (key.includes('lampiran') || key.includes('draft') || key.includes('form')) {
        localStorage.removeItem(key);
      }
    });
  };

  const handleCancel = async () => {
    // Ask for confirmation before discarding changes
    const hasFormData = form.bentuk || form.golonganLimbah || form.jenisLimbah;
    const hasDetailData = details.some(detail => 
      detail.namaLimbah || detail.satuan || detail.bobot || detail.alasan
    );
    
    if (hasFormData || hasDetailData) {
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
      onNavigate("daftar-ajuan");
    }
  };

  const handleKembali = async () => {
    // Same behavior as cancel - ask for confirmation if there's unsaved data
    const hasFormData = form.bentuk || form.golonganLimbah || form.jenisLimbah;
    const hasDetailData = details.some(detail => 
      detail.namaLimbah || detail.satuan || detail.bobot || detail.alasan
    );
    
    if (hasFormData || hasDetailData) {
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
      onNavigate("daftar-ajuan");
    }
  };

  // Validate only detail items for lampiran save
  const validateDetailsOnly = () => {
    const errors = [];

    if (details.length === 0) {
      errors.push("Minimal harus ada satu item dalam lampiran");
      return errors;
    }

    details.forEach((detail, index) => {
      const itemNumber = index + 1;
      if (!detail.namaLimbah.trim()) {
        errors.push(`Item ${itemNumber}: Nama limbah wajib diisi`);
      }
      if (!detail.jumlahBarang.trim()) {
        errors.push(`Item ${itemNumber}: Jumlah barang wajib diisi`);
      }
      if (!detail.satuan.trim()) {
        errors.push(`Item ${itemNumber}: Satuan wajib diisi`);
      }
      if (!detail.noWadah.trim()) {
        errors.push(`Item ${itemNumber}: No. wadah wajib diisi`);
      }
      if (!detail.bobot || parseFloat(detail.bobot) <= 0) {
        errors.push(`Item ${itemNumber}: Bobot harus lebih dari 0`);
      }
      if (!detail.alasan.trim()) {
        errors.push(`Item ${itemNumber}: Alasan pemusnahan wajib diisi`);
      }
    });

    return errors;
  };

  const handleSaveLampiran = () => {
    const validationErrors = validateDetailsOnly();
    if (validationErrors.length > 0) {
      showError("Mohon perbaiki kesalahan berikut pada lampiran:\n\n" + validationErrors.join("\n"));
      return;
    }

    // Just show a validation success message - no actual saving to localStorage
    showInfo('Data lampiran valid! Klik "Save to Draft" untuk menyimpan ke server.');
  };

  // Validation function for form data
  const validateFormData = () => {
    const errors = [];

    // Validate main form
    if (!form.bentuk) {
      const availableOptions = bentukOptions.map(opt => opt.label).join('/');
      errors.push(`Bentuk limbah harus dipilih (${availableOptions})`);
    }
    if (!form.golonganLimbah) {
      errors.push("Golongan limbah harus dipilih");
    }
    if (!form.jenisLimbah) {
      errors.push("Jenis limbah harus dipilih");
    }

    // Validate details (lampiran)
    if (details.length === 0) {
      errors.push("Minimal harus ada satu item dalam lampiran");
    }

    details.forEach((detail, index) => {
      const itemNumber = index + 1;
      if (!detail.namaLimbah.trim()) {
        errors.push(`Item ${itemNumber}: Nama limbah wajib diisi`);
      }
      if (!detail.jumlahBarang.trim()) {
        errors.push(`Item ${itemNumber}: Jumlah barang wajib diisi`);
      }
      if (!detail.satuan.trim()) {
        errors.push(`Item ${itemNumber}: Satuan wajib diisi`);
      }
      if (!detail.noWadah.trim()) {
        errors.push(`Item ${itemNumber}: No. wadah wajib diisi`);
      }
      if (!detail.bobot || parseFloat(detail.bobot) <= 0) {
        errors.push(`Item ${itemNumber}: Bobot harus lebih dari 0`);
      }
      if (!detail.alasan.trim()) {
        errors.push(`Item ${itemNumber}: Alasan pemusnahan wajib diisi`);
      }
    });

    return errors;
  };

  // Helper function to map option value to ID
  const getIdFromOption = (value, options) => {
    if (!value || !options) return null;
    const option = options.find(opt => opt.value === value);
    return option ? option.id : null;
  };

  // Helper function to map ID back to option value  
  const getValueFromId = (id, options) => {
    if (!id || !options) return "";
    const option = options.find(opt => opt.id === parseInt(id));
    return option ? option.value : "";
  };

  const handleSubmitForApproval = async (e) => {
    e.preventDefault();
    
    if (!form.noPermohonan) {
      showWarning("Silakan simpan draft terlebih dahulu sebelum submit untuk persetujuan.");
      return;
    }

    try {
      const requestId = form.noPermohonan;
      const response = await dataAPI.submitDestructionRequest(requestId);
      
      if (response.data.success) {
        showSuccess(response.data.message || "Permohonan berhasil disubmit untuk persetujuan");
        
        // Dispatch custom event to refresh DataTable
        window.dispatchEvent(new CustomEvent('ajuanDataRefresh'));
        
        // Navigate back to list or show success message
        if (onNavigate) {
          onNavigate('daftar-ajuan');
        }
      } else {
        showError("Gagal submit permohonan: " + response.data.message);
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      showError("Terjadi kesalahan saat submit permohonan");
    }
  };

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    
    // Validate form data before submission
    const validationErrors = validateFormData();
    if (validationErrors.length > 0) {
      showError("Mohon perbaiki kesalahan berikut:\n\n" + validationErrors.join("\n"));
      return;
    }

    try {
      // Map frontend form data to backend expected format
      const mappedDetails = details.map(detail => ({
        nama_limbah: detail.namaLimbah,
        nomor_analisa: detail.noBets, // noBets maps to nomor_analisa (No. Bets/No. Analisa)
        nomor_referensi: detail.noDokumen, // noDokumen maps to nomor_referensi
        nomor_wadah: detail.noWadah ? parseInt(detail.noWadah) : null,
        jumlah_barang: detail.jumlahBarang ? parseInt(detail.jumlahBarang) : null,
        satuan: detail.satuan,
        bobot: detail.bobot ? parseFloat(detail.bobot) : 0,
        alasan_pemusnahan: detail.alasan
      }));

      const payload = {
        bagian: form.bagian,
        bentuk_limbah: form.bentuk, // maps to bentuk_limbah
        golongan_limbah_id: getIdFromOption(form.golonganLimbah, golonganOptions),
        jenis_limbah_b3_id: getIdFromOption(form.jenisLimbah, jenisOptions),
        is_produk_pangan: form.isProdukPangan,
        details: mappedDetails
      };

      console.log("Sending payload to backend:", payload);

      let response;
      if (isEditMode && editId) {
        // Update existing request
        response = await dataAPI.updateDestructionRequest(editId, payload);
      } else {
        // Create new request
        response = await dataAPI.saveDraftDestructionRequest(payload);
      }
      
      if (response.data.success) {
        // Clear any temporary data since form was successfully saved to backend
        localStorage.removeItem('formDraftData');
        localStorage.removeItem('lampiranData');
        
        // Update the form with the generated request_id as no_permohonan
        if (response.data.data && response.data.data.request_id) {
          setForm(prev => ({
            ...prev,
            noPermohonan: response.data.data.request_id.toString()
          }));
        }
        showSuccess(response.data.message || (isEditMode ? "Permohonan berhasil diupdate" : "Draft berhasil disimpan"));
        
        // Dispatch custom event to refresh detail page
        if (isEditMode && editId) {
          window.dispatchEvent(new CustomEvent('refreshDetailAjuan', { 
            detail: { applicationId: editId } 
          }));
        }
        
        // Dispatch custom event to refresh DataTable
        window.dispatchEvent(new CustomEvent('ajuanDataRefresh'));
        
        // Navigate back appropriately based on mode
        if (onNavigate) {
          if (isEditMode && editId) {
            // If editing, go back to detail page with updated data and force refresh
            onNavigate("detail-ajuan", { id: editId, refresh: Date.now() });
          } else {
            // If creating new, go to list
            onNavigate("daftar-ajuan");
          }
        }
      } else {
        showError("Failed to save: " + response.data.message);
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      showError("Error saving draft.");
    }
  };

  // Allow any authenticated user (or delegated user) to create/save a new permohonan.
  // Using centralized access rights (see src/constants/accessRights.js)
  const canCreateAjuan = !!user; // any logged-in user (defined in accessRights.js as canCreateAjuan)

  // Show loading state while loading edit data
  if (loadingEditData) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data permohonan...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an edit error
  if (editError) {
    const isManagerReturn = originalData?.status === 'Draft' && originalData?.alasan_penolakan;
    const isError = !isManagerReturn;
    
    return (
      <div className="p-6">
        <div className={`border rounded-md p-4 ${isError ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className={`h-5 w-5 ${isError ? 'text-red-400' : 'text-yellow-400'}`} viewBox="0 0 20 20" fill="currentColor">
                {isError ? (
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                )}
              </svg>
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${isError ? 'text-red-800' : 'text-yellow-800'}`}>
                {isError ? 'Tidak dapat mengedit permohonan' : 'Permohonan Dikembalikan'}
              </h3>
              <p className={`mt-2 text-sm ${isError ? 'text-red-700' : 'text-yellow-700'}`}>{editError}</p>
              {isManagerReturn && (
                <p className="mt-2 text-sm text-yellow-700">
                  Silakan perbaiki permohonan sesuai feedback dan submit ulang.
                </p>
              )}
              <div className="mt-4">
                {isManagerReturn ? (
                  <button
                    onClick={() => setEditError(null)}
                    className="bg-yellow-100 px-4 py-2 text-sm text-yellow-800 rounded hover:bg-yellow-200 transition-colors mr-2"
                  >
                    Lanjutkan Edit
                  </button>
                ) : null}
                <button
                  onClick={() => onNavigate && onNavigate("daftar-ajuan")}
                  className={`px-4 py-2 text-sm rounded hover:transition-colors ${
                    isError 
                      ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  }`}
                >
                  Kembali ke Daftar Ajuan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isRecallSelected = golonganOptions.find(g => g.value === form.golonganLimbah)?.label === 'Recall';

  // Whether the current golongan triggers select-mode for Nama Limbah in lampiran rows
  const isNamaLimbahSelectGolongan = GOLONGAN_NAMA_LIMBAH_SELECT.includes(selectedGolonganLabel);

  return (
    <div className="p-6">
      <div className="mb-6">
        <nav className="text-sm text-gray-500 mb-2">
          <span>Limbah B3</span>
          <span className="mx-2">›</span>
          <span>Daftar Ajuan Pemusnahan</span>
          <span className="mx-2">›</span>
          <span className="text-gray-900">{isEditMode ? 'Edit Ajuan' : 'Tambah Ajuan'}</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditMode ? 'Edit Ajuan Pemusnahan' : 'Tambah Ajuan Pemusnahan'}
            </h1>
            <p className="mt-2 text-gray-600">
              {isEditMode ? 'Form untuk mengedit ajuan pemusnahan.' : 'Form untuk menambah ajuan pemusnahan.'}
            </p>
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
          <div className="flex space-x-6 items-center">
            {bentukOptions.map((option) => (
              <label key={option.value} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="bentukLimbah"
                  checked={form.bentuk === option.value}
                  onChange={() => handleBentukChange(option.value)}
                  className="text-green-600 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bagian</label>
              <input 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-600" 
                name="bagian" 
                value={form.bagian} 
                disabled
                placeholder="Auto-set from user department"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pengajuan</label>
              <input 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-600" 
                value={formatDateToDDMMYYYY(form.tanggalPengajuan)} 
                disabled 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No. Permohonan</label>
              <input 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-600" 
                value={form.noPermohonan} 
                disabled
                placeholder="Generated as request ID after save"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Item</label>
              <input 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-600" 
                name="jumlahItem" 
                value={form.jumlahItem} 
                disabled
                placeholder="Auto-calculated from items"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Wadah</label>
              <input 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-600" 
                name="jumlahWadah" 
                value={form.jumlahWadah} 
                disabled
                placeholder="Auto-calculated from items"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bobot Total (gram)</label>
              <input 
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-600" 
                name="bobotTotal" 
                value={form.bobotTotal} 
                disabled
                placeholder="Auto-calculated from items"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Golongan Limbah</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                name="golonganLimbah"
                value={form.golonganLimbah}
                onChange={handleFormChange}
              >
                <option value="">- Pilih Golongan -</option>
                {golonganOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Limbah</label>
              <select
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${!form.golonganLimbah ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                name="jenisLimbah"
                value={form.jenisLimbah}
                onChange={handleFormChange}
                disabled={!form.golonganLimbah}
              >
                <option value="">{form.golonganLimbah ? '- Pilih Jenis -' : '- Pilih Golongan terlebih dahulu -'}</option>
                {filteredJenisOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Conditionally render the new checkbox */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isRecallSelected && (
              <div>
                <label className="flex items-center space-x-3 mt-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    checked={form.isProdukPangan}
                    onChange={e => setForm({ ...form, isProdukPangan: e.target.checked })}
                  />
                  <span className="text-sm font-medium text-gray-700">Apakah ini produk pangan?</span>
                </label>
              </div>
            )}
          </div>

          <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
            <button 
              type="button"
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between transition-colors duration-200"
              onClick={() => setShowDetails(!showDetails)}
            >
              <h3 className="text-lg font-semibold text-gray-900">Lampiran</h3>
              <ChevronDownIcon className={`h-5 w-5 transform transition-transform duration-200 text-gray-500 ${showDetails ? 'rotate-180' : ''}`} />
            </button>
            
            {showDetails && (
              <>
                <div className="p-4">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-green-600">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">No</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">No. Dokumen</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Jenis Limbah</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Kode Limbah</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Nama Limbah</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">No. Bets/No. Analisa</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Jumlah Barang</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Satuan</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">No. Wadah</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Bobot (gram)</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Alasan Pemusnahan</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {details.map((detail, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{idx + 1}</td>
                            <td className="px-2 py-2">
                              <div className="flex items-center space-x-1">
                                <input
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                  name="noDokumen"
                                  value={detail.noDokumen}
                                  onChange={e => handleDetailChange(idx, e)}
                                  placeholder="No. Dokumen"
                                />
                                <button
                                  type="button"
                                  className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                                  title="Cari Dokumen"
                                >
                                  <SearchIcon />
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <input
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50 text-gray-600"
                                name="jenisLimbah"
                                value={detail.jenisLimbah}
                                readOnly
                                placeholder="Jenis Limbah"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50 text-gray-600"
                                name="kodeLimbah"
                                value={detail.kodeLimbah}
                                readOnly
                                placeholder="Kode Limbah"
                              />
                            </td>
                            <td className="px-2 py-2">
                              {(() => {
                                const jenisLabel = detail.jenisLimbah || '';
                                const isSelectMode = isNamaLimbahSelectGolongan &&
                                  (jenisLabel === 'Bahan Baku' || jenisLabel.startsWith('Produk'));
                                const namaOpts = jenisLabel === 'Bahan Baku'
                                  ? NAMA_LIMBAH_BB_OPTIONS
                                  : NAMA_LIMBAH_PRODUK_OPTIONS;
                                return isSelectMode ? (
                                  <select
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                    name="namaLimbah"
                                    value={detail.namaLimbah}
                                    onChange={e => handleDetailChange(idx, e)}
                                    required
                                  >
                                    <option value="">- Pilih Nama Limbah -</option>
                                    {namaOpts.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                    name="namaLimbah"
                                    value={detail.namaLimbah}
                                    onChange={e => handleDetailChange(idx, e)}
                                    placeholder="Nama Limbah"
                                    required
                                  />
                                );
                              })()}
                            </td>
                            <td className="px-2 py-2">
                              <input
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                name="noBets"
                                value={detail.noBets}
                                onChange={e => handleDetailChange(idx, e)}
                                placeholder="No. Bets"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                name="jumlahBarang"
                                value={detail.jumlahBarang}
                                onChange={e => handleDetailChange(idx, e)}
                                placeholder="Jumlah Barang"
                                type="number"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                name="satuan"
                                value={detail.satuan}
                                onChange={e => handleDetailChange(idx, e)}
                                placeholder="Satuan"
                                required
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                name="noWadah"
                                value={detail.noWadah}
                                onChange={e => handleDetailChange(idx, e)}
                                placeholder="No. Wadah"
                                type="number"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                name="bobot"
                                value={detail.bobot}
                                onChange={e => handleDetailChange(idx, e)}
                                placeholder="Bobot"
                                type="number"
                                step="0.01"
                                min="0"
                                required
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                name="alasan"
                                value={detail.alasan}
                                onChange={e => handleDetailChange(idx, e)}
                                placeholder="Alasan"
                                required
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                type="button"
                                className="text-red-600 hover:text-red-800 focus:outline-none"
                                onClick={() => removeDetailRow(idx)}
                                title="Remove row"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex justify-between items-center mt-6 p-4 bg-gray-50">
                    <button
                      type="button"
                      className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium transition-colors ${
                        form.jenisLimbah 
                          ? 'bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                          : 'bg-gray-400 text-gray-700 cursor-not-allowed'
                      }`}
                      onClick={addDetailRow}
                      disabled={!form.jenisLimbah}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      <span>Add Item</span>
                    </button>
                    
                    {/* <button
                      type="button"
                      className="px-4 py-2 bg-green-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                      onClick={handleSaveLampiran}
                    >
                      Save Lampiran
                    </button> */}
                  </div>
                </div>
              </>
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
            {canCreateAjuan && (
              <>
                <button
                  type="button"
                  className="px-4 py-2 bg-green-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  onClick={handleSaveDraft}
                >
                  Save to Draft
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormAjuanPemusnahan;
