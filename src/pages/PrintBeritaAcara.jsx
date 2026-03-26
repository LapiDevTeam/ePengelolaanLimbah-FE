import { useEffect, useState } from "react";
import FormBeritaAcaraContent from "../components/FormBeritaAcaraContent";
import { dataAPI } from "../services/api";
import { API_URL } from "../config/url";

export default function PrintBeritaAcara({ beritaAcaraId: propBeritaAcaraId = null }) {
  // Fallback: parse beritaAcaraId from URL like MainLayout (no react-router)
  const getBeritaAcaraIdFromURL = () => {
    let path = window.location.pathname;
    
    // Remove base path if present (e.g., /ePemusnahanLimbah)
    if (path.startsWith('/ePemusnahanLimbah')) {
      path = path.substring('/ePemusnahanLimbah'.length);
    }
    
    const normalized = path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
    if (normalized.startsWith("/berita-acara-pemusnahan/print/")) {
      const parts = normalized.split("/");
      return parts.length >= 3 ? parts[parts.length - 1] : null;
    }
    return null;
  };

  const beritaAcaraId = propBeritaAcaraId || getBeritaAcaraIdFromURL();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debug logging
  console.log('[PrintBeritaAcara] beritaAcaraId:', beritaAcaraId);
  console.log('[PrintBeritaAcara] API URL:', API_URL);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('[PrintBeritaAcara] Fetching data for ID:', beritaAcaraId);
        const response = await dataAPI.getBeritaAcaraDataForDoc(beritaAcaraId);
        console.log('[PrintBeritaAcara] API Response:', response);

        if (response.data && response.data.success) {
          console.log('[PrintBeritaAcara] Data loaded successfully');
          setData(response.data.data);
        } else {
          console.error('[PrintBeritaAcara] API returned error:', response.data?.message);
          setError("Gagal memuat data");
        }
      } catch (err) {
        console.error("[PrintBeritaAcara] Error fetching data:", err);
        setError(err.message || "Terjadi kesalahan saat memuat data");
      } finally {
        setLoading(false);
      }
    };

    if (beritaAcaraId) {
      fetchData();
    } else {
      console.error('[PrintBeritaAcara] No beritaAcaraId provided');
      setLoading(false);
      setError("No beritaAcaraId provided");
    }
  }, [beritaAcaraId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p className="text-xl font-semibold">Error</p>
          <p className="mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Data tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {data && beritaAcaraId ? (
        <FormBeritaAcaraContent data={data} beritaAcaraId={beritaAcaraId} />
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-600">Loading document content...</p>
        </div>
      )}
    </div>
  );
}
