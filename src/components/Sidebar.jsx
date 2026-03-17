"use client"

import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"

// SVG Icons
const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v14l-5-3-5 3V5z" />
  </svg>
)

const FileIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const AdminIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
)

const DownloadIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const MenuIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const Sidebar = ({ currentPage, onNavigate, isCollapsed, setIsCollapsed, hasPendingApproval, pendingApprovalByGroup = {} }) => {
  const { user, logout } = useAuth()
  const [isLimbahExpanded, setIsLimbahExpanded] = useState(true)
  const [isRecallExpanded, setIsRecallExpanded] = useState(true)
  const [isRecallPrecursorExpanded, setIsRecallPrecursorExpanded] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
      onNavigate("login")
    } catch (error) {
      console.error("Logout failed:", error)
      onNavigate("login")
    } finally {
      setIsLoggingOut(false)
    }
  }

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <DashboardIcon />,
      page: "dashboard",
      onClick: () => onNavigate("dashboard"),
    },
    {
      id: "limbah-b3",
      label: "Limbah B3",
      icon: <FileIcon />,
      hasSubmenu: true,
      isExpanded: isLimbahExpanded,
      onToggle: () => setIsLimbahExpanded(!isLimbahExpanded),
      submenu: [
        {
          id: "daftar-ajuan",
          label: "Daftar Ajuan Pemusnahan",
          page: "daftar-ajuan-b3",
          onClick: () => onNavigate("daftar-ajuan", { group: "limbah-b3", pageAlias: "daftar-ajuan-b3" }),
        },
        {
          id: "berita-acara",
          label: "Berita Acara Pemusnahan",
          page: "berita-acara-b3",
          onClick: () => onNavigate("berita-acara", { group: "limbah-b3", pageAlias: "berita-acara-b3" }),
        },
      ],
    },
    {
      id: "recall",
      label: "Recall",
      icon: <FileIcon />,
      hasSubmenu: true,
      isExpanded: isRecallExpanded,
      onToggle: () => setIsRecallExpanded(!isRecallExpanded),
      submenu: [
        {
          id: "recall-ajuan",
          label: "Daftar Ajuan Pemusnahan",
          page: "daftar-ajuan-recall",
          onClick: () => onNavigate("daftar-ajuan", { group: "recall", pageAlias: "daftar-ajuan-recall" }),
        },
        {
          id: "recall-berita-acara",
          label: "Berita Acara Pemusnahan",
          page: "berita-acara-recall",
          onClick: () => onNavigate("berita-acara", { group: "recall", pageAlias: "berita-acara-recall" }),
        },
      ],
    },
    {
      id: "recall-precursor-oot",
      label: "Precursor & OOT",
      icon: <FileIcon />,
      hasSubmenu: true,
      isExpanded: isRecallPrecursorExpanded,
      onToggle: () => setIsRecallPrecursorExpanded(!isRecallPrecursorExpanded),
      submenu: [
        {
          id: "recall-precursor-ajuan",
          label: "Daftar Ajuan Pemusnahan",
          page: "daftar-ajuan-recall-precursor-oot",
          onClick: () => onNavigate("daftar-ajuan", { group: "recall-precursor", pageAlias: "daftar-ajuan-recall-precursor-oot" }),
        },
        {
          id: "recall-precursor-berita-acara",
          label: "Berita Acara Pemusnahan",
          page: "berita-acara-recall-precursor-oot",
          onClick: () => onNavigate("berita-acara", { group: "recall-precursor", pageAlias: "berita-acara-recall-precursor-oot" }),
        },
      ],
    },
    {
      id: "audit-log-download",
      label: "Audit Trail",
      icon: <DownloadIcon />,
      page: "audit-log-download",
      onClick: () => onNavigate("audit-log-download"),
    },
    /*
    {
      id: "notifications",
      label: "Notifications",
      icon: <BellIcon />,
      badge: "01",
      page: "notifications",
      onClick: () => onNavigate("notifications"),
    },
    {
      id: "workflow-admin",
      label: "Workflow Admin",
      icon: <AdminIcon />,
      page: "workflow-admin",
      onClick: () => onNavigate("workflow-admin"),
    },
    {
      id: "settings",
      label: "Settings",
      icon: <SettingsIcon />,
      page: "settings",
      onClick: () => onNavigate("settings"),
    },
    */
  ]

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white shadow-lg border-r border-gray-200 flex flex-col h-screen fixed left-0 top-16 transition-all duration-300 z-40`}>
      {/* User Profile - Hidden when collapsed */}
      {!isCollapsed && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                <span>{user?.Inisial_Name?.charAt(0) || "A"}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user?.Inisial_Name || "NIK"}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {user?.emp_DeptID || "DEPT"}
                </div>
                {/* Show delegation info if exists */}
                {user?.delegatedTo && (
                  <div className="text-xs text-green-600 truncate mt-1">
                    Operated by: {user.delegatedTo.Inisial_Name}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon />
            </button>
          </div>
        </div>
      )}

      {/* Toggle button when collapsed */}
      {isCollapsed && (
        <div className="p-2 border-b border-gray-200">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <MenuIcon />
          </button>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.id}>
              <div
                className={`flex items-center ${isCollapsed ? 'justify-center p-2' : 'justify-between p-2'} rounded-md cursor-pointer transition-colors ${
                  currentPage === item.page 
                    ? "bg-green-100 text-green-700" 
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={item.hasSubmenu ? item.onToggle : item.onClick}
                title={isCollapsed ? item.label : undefined}
              >
                {isCollapsed ? (
                  // Collapsed view - only icon
                  <span>{item.icon}</span>
                ) : (
                  // Expanded view - full menu
                  <>
                    <div className="flex items-center space-x-3">
                      <span>{item.icon}</span>
                      <span className="text-sm font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {item.hasSubmenu && (
                      <span className="text-gray-400">
                        {item.isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Submenu - only show when expanded */}
              {!isCollapsed && item.hasSubmenu && item.isExpanded && (
                <ul className="mt-1 ml-6 space-y-1">
                  {item.submenu.map((subItem) => {
                    // Map submenu IDs to group keys for badge display
                    const groupKeyMap = {
                      'berita-acara': 'limbah-b3',
                      'recall-berita-acara': 'recall',
                      'recall-precursor-berita-acara': 'recall-precursor'
                    }
                    const groupKey = groupKeyMap[subItem.id]
                    const hasPending = groupKey && pendingApprovalByGroup[groupKey] > 0
                    
                    return (
                      <li key={subItem.id}>
                        <div
                          className={`p-2 rounded-md cursor-pointer text-sm transition-colors flex items-center justify-between ${
                            currentPage === subItem.page
                              ? "bg-green-50 text-green-600"
                              : "text-gray-600 hover:bg-gray-50"
                          }`}
                          onClick={subItem.onClick}
                        >
                          <span>{subItem.label}</span>
                          {hasPending && (
                            <span className="w-2 h-2 bg-red-500 rounded-full" title="Pending approval"></span>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>
        
        {/* Logout Button */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`w-full p-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors ${
              isCollapsed ? "flex items-center justify-center" : ""
            }`}
            title={isCollapsed ? "Logout" : undefined}
          >
            {isCollapsed ? "⏻" : (isLoggingOut ? "Logging out..." : "Logout")}
          </button>
        </div>
      </nav>
    </div>
  )
}

export default Sidebar
