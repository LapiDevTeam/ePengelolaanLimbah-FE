import { useState, useEffect } from "react"
import { getBasePath } from "../utils/urlHelper"
import Header from "./Header"
import Sidebar from "./Sidebar"
import Dashboard from "../pages/Dashboard"
import DaftarAjuan from "../pages/DaftarAjuan"
import DetailAjuan from "../pages/DetailAjuan"
import FormAjuanPemusnahan from "../pages/FormAjuanPemusnahan"
import PendingApprovals from "../pages/PendingApprovals"
import BeritaAcara from "../pages/BeritaAcara"
import DetailBeritaAcara from "../pages/DetailBeritaAcara"
import FormBeritaAcara from "../pages/FormBeritaAcara"
import TestLabelPage from "../pages/TestLabelPage"
import Notifications from "../pages/Notifications"
import Settings from "../pages/Settings"
import ConfigDemo from "../pages/ConfigDemo"
import WorkflowAdmin from "../pages/WorkflowAdmin"
import PrintPermohonan from "../pages/PrintPermohonan"
import PrintBeritaAcara from "../pages/PrintBeritaAcara"

// Get current page and id from URL
const getCurrentPageFromURL = () => {
  let path = window.location.pathname
  
  // Remove base path if present (e.g., /ePemusnahanLimbah)
  const basePath = getBasePath();
  if (basePath && path.startsWith(basePath)) {
    path = path.substring(basePath.length) || '/';
  }
  
  // Normalize trailing slash
  const normalized = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path
  // Return object with page and optional id
  if (normalized === "/" || normalized === "/dashboard") return { page: "dashboard" }
  if (normalized === "/daftar-ajuan") return { page: "daftar-ajuan" }
  if (normalized === "/detail-ajuan") return { page: "daftar-ajuan" }
  if (normalized.startsWith("/detail-ajuan/")) {
    const parts = normalized.split('/')
    const id = parts.length >= 3 ? parts[2] : null
    return { page: "detail-ajuan", id }
  }
  if (normalized === "/tambah-ajuan-pemusnahan") return { page: "tambah-ajuan-pemusnahan" }
  if (normalized === "/pending-approvals") return { page: "pending-approvals" }
  if (normalized === "/berita-acara") return { page: "berita-acara" }
  if (normalized === "/detail-berita-acara") return { page: "berita-acara" }
  if (normalized.startsWith("/detail-berita-acara/")) {
    const parts = normalized.split('/')
    const id = parts.length >= 3 ? parts[2] : null
    return { page: "detail-berita-acara", id }
  }
  if (normalized === "/tambah-berita-acara") return { page: "tambah-berita-acara" }
  if (normalized === "/notifications") return { page: "notifications" }
  if (normalized === "/workflow-admin") return { page: "workflow-admin" }
  if (normalized === "/settings") return { page: "settings" }
  if (normalized === "/config-demo") return { page: "config-demo" }
  if (normalized.startsWith("/permohonan-pemusnahan/print/")) {
    const parts = normalized.split('/')
    const id = parts.length >= 4 ? parts[3] : null
    return { page: "permohonan-print", id }
  }
  if (normalized.startsWith("/berita-acara-pemusnahan/print/")) {
    const parts = normalized.split('/')
    const id = parts.length >= 4 ? parts[3] : null
    return { page: "berita-acara-print", id }
  }
  return { page: "dashboard" } // default
}

const MainLayout = () => {
  const initial = getCurrentPageFromURL()
  const [currentPage, setCurrentPage] = useState(initial.page)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [pageData, setPageData] = useState(initial.id ? { id: initial.id } : null) // Store data passed between pages

  useEffect(() => {
    // Handle browser back/forward buttons
    const handlePopState = () => {
      const current = getCurrentPageFromURL()
      setCurrentPage(current.page)
      setPageData(current.id ? { id: current.id } : null)
    }

    window.addEventListener('popstate', handlePopState)
    
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const handleNavigate = (page, data = null) => {
    // Update URL without page reload
    // Build URL with optional id when provided in data
    // Include base path for production
    const basePath = getBasePath();
    let url = page === "dashboard" ? `${basePath}/` : `${basePath}/${page}`
    if (data && data.id) {
      url = `${basePath}/${page}/${data.id}`
    }
    window.history.pushState({}, '', url)
    setCurrentPage(page)
    // Prefer explicit data param; if absent but URL has id, preserve it
    if (data) setPageData(data)
    else {
      const parsed = getCurrentPageFromURL()
      setPageData(parsed.id ? { id: parsed.id } : null)
    }
  }

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={handleNavigate} />
      case "daftar-ajuan":
        return <DaftarAjuan onNavigate={handleNavigate} pageData={pageData} />
      case "detail-ajuan":
        // If no id supplied, redirect to daftar-ajuan to avoid mock fallback
        if (!pageData?.id) {
          // push user back to list
          handleNavigate('daftar-ajuan')
          return null
        }
        return <DetailAjuan 
          key={`detail-${pageData?.id}-${pageData?.refresh || ''}`} 
          onNavigate={handleNavigate} 
          applicationId={pageData?.id}
          navigationData={pageData}
        />
      case "tambah-ajuan-pemusnahan":
        return <FormAjuanPemusnahan onNavigate={handleNavigate} />
      case "edit-ajuan-pemusnahan":
        return <FormAjuanPemusnahan onNavigate={handleNavigate} editId={pageData?.id} />
      case "pending-approvals":
        return <PendingApprovals onNavigate={handleNavigate} />
      case "berita-acara":
        return <BeritaAcara onNavigate={handleNavigate} />
      case "detail-berita-acara":
        if (!pageData?.id) {
          handleNavigate('berita-acara')
          return null
        }
        return <DetailBeritaAcara onNavigate={handleNavigate} beritaAcaraId={pageData?.id} />
      case "tambah-berita-acara":
        return <FormBeritaAcara onNavigate={handleNavigate} />
      case "test-label":
        return <TestLabelPage onNavigate={handleNavigate} />
      case "notifications":
        return <Notifications />
      case "workflow-admin":
        return <WorkflowAdmin />
      case "settings":
        return <Settings />
      case "config-demo":
        return <ConfigDemo />
      case "permohonan-print":
        if (!pageData?.id) {
          handleNavigate('daftar-ajuan')
          return null
        }
        return <PrintPermohonan requestId={pageData.id} />
      case "berita-acara-print":
        if (!pageData?.id) {
          handleNavigate('berita-acara')
          return null
        }
        return <PrintBeritaAcara beritaAcaraId={pageData.id} />
      default:
        return <Dashboard />
    }
  }

  // For print pages, render without layout
  if (currentPage === "permohonan-print" || currentPage === "berita-acara-print") {
    return renderPage();
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="flex pt-16">
        <Sidebar 
          currentPage={currentPage} 
          onNavigate={handleNavigate}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
        <main className={`flex-1 bg-gray-100 transition-all duration-300 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default MainLayout
