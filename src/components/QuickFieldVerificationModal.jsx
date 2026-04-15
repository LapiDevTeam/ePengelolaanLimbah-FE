import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { dataAPI } from "../services/api";
import { getUserVerificationRoles } from "../constants/accessRights";
import { toJakartaIsoFromLocal, formatDateID } from "../utils/time";
import { showWarning, showError, showSuccess } from "../utils/sweetAlert";

// ─── Icons ───────────────────────────────────────────────────────────────────
const XIcon = () => (
  <div className="w-5 h-5 relative">
    <div className="absolute top-2 left-0 w-5 h-0.5 bg-current transform rotate-45 origin-center" />
    <div className="absolute top-2 left-0 w-5 h-0.5 bg-current transform -rotate-45 origin-center" />
  </div>
);

const CheckIcon = () => (
  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
      clipRule="evenodd"
    />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

// ─── Constants ───────────────────────────────────────────────────────────────
const VERIFICATION_ROLES = [
  { id: 1, key: "pelaksana_pemohon", title: "Pelaksana Pemohon", description: "Verifikasi dari pelaksana bagian pemohon", department: "pemohon", jobLevel: 7 },
  { id: 2, key: "supervisor_pemohon", title: "Supervisor/Officer Pemohon", description: "Supervisi dari bagian pemohon", department: "pemohon", jobLevel: [5, 6] },
  { id: 3, key: "pelaksana_hse", title: "Pelaksana HSE", description: "Verifikasi dari pelaksana HSE", department: "KL", jobLevel: 7 },
  { id: 4, key: "supervisor_hse", title: "Supervisor/Officer HSE", description: "Supervisi dari bagian HSE", department: "KL", jobLevel: [5, 6] },
];

const CHECKLIST_ITEMS = [
  { id: 1, text: "Memastikan bahwa kemasan Limbah B3 tertutup dengan rapat, kemasan tidak rusak, tidak bocor, serta kelengkapan label identitas dan simbol limbah B3" },
  { id: 2, text: "Melengkapi seluruh kolom pada spreadsheet" },
];

const isADGroup = (dept) => dept === "AD1" || dept === "AD2";

// ─── Component ───────────────────────────────────────────────────────────────
const QuickFieldVerificationModal = ({ isOpen, onClose, onComplete, ajuanData }) => {
  const { user } = useAuth();

  // Which roles can the currently-logged-in user approve?
  const eligibleRoleIds = ajuanData
    ? getUserVerificationRoles(user, ajuanData.bagian)
    : [];

  // ── State ──────────────────────────────────────────────────────────────
  const [verifications, setVerifications] = useState({});
  const [availableVerifiers, setAvailableVerifiers] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [verifierListOpen, setVerifierListOpen] = useState(false);
  const [verifierTab, setVerifierTab] = useState(1);
  const [loadingData, setLoadingData] = useState(false);

  // ── Helper: eligible role IDs based on external approver data ─────────
  const getExternalUserEligibleRoles = useCallback((approver, permohonanDept) => {
    const roles = [];
    const dept = (approver.Appr_DeptID || "").toString().toUpperCase();
    const jl = parseInt(approver.job_levelid || 0);
    const reqDept = (permohonanDept || "").toString().toUpperCase();

    if (dept === "KL") {
      if (jl === 7) roles.push(3);
      if (jl === 5 || jl === 6) roles.push(4);
    }
    if (reqDept && (dept === reqDept || (isADGroup(dept) && isADGroup(reqDept)))) {
      if (jl === 7) roles.push(1);
      if (jl === 5 || jl === 6) roles.push(2);
    }
    return roles;
  }, []);

  // ── Load verification data ────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !ajuanData?.id) return;
    let cancelled = false;

    const load = async () => {
      setLoadingData(true);
      try {
        const [externalRes, workflowRes] = await Promise.all([
          dataAPI.getExternalApprovalList(3),
          dataAPI.getApprovalWorkflows(ajuanData.id),
        ]);

        if (cancelled) return;

        // ── Parse workflow for verification step ──
        const workflows = workflowRes?.data?.data || [];
        const step3 = workflows.find((s) => s.step_level === 3);

        if (step3) {
          const rolesFromBE = step3.VerificationRoles || [];
          const loaded = {};
          const loadedChecked = {};

          rolesFromBE.forEach((role) => {
            if (role.approved) {
              loaded[role.id] = {
                status: "approved",
                completedAt: role.approved_at,
                userInfo: { username: role.approver_id || "Unknown", name: role.approver_name || "Unknown" },
              };
              CHECKLIST_ITEMS.forEach((ci) => {
                loadedChecked[`${role.id}-${ci.id}`] = true;
              });
            }
          });
          setVerifications(loaded);
          setCheckedItems(loadedChecked);
        }

        // ── Parse external verifiers ──
        if (externalRes?.data?.success) {
          const approvers = (externalRes.data.data || []).filter(
            (a) => String(a.Appr_No ?? a.appr_no) === "3"
          );
          const permohonanDept = ajuanData.bagian;

          const seen = new Set();
          const users = [];
          approvers.forEach((a) => {
            const roles = getExternalUserEligibleRoles(a, permohonanDept);
            if (roles.length === 0) return;
            const key = String(a.Appr_ID);
            if (seen.has(key)) return;
            seen.add(key);
            users.push({
              id: a.Appr_ID,
              username: a.Appr_ID,
              name: a.emp_Name,
              department: a.Appr_DeptID,
              jobLevel: parseInt(a.job_levelid || 0),
              jobTitle: a.Appr_CC,
              eligibleRoles: roles,
            });
          });
          setAvailableVerifiers(users);
        }
      } catch (err) {
        console.error("QuickFieldVerificationModal: load error", err);
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [isOpen, ajuanData, getExternalUserEligibleRoles]);

  // ── Derived state ─────────────────────────────────────────────────────
  const isRoleCompleted = (id) => verifications[id]?.status === "approved";
  const completedCount = Object.values(verifications).filter((v) => v.status === "approved").length;

  // Build verifier info from the same external approval data the old modal uses.
  // Match the logged-in user's NIK against the availableVerifiers list so that
  // verifierId, verifierName, verifierJabatan are identical to the old flow.
  const loggedInNIK = user?.log_NIK || user?.username || '';
  const matchedVerifier = availableVerifiers.find(
    (v) => String(v.id) === String(loggedInNIK) || String(v.username) === String(loggedInNIK)
  );
  // currentUserInfo mirrors the old FieldVerificationModal shape exactly:
  //   id / username  = Appr_ID (NIK)
  //   name           = emp_Name
  //   jobTitle       = Appr_CC  (e.g. "Pelaksana", "Supervisor")
  //   department     = Appr_DeptID
  //   jobLevel       = job_levelid (number)
  const currentUserInfo = matchedVerifier || (user ? {
    id: loggedInNIK,
    username: loggedInNIK,
    name: user.emp_Name || user.name || loggedInNIK || 'Unknown',
    department: (user.emp_DeptID || '').toString().toUpperCase(),
    jobLevel: user.Job_LevelID != null ? Number(user.Job_LevelID) : null,
    jobTitle: user.Jabatan || user.role || '',
    eligibleRoles: eligibleRoleIds,
  } : null);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleRoleClick = (roleId) => {
    if (isRoleCompleted(roleId)) return;
    if (!eligibleRoleIds.includes(roleId)) return;
    setSelectedRole(roleId);
    setShowRejectModal(false);
    setRejectReason("");
    setRejectError("");
  };

  const handleChecklistChange = (itemId, checked) => {
    if (!selectedRole) return;
    setCheckedItems((prev) => ({ ...prev, [`${selectedRole}-${itemId}`]: checked }));
  };

  const handleVerification = async () => {
    if (!selectedRole || !currentUserInfo) return;

    const allChecked = CHECKLIST_ITEMS.every((i) => checkedItems[`${selectedRole}-${i.id}`] === true);
    if (!allChecked) {
      showWarning("Mohon lengkapi semua checklist sebelum melakukan verifikasi");
      return;
    }

    try {
      const roleData = VERIFICATION_ROLES.find((r) => r.id === selectedRole);
      const checklistPayload = CHECKLIST_ITEMS.map((item) => ({
        ...item,
        checked: checkedItems[`${selectedRole}-${item.id}`],
      }));

      const res = await dataAPI.approveDestructionRequest(
        ajuanData?.id,
        JSON.stringify(checklistPayload),
        {
          verifierId: currentUserInfo.id || currentUserInfo.username,
          verifierName: currentUserInfo.name,
          verifierJabatan: currentUserInfo.jobTitle,
          roleId: selectedRole,
        }
      );

      if (res.data?.success) {
        const entry = {
          status: "approved",
          completedAt: toJakartaIsoFromLocal(),
          userInfo: { username: currentUserInfo.username, name: currentUserInfo.name },
        };

        const updated = { ...verifications, [selectedRole]: entry };
        setVerifications(updated);
        setSelectedRole(null);

        const newCount = Object.values(updated).filter((v) => v.status === "approved").length;
        if (newCount === VERIFICATION_ROLES.length) {
          onComplete && onComplete({ status: "field_verified" });
        } else {
          showSuccess(`Verifikasi ${roleData.title} berhasil!`);
          // Refresh parent data
          onComplete && onComplete({ status: "partial", roleId: selectedRole });
        }
      } else {
        showError("Gagal menyimpan verifikasi: " + (res.data?.message || "Terjadi kesalahan"));
      }
    } catch (err) {
      console.error("Verification error:", err);
      showError("Terjadi kesalahan saat menyimpan verifikasi");
    }
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
    setSelectedRole(null);
    setShowRejectModal(false);
    setRejectReason("");
    setRejectError("");
    onClose();
  };

  // ── Render helpers ────────────────────────────────────────────────────
  const verifiersForTab = availableVerifiers.filter((v) => v.eligibleRoles.includes(verifierTab));

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Verifikasi Lapangan</h3>
            <p className="text-sm text-gray-500">No. Permohonan: {ajuanData?.noPermohonan || "N/A"}</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XIcon />
          </button>
        </div>

        {loadingData ? (
          <div className="p-10 text-center text-gray-500">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-green-500 rounded-full animate-spin mx-auto mb-3" />
            Memuat data verifikasi...
          </div>
        ) : (
          <>
            {/* ── Step Selection ── */}
            <div className="p-5 border-b border-gray-200 bg-gray-50">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Tahap Verifikasi ({completedCount}/{VERIFICATION_ROLES.length})
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {VERIFICATION_ROLES.map((role) => {
                  const completed = isRoleCompleted(role.id);
                  const canAccess = eligibleRoleIds.includes(role.id);
                  const isSelected = selectedRole === role.id;
                  const disabled = completed || !canAccess;

                  return (
                    <button
                      key={role.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleRoleClick(role.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        completed
                          ? "bg-green-50 border-green-200 cursor-default"
                          : isSelected
                          ? "bg-blue-50 border-blue-300 shadow-md"
                          : canAccess
                          ? "bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm cursor-pointer"
                          : "bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-sm font-medium ${
                            completed ? "text-green-700" : isSelected ? "text-blue-700" : canAccess ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          Tahap {role.id}: {role.title}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            completed ? "bg-green-500" : isSelected ? "bg-blue-500" : "bg-gray-300"
                          }`}
                        >
                          {completed ? <CheckIcon /> : <span className="text-white text-[10px] font-bold">{role.id}</span>}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{role.description}</p>
                      {completed && verifications[role.id]?.userInfo && (
                        <p className="mt-1 text-xs text-green-600">
                          Verifikator: {verifications[role.id].userInfo.name}
                        </p>
                      )}
                      {!canAccess && !completed && (
                        <p className="mt-1 text-xs text-gray-400 italic">Anda tidak memiliki akses</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Main Content: Auth / Checklist / Reject ── */}
            <div className="p-5">
              {!selectedRole ? (
                <p className="text-center text-gray-500 text-sm py-4">
                  Pilih salah satu tahap di atas untuk memulai verifikasi.
                </p>
              ) : showRejectModal ? (
                /* ── Reject Form ── */
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
              ) : (
                /* ── Checklist + Actions (uses session user, no separate login) ── */
                <div className="space-y-5">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                    Verifikasi sebagai: <span className="font-semibold">{currentUserInfo?.name}</span>{" "}
                    ({VERIFICATION_ROLES.find((r) => r.id === selectedRole)?.title})
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-900 mb-3 text-sm">
                      Checklist Verifikasi — {VERIFICATION_ROLES.find((r) => r.id === selectedRole)?.title}
                    </h5>
                    <div className="space-y-2">
                      {CHECKLIST_ITEMS.map((item) => (
                        <label key={item.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checkedItems[`${selectedRole}-${item.id}`] || false}
                            onChange={(e) => handleChecklistChange(item.id, e.target.checked)}
                            className="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 leading-relaxed">{item.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Verification Status Table */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <h6 className="font-medium text-gray-900 mb-2 text-sm">Status Verifikasi Keseluruhan</h6>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-300 text-xs">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="border border-gray-300 px-2 py-1 text-center font-medium text-gray-700 uppercase" colSpan="2">Bagian Pemohon</th>
                            <th className="border border-gray-300 px-2 py-1 text-center font-medium text-gray-700 uppercase" colSpan="2">Bagian HSE</th>
                          </tr>
                          <tr>
                            <th className="border border-gray-300 px-2 py-1" />
                            <th className="border border-gray-300 px-2 py-1 text-center font-medium text-gray-700">Pelaksana</th>
                            <th className="border border-gray-300 px-2 py-1 text-center font-medium text-gray-700">Spv/Officer</th>
                            <th className="border border-gray-300 px-2 py-1 text-center font-medium text-gray-700">Pelaksana</th>
                            <th className="border border-gray-300 px-2 py-1 text-center font-medium text-gray-700">Spv/Officer</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {CHECKLIST_ITEMS.map((ci) => (
                            <tr key={ci.id}>
                              <td className="border border-gray-300 px-2 py-1 text-gray-900">{ci.text}</td>
                              {VERIFICATION_ROLES.map((role) => (
                                <td key={role.id} className="border border-gray-300 px-2 py-1 text-center">
                                  {isRoleCompleted(role.id) ? (
                                    <span className="inline-flex w-5 h-5 bg-green-600 text-white rounded-full items-center justify-center"><CheckIcon /></span>
                                  ) : role.id === selectedRole ? (
                                    <span className="inline-block w-5 h-5 bg-blue-100 border-2 border-blue-600 rounded" />
                                  ) : (
                                    <span className="inline-block w-5 h-5 bg-gray-100 border border-gray-300 rounded" />
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                          <tr>
                            <td className="border border-gray-300 px-2 py-1 font-medium text-gray-900">Paraf / Tgl</td>
                            {VERIFICATION_ROLES.map((role) => (
                              <td key={role.id} className="border border-gray-300 px-2 py-1 text-center text-gray-600">
                                {isRoleCompleted(role.id) && verifications[role.id] ? (
                                  <div>
                                    <div className="font-medium">{verifications[role.id].userInfo?.name}</div>
                                    <div>{verifications[role.id].completedAt ? formatDateID(verifications[role.id].completedAt) : "-"}</div>
                                  </div>
                                ) : "-"}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ── Action Buttons ── */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedRole(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      Kembali
                    </button>
                    <div className="flex items-center gap-2">
                      {currentUserInfo && currentUserInfo.department === "KL" && (currentUserInfo.jobLevel === 5 || currentUserInfo.jobLevel === 6) && (
                        <button onClick={() => setShowRejectModal(true)} className="px-5 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 text-sm">
                          Reject
                        </button>
                      )}
                      <button
                        onClick={handleVerification}
                        disabled={!CHECKLIST_ITEMS.every((i) => checkedItems[`${selectedRole}-${i.id}`])}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        Verifikasi
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Verifier List (Collapsible) ── */}
            <div className="border-t border-gray-200">
              <button
                type="button"
                onClick={() => setVerifierListOpen((o) => !o)}
                className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>Daftar Verifikator</span>
                <span className={`transform transition-transform ${verifierListOpen ? "rotate-180" : ""}`}>
                  <ChevronDownIcon />
                </span>
              </button>

              {verifierListOpen && (
                <div className="px-5 pb-5">
                  {/* Tabs 1-4 */}
                  <div className="flex border-b border-gray-200 mb-3">
                    {VERIFICATION_ROLES.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setVerifierTab(role.id)}
                        className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                          verifierTab === role.id
                            ? "border-green-500 text-green-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        Tahap {role.id}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-gray-500 mb-2">
                    {VERIFICATION_ROLES.find((r) => r.id === verifierTab)?.title}
                  </p>

                  {verifiersForTab.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">Tidak ada verifikator tersedia untuk tahap ini.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {verifiersForTab.map((v, idx) => (
                        <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="font-medium text-sm text-gray-900">{v.name}</div>
                          <div className="text-xs text-gray-600">{v.jobTitle}</div>
                          <div className="text-xs text-gray-500">
                            ID: {v.username} | Dept: {v.department} | Level: {v.jobLevel}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QuickFieldVerificationModal;
