import { useEffect, useState } from "react";
import BeritaAcaraDataTable from "../components/BeritaAcaraDataTable";
import { useAuth } from "../contexts/AuthContext";
import { dataAPI } from "../services/api";
import { showInfo } from "../utils/sweetAlert";

const BeritaAcara = ({ onNavigate, onPendingApprovalChange, pendingApprovalByGroup, group, viewMode }) => {
  const { user } = useAuth();
  const [isCreatorAllowed, setIsCreatorAllowed] = useState(false);
  const [creatorCheckLoading, setCreatorCheckLoading] = useState(true);

  // Show "Tambah Berita Acara" to users registered in external approval API:
  //   - KL officers:  Appr_No=1 (Supervisor/Officer) or Appr_No=2 (Manager) — all groups
  //   - QA officers:  Appr_No=3 — only for 'recall' group
  //   - PN1 officers: Appr_No=3 — only for 'recall-precursor' group
  useEffect(() => {
    let mounted = true;

    const checkCreator = async () => {
      setCreatorCheckLoading(true);
      try {
        const res = await dataAPI.getExternalApprovalList(null);
        if (res.data && res.data.success) {
          const items = res.data.data || [];
          const appItems = items.filter(i => String(i.Appr_ApplicationCode || '') === 'ePengelolaan_Limbah_Berita_Acara');
          const myNik = user && (user.log_NIK || user.emp_NIK || user.log_nik || user.NIK);
          const myEntries = appItems.filter(it => String(it.Appr_ID) === String(myNik));

          // KL (Appr_No 1 or 2) → allowed for all groups
          const isKL = myEntries.some(e =>
            (Number(e.Appr_No) === 1 || Number(e.Appr_No) === 2) &&
            String((e.Appr_DeptID || '').toUpperCase()) === 'KL'
          );
          // QA (Appr_No 3) → only for 'recall' group
          const isQA = group === 'recall' && myEntries.some(e =>
            Number(e.Appr_No) === 3 &&
            String((e.Appr_DeptID || '').toUpperCase()) === 'QA'
          );
          // PN1 (Appr_No 3) → only for 'recall-precursor' group
          const isPN1 = group === 'recall-precursor' && myEntries.some(e =>
            Number(e.Appr_No) === 3 &&
            String((e.Appr_DeptID || '').toUpperCase()) === 'PN1'
          );

          if (mounted) setIsCreatorAllowed(isKL || isQA || isPN1);
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

  const handleAddBeritaAcara = () => {
    // Navigate to form page with group context
    if (onNavigate) {
      onNavigate("tambah-berita-acara", { group });
    } else {
      showInfo("Add berita acara functionality will be implemented here");
    }
  };

  const getBreadCrumb = () => {
    if (group === 'limbah-b3') {
      return 'Limbah B3';
    } else if (group === 'recall') {
      return 'Recall';
    } else if (group === 'recall-precursor') {
      return 'Precursor & OOT';
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <nav className="text-sm text-gray-500 mb-2">
          <span>{getBreadCrumb() || ''}</span>
          <span className="mx-2">›</span>
          <span className="text-gray-900">Berita Acara Pemusnahan</span>
        </nav>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Berita Acara Pemusnahan</h1>
            <p className="mt-2 text-gray-600">Berita acara pemusnahan yang telah dibuat.</p>
          </div>
          {isCreatorAllowed && (
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              onClick={handleAddBeritaAcara}
            >
              <span className="text-lg leading-none">+</span>
              <span>Tambah Berita Acara</span>
            </button>
          )}
        </div>
      </div>

      <BeritaAcaraDataTable onNavigate={onNavigate} onPendingApprovalChange={onPendingApprovalChange} pendingApprovalByGroup={pendingApprovalByGroup} initialTab={viewMode === 'pending-approval' ? 'pending-approval' : 'all'} />
    </div>
  );
};

export default BeritaAcara;
