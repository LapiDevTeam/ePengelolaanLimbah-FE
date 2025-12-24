"use client"

import { useAuth } from "../contexts/AuthContext"
import { formatDateTimeID, formatTimeID, toJakartaIsoFromLocal } from "../utils/time"

const Header = () => {
  const { user } = useAuth()

  const getCurrentDateTime = () => {
    // Build Jakarta explicit ISO from local clock and format using Jakarta formatter so
    // the displayed wall-clock matches Jakarta time. This avoids converting the stored
    // Jakarta timestamps into the client's timezone.
    const jakartaIso = toJakartaIsoFromLocal();
    // formatDateTimeID returns 'DD/MM/YYYY HH:MM' — convert to a more verbose local id style
    const dt = formatDateTimeID(jakartaIso);
    if (!dt) return '';
    // dt is 'DD/MM/YYYY HH:MM:SS' — expand month name for parity with previous long format
    // Simple mapping to get Indonesian month name
    const [datePart] = dt.split(' ');
    const [dd, mm, yyyy] = datePart.split('/');
    const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    const monthName = monthNames[Number(mm) - 1] || '';
    // Use formatTimeID to ensure we display HH:MM:SS (Jakarta wall-clock)
    const time = formatTimeID(jakartaIso);
    return `${Number(dd).toString().padStart(2,'0')} ${monthName} ${yyyy}, ${time}`;
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-white text-green-600 py-3 shadow-lg z-50">
      <div className="px-6">
        {/* System title positioned on the very left */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">ePengelolaan Limbah</h1>
          
          {/* Right side - User greeting and datetime (only show if user is logged in) */}
          {user && (
            <div className="text-right">
              <div className="text-sm font-medium mb-1">Hello, {user.Nama}!</div>
              <div className="text-xs opacity-90">{getCurrentDateTime()}</div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
