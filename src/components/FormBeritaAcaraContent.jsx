import PropTypes from "prop-types";
import { useMemo, useEffect, useState } from "react";
import { dataAPI } from "../services/api";
import { getBaseUrl } from "../utils/urlHelper";

export default function FormBeritaAcaraContent({ 
  beritaAcaraId = null, 
  data: initialData = null, 
  useMockData = false 
}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (useMockData) {
        // keep any initialData if provided
        return;
      }
      if (!beritaAcaraId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await dataAPI.getBeritaAcaraDataForDoc(beritaAcaraId);
        if (res.data.success) {
          setData(res.data.data);
        } else {
          setError(res.data.message || 'Gagal memuat data dokumen');
        }
      } catch (err) {
        console.error('Error fetching berita acara data for doc:', err);
        setError('Gagal memuat data dokumen');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [beritaAcaraId, useMockData]);

  // Format tanggal untuk tanda tangan
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

  // Format time to HH:MM:SS
  const formatTime = (timeString) => {
    if (!timeString) return '';
    // If it's already in HH:MM:SS format, return as is
    if (timeString.match(/^\d{2}:\d{2}:\d{2}$/)) return timeString;
    // If it's a datetime string, extract time part
    if (timeString.includes('T') || timeString.includes(' ')) {
      const date = new Date(timeString);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${hours}:${minutes}:${seconds}`;
    }
    // If it's just time without seconds, add seconds
    if (timeString.match(/^\d{1,2}:\d{2}$/)) {
      return timeString + ':00';
    }
    return timeString;
  };

  // Display name helper - now uses Inisial_Name from API
  const displayNameFor = (inisialName) => {
    if (!inisialName) return "N/A";
    return inisialName;
  };

  // Format paraf dengan delegasi
  const formatParafUser = (nama, user) => {
    if (!nama && !user) return "N/A";
    if (!nama) return displayNameFor(user);
    if (!user) return displayNameFor(nama);
    if (nama === user) return displayNameFor(user);
    return `${displayNameFor(nama)} a.n. ${displayNameFor(user)}`;
  };

  // Checkbox helper
  const renderCheckbox = (checked) => {
    return checked ? "✓" : "";
  };

  // Memoize URLs to avoid rebuilding on every render
  const { link, printUrl } = useMemo(() => {
    if (!beritaAcaraId || !data) {
      return { link: '', printUrl: '' };
    }

    const BASE_URL_FE = getBaseUrl(); // frontend host with base path
    const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

    const link = `${BASE_URL_FE}/berita-acara-pemusnahan/print/${beritaAcaraId}`;
    const createdAt = new Date().toISOString(); // Use current date as creation timestamp

    // Build the backend print endpoint URL with encoded params
    const printUrl = `${BASE_URL}/document-generation/print-berita-acara-pemusnahan?link=${encodeURIComponent(link)}&beritaAcaraId=${encodeURIComponent(beritaAcaraId)}&createdAt=${encodeURIComponent(createdAt)}`;

    return { link, printUrl };
  }, [beritaAcaraId, data]);

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
            <p className="text-gray-700">Tidak ada data berita acara untuk ditampilkan.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="document-content bg-white" style={{ fontSize: '10px', fontFamily: 'Verdana, sans-serif', lineHeight: '1.2' }}>
      {/* Document Body */}
      <div style={{ 
        maxWidth: '210mm', 
        margin: '0 auto',
        minHeight: 'auto' 
      }}>

        {/* Intro Text */}
        <div style={{ marginBottom: '15px' }}>
          <p style={{ fontSize: '10px', marginBottom: '15px', textAlign: 'justify' }}>
            Telah dilakukan proses verifikasi dan atau perusakan limbah B3 (terlampir form permohonan pemusnahan dan lampiran limbah B3) yang dilaksanakan pada:
          </p>
        </div>

        {/* Basic Info Table */}
        <div className="mb-4">
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            border: '1px solid black',
            marginBottom: '15px',
            fontSize: '10px'
          }}>
            <tbody>
              <tr>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '4px 8px', 
                  backgroundColor: 'white',
                  width: '10%'
                }}>
                  Divisi
                </td>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '4px 8px',
                  width: '10%'
                }}>
                  {data.divisi || ''}
                </td>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '4px 8px', 
                  backgroundColor: 'white',
                  width: '10%'
                }}>
                  Hari/Tanggal
                </td>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '4px 8px',
                  width: '25%'
                }}>
                  {data.hari_tanggal || ''}
                </td>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '4px 8px', 
                  backgroundColor: 'white',
                  width: '10%'
                }}>
                  Jam/Waktu
                </td>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '4px 8px',
                  width: '10%'
                }}>
                  {formatTime(data.jam_waktu) || ''}
                </td>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '4px 8px', 
                  backgroundColor: 'white',
                  width: '20%'
                }}>
                  Lokasi Verifikasi
                </td>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '4px 8px',
                  width: '15%'
                }}>
                  {data.lokasi_verifikasi || ''}
                </td>
              </tr>
              <tr>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '4px 8px', 
                  backgroundColor: 'white'
                }} colSpan={3}>
                  Pelaksana Bagian
                </td>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '4px 8px'
                }}>
                  {data.pelaksana_bagian || ''}
                </td>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '4px 8px', 
                  backgroundColor: 'white'
                }} colSpan={2}>
                  Pelaksana HSE
                </td>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '4px 8px'
                }} colSpan={2}>
                  {data.pelaksana_hse || ''}
                </td>
              </tr>
              <tr>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '4px 8px', 
                  backgroundColor: 'white'
                }} colSpan={3}>
                  Supervisor/Officer Bagian
                </td>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '4px 8px'
                }}>
                  {data.supervisor_bagian || ''}
                </td>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '4px 8px', 
                  backgroundColor: 'white'
                }} colSpan={2}>
                  Supervisor/Officer HSE
                </td>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '4px 8px'
                }} colSpan={2}>
                  {data.supervisor_hse || ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Process Description */}
        <div style={{ marginBottom: '10px' }}>
          <p style={{ fontSize: '10px', marginBottom: '10px' }}>
            Proses verifikasi, perusakan/pemusnahan dilakukan terhadap limbah B3 dengan rincian
          </p>
        </div>

        {/* Main Data Table */}
        <div className="mb-4">
          <table className="daftar-pemusnahan-table" style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            border: '1px solid black',
            fontSize: '9px'
          }}>
            <thead>
              <tr style={{ backgroundColor: 'white' }}>
                <th style={{ 
                  border: '1px solid black', 
                  padding: '6px 4px', 
                  textAlign: 'center',
                  width: '15%'
                }}>
                  Nomor Permohonan
                </th>
                <th style={{ 
                  border: '1px solid black', 
                  padding: '6px 4px', 
                  textAlign: 'center',
                  width: '12%'
                }}>
                  Bentuk Limbah
                </th>
                <th style={{ 
                  border: '1px solid black', 
                  padding: '6px 4px', 
                  textAlign: 'center',
                  width: '15%'
                }}>
                  Golongan Limbah
                </th>
                <th style={{ 
                  border: '1px solid black', 
                  padding: '6px 4px', 
                  textAlign: 'center',
                  width: '20%'
                }}>
                  Jenis Limbah
                </th>
                <th style={{ 
                  border: '1px solid black', 
                  padding: '6px 4px', 
                  textAlign: 'center',
                  width: '10%'
                }}>
                  Jumlah Item Limbah
                </th>
                <th style={{ 
                  border: '1px solid black', 
                  padding: '6px 4px', 
                  textAlign: 'center',
                  width: '13%'
                }}>
                  Bobot total (Gram/Pcs)
                </th>
                <th style={{ 
                  border: '1px solid black', 
                  padding: '6px 4px', 
                  textAlign: 'center',
                  width: '15%'
                }}>
                  Alasan Pemusnahan
                </th>
              </tr>
            </thead>
            <tbody>
              {data.permohonan_list && data.permohonan_list.length > 0 ? (
                data.permohonan_list.map((item, index) => (
                  <tr key={index}>
                    <td style={{ 
                      border: '1px solid black', 
                      padding: '4px', 
                      textAlign: 'center',
                      verticalAlign: 'top'
                    }}>
                      {item.nomor_permohonan || ''}
                    </td>
                    <td style={{ 
                      border: '1px solid black', 
                      padding: '4px', 
                      textAlign: 'center',
                      verticalAlign: 'top'
                    }}>
                      {item.bentuk_limbah || ''}
                    </td>
                    <td style={{ 
                      border: '1px solid black', 
                      padding: '4px', 
                      textAlign: 'center',
                      verticalAlign: 'top'
                    }}>
                      {item.golongan_limbah || ''}
                    </td>
                    <td style={{ 
                      border: '1px solid black', 
                      padding: '4px', 
                      textAlign: 'center',
                      verticalAlign: 'top'
                    }}>
                      {item.jenis_limbah || ''}
                    </td>
                    <td style={{ 
                      border: '1px solid black', 
                      padding: '4px', 
                      textAlign: 'center',
                      verticalAlign: 'top'
                    }}>
                      {item.jumlah_item_limbah || ''}
                    </td>
                    <td style={{ 
                      border: '1px solid black', 
                      padding: '4px', 
                      textAlign: 'center',
                      verticalAlign: 'top'
                    }}>
                      {item.bobot_total || ''}
                    </td>
                    <td style={{ 
                      border: '1px solid black', 
                      padding: '4px', 
                      textAlign: 'center',
                      verticalAlign: 'top'
                    }}>
                      {item.alasan_pemusnahan || ''}
                    </td>
                  </tr>
                ))
              ) : (
                // Add empty rows to match the PDF format
                Array.from({ length: 10 }, (_, index) => (
                  <tr key={`empty-${index}`}>
                    <td style={{ border: '1px solid black', padding: '4px', height: '25px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid black', padding: '4px', height: '25px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid black', padding: '4px', height: '25px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid black', padding: '4px', height: '25px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid black', padding: '4px', height: '25px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid black', padding: '4px', height: '25px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid black', padding: '4px', height: '25px' }}>&nbsp;</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Signature Section */}
        <div className="signature-section" style={{ marginTop: '20px' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            border: '1px solid black',
            fontSize: '9px'
          }}>
            <tbody>
              {/* Header Row */}
              <tr>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '8px', 
                  textAlign: 'center',
                  width: '20%'
                }}>
                  Dibuat oleh
                </td>
                <td colSpan={4} style={{ 
                  border: '1px solid black', 
                  padding: '8px', 
                  textAlign: 'center',
                  width: '80%'
                }}>
                  Disetujui oleh
                </td>
              </tr>
              
              {/* Signature Spaces */}
              <tr>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '8px', 
                  height: '80px',
                  verticalAlign: 'top'
                }}>
                  <div>Paraf/Tgl</div>
                  <div style={{ height: '64px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      {formatParafUser(
                        data.signatures?.hse_supervisor_officer?.nama,
                        data.signatures?.hse_supervisor_officer?.user
                      )}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      {data.signatures?.hse_supervisor_officer?.tgl ? 
                        formatDateTime(data.signatures.hse_supervisor_officer.tgl) : "N/A"}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>HSE Supervisor/Officer</div>
                </td>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '8px', 
                  height: '80px',
                  verticalAlign: 'top'
                }}>
                  <div>Paraf/Tgl</div>
                  <div style={{ height: '64px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      {formatParafUser(
                        data.signatures?.hse_manager?.nama,
                        data.signatures?.hse_manager?.user
                      )}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      {data.signatures?.hse_manager?.tgl ? 
                        formatDateTime(data.signatures.hse_manager.tgl) : "N/A"}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>HSE Manager</div>
                </td>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '8px', 
                  height: '80px',
                  verticalAlign: 'top'
                }}>
                  <div>Paraf/Tgl</div>
                  <div style={{ height: '64px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    {/* Display each approver in separate sections side by side within the same cell */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                        {/* Manager Pemohon Section */}
                        {(data.signatures?.manager_pemohon?.nama || data.signatures?.manager_pemohon?.user) && (
                          <div style={{ textAlign: 'center' }}>
                            <div>{formatParafUser(data.signatures.manager_pemohon.nama, data.signatures.manager_pemohon.user)}</div>
                            <div>{formatDateTime(data.signatures.manager_pemohon.tgl) || "N/A"}</div>
                          </div>
                        )}
                        
                        {/* APJ QA Section */}
                        {(data.signatures?.apj_qa?.nama || data.signatures?.apj_qa?.user) && (
                          <div style={{ textAlign: 'center' }}>
                            <div>{formatParafUser(data.signatures.apj_qa.nama, data.signatures.apj_qa.user)}</div>
                            <div>{formatDateTime(data.signatures.apj_qa.tgl) || "N/A"}</div>
                          </div>
                        )}
                        
                        {/* APJ PN Section */}
                        {(data.signatures?.apj_pn?.nama || data.signatures?.apj_pn?.user) && (
                          <div style={{ textAlign: 'center' }}>
                            <div>{formatParafUser(data.signatures.apj_pn.nama, data.signatures.apj_pn.user)}</div>
                            <div>{formatDateTime(data.signatures.apj_pn.tgl) || "N/A"}</div>
                          </div>
                        )}
                        
                        {/* PJKPO Section */}
                        {(data.signatures?.pjkpo?.nama || data.signatures?.pjkpo?.user) && (
                          <div style={{ textAlign: 'center' }}>
                            <div>{formatParafUser(data.signatures.pjkpo.nama, data.signatures.pjkpo.user)}</div>
                            <div>{formatDateTime(data.signatures.pjkpo.tgl) || "N/A"}</div>
                          </div>
                        )}
                      </div>
                      
                      {/* Show N/A if no approvals */}
                      {![data.signatures?.manager_pemohon, data.signatures?.apj_qa, data.signatures?.apj_pn, data.signatures?.pjkpo].some(item => item?.nama || item?.user) && (
                        <div>
                          <div>N/A</div>
                          <div>N/A</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    {/* Only show roles that actually signed */}
                    <>
                      {(() => {
                        const signedRoles = [];
                        
                        if (data.signatures?.manager_pemohon?.nama || data.signatures?.manager_pemohon?.user) {
                          signedRoles.push('Manager Pemohon');
                        }
                        if (data.signatures?.apj_qa?.nama || data.signatures?.apj_qa?.user) {
                          signedRoles.push('APJ QA');
                        }
                        if (data.signatures?.apj_pn?.nama || data.signatures?.apj_pn?.user) {
                          signedRoles.push('APJ PN');
                        }
                        if (data.signatures?.pjkpo?.nama || data.signatures?.pjkpo?.user) {
                          signedRoles.push('PJKPO');
                        }
                        
                        return signedRoles.length > 0 ? signedRoles.join(' / ') + '*' : 'N/A';
                      })()}
                    </>
                  </div>
                </td>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '8px', 
                  height: '80px',
                  verticalAlign: 'top'
                }}>
                  <div>Paraf/Tgl</div>
                  <div style={{ height: '64px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      {formatParafUser(
                        data.signatures?.head_of_plant?.nama,
                        data.signatures?.head_of_plant?.user
                      )}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      {data.signatures?.head_of_plant?.tgl ? 
                        formatDateTime(data.signatures.head_of_plant.tgl) : "N/A"}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>Head of Plant*</div>
                </td>
                <td style={{ 
                  border: '1px solid black', 
                  padding: '8px', 
                  height: '80px',
                  verticalAlign: 'top'
                }}>
                  <div>Paraf/Tgl</div>
                  <div style={{ height: '64px' }}>
                    {/* Empty space for BBOM/BPOM - no N/A */}
                  </div>
                  <div style={{ textAlign: 'center' }}>BBOM/BPOM*</div>
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* Footer Notes */}
        <div className="mt-4">
          <p className="mb-1">• Head of Plant, BBPOM/ BPOM : Khusus untuk limbah B3 Produk recall dan Produk Prekursor/ Golongan OOT</p>
          <p className="mb-1">• APJ QA : Khusus untuk limbah B3 Produk recall</p>
          <p className="mb-1">• APJ PN : Khusus untuk limbah B3 Produk Prekursor/ Golongan OOT</p>
          <p className="mb-1">• PJKPO : Penanggung Jawab Keamanan Pangan Olahan</p>
        </div>
      </div>
    </div>
  );
}

FormBeritaAcaraContent.propTypes = {
  beritaAcaraId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  data: PropTypes.object,
  useMockData: PropTypes.bool,
};
