import PropTypes from "prop-types";
import { useMemo, useEffect, useState } from "react";
import { dataAPI } from "../services/api";
import { getBaseUrl } from "../utils/urlHelper";

export default function FormPermohonanContent({ requestId = null, data: initialData = null, useMockData = false }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (useMockData) {
        // keep any initialData if provided
        return;
      }
      if (!requestId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await dataAPI.getPermohonanDataForDoc(requestId);
        if (res.data.success) {
          setData(res.data.data);
        } else {
          setError(res.data.message || 'Gagal memuat data dokumen');
        }
      } catch (err) {
        console.error('Error fetching permohonan data for doc:', err);
        setError('Gagal memuat data dokumen');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [requestId, useMockData]);
  // Format tanggal
  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format datetime untuk paraf/tgl
  const formatDateTime = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  // Display name helper - now uses Inisial_Name from API
  const displayNameFor = (inisialName) => {
    if (!inisialName) return "N/A";
    return inisialName;
  };

  // Format paraf dengan delegasi
  const formatParafUser = (paraf, user) => {
    if (!paraf && !user) return "N/A";
    if (!paraf) return displayNameFor(user);
    if (!user) return displayNameFor(paraf);
    if (paraf === user) return displayNameFor(user);
    return `${displayNameFor(paraf)} a.n. ${displayNameFor(user)}`;
  };

  // Checkbox helper
  const renderCheckbox = (checked) => {
    return checked ? "✓" : "";
  };

  // Golongan Limbah checkboxes
  const golonganLimbahOptions = [
    "Prekursor & OOT",
    "Recall",
    "Hormon",
    "Sefalosporin",
    "Probiotik",
    "Betalaktam",
    "Non Betalaktam",
    "Limbah mikrobiologi",
    "Sisa Analisa Lab",
    "Recall & Prekursor",
  ];

  // Jenis Limbah B3 options
  const jenisLimbahOptions = [
    { code: "A336-1", label: "Bahan Baku" },
    { code: "A336-1", label: "Produk antara" },
    { code: "A336-1", label: "Produk ruahan" },
    { code: "A336-1", label: "Produk setengah jadi" },
    { code: "A336-1", label: "Produk jadi" },
    { code: "A336-1", label: "Produk kembalian" },
    { code: "A336-1", label: "Bahan Kimia kadaluwarsa" },
    { code: "A336-2", label: "Residu proses produksi dan formulasi" },
    { code: "B336-2", label: "Sludge dari IPAL" },
    { code: "A102d", label: "Aki/Baterai bekas" },
    { code: "A106d", label: "Limbah laboratorium (HPLC)" },
    { code: "A106d", label: "Sisa destruksi" },
    { code: "B110d", label: "Kain Majun dan sejenisnya" },
    { code: "A108d", label: "Limbah terkontaminasi B3" },
    { code: "B105d", label: "Minyak Pelumas/Oli bekas" },
    { code: "B353-1", label: "Cartridge" },
    { code: "B109d", label: "Filter dan Prefilter" },
    { code: "B107d", label: "Lampu TL" },
    { code: "B107d", label: "Elektronik" },
    { code: "B104d", label: "Kemasan bekas B3" },
  ];

  // Memoize derived values to avoid recomputation on every render
  const { kode, tipe2, tipe } = useMemo(() => {
    let kode;
    let tipe2;

    // Map some common golongan types to codes and printable type names.
    switch (data?.golongan_limbah) {
      case 'Recall':
        kode = 'FO.KL.000012';
        tipe2 = 'PERMOHONAN PEMUSNAHAN RECALL';
        break;
      case 'Prekursor & OOT':
        kode = 'FO.KL.000013';
        tipe2 = 'PERMOHONAN PEMUSNAHAN PREKURSOR & OOT';
        break;
      case 'Recall & Prekursor':
        kode = 'FO.KL.000014';
        tipe2 = 'PERMOHONAN PEMUSNAHAN RECALL & PREKURSOR';
        break;
      default:
        kode = null;
        tipe2 = 'PERMOHONAN PEMUSNAHAN';
    }

    // tipe — take the last word of bentuk_limbah if present
    const tipe = (data?.bentuk_limbah || '')
      .toString()
      .split(' ')
      .pop();

    return { kode, tipe2, tipe };
  }, [data?.golongan_limbah, data?.bentuk_limbah]);

  // Memoize URLs to avoid rebuilding on every render
  const { link, printUrl } = useMemo(() => {
    if (!requestId || !data) {
      return { link: '', printUrl: '' };
    }

    const BASE_URL_FE = getBaseUrl(); // frontend host with base path
    const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

    const link = `${BASE_URL_FE}/permohonan-pemusnahan/print/${requestId}`;
    const createdAt = data?.tanggal_pengajuan || new Date().toISOString();

    // Build the backend print endpoint URL with encoded params
    const printUrl = `${BASE_URL}/document-generation/print-permohonan-pemusnahan?link=${encodeURIComponent(link)}&type=${encodeURIComponent(
      tipe2
    )}&kode=${encodeURIComponent(kode || '')}&createdAt=${encodeURIComponent(createdAt)}`;

    return { link, printUrl };
  }, [requestId, data?.tanggal_pengajuan, tipe2, kode]);

  // Only show content if we have data
  if (loading) {
    return (
      <div className="document-content" style={{fontSize: '10px'}}>
        <div className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            <span>Memuat dokumen...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="document-content" style={{fontSize: '10px'}}>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <h3 className="text-lg text-red-600 mb-2">Error</h3>
            <p className="text-gray-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // No data
  if (!data) {
    return (
      <div className="document-content" style={{fontSize: '10px'}}>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <h3 className="text-lg text-gray-600 mb-2">No Data</h3>
            <p className="text-gray-700">Tidak ada data permohonan untuk ditampilkan.</p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="document-content leading-tight" style={{fontFamily: 'Verdana, sans-serif', fontSize: '10px'}}>
        {/* Section 1: Combined Header and Quantity Table */}
        <div className="page-break">
        <table className="w-full border-collapse border border-black mb-3">
          <tbody>
            {/* Row 1: Padat/Cair and Info Fields */}
            <tr>
              <td className="border border-black px-2 py-1 w-20 text-center">
                <div className="flex items-center justify-center">
                  <span className="border border-black w-4 h-4 flex items-center justify-center mr-1">
                    {data?.is_padat ? "✓" : ""}
                  </span>
                  Padat
                </div>
              </td>
              <td className="border border-black px-2 py-1 w-20 text-center">
                <div className="flex items-center justify-center">
                  <span className="border border-black w-4 h-4 flex items-center justify-center mr-1">
                    {data?.is_cair ? "✓" : ""}
                  </span>
                  Cair
                </div>
              </td>
              <td className="border border-black px-2 py-1 w-24">
                Bagian
              </td>
              <td className="border border-black px-2 py-1 w-28">
                {data?.bagian || "N/A"}
              </td>
              <td className="border border-black px-2 py-1 w-32">
                Tanggal Pengajuan
              </td>
              <td className="border border-black px-2 py-1 w-28">
                {formatDate(data?.tanggal_pengajuan) || "N/A"}
              </td>
              <td className="border border-black px-2 py-1 w-32">
                Nomor Permohonan
              </td>
              <td className="border border-black px-2 py-1">
                {data?.nomor_permohonan || "N/A"}
              </td>
            </tr>
            {/* Row 2: Quantity Information */}
            <tr>
              <td className="border border-black px-2 py-1" colSpan={2}>
                Jumlah item barang
              </td>
              <td className="border border-black px-2 py-1">{data?.jumlah_item !== null && data?.jumlah_item !== undefined ? data.jumlah_item : "N/A"}</td>
              <td className="border border-black px-2 py-1" colSpan={2}>
                Jumlah kemasan (maks. Bobot per kemasan 20 kg)
              </td>
              <td className="border border-black px-2 py-1">{data?.jumlah_wadah !== null && data?.jumlah_wadah !== undefined ? data.jumlah_wadah : "N/A"}</td>
              <td className="border border-black px-2 py-1">
                Bobot Total (gram)
              </td>
              <td className="border border-black px-2 py-1">{data?.bobot_total !== null && data?.bobot_total !== undefined ? data.bobot_total : "N/A"}</td>
            </tr>
          </tbody>
        </table>

        {/* Section 3: Golongan Limbah */}
        <div className="mb-3 mt-6">
          <p className="mb-2">
            Mengajukan permohonan pemusnahan untuk Limbah B3 berupa:
          </p>
          <p className="mb-2 font-bold">Golongan Limbah</p>
          <div className="border border-black p-2 min-h-8">
            <div>
              {data?.golongan_limbah || "N/A"}
            </div>
          </div>
        </div>

        {/* Section 4: Jenis Limbah B3 */}
        <div className="mb-3">
          <p className="mb-2 font-bold">Jenis Limbah B3</p>
          <div className="border border-black p-2 min-h-8">
            <div>
              {data?.jenis_limbah || "N/A"}
            </div>
          </div>
        </div>

        <div>
        {/* Section 5: Checklist Verifikasi */}
        <div className="mb-3 mt-6 verification-section">
          <p className="mb-2">
            Mohon di cek kelengkapan yang harus ada saat verifikasi dan beri checklist (✓), sebagai berikut:
          </p>
          <table className="w-full border-collapse border border-black">
            <thead>
              <tr>
                <th
                  className="border border-black px-2 py-1 text-center"
                  colSpan={2}
                  rowSpan={2}
                >
                  Aktivitas sebelum verifikasi/perusakan
                </th>
                <th className="border border-black px-2 py-1 text-center" colSpan={2}>
                  Bagian Pemohon
                </th>
                <th className="border border-black px-2 py-1 text-center" colSpan={2}>
                  Bagian HSE
                </th>
              </tr>
              <tr>
                <th className="border border-black px-2 py-1 text-center">Pelaksana</th>
                <th className="border border-black px-2 py-1 text-center">Supervisor/Officer</th>
                <th className="border border-black px-2 py-1 text-center">Pelaksana</th>
                <th className="border border-black px-2 py-1 text-center">Supervisor/Officer</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-2 py-1 h-12" colSpan={2}>
                  Memastikan bahwa kemasan Limbah B3 tertutup dengan rapat,
                  kemasan tidak rusak, tidak bocor, serta kelengkapan label
                  identitas dan simbol limbah B3
                </td>
                <td className="border border-black px-2 py-1 text-center">✓</td>
                <td className="border border-black px-2 py-1 text-center">✓</td>
                <td className="border border-black px-2 py-1 text-center">✓</td>
                <td className="border border-black px-2 py-1 text-center">✓</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1 h-12" colSpan={2}>
                  Melengkapi seluruh kolom pada spreadsheet
                </td>
                <td className="border border-black px-2 py-1 text-center">✓</td>
                <td className="border border-black px-2 py-1 text-center">✓</td>
                <td className="border border-black px-2 py-1 text-center">✓</td>
                <td className="border border-black px-2 py-1 text-center">✓</td>
              </tr>
              <tr>
                <td className="border border-black px-2 py-1" colSpan={2}>Paraf/Tgl</td>
                <td className="border border-black px-2 py-1 text-center">
                  {data?.verifikasi?.pelaksana_pemohon?.paraf || "N/A"}<br />
                  {formatDateTime(data?.verifikasi?.pelaksana_pemohon?.tgl) || "N/A"}
                </td>
                <td className="border border-black px-2 py-1 text-center">
                  {data?.verifikasi?.supervisor_pemohon?.paraf || "N/A"}<br />
                  {formatDateTime(data?.verifikasi?.supervisor_pemohon?.tgl) || "N/A"}
                </td>
                <td className="border border-black px-2 py-1 text-center">
                  {data?.verifikasi?.pelaksana_hse?.paraf || "N/A"}<br />
                  {formatDateTime(data?.verifikasi?.pelaksana_hse?.tgl) || "N/A"}
                </td>
                <td className="border border-black px-2 py-1 text-center">
                  {data?.verifikasi?.supervisor_hse?.paraf || "N/A"}<br />
                  {formatDateTime(data?.verifikasi?.supervisor_hse?.tgl) || "N/A"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 6: Alasan Reject */}
        <div className="mb-3">
          <p className="mb-2">Alasan Reject</p>
          <div className="border border-black p-3 min-h-16">
            <div>
              {data?.verifikasi?.alasan_reject || "N/A"}
            </div>
          </div>
        </div>
        </div>

        {/* Section 7: Signature Section */}
        <table className="w-full border-collapse border border-black">
          <thead>
            <tr>
              <th className="border border-black px-2 py-2 text-center">Yang Menyerahkan</th>
              <th className="border border-black px-2 py-2 text-center">Menyetujui</th>
              <th className="border border-black px-2 py-2 text-center">Mengetahui</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black px-2 py-2 h-20 align-bottom">
                <div>Paraf/Tgl</div>
                <div>
                  <div className="h-6"></div>
                  <div className="text-center">
                    {formatParafUser(
                      data?.penyerah?.paraf,
                      data?.penyerah?.user
                    )}
                  </div>
                  <div className="text-center">{formatDateTime(data?.penyerah?.tgl) || "N/A"}</div>
                  <div className="h-6"></div>
                  <div className="mt-1 text-center">{data?.bagian || "N/A"} Manager</div>
                </div>
              </td>
              <td className="border border-black px-2 py-2 h-20 align-bottom">
                <div>Paraf/Tgl</div>
                <div>
                  <div className="h-6"></div>
                  {/* Display each APJ in separate sections side by side within the same cell */}
                  <div className="text-center">
                    <div className="flex justify-center space-x-4">
                      {/* APJ QA Section */}
                      {(data?.menyetujui?.apj_qa?.paraf || data?.menyetujui?.apj_qa?.user) && (
                        <div className="text-center">
                          <div>{formatParafUser(data?.menyetujui?.apj_qa?.paraf, data?.menyetujui?.apj_qa?.user)}</div>
                          <div>{formatDateTime(data?.menyetujui?.apj_qa?.tgl) || "N/A"}</div>
                        </div>
                      )}
                      
                      {/* APJ PN Section */}
                      {(data?.menyetujui?.apj_pn?.paraf || data?.menyetujui?.apj_pn?.user) && (
                        <div className="text-center">
                          <div>{formatParafUser(data?.menyetujui?.apj_pn?.paraf, data?.menyetujui?.apj_pn?.user)}</div>
                          <div>{formatDateTime(data?.menyetujui?.apj_pn?.tgl) || "N/A"}</div>
                        </div>
                      )}
                      
                      {/* PJKPO Section */}
                      {(data?.menyetujui?.pjkpo?.paraf || data?.menyetujui?.pjkpo?.user) && (
                        <div className="text-center">
                          <div>{formatParafUser(data?.menyetujui?.pjkpo?.paraf, data?.menyetujui?.pjkpo?.user)}</div>
                          <div>{formatDateTime(data?.menyetujui?.pjkpo?.tgl) || "N/A"}</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Show N/A if no approvals */}
                    {![data?.menyetujui?.apj_qa, data?.menyetujui?.apj_pn, data?.menyetujui?.pjkpo].some(item => item?.paraf || item?.user) && (
                      <div>
                        <div>N/A</div>
                        <div>N/A</div>
                      </div>
                    )}
                  </div>
                  <div className="h-6"></div>
                  <div className="mt-1 text-center">
                    {/* Always show all three options with strikethrough only for those who didn't sign */}
                    <>
                      {data?.menyetujui?.apj_qa?.paraf || data?.menyetujui?.apj_qa?.user ? (
                        <>APJ QA</>
                      ) : (
                        <span style={{textDecoration: 'line-through'}}>APJ QA</span>
                      )} / {data?.menyetujui?.apj_pn?.paraf || data?.menyetujui?.apj_pn?.user ? (
                        <>APJ PN</>
                      ) : (
                        <span style={{textDecoration: 'line-through'}}>APJ PN</span>
                      )} / {data?.menyetujui?.pjkpo?.paraf || data?.menyetujui?.pjkpo?.user ? (
                        <>PJKPO</>
                      ) : (
                        <span style={{textDecoration: 'line-through'}}>PJKPO</span>
                      )}*
                    </>
                  </div>
                </div>
              </td>
              <td className="border border-black px-2 py-2 h-20 align-bottom">
                <div>Paraf/Tgl</div>
                <div>
                  <div className="h-6"></div>
                  <div className="text-center">
                    {formatParafUser(
                      data?.mengetahui?.paraf,
                      data?.mengetahui?.user
                    )}
                  </div>
                  <div className="text-center">{formatDateTime(data?.mengetahui?.tgl) || "N/A"}</div>
                  <div className="h-6"></div>
                  <div className="mt-1 text-center">HSE Manager</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section 8: Footer Notes - Moved to end */}
        <div className="mt-4">
          <p className="mb-1">• (*) Coret yang tidak perlu</p>
          <p className="mb-1">• APJ QA : Khusus untuk limbah B3 Produk recall</p>
          <p className="mb-1">• APJ PN : Khusus untuk limbah B3 Produk Prekursor/ OOT</p>
          <p className="mb-1">• PJKPO : Penanggung Jawab Keamanan Pangan Olahan</p>
        </div>
        </div> {/* end page-break */}
    </div>
  );
}

FormPermohonanContent.propTypes = {
  requestId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  data: PropTypes.object,
  useMockData: PropTypes.bool
};