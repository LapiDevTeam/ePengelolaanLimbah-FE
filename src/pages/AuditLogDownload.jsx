import { useState } from 'react'
import api from '../services/api'
import { showError, showSuccess, showWarning } from '../utils/sweetAlert'

const AuditLogDownload = () => {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      showWarning('Tanggal mulai tidak boleh lebih besar dari tanggal akhir')
      return
    }

    setIsDownloading(true)

    try {
      const response = await api.downloadAuditLogExcel(startDate, endDate)

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

      const contentDisposition = response.headers?.['content-disposition'] || ''
      const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
      const fallbackName = 'audit-trail.xlsx'
      const filename = filenameMatch?.[1] || fallbackName

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.style.display = 'none'
      link.href = url
      link.download = filename

      document.body.appendChild(link)
      link.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)

      showSuccess('File audit trail berhasil diunduh')
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Gagal download audit trail'
      showError(message)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleReset = () => {
    setStartDate('')
    setEndDate('')
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Audit Trail</h1>
        <p className="mt-2 text-gray-600">
          Isi rentang tanggal jika ingin filter berdasarkan change timestamp, atau kosongkan untuk download semua data audit trail.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="audit-start-date" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              id="audit-start-date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label htmlFor="audit-end-date" className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              id="audit-end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isDownloading ? 'Downloading...' : 'Download'}
          </button>

          <button
            onClick={handleReset}
            disabled={isDownloading}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Kosongkan Tanggal
          </button>
        </div>
      </div>
    </div>
  )
}

export default AuditLogDownload
