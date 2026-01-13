import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import api from "../services/api"
import { showSuccess, showError, showWarning } from "../utils/sweetAlert"

const Dashboard = ({ onNavigate }) => {
  const { user, fetchProfile } = useAuth()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [startDatePermohonan, setStartDatePermohonan] = useState('')
  const [endDatePermohonan, setEndDatePermohonan] = useState('')
  const [isDownloadingPermohonan, setIsDownloadingPermohonan] = useState(false)
  const [stats, setStats] = useState({
    myRequests: 0,
    pendingApprovals: 0,
    approved: 0,
    // KL-specific counts (backend should include these when applicable)
    waitingHseManager: 0,
    verifikasiLapangan: 0,
    rejectedKL: 0
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  // Fetch dashboard statistics on component mount
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoadingStats(true)
      try {
        const result = await api.getDashboardStats()
        if (result.data.success) {
          const backendStats = result.data.data || {}
          setStats(backendStats)

          // Fallback: if backend didn't provide specific counts, fetch minimal counts
          const needsFallback = typeof backendStats.myRequests !== 'number' ||
                                typeof backendStats.pendingApprovals !== 'number' ||
                                typeof backendStats.approved !== 'number' ||
                                typeof backendStats.waitingHseManager !== 'number' ||
                                typeof backendStats.verifikasiLapangan !== 'number' ||
                                typeof backendStats.rejectedKL !== 'number'

          if (needsFallback) {
            try {
              // Fetch only pagination totals (use limit=1 to reduce payload)
              // Use statusFilter for KL-specific counts to match backend filtering
              const [myReqRes, pendingRes, approvedRes, verifikasiRes, waitingHseRes, rejectedRes] = await Promise.all([
                api.getDestructionRequests({ page: 1, limit: 1, userOnly: true }).catch(() => ({ data: { pagination: { total: 0 } } })),
                api.getPendingApprovals({ page: 1, limit: 1 }).catch(() => ({ data: { pagination: { total: 0 } } })),
                api.getProcessedByUser({ page: 1, limit: 1 }).catch(() => ({ data: { pagination: { total: 0 } } })),
                // Verifikasi: all requests at step 3
                api.getDestructionRequests({ page: 1, limit: 1, userOnly: false, statusFilter: 'Verification' }).catch(() => ({ data: { pagination: { total: 0 } } })),
                // Waiting HSE Manager: all requests at step 4
                api.getDestructionRequests({ page: 1, limit: 1, userOnly: false, statusFilter: 'WaitingHSEManager' }).catch(() => ({ data: { pagination: { total: 0 } } })),
                // Rejected: all rejected requests
                api.getDestructionRequests({ page: 1, limit: 1, userOnly: false, statusFilter: 'Rejected' }).catch(() => ({ data: { pagination: { total: 0 } } }))
              ])

              setStats(prev => ({
                myRequests: typeof prev.myRequests === 'number' ? prev.myRequests : (myReqRes.data?.pagination?.total || 0),
                pendingApprovals: typeof prev.pendingApprovals === 'number' ? prev.pendingApprovals : (pendingRes.data?.pagination?.total || 0),
                approved: typeof prev.approved === 'number' ? prev.approved : (approvedRes.data?.pagination?.total || 0),
                waitingHseManager: typeof prev.waitingHseManager === 'number' ? prev.waitingHseManager : (waitingHseRes.data?.pagination?.total || 0),
                verifikasiLapangan: typeof prev.verifikasiLapangan === 'number' ? prev.verifikasiLapangan : (verifikasiRes.data?.pagination?.total || 0),
                rejectedKL: typeof prev.rejectedKL === 'number' ? prev.rejectedKL : (rejectedRes.data?.pagination?.total || 0)
              }))
            } catch (fallbackError) {
              console.error('Error fetching fallback counts:', fallbackError)
            }
          }
        } else {
          console.error('Failed to fetch stats:', result.data.message)
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setIsLoadingStats(false)
      }
    }

    fetchStats()
  }, [])

  const handleFetchProfile = async () => {
    const result = await fetchProfile()
    if (result?.success) {
      showSuccess('Profile updated successfully!')
    } else {
      showError('Failed to fetch profile: ' + (result?.error || 'Unknown error'))
    }
  }

  const handleGenerateLogbook = async () => {
    if (!startDate || !endDate) {
      showWarning('Silakan pilih tanggal mulai dan tanggal akhir')
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      showWarning('Tanggal mulai tidak boleh lebih besar dari tanggal akhir')
      return
    }

    setIsGenerating(true)
    
    try {
      const result = await api.downloadLogbookExcel(startDate, endDate)
      
      if (!result.data.success) {
        throw new Error(result.data.message || 'Failed to generate logbook')
      }

      // Create blob and download file
      const blob = new Blob([result.data.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `logbook-limbah-b3-${startDate.replace(/-/g, '')}-${endDate.replace(/-/g, '')}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error generating logbook:', error)
      showError('Gagal generate logbook: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadPermohonanByDateRange = async () => {
    if (!startDatePermohonan || !endDatePermohonan) {
      showWarning('Silakan pilih tanggal mulai dan tanggal akhir')
      return
    }

    if (new Date(startDatePermohonan) > new Date(endDatePermohonan)) {
      showWarning('Tanggal mulai tidak boleh lebih besar dari tanggal akhir')
      return
    }

    setIsDownloadingPermohonan(true)
    
    try {
      // Call the new endpoint directly via axios
      const response = await api.downloadPermohonanByDateRangeExcel(startDatePermohonan, endDatePermohonan)
      
      // Handle response which is blob data
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.style.display = 'none'
      link.href = url
      link.download = `lampiran-permohonan-${startDatePermohonan}_to_${endDatePermohonan}.xlsx`
      document.body.appendChild(link)
      link.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)
      
      showSuccess('File lampiran permohonan berhasil diunduh!')
    } catch (error) {
      console.error('Error downloading permohonan:', error)
      showError('Gagal download lampiran permohonan: ' + (error.response?.data?.message || error.message))
    } finally {
      setIsDownloadingPermohonan(false)
    }
  }

  // Get user's department
  const userDepartment = user?.emp_DeptID;
  // Align naming with DaftarAjuan: hasApprovalAuthority and isFromKL
  const hasApprovalAuthority = (user?.role && ["Manager", "HSE", "APJ", "QA"].includes(user.role)) || (user?.log_NIK === "PJKPO");
  const isFromKL = user?.emp_DeptID && String(user.emp_DeptID).toUpperCase() === "KL";

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome to ePengelolaan Limbah</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* My Requests Card - Always visible */}
        <button
          onClick={() => onNavigate && onNavigate('daftar-ajuan', { viewMode: 'my-requests' })}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">My Requests</h3>
          {isLoadingStats ? (
            <div className="flex items-center justify-center h-12">
              <svg className="animate-spin h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : (
            <p className="text-3xl font-bold text-green-600">{stats.myRequests}</p>
          )}
        </button>

        {/* Pending Approvals Card - Only visible for users with approval authority */}
        {hasApprovalAuthority && (
          <button
            onClick={() => onNavigate && onNavigate('daftar-ajuan', { viewMode: 'pending-approvals' })}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer text-left"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pending Approvals</h3>
            {isLoadingStats ? (
              <div className="flex items-center justify-center h-12">
                <svg className="animate-spin h-8 w-8 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : (
              <p className="text-3xl font-bold text-yellow-600">{stats.pendingApprovals}</p>
            )}
          </button>
        )}

        {/* Approved Card - Only visible for users with approval authority */}
        {hasApprovalAuthority && (
          <button
            onClick={() => onNavigate && onNavigate('daftar-ajuan', { viewMode: 'approved' })}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer text-left"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Approved</h3>
            {isLoadingStats ? (
              <div className="flex items-center justify-center h-12">
                <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : (
              <p className="text-3xl font-bold text-blue-600">{stats.approved}</p>
            )}
          </button>
        )}

        {/* KL-specific status cards for KL users who are not approvers (officer view) */}
        {isFromKL && !hasApprovalAuthority && (
          <>
            <button
              onClick={() => onNavigate && onNavigate('daftar-ajuan', { viewMode: 'all-permohonan', statusFilter: 'Verification' })}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verifikasi Lapangan</h3>
              {isLoadingStats ? (
                <div className="flex items-center justify-center h-12">
                  <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <p className="text-3xl font-bold text-indigo-600">{stats.verifikasiLapangan}</p>
              )}
            </button>

            <button
              onClick={() => onNavigate && onNavigate('daftar-ajuan', { viewMode: 'all-permohonan', statusFilter: 'WaitingHSEManager' })}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Waiting HSE Manager</h3>
              {isLoadingStats ? (
                <div className="flex items-center justify-center h-12">
                  <svg className="animate-spin h-8 w-8 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <p className="text-3xl font-bold text-yellow-600">{stats.waitingHseManager}</p>
              )}
            </button>

            <button
              onClick={() => onNavigate && onNavigate('daftar-ajuan', { viewMode: 'all-permohonan', statusFilter: 'Rejected' })}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer text-left"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Rejected (KL)</h3>
              {isLoadingStats ? (
                <div className="flex items-center justify-center h-12">
                  <svg className="animate-spin h-8 w-8 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <p className="text-3xl font-bold text-red-600">{stats.rejectedKL}</p>
              )}
            </button>
          </>
        )}
      </div>

      {/* User Info Section */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">User Information</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-gray-900">{user?.Nama || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">NIK</label>
              <p className="text-gray-900">{user?.log_NIK || 'N/A'}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Position</label>
              <p className="text-gray-900">{user?.Jabatan || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Department</label>
              <p className="text-gray-900">{user?.emp_DeptID || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Delegated To Section */}
        {user?.delegatedTo && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delegated To</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-gray-900">{user.delegatedTo.Nama || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">NIK</label>
                  <p className="text-gray-900">{user.delegatedTo.log_NIK || 'N/A'}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Position</label>
                  <p className="text-gray-900">{user.delegatedTo.Jabatan || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Department</label>
                  <p className="text-gray-900">{user.delegatedTo.emp_DeptID || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Download Lampiran Permohonan Section */}
      <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-green-800 mb-4">Download Lampiran Permohonan</h2>        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="start-date-permohonan" className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Mulai
            </label>
            <input
              type="date"
              id="start-date-permohonan"
              value={startDatePermohonan}
              onChange={(e) => setStartDatePermohonan(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          
          <div>
            <label htmlFor="end-date-permohonan" className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Akhir
            </label>
            <input
              type="date"
              id="end-date-permohonan"
              value={endDatePermohonan}
              onChange={(e) => setEndDatePermohonan(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          
          <div>
            <button
              onClick={handleDownloadPermohonanByDateRange}
              disabled={isDownloadingPermohonan || !startDatePermohonan || !endDatePermohonan}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isDownloadingPermohonan ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Downloading...
                </span>
              ) : (
                'Download Lampiran'
              )}
            </button>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-green-600">
          <p>• Download semua lampiran permohonan dalam range tanggal yang dipilih</p>
          <p>• Data diambil dari tanggal pengajuan</p>
          <p>• Satu baris per detail limbah dengan informasi permohonan</p>
          {isFromKL ? (
            <p className="font-semibold">• User KL: Dapat mendownload data dari semua bagian</p>
          ) : (
            <p className="font-semibold">• User {userDepartment || 'Non-KL'}: Hanya dapat mendownload data dari bagian sendiri ({userDepartment})</p>
          )}
        </div>
      </div>

      {/* Generate Logbook Section - Only visible for KL users */}
      {isFromKL && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-800 mb-4">Generate Logbook</h2>        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Mulai
            </label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
              Tanggal Akhir
            </label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <button
              onClick={handleGenerateLogbook}
              disabled={isGenerating || !startDate || !endDate}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </span>
              ) : (
                'Generate Logbook'
              )}
            </button>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-blue-600">
          <p>• Logbook akan mengelompokkan data berdasarkan jenis limbah</p>
          <p>• Setiap jenis limbah akan memiliki sheet terpisah</p>
          <p>• Data diambil dari permohonan dengan status Completed</p>
          <p className="font-semibold">• Fitur ini hanya tersedia untuk user KL</p>
        </div>
      </div>
      )}
    </div>
  )
}

export default Dashboard
