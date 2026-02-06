import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import api from "../services/api"
import { showSuccess, showError, showWarning } from "../utils/sweetAlert"
import { 
  hasDaftarAjuanApprovalAuthority,
  hasBeritaAcaraApprovalAuthority,
  isFromKLDepartment,
  canSeeVerifikasiLapanganCard,
  getVerifikasiLapanganScope,
  canSeePembuatanBAPCard,
  getPembuatanBAPScope,
  getDownloadLampiranOptions
} from "../constants/accessRights"

const Dashboard = ({ onNavigate, pendingApprovalByGroup = { 'limbah-b3': 0, 'recall': 0, 'recall-precursor': 0 } }) => {
  const { user, fetchProfile } = useAuth()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [startDatePermohonan, setStartDatePermohonan] = useState('')
  const [endDatePermohonan, setEndDatePermohonan] = useState('')
  const [isDownloadingPermohonan, setIsDownloadingPermohonan] = useState(false)
  // Golongan selection for download lampiran
  const [selectedGolonganGroups, setSelectedGolonganGroups] = useState([])
  const [stats, setStats] = useState({
    myRequests: 0,
    pendingApprovals: 0,
    approved: 0,
    // KL-specific counts (backend should include these when applicable)
    waitingHseManager: 0,
    verifikasiLapangan: 0,
    pembuatanBAP: 0,
    rejectedKL: 0
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [statsByGroup, setStatsByGroup] = useState({
    myRequests: { 'limbah-b3': 0, 'recall': 0, 'recall-precursor': 0 },
    pendingApprovals: { 'limbah-b3': 0, 'recall': 0, 'recall-precursor': 0 },
    approved: { 'limbah-b3': 0, 'recall': 0, 'recall-precursor': 0 },
    waitingHseManager: { 'limbah-b3': 0, 'recall': 0, 'recall-precursor': 0 },
    verifikasiLapangan: { 'limbah-b3': 0, 'recall': 0, 'recall-precursor': 0 },
    pembuatanBAP: { 'limbah-b3': 0, 'recall': 0, 'recall-precursor': 0 },
    rejectedKL: { 'limbah-b3': 0, 'recall': 0, 'recall-precursor': 0 }
  })

  // Fetch dashboard statistics on component mount
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoadingStats(true)
      try {
        const result = await api.getDashboardStats()
        if (result.data.success) {
          const backendStats = result.data.data || {}
          
          // Handle new format from backend (with byGroup nested structure)
          const myRequestsTotal = typeof backendStats.myRequests === 'object' 
            ? backendStats.myRequests.total 
            : (backendStats.myRequestsCount || backendStats.myRequests || 0)
          const pendingApprovalsTotal = typeof backendStats.pendingApprovals === 'object'
            ? backendStats.pendingApprovals.total
            : (backendStats.pendingApprovalsCount || backendStats.pendingApprovals || 0)
          const approvedTotal = typeof backendStats.approved === 'object'
            ? backendStats.approved.total
            : (backendStats.approvedCount || backendStats.approved || 0)
          
          setStats({
            myRequests: myRequestsTotal,
            pendingApprovals: pendingApprovalsTotal,
            approved: approvedTotal,
            waitingHseManager: backendStats.waitingHseManager || 0,
            verifikasiLapangan: backendStats.verifikasiLapangan || 0,
            pembuatanBAP: backendStats.pembuatanBAP || 0,
            rejectedKL: backendStats.rejectedKL || 0
          })
          
          // Extract group breakdowns from backend response
          const myRequestsByGroup = typeof backendStats.myRequests === 'object' 
            ? backendStats.myRequests.byGroup 
            : { 'limbah-b3': 0, 'recall': 0, 'recall-precursor': 0 }
          const pendingApprovalsByGroup = typeof backendStats.pendingApprovals === 'object'
            ? backendStats.pendingApprovals.byGroup
            : { 'limbah-b3': 0, 'recall': 0, 'recall-precursor': 0 }
          const approvedByGroup = typeof backendStats.approved === 'object'
            ? backendStats.approved.byGroup
            : { 'limbah-b3': 0, 'recall': 0, 'recall-precursor': 0 }
          
          setStatsByGroup({
            myRequests: myRequestsByGroup || { 'limbah-b3': 0, 'recall': 0, 'recall-precursor': 0 },
            pendingApprovals: pendingApprovalsByGroup || { 'limbah-b3': 0, 'recall': 0, 'recall-precursor': 0 },
            approved: approvedByGroup || { 'limbah-b3': 0, 'recall': 0, 'recall-precursor': 0 },
            waitingHseManager: backendStats.waitingHseManagerByGroup || { 'limbah-b3': 0, 'recall': 0, 'recall-precursor': 0 },
            verifikasiLapangan: backendStats.verifikasiLapanganByGroup || { 'limbah-b3': 0, 'recall': 0, 'recall-precursor': 0 },
            pembuatanBAP: backendStats.pembuatanBAPByGroup || { 'limbah-b3': 0, 'recall': 0, 'recall-precursor': 0 },
            rejectedKL: backendStats.rejectedKLByGroup || { 'limbah-b3': 0, 'recall': 0, 'recall-precursor': 0 }
          })
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

    // Validate golongan selection
    if (selectedGolonganGroups.length === 0) {
      showWarning('Silakan pilih minimal satu golongan')
      return
    }

    setIsDownloadingPermohonan(true)
    
    try {
      // Prepare golongan groups parameter
      const golonganGroupsParam = selectedGolonganGroups.join(',')
      
      // Call the endpoint with golongan groups
      const response = await api.downloadPermohonanByDateRangeExcel(
        startDatePermohonan, 
        endDatePermohonan,
        golonganGroupsParam
      )
      
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
      
      // Handle 404 - no data found
      if (error.response?.status === 404) {
        const errorData = error.response?.data
        let errorMsg = errorData?.message || 'Tidak ada data yang ditemukan'
        
        // Add details if available
        if (errorData?.details) {
          const d = errorData.details
          errorMsg += `\n\nDetail:\n`
          errorMsg += `• Total data ditemukan: ${d.totalFound || 0}\n`
          errorMsg += `• Setelah filter akses: ${d.afterScopeFilter || 0}\n`
          errorMsg += `• Setelah filter status: ${d.afterStatusFilter || 0}\n`
          errorMsg += `• Rentang tanggal: ${d.dateRange || '-'}\n`
          errorMsg += `• Golongan dipilih: ${d.selectedGroups || '-'}\n\n`
          errorMsg += `Kriteria: ${d.criteria || '-'}`
        }
        
        showWarning(errorMsg)
      } else {
        // Other errors
        showError('Gagal download lampiran permohonan: ' + (error.response?.data?.message || error.message))
      }
    } finally {
      setIsDownloadingPermohonan(false)
    }
  }

  // Handle golongan group selection
  const handleGolonganGroupChange = (group) => {
    const downloadOptions = getDownloadLampiranOptions(user)
    
    if (downloadOptions.canMultiSelect) {
      // Multi-select (KL users) - toggle the group
      setSelectedGolonganGroups(prev => {
        if (prev.includes(group)) {
          return prev.filter(g => g !== group)
        } else {
          return [...prev, group]
        }
      })
    } else {
      // Single-select (non-KL users) - replace selection
      setSelectedGolonganGroups([group])
    }
  }

  // Handle "Select All" for KL users
  const handleSelectAllGolongan = () => {
    const downloadOptions = getDownloadLampiranOptions(user)
    if (downloadOptions.canMultiSelect) {
      if (selectedGolonganGroups.length === downloadOptions.availableGroups.length) {
        setSelectedGolonganGroups([]) // Deselect all
      } else {
        setSelectedGolonganGroups([...downloadOptions.availableGroups]) // Select all
      }
    }
  }

  // Get user's department
  const userDepartment = user?.emp_DeptID;
  // Use centralized access rights (see src/constants/accessRights.js)
  const hasApprovalAuthority = hasDaftarAjuanApprovalAuthority(user);
  const hasBeritaAcaraAuthority = hasBeritaAcaraApprovalAuthority(user);
  const isFromKL = isFromKLDepartment(user);
  
  // Get download lampiran options
  const downloadLampiranOptions = getDownloadLampiranOptions(user);
  
  // Get scopes for verifikasi lapangan and pembuatan BAP
  const verifikasiScope = getVerifikasiLapanganScope(user);
  const pembuatanBAPScope = getPembuatanBAPScope(user);
  
  // Check if user can see the cards (all logged in users)
  const showVerifikasiLapanganCard = canSeeVerifikasiLapanganCard(user);
  const showPembuatanBAPCard = canSeePembuatanBAPCard(user);

  // Reusable component for group breakdown
  const GroupBreakdown = ({ groupCounts, onGroupClick }) => {
    const groupLabels = {
      'limbah-b3': 'Limbah B3',
      'recall': 'Recall',
      'recall-precursor': 'Precursor & OOT'
    }
    
    const hasAnyCount = Object.values(groupCounts).some(count => count > 0)
    if (!hasAnyCount) return null
    
    return (
      <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
        {Object.entries(groupCounts).map(([group, count]) => {
          if (count === 0) return null
          return (
            <button
              key={group}
              onClick={(e) => {
                e.stopPropagation()
                onGroupClick(group)
              }}
              className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded px-2 py-1 transition-colors"
            >
              <span>{groupLabels[group]}</span>
              <span className="font-semibold">{count}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">Welcome to ePengelolaan Limbah</p>
          </div>
          {user && (
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              onClick={() => onNavigate("tambah-ajuan-pemusnahan")}
            >
              <span className="text-lg leading-none">+</span>
              <span>Tambah Ajuan</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* My Requests Card - Always visible */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-2">
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
          </div>
          {!isLoadingStats && (
            <GroupBreakdown 
              groupCounts={statsByGroup.myRequests}
              onGroupClick={(group) => {
                const aliasMap = { 'limbah-b3': 'daftar-ajuan-b3', 'recall': 'daftar-ajuan-recall', 'recall-precursor': 'daftar-ajuan-recall-precursor-oot' }
                onNavigate && onNavigate('daftar-ajuan', { viewMode: 'my-requests', group, pageAlias: aliasMap[group] || 'daftar-ajuan' })
              }}
            />
          )}
        </div>

        {/* Pending Approvals Card - Only visible for users with approval authority */}
        {hasApprovalAuthority && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-2">
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
            </div>
            {!isLoadingStats && (
              <GroupBreakdown 
                groupCounts={statsByGroup.pendingApprovals}
                onGroupClick={(group) => {
                  const aliasMap = { 'limbah-b3': 'daftar-ajuan-b3', 'recall': 'daftar-ajuan-recall', 'recall-precursor': 'daftar-ajuan-recall-precursor-oot' }
                  onNavigate && onNavigate('daftar-ajuan', { viewMode: 'pending-approvals', group, pageAlias: aliasMap[group] || 'daftar-ajuan' })
                }}
              />
            )}
          </div>
        )}

        {/* Verifikasi Lapangan Card - Visible for all users with different data scopes */}
        {showVerifikasiLapanganCard && (() => {
          // Filter group counts based on user's allowed groups
          const filteredGroupCounts = {};
          
          for (const group of verifikasiScope.allowedGroups) {
            const count = statsByGroup.verifikasiLapangan[group] || 0;
            filteredGroupCounts[group] = count;
          }
          
          return (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Verifikasi Lapangan</h3>
                {isLoadingStats ? (
                  <div className="flex items-center justify-center h-12">
                    <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-indigo-600">
                    {stats.verifikasiLapangan}
                  </p>
                )}
                {verifikasiScope.scope === 'own' && (
                  <p className="text-xs text-gray-500 mt-1">Menampilkan data bagian Anda</p>
                )}
                {verifikasiScope.scope === 'bagian_plus_group' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Menampilkan data bagian Anda + {verifikasiScope.additionalGroups?.map(g => {
                      const labels = { 'limbah-b3': 'Limbah B3', 'recall': 'Recall', 'recall-precursor': 'Precursor' };
                      return labels[g];
                    }).join(', ')}
                  </p>
                )}
                {verifikasiScope.scope === 'all' && (
                  <p className="text-xs text-gray-500 mt-1">Menampilkan semua data</p>
                )}
              </div>
              {!isLoadingStats && (
                <GroupBreakdown 
                  groupCounts={filteredGroupCounts}
                  onGroupClick={(group) => {
                    const aliasMap = { 'limbah-b3': 'daftar-ajuan-b3', 'recall': 'daftar-ajuan-recall', 'recall-precursor': 'daftar-ajuan-recall-precursor-oot' }
                    // Navigate to all-permohonan with Verification status filter
                    // If user has filterByBagian, the DataTable will handle filtering by user's bagian
                    onNavigate && onNavigate('daftar-ajuan', { 
                      viewMode: 'all-permohonan', 
                      statusFilter: 'Verification', 
                      group, 
                      pageAlias: aliasMap[group] || 'daftar-ajuan',
                      filterByBagian: verifikasiScope.filterByBagian
                    })
                  }}
                />
              )}
            </div>
          );
        })()}

        {/* Pembuatan BAP Card - Visible for all users with different data scopes */}
        {showPembuatanBAPCard && (() => {
          // Filter group counts based on user's allowed groups
          const filteredGroupCounts = {};
          
          for (const group of pembuatanBAPScope.allowedGroups) {
            const count = statsByGroup.pembuatanBAP[group] || 0;
            filteredGroupCounts[group] = count;
          }
          
          return (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Pembuatan BAP</h3>
                {isLoadingStats ? (
                  <div className="flex items-center justify-center h-12">
                    <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-blue-600">
                    {stats.pembuatanBAP}
                  </p>
                )}
                {pembuatanBAPScope.scope === 'own' && (
                  <p className="text-xs text-gray-500 mt-1">Menampilkan data bagian Anda</p>
                )}
                {pembuatanBAPScope.scope === 'bagian_plus_group' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Menampilkan data bagian Anda + {pembuatanBAPScope.additionalGroups?.map(g => {
                      const labels = { 'limbah-b3': 'Limbah B3', 'recall': 'Recall', 'recall-precursor': 'Precursor' };
                      return labels[g];
                    }).join(', ')}
                  </p>
                )}
                {pembuatanBAPScope.scope === 'all' && (
                  <p className="text-xs text-gray-500 mt-1">Menampilkan semua data</p>
                )}
              </div>
              {!isLoadingStats && (
                <GroupBreakdown 
                  groupCounts={filteredGroupCounts}
                  onGroupClick={(group) => {
                    const aliasMap = { 'limbah-b3': 'daftar-ajuan-b3', 'recall': 'daftar-ajuan-recall', 'recall-precursor': 'daftar-ajuan-recall-precursor-oot' }
                    // Navigate to all-permohonan with Pembuatan BAP status filter
                    onNavigate && onNavigate('daftar-ajuan', { 
                      viewMode: 'all-permohonan', 
                      statusFilter: 'Pembuatan BAP', 
                      group, 
                      pageAlias: aliasMap[group] || 'daftar-ajuan',
                      filterByBagian: pembuatanBAPScope.filterByBagian
                    })
                  }}
                />
              )}
            </div>
          );
        })()}

        {/* Berita Acara Pending Approval Card - Only visible for users with Berita Acara approval authority */}
        {hasBeritaAcaraAuthority && (() => {
          const totalPending = Object.values(pendingApprovalByGroup).reduce((sum, count) => sum + count, 0)
          if (totalPending === 0) return null
          
          return (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Berita Acara - Pending Approval</h3>
                <p className="text-3xl font-bold text-orange-600">{totalPending}</p>
              </div>
              {totalPending > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  {pendingApprovalByGroup['limbah-b3'] > 0 && (
                    <button
                      onClick={() => onNavigate && onNavigate('berita-acara', { group: 'limbah-b3', pageAlias: 'berita-acara-b3', viewMode: 'pending-approval' })}
                      className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded px-2 py-1 transition-colors"
                    >
                      <span>Limbah B3</span>
                      <span className="font-semibold">{pendingApprovalByGroup['limbah-b3']}</span>
                    </button>
                  )}
                  {pendingApprovalByGroup['recall'] > 0 && (
                    <button
                      onClick={() => onNavigate && onNavigate('berita-acara', { group: 'recall', pageAlias: 'berita-acara-recall', viewMode: 'pending-approval' })}
                      className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded px-2 py-1 transition-colors"
                    >
                      <span>Recall</span>
                      <span className="font-semibold">{pendingApprovalByGroup['recall']}</span>
                    </button>
                  )}
                  {pendingApprovalByGroup['recall-precursor'] > 0 && (
                    <button
                      onClick={() => onNavigate && onNavigate('berita-acara', { group: 'recall-precursor', pageAlias: 'berita-acara-recall-precursor-oot', viewMode: 'pending-approval' })}
                      className="w-full flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded px-2 py-1 transition-colors"
                    >
                      <span>Precursor & OOT</span>
                      <span className="font-semibold">{pendingApprovalByGroup['recall-precursor']}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })()}

        {/* KL-specific status cards for KL users who are not approvers (officer view) */}
        {isFromKL && !hasApprovalAuthority && (
          <>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-2">
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
              </div>
              {!isLoadingStats && (
                <GroupBreakdown 
                  groupCounts={statsByGroup.waitingHseManager}
                  onGroupClick={(group) => {
                    const aliasMap = { 'limbah-b3': 'daftar-ajuan-b3', 'recall': 'daftar-ajuan-recall', 'recall-precursor': 'daftar-ajuan-recall-precursor-oot' }
                    onNavigate && onNavigate('daftar-ajuan', { viewMode: 'all-permohonan', statusFilter: 'WaitingHSEManager', group, pageAlias: aliasMap[group] || 'daftar-ajuan' })
                  }}
                />
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-2">
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
              </div>
              {!isLoadingStats && (
                <GroupBreakdown 
                  groupCounts={statsByGroup.rejectedKL}
                  onGroupClick={(group) => {
                    const aliasMap = { 'limbah-b3': 'daftar-ajuan-b3', 'recall': 'daftar-ajuan-recall', 'recall-precursor': 'daftar-ajuan-recall-precursor-oot' }
                    onNavigate && onNavigate('daftar-ajuan', { viewMode: 'all-permohonan', statusFilter: 'Rejected', group, pageAlias: aliasMap[group] || 'daftar-ajuan' })
                  }}
                />
              )}
            </div>
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
        
        {/* Golongan Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pilih Golongan {downloadLampiranOptions.canMultiSelect ? '(bisa pilih lebih dari satu)' : ''}
          </label>
          
          {downloadLampiranOptions.canMultiSelect ? (
            // Multi-select checkboxes for KL users
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={selectedGolonganGroups.length === downloadLampiranOptions.availableGroups.length}
                  onChange={handleSelectAllGolongan}
                  className="form-checkbox h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="ml-2 text-sm text-gray-700 font-medium">Semua Golongan</span>
              </label>
              <div className="w-px h-6 bg-gray-300"></div>
              {downloadLampiranOptions.availableGroups.map((group) => {
                const groupLabels = {
                  'limbah-b3': 'Limbah B3',
                  'recall': 'Recall',
                  'recall-precursor': 'Precursor & OOT'
                }
                return (
                  <label key={group} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedGolonganGroups.includes(group)}
                      onChange={() => handleGolonganGroupChange(group)}
                      className="form-checkbox h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{groupLabels[group]}</span>
                  </label>
                )
              })}
            </div>
          ) : (
            // Single-select dropdown for non-KL users
            <select
              value={selectedGolonganGroups[0] || ''}
              onChange={(e) => setSelectedGolonganGroups(e.target.value ? [e.target.value] : [])}
              className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">-- Pilih Golongan --</option>
              <option value="limbah-b3">Limbah B3</option>
              <option value="recall">Recall</option>
              <option value="recall-precursor">Precursor & OOT</option>
            </select>
          )}
        </div>
        
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
              disabled={isDownloadingPermohonan || !startDatePermohonan || !endDatePermohonan || selectedGolonganGroups.length === 0}
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
          <p>• Download lampiran permohonan dalam range tanggal dan golongan yang dipilih</p>
          <p>• Data diambil dari tanggal pengajuan</p>
          <p>• Satu baris per detail limbah dengan informasi permohonan</p>
          {isFromKL ? (
            <p className="font-semibold">• User KL: Dapat mendownload data dari semua bagian untuk semua golongan</p>
          ) : (
            <>
              <p className="font-semibold">• User {userDepartment || 'Non-KL'}:</p>
              {userDepartment === 'QA' ? (
                <>
                  <p className="ml-4">- Recall: Dapat melihat semua bagian</p>
                  <p className="ml-4">- Limbah B3 & Precursor: Hanya bagian {userDepartment}</p>
                </>
              ) : userDepartment === 'PN1' ? (
                <>
                  <p className="ml-4">- Precursor & OOT: Dapat melihat semua bagian</p>
                  <p className="ml-4">- Limbah B3 & Recall: Hanya bagian {userDepartment}</p>
                </>
              ) : (
                <p className="ml-4">- Semua golongan: Hanya bagian {userDepartment}</p>
              )}
            </>
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
