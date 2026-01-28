import { useState, useEffect } from "react";
import { dataAPI } from "../services/api";
import { formatDateTimeID, formatDateID, formatTimeID } from "../utils/time";
import { getBaseUrl } from "../utils/urlHelper";
import { TokenManager } from "../utils/tokenManager";
import { useAuth } from "../contexts/AuthContext";
import { useConfigContext } from "../contexts/ConfigContext";
import {
  getJenisDisplayName,
  getStatusDisplayName,
  getBeritaAcaraStatusDisplayName,
  DEFAULT_JENIS_OPTIONS,
  DEFAULT_GOLONGAN_OPTIONS,
} from "../constants/referenceData";
import SigningWorkflowSteps from "../components/SigningWorkflowSteps";
import { showSuccess, showError, showConfirmation } from "../utils/sweetAlert";

// Use centralized Jakarta formatters so displayed timestamps match stored Jakarta wall-clock

const DetailBeritaAcara = ({ onNavigate, beritaAcaraId, navigationData = {} }) => {
  const { user } = useAuth();
  const { getStatusStyle } = useConfigContext();
  const [data, setData] = useState(null);
  const [verificationTimeRange, setVerificationTimeRange] = useState({ start: null, end: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signingWorkflow, setSigningWorkflow] = useState([]);
  const [canSign, setCanSign] = useState(false);
  const [beritaAcaraLoading, setBeritaAcaraLoading] = useState(false);
  const [excelLoadingStates, setExcelLoadingStates] = useState({});
  const [permohonanLoadingStates, setPermohonanLoadingStates] = useState({});

  useEffect(() => {
  }, [verificationTimeRange]);

  // Fetch berita acara detail
  useEffect(() => {
    const fetchBeritaAcaraDetail = async () => {
      if (!beritaAcaraId) {
        setError("Berita Acara ID is required");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. Fetch main berita acara data
        const response = await dataAPI.getBeritaAcaraById(beritaAcaraId);

        if (!response.data.success) {
          setError(response.data.message || "Failed to fetch berita acara details");
          return;
        }

        // Normalize/unpack API response which may be nested (several wrappers of { success, data })
        let beritaAcaraData = response?.data;
        // If the wrapper has { data: ... } repeatedly, unwrap until we find the actual event object
        const maxUnwrap = 5;
        let unwrapCount = 0;
        while (
          beritaAcaraData &&
          typeof beritaAcaraData === "object" &&
          beritaAcaraData.data &&
          unwrapCount < maxUnwrap
        ) {
          beritaAcaraData = beritaAcaraData.data;
          unwrapCount += 1;
        }

        // If backend uses { success: true, data: {...} } as top-level, ensure we have that inside
        if (beritaAcaraData && beritaAcaraData.success && beritaAcaraData.data) {
          beritaAcaraData = beritaAcaraData.data;
        }

        // 2. Extract data directly from API response (no fallback logic needed)
        const requests = beritaAcaraData.PermohonanPemusnahanLimbahs || [];
        const firstReq = requests[0];

        // Build daftar pemusnahan
        const daftar = requests.map((req) => {
          const details = req.DetailLimbahs || [];
          const jumlahItem =
            req.jumlah_item || (details.reduce ? details.reduce((s, d) => s + (d.jumlah_item || 0), 0) : 0);
          const bobotTotal = details.reduce((s, d) => s + parseFloat(d.bobot || 0), 0);
          const alasanPemusnahan = details
            .map((d) => d.alasan_pemusnahan)
            .filter(Boolean)
            .join("; ");

          return {
            request_id: req.request_id,
            noPermohonan: req.nomor_permohonan || `DRAFT-${req.request_id}`,
            bentukLimbah: req.bentuk_limbah,
            golonganLimbah: req.GolonganLimbah ? req.GolonganLimbah.nama : "",
            jenisLimbah: req.JenisLimbahB3 ? req.JenisLimbahB3.nama : "",
            jumlahItem,
            bobotTotal: Number(bobotTotal.toFixed(2)),
            alasanPemusnahan,
          };
        });

        // Build detail BAP
        const detailBAP = {
          divisi: beritaAcaraData.bagian || "-",
          hariTanggal: beritaAcaraData.tanggal ? formatDateID(beritaAcaraData.tanggal) : "-",
          jamWaktu: beritaAcaraData.waktu ? formatTimeID(beritaAcaraData.waktu) : "-",
          lokasiVerifikasi: beritaAcaraData.lokasi_verifikasi || "-",
          pelaksanaBagian: beritaAcaraData.pelaksana_bagian || beritaAcaraData.pelaksanaBagian || "-",
          supervisorOfficerBagian: beritaAcaraData.supervisor_bagian || beritaAcaraData.supervisorBagian || "-",
          pelaksanaHSE: beritaAcaraData.pelaksana_hse || beritaAcaraData.pelaksanaHSE || "-",
          supervisorOfficerHSE: beritaAcaraData.supervisor_hse || beritaAcaraData.supervisorHSE || "-",
        };

        // Prefer backend-provided current_step_level (keeps detail consistent with list view)
        let currentStepLevel = null;
        if (typeof beritaAcaraData.current_step_level !== "undefined" && beritaAcaraData.current_step_level !== null) {
          currentStepLevel = beritaAcaraData.current_step_level;
        } else if (beritaAcaraData.current_signing_step_id) {
          const matching = (beritaAcaraData.SigningWorkflowSteps || []).find(
            (s) => s.step_id === beritaAcaraData.current_signing_step_id
          );
          if (matching) {
            currentStepLevel = matching.step_level === 1 ? 2 : matching.step_level;
          }
        } else {
          // Fallback: find first pending step >= 2
          const pending = (beritaAcaraData.SigningWorkflowSteps || []).find(
            (s) => (s.status || "").toString().toLowerCase() === "pending" && s.step_level >= 2
          );
          currentStepLevel = pending ? pending.step_level : 2;
        }

        // Transform main data
        const transformedData = {
          id: beritaAcaraData.berita_acara_id,
          noBeritaAcara: `BA-${String(beritaAcaraData.berita_acara_id).padStart(3, "0")}`,
          tanggal: beritaAcaraData.tanggal,
          waktu: beritaAcaraData.waktu,
          lokasi_verifikasi: beritaAcaraData.lokasi_verifikasi,
          creator: beritaAcaraData.creator_name || "",
          creatorJabatan: beritaAcaraData.creator_jabatan || "",
          status: beritaAcaraData.status || "Draft",
          requests,
          daftarPemusnahan: daftar,
          detailBAP,
          created_at: beritaAcaraData.created_at,

          // Extract data for SigningWorkflowSteps (following DetailAjuan pattern)
          requestId: firstReq?.request_id || null,
          currentStatus: beritaAcaraData.status || "Draft",
          requesterName: beritaAcaraData.creator_name || "",
          submittedAt: beritaAcaraData.created_at,
          golonganLimbahId: firstReq?.golongan_limbah_id || null,
          golonganLimbahName: firstReq?.GolonganLimbah?.nama || "",
          currentStepLevel: currentStepLevel,
          bagian: beritaAcaraData.bagian || "",
          // Check if any of the related requests is produk pangan
          isProdukPangan: (beritaAcaraData.PermohonanPemusnahanLimbahs || []).some(
            (req) => req.is_produk_pangan === true
          ),
        };

        setData(transformedData);

        // Use SigningWorkflowSteps included in the beritaAcara response when available
        let signingWorkflowData = [];
        if (Array.isArray(beritaAcaraData.SigningWorkflowSteps) && beritaAcaraData.SigningWorkflowSteps.length > 0) {
          signingWorkflowData = beritaAcaraData.SigningWorkflowSteps;
          setSigningWorkflow(signingWorkflowData);

          // When workflow is present, determine the next pending step (advance past signed steps)
          try {
            // normalize and sort by step_level
            const normalized = signingWorkflowData
              .map((s) => ({
                ...s,
                step_level: Number(s.step_level || s.stepLevel || 0),
                status: (s.status || "").toString().toLowerCase(),
              }))
              .filter((s) => s.step_level >= 2)
              .sort((a, b) => a.step_level - b.step_level);

            // find the first step that is not signed (no signed_at and status !== 'signed')
            const nextPending = normalized.find((s) => !(s.status === "signed" || s.signed_at));

            if (nextPending) {
              transformedData.currentStepLevel = nextPending.step_level;
              // keep existing status (backend's status) unless all signed
              transformedData.status = beritaAcaraData.status || transformedData.status;

              // decide canSign from the next pending step's signers only if backend didn't provide can_sign
              if (typeof beritaAcaraData.can_sign === "undefined") {
                try {
                  const myNik = user && (user.log_NIK || user.emp_NIK || user.log_nik || user.NIK);
                  let allowed = false;
                  if (Array.isArray(nextPending.signers)) {
                    allowed = nextPending.signers.some((sig) => {
                      const v = (
                        sig.log_nik ||
                        sig.Appr_ID ||
                        sig.signer_id ||
                        sig.signer_identity ||
                        sig.signer_identity_id ||
                        ""
                      ).toString();
                      return myNik && v && String(myNik) === String(v);
                    });
                  }
                  setCanSign(!!allowed);
                } catch (e) {
                  // if something goes wrong determining permission, leave canSign as-is
                  console.warn("Failed to compute canSign from signing workflow:", e);
                }
              }
            } else {
              // no pending unsigned steps -> Completed
              transformedData.status = "Completed";
              transformedData.currentStepLevel = null;
              setCanSign(false);
            }
          } catch (e) {
            console.warn("Error processing SigningWorkflowSteps:", e);
          }
        } else {
          // Fallback: try to fetch signing workflow by request id if API did not include it
          if (firstReq?.request_id) {
            try {
              const wfResponse = await dataAPI.getSigningWorkflows(firstReq.request_id);
              if (wfResponse.data?.success) {
                signingWorkflowData = wfResponse.data.data || [];
                setSigningWorkflow(signingWorkflowData);
              }
            } catch (wfError) {
              console.error("Error fetching signing workflow fallback:", wfError);
            }
          }
        }

        // Determine canSign: prefer backend's can_sign flag which already contains the authorization logic
        if (typeof beritaAcaraData.can_sign !== "undefined") {
          // Trust the backend's authorization calculation
          setCanSign(!!beritaAcaraData.can_sign);
        } else if (Array.isArray(signingWorkflowData) && signingWorkflowData.length > 0) {
          // Fallback: if backend doesn't provide can_sign, use workflow-derived permission
          // canSign was already set above when computing next pending step, but ensure a sensible default
          setCanSign((prev) => !!prev);
        } else {
          // Final fallback: allow signing if current user appears in signing workflow signers
          try {
            const myNik = user && (user.log_NIK || user.emp_NIK || user.log_nik || user.NIK);
            const normalizeSteps = (steps) => {
              if (!steps) return [];
              if (Array.isArray(steps) && steps.length > 0 && steps[0].SigningWorkflowSteps) {
                return steps[0].SigningWorkflowSteps;
              }
              return Array.isArray(steps) ? steps : [];
            };

            const steps = normalizeSteps(signingWorkflowData);
            const current = steps.find((s) => Number(s.step_level) === Number(transformedData.currentStepLevel));
            let listed = false;
            if (current && Array.isArray(current.signers)) {
              listed = current.signers.some((s) => {
                const v = (
                  s.log_nik ||
                  s.Appr_ID ||
                  s.signer_id ||
                  s.signer_identity ||
                  s.signer_identity_id ||
                  ""
                ).toString();
                return myNik && v && String(myNik) === String(v);
              });
            }

            if (listed) setCanSign(true);
          } catch (e) {
            console.warn("Failed to evaluate signingWorkflow signers for permission:", e);
          }
        }
      } catch (err) {
        console.error("Error fetching berita acara detail:", err);
        setError("Error fetching berita acara details");
      } finally {
        setLoading(false);
      }
    };

    fetchBeritaAcaraDetail();
  }, [beritaAcaraId, user]);

  // Aggregate verification start/end times across all related permohonan using workflow API
  useEffect(() => {
    if (!data?.requests || data.requests.length === 0) {
      setVerificationTimeRange({ start: null, end: null });
      return;
    }

    let cancelled = false;

    const normalizeTs = (val) => {
      if (!val) return null;
      const direct = new Date(val);
      if (!Number.isNaN(direct.getTime())) return direct.toISOString();

      // Fallback: handle malformed fractional seconds like 2025-12-02T07:07:49.07.200Z
      const m = val.match(/^([0-9]{4}-[0-9]{2}-[0-9]{2})[T ]([0-9]{2}):([0-9]{2}):([0-9]{2})/);
      if (m) {
        return `${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`;
      }
      return null;
    };

    const loadVerificationTimes = async () => {
      try {
        const workflowResults = await Promise.all(
          data.requests.map(async (req) => {
            try {
              const res = await dataAPI.getApprovalWorkflows(req.request_id);
              if (res?.data?.success) return res.data.data || [];
            } catch (err) {
              console.error("Failed to fetch approval workflows for request", req.request_id, err);
            }
            return null;
          })
        );

        const startTimes = [];
        const endTimes = [];

        workflowResults.forEach((steps) => {
          if (!steps) return;
          const verificationStep = steps.find(
            (step) => Number(step.step_level) === 3 || (step.step_name || "").toLowerCase() === "verification"
          );
          if (verificationStep && Array.isArray(verificationStep.VerificationRoles)) {
            // Ambil semua roles id 1..4, pilih approved_at paling awal untuk start
            // dan approved_at paling akhir untuk end (langkah tidak selalu mulai dari id 1)
            const roleTimes = verificationStep.VerificationRoles
              .filter((r) => [1, 2, 3, 4].includes(Number(r.id || r.role_id)))
              .map((r) => r && r.approved_at)
              .filter(Boolean);

            if (roleTimes.length > 0) {
              // Gunakan normalizer yang ada di bawah saat konversi ke millis
              // Di sini cukup push raw timestamps; konversi terjadi setelahnya
              // Start = earliest di permohonan ini, End = latest di permohonan ini
              // Nanti di bawah akan diambil min(startTimes) dan max(endTimes) lintas permohonan
              // dengan konversi ke millis melalui toMillis
              // Untuk menjaga konsistensi, kita tentukan earliest/latest via Date langsung di sini juga
              const toMsLocal = (v) => {
                const norm = normalizeTs(v);
                return norm ? new Date(norm).getTime() : null;
              };
              const msList = roleTimes.map(toMsLocal).filter((v) => v !== null && Number.isFinite(v));
              if (msList.length > 0) {
                const earliestMs = Math.min(...msList);
                const latestMs = Math.max(...msList);
                startTimes.push(new Date(earliestMs).toISOString());
                endTimes.push(new Date(latestMs).toISOString());
              }
            }
          }
        });

        const toMillis = (val) => {
          const norm = normalizeTs(val);
          if (!norm) return null;
          const ts = new Date(norm).getTime();
          return Number.isFinite(ts) ? ts : null;
        };

        const startMillis = startTimes.map(toMillis).filter((v) => v !== null);
        const endMillis = endTimes.map(toMillis).filter((v) => v !== null);

        // Take earliest start time and latest end time from all permohonan
        const minStart = startMillis.length ? Math.min(...startMillis) : null;
        const maxEnd = endMillis.length ? Math.max(...endMillis) : null;

        if (!cancelled) {
          setVerificationTimeRange({
            start: minStart !== null ? new Date(minStart).toISOString() : null,
            end: maxEnd !== null ? new Date(maxEnd).toISOString() : null,
          });
        }
      } catch (err) {
        console.error("Failed to aggregate verification times", err);
        if (!cancelled) setVerificationTimeRange({ start: null, end: null });
      }
    };

    loadVerificationTimes();

    return () => {
      cancelled = true;
    };
  }, [data?.requests]);

  const handleBack = () => {
    if (onNavigate) {
      // Use navigation context if available, otherwise fallback to default
      const fromContext = navigationData?.from;
      if (fromContext && fromContext.page) {
        onNavigate(fromContext.page, {
          pageAlias: fromContext.pageAlias,
          group: fromContext.group,
          pageNumber: fromContext.pageNumber
        });
      } else {
        onNavigate("berita-acara");
      }
    }
  };

  const handleSign = async () => {
    if (!beritaAcaraId) {
      showError("Invalid Berita Acara ID");
      return;
    }

    // DEBUG: Log signing attempt

    const result = await showConfirmation("Are you sure you want to sign this Berita Acara?", "Confirm Sign");
    if (!result.isConfirmed) return;

    try {
      setLoading(true);

      // DEBUG: Log API call

      const response = await dataAPI.signBeritaAcara(beritaAcaraId);

      // DEBUG: Log response

      if (response.data.success) {
        showSuccess(response.data.message || "Berita Acara signed successfully!");
        window.location.reload();
      } else {
        showError("Error: " + (response.data.message || "Failed to sign berita acara"));
      }
    } catch (error) {
      console.error("Error signing berita acara:", error);
      showError("Error signing berita acara.");
    } finally {
      setLoading(false);
    }
  };
  const handleGenerateBeritaAcara = async () => {
    if (!beritaAcaraId) {
      showError("Invalid Berita Acara ID");
      return;
    }

    try {
      setBeritaAcaraLoading(true);

      // Fetch berita acara data first to get the required info
      const res = await dataAPI.getBeritaAcaraDataForDoc(beritaAcaraId);
      if (!res.data.success) {
        showError(res.data?.message || "Gagal memuat data berita acara");
        return;
      }

      const beritaAcaraData = res.data.data;
      const BASE_URL_FE = getBaseUrl();
      const link = `${BASE_URL_FE}/berita-acara-pemusnahan/print/${beritaAcaraId}`;
      const createdAt = new Date().toISOString();

      // Try to call the print API directly with authentication
      try {
        const printRes = await dataAPI.printBeritaAcaraPemusnahan({ beritaAcaraId, link, createdAt });
        if (printRes?.data?.success && printRes.data.data) {
          // response.data.data is an ArrayBuffer
          const arrayBuffer = printRes.data.data;
          const blob = new Blob([arrayBuffer], { type: "application/pdf" });
          const url = window.URL.createObjectURL(blob);
          window.open(url, "_blank");
          console.log("PDF generated successfully");
        } else {
          console.warn("Print request failed:", printRes?.data?.message);
          // Fallback to direct URL with token
          const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/$/, "");
          const printUrl = `${BASE_URL}/document-generation/print-berita-acara-pemusnahan?link=${encodeURIComponent(
            link
          )}&beritaAcaraId=${encodeURIComponent(beritaAcaraId)}&createdAt=${encodeURIComponent(createdAt)}`;
          window.open(TokenManager.addTokenToUrl(printUrl), "_blank");
        }
      } catch (printErr) {
        console.warn("Print API call failed:", printErr.message);
        // Fallback to direct URL with token
        const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/$/, "");
        const printUrl = `${BASE_URL}/document-generation/print-berita-acara-pemusnahan?link=${encodeURIComponent(
          link
        )}&beritaAcaraId=${encodeURIComponent(beritaAcaraId)}&createdAt=${encodeURIComponent(createdAt)}`;
        window.open(TokenManager.addTokenToUrl(printUrl), "_blank");
      }
    } catch (err) {
      console.error("Error generating PDF:", err);
      showError("Gagal membuat PDF berita acara");
    } finally {
      setBeritaAcaraLoading(false);
    }
  };

  const handleDownloadExcel = async (requestId) => {
    if (!requestId) {
      showError("ID permohonan tidak tersedia");
      return;
    }

    try {
      setExcelLoadingStates((prev) => ({ ...prev, [requestId]: true }));
      const response = await dataAPI.downloadPermohonanExcel(requestId);

      if (response.data.success && response.data.data) {
        // Create and download Excel file
        const arrayBuffer = response.data.data;
        const blob = new Blob([arrayBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const permohonanItem = data.daftarPemusnahan.find((item) => item.request_id === requestId);
        link.download = `detail-limbah-${permohonanItem?.noPermohonan || requestId}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log("Excel file downloaded successfully");
      } else {
        showError("Gagal mengunduh lampiran Excel: " + (response.data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Error downloading Excel:", err);
      showError("Gagal mengunduh lampiran Excel");
    } finally {
      setExcelLoadingStates((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleGeneratePermohonanPDF = async (requestId) => {
    if (!requestId) {
      showError("ID permohonan tidak tersedia");
      return;
    }

    try {
      setPermohonanLoadingStates((prev) => ({ ...prev, [requestId]: true }));

      // Fetch permohonan data first to get the required info
      const res = await dataAPI.getPermohonanDataForDoc(requestId);
      if (!res.data.success) {
        showError(res.data?.message || "Gagal memuat data permohonan");
        return;
      }

      const permohonanData = res.data.data;
      const BASE_URL_FE = getBaseUrl();
      const link = `${BASE_URL_FE}/permohonan-pemusnahan/print/${requestId}`;
      const createdAt = permohonanData?.tanggal_pengajuan || new Date().toISOString();

      // Try to call the print API directly with authentication
      try {
        const printRes = await dataAPI.printPermohonanPemusnahan({ requestId, link, createdAt });
        if (printRes?.data?.success && printRes.data.data) {
          // response.data.data is an ArrayBuffer
          const arrayBuffer = printRes.data.data;
          const blob = new Blob([arrayBuffer], { type: "application/pdf" });
          const url = window.URL.createObjectURL(blob);
          window.open(url, "_blank");
          console.log("PDF generated successfully");
        } else {
          console.warn("Print request failed:", printRes?.data?.message);
          // Fallback to direct URL with token
          const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/$/, "");
          const printUrl = `${BASE_URL}/document-generation/print-permohonan-pemusnahan?link=${encodeURIComponent(
            link
          )}&createdAt=${encodeURIComponent(createdAt)}`;
          window.open(TokenManager.addTokenToUrl(printUrl), "_blank");
        }
      } catch (printErr) {
        console.warn("Print API call failed:", printErr.message);
        // Fallback to direct URL with token
        const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/$/, "");
        const printUrl = `${BASE_URL}/document-generation/print-permohonan-pemusnahan?link=${encodeURIComponent(
          link
        )}&createdAt=${encodeURIComponent(createdAt)}`;
        window.open(TokenManager.addTokenToUrl(printUrl), "_blank");
      }
    } catch (err) {
      console.error("Error generating PDF:", err);
      showError("Gagal membuat PDF permohonan");
    } finally {
      setPermohonanLoadingStates((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat detail berita acara...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading screen when generating berita acara PDF
  if (beritaAcaraLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Generating Berita Acara...</p>
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
          <button onClick={handleBack} className="mt-2 text-red-600 hover:text-red-800 underline">
            Kembali ke Berita Acara
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
          <button onClick={handleBack} className="mt-2 text-green-600 hover:text-green-800 underline">
            Kembali ke Berita Acara
          </button>
        </div>
      </div>
    );
  }

  const verificationTimeText =
    verificationTimeRange.start || verificationTimeRange.end
      ? `${verificationTimeRange.start ? formatTimeID(verificationTimeRange.start) : ''}${
          verificationTimeRange.start && verificationTimeRange.end ? ' - ' : ''
        }${verificationTimeRange.end ? formatTimeID(verificationTimeRange.end) : ''}`.trim()
      : data.detailBAP.jamWaktu;

  return (
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="mb-6">
        <nav className="text-sm text-gray-500 mb-2">
          <button onClick={handleBack} className="text-gray-500 hover:text-gray-700">
            Limbah B3
          </button>
          <span className="mx-2">›</span>
          <span className="text-gray-900">Detail Berita Acara Pemusnahan</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Detail Berita Acara Pemusnahan</h1>
            <p className="mt-2 text-gray-600">Detail informasi berita acara pemusnahan limbah B3.</p>
          </div>
          <div className="flex gap-3">
            {data?.status === "Completed" && (
              <>
                <button
                  onClick={handleGenerateBeritaAcara}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                  disabled={beritaAcaraLoading}
                >
                  {beritaAcaraLoading ? "Generating..." : "Generate Berita Acara"}
                </button>
              </>
            )}

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
              <h2 className="text-xl font-semibold text-gray-900">No. Berita Acara : {data.noBeritaAcara}</h2>
            </div>
            <div className="text-right">
              <span className="text-sm text-gray-500">Status :</span>
              <span
                className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                style={getStatusStyle(data.status)}
              >
                {getBeritaAcaraStatusDisplayName(data.status, data.currentStepLevel)}
              </span>
            </div>
          </div>
        </div>

        {/* Signing Workflow */}
        <div className="p-6 border-b border-gray-200">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Status Persetujuan</h3>
          </div>
          <SigningWorkflowSteps
            requestId={data.requestId}
            currentStatus={data.currentStatus}
            requesterName={data.requesterName}
            submittedAt={data.submittedAt}
            golonganLimbahId={data.golonganLimbahId}
            golonganLimbahName={data.golonganLimbahName}
            currentStepLevel={data.currentStepLevel}
            bagian={data.bagian}
            signingWorkflow={signingWorkflow}
            isProdukPangan={data.isProdukPangan}
          />
        </div>

        {/* Detail BAP Section */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail BAP</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Divisi</label>
              <p className="text-gray-900">{data.detailBAP.divisi}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hari/Tanggal</label>
              <p className="text-gray-900">{data.detailBAP.hariTanggal}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jam/Waktu</label>
              <p className="text-gray-900">{verificationTimeText}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi Verifikasi</label>
              <p className="text-gray-900">{data.detailBAP.lokasiVerifikasi}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pelaksana Bagian</label>
              <p className="text-gray-900">{data.detailBAP.pelaksanaBagian}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor/Officer Bagian</label>
              <p className="text-gray-900">{data.detailBAP.supervisorOfficerBagian}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pelaksana HSE</label>
              <p className="text-gray-900">{data.detailBAP.pelaksanaHSE}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor/Officer HSE</label>
              <p className="text-gray-900">{data.detailBAP.supervisorOfficerHSE}</p>
            </div>
          </div>
        </div>

        {/* Daftar Pemusnahan Section */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daftar Pemusnahan</h3>

          <div className="flex gap-6">
            {/* Table Section */}
            <div className="flex-1">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-green-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        No. Permohonan
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Bentuk Limbah
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Golongan Limbah
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Jenis Limbah
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Jumlah Item
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Bobot Total (gram)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                        Alasan Pemusnahan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.daftarPemusnahan.map((item, index) => (
                      <tr key={item.request_id || index} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.noPermohonan}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.bentukLimbah}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.golonganLimbah}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{item.jenisLimbah}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.jumlahItem}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.bobotTotal}</td>
                        <td className="px-4 py-4 text-sm text-gray-900">{item.alasanPemusnahan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons Section */}
            <div className="w-80 flex-shrink-0">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="space-y-3">
                  {data.daftarPemusnahan.map((item, index) => (
                    <div key={item.request_id || index} className="bg-white rounded-md border border-gray-200 p-3">
                      <div className="text-xs font-medium text-gray-600 mb-2">{item.noPermohonan}</div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleDownloadExcel(item.request_id)}
                          className="w-full px-3 py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                          disabled={excelLoadingStates[item.request_id]}
                          title="Download Lampiran Excel"
                        >
                          {excelLoadingStates[item.request_id] ? "Loading..." : "Download Lampiran"}
                        </button>
                        <button
                          onClick={() => handleGeneratePermohonanPDF(item.request_id)}
                          className="w-full px-3 py-2 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                          disabled={permohonanLoadingStates[item.request_id]}
                          title="Generate Form Permohonan PDF"
                        >
                          {permohonanLoadingStates[item.request_id] ? "Generating..." : "Generate Form Permohonan"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Button - Show for InProgress status when user has permission */}
        {data.status !== "Completed" && canSign && (
          <div className="p-6 border-t border-gray-200 flex items-center gap-3 justify-end">
            <button
              onClick={handleSign}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              disabled={loading}
            >
              {loading ? "Signing..." : "Sign Berita Acara"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailBeritaAcara;
