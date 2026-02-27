// This file contains constants and utility functions for reference data
// These serve as fallbacks when the API is not available

export const DEFAULT_GOLONGAN_OPTIONS = [
  { value: "Prekursor & OOT", label: "Prekursor & OOT" },
  { value: "Recall", label: "Recall" },
  { value: "Recall & Prekursor", label: "Recall & Prekursor" },
  { value: "Hormon", label: "Hormon" },
  { value: "Sefalosporin", label: "Sefalosporin" },
  { value: "Probiotik", label: "Probiotik" },
  { value: "Non Betalaktam", label: "Non Betalaktam" },
  { value: "Betalaktam", label: "Betalaktam" },
  { value: "Limbah mikrobiologi", label: "Limbah mikrobiologi" },
  { value: "Sisa Analisa Lab", label: "Sisa Analisa Lab" },
  { value: "Lain-lain", label: "Lain-lain" }
];

export const DEFAULT_JENIS_OPTIONS = [
  { value: "A336-1 Bahan Baku", label: "(A336-1) Bahan Baku", kode_limbah: "A336-1", jenis_limbah: "Bahan Baku" },
  { value: "A336-1 Produk antara", label: "(A336-1) Produk antara", kode_limbah: "A336-1", jenis_limbah: "Produk antara" },
  { value: "A336-1 Produk ruahan", label: "(A336-1) Produk ruahan", kode_limbah: "A336-1", jenis_limbah: "Produk ruahan" },
  { value: "A336-1 Produk setengah jadi", label: "(A336-1) Produk setengah jadi", kode_limbah: "A336-1", jenis_limbah: "Produk setengah jadi" },
  { value: "A336-1 Produk jadi", label: "(A336-1) Produk jadi", kode_limbah: "A336-1", jenis_limbah: "Produk jadi" },
  { value: "A336-1 Produk kembalian", label: "(A336-1) Produk kembalian", kode_limbah: "A336-1", jenis_limbah: "Produk kembalian" },
  { value: "A336-1 Bahan Kimia kadaluwarsa", label: "(A336-1) Bahan Kimia kadaluwarsa", kode_limbah: "A336-1", jenis_limbah: "Bahan Kimia kadaluwarsa" },
  { value: "A336-2 Residu proses produksi dan formulasi", label: "(A336-2) Residu proses produksi dan formulasi", kode_limbah: "A336-2", jenis_limbah: "Residu proses produksi dan formulasi" },
  { value: "A336-2 Residu Non Betalaktam", label: "(A336-2) Residu Non Betalaktam", kode_limbah: "A336-2", jenis_limbah: "Residu Non Betalaktam" },
  { value: "B336-2 Sludge dari IPAL", label: "(B336-2) Sludge dari IPAL", kode_limbah: "B336-2", jenis_limbah: "Sludge dari IPAL" },
  { value: "A102d Aki/Baterai bekas", label: "(A102d) Aki/Baterai bekas", kode_limbah: "A102d", jenis_limbah: "Aki/Baterai bekas" },
  { value: "A106d Limbah laboratorium (HPLC)", label: "(A106d) Limbah laboratorium (HPLC)", kode_limbah: "A106d", jenis_limbah: "Limbah laboratorium (HPLC)" },
  { value: "A106d Sisa destruksi", label: "(A106d) Sisa destruksi", kode_limbah: "A106d", jenis_limbah: "Sisa destruksi" },
  { value: "A106d Media Fill", label: "(A106d) Media Fill", kode_limbah: "A106d", jenis_limbah: "Media Fill" },
  { value: "B110d Kain Majun dan sejenisnya", label: "(B110d) Kain Majun dan sejenisnya", kode_limbah: "B110d", jenis_limbah: "Kain Majun dan sejenisnya" },
  { value: "A108d Limbah terkontaminasi B3", label: "(A108d) Limbah terkontaminasi B3", kode_limbah: "A108d", jenis_limbah: "Limbah terkontaminasi B3" },
  { value: "B105d Minyak Pelumas/Oli bekas", label: "(B105d) Minyak Pelumas/Oli bekas", kode_limbah: "B105d", jenis_limbah: "Minyak Pelumas/Oli bekas" },
  { value: "B353-1 Cartridge", label: "(B353-1) Cartridge", kode_limbah: "B353-1", jenis_limbah: "Cartridge" },
  { value: "B109d Filter dan Prefilter", label: "(B109d) Filter dan Prefilter", kode_limbah: "B109d", jenis_limbah: "Filter dan Prefilter" },
  { value: "B107d Lampu TL", label: "(B107d) Lampu TL", kode_limbah: "B107d", jenis_limbah: "Lampu TL" },
  { value: "B107d Elektronik", label: "(B107d) Elektronik", kode_limbah: "B107d", jenis_limbah: "Elektronik" },
  { value: "B104d Kemasan bekas B3", label: "(B104d) Kemasan bekas B3", kode_limbah: "B104d", jenis_limbah: "Kemasan bekas B3" },
  { value: "Lain-lain", label: "Lain-lain", kode_limbah: "Lain-lain", jenis_limbah: "Lain-lain" }
];

/**
 * Mapping from golongan limbah label (case-insensitive) to the allowed
 * jenis_limbah names. Must match the `jenis_limbah` field of DEFAULT_JENIS_OPTIONS
 * exactly (comparison is case-insensitive).
 *
 * - Golongan listed here → show only its mapped jenis options.
 * - Golongan NOT listed here → show only jenis not claimed by any mapped golongan.
 */
export const GOLONGAN_JENIS_FILTER_MAP = {
  'Prekursor & OOT': [
    'Bahan Baku',
    'Produk antara',
    'Produk ruahan',
    'Produk setengah jadi',
    'Produk jadi',
    'Produk kembalian',
  ],
  'Recall': [
    'Produk jadi',
  ],
  'Recall & Prekursor': [
    'Produk jadi',
  ],
  'Hormon': [
    'Residu proses produksi dan formulasi',
    'Bahan Baku',
    'Produk antara',
    'Produk ruahan',
    'Produk setengah jadi',
    'Produk jadi',
    'Produk kembalian',
  ],
  'Sefalosporin': [
    'Residu proses produksi dan formulasi',
    'Bahan Baku',
    'Produk antara',
    'Produk ruahan',
    'Produk setengah jadi',
    'Produk jadi',
    'Produk kembalian',
  ],
  'Probiotik': [
    'Residu proses produksi dan formulasi',
    'Bahan Baku',
    'Produk antara',
    'Produk ruahan',
    'Produk setengah jadi',
    'Produk jadi',
    'Produk kembalian',
  ],
  'Non Betalaktam': [
    'Residu proses produksi dan formulasi',
    'Bahan Baku',
    'Produk antara',
    'Produk ruahan',
    'Produk setengah jadi',
    'Produk jadi',
    'Produk kembalian',
  ],
  'Betalaktam': [
    'Residu proses produksi dan formulasi',
    'Bahan Baku',
    'Produk antara',
    'Produk ruahan',
    'Produk setengah jadi',
    'Produk jadi',
    'Produk kembalian',
  ],
  'Limbah mikrobiologi': [
    'Media Fill',
    'Sisa destruksi',
  ],
  'Sisa Analisa Lab': [
    'Limbah laboratorium (HPLC)',
    'Bahan Kimia kadaluwarsa',
    'Bahan Baku',
    'Produk antara',
    'Produk ruahan',
    'Produk setengah jadi',
    'Produk jadi',
  ],
  'Lain-lain': [
    'Kain Majun dan sejenisnya',
    'Limbah terkontaminasi B3',
    'Minyak Pelumas/Oli bekas',
    'Cartridge',
    'Filter dan Prefilter',
    'Lampu TL',
    'Elektronik',
    'Kemasan bekas B3',
    'Sludge dari IPAL',
    'Aki/Baterai bekas',
  ],
};

/**
 * Given a golongan label and the full jenisOptions array, return only the
 * jenis options that are allowed for that golongan.
 *
 * - No golongan selected          → empty array (select is disabled)
 * - Golongan listed in the map     → only its explicitly mapped jenis
 * - Golongan NOT listed in the map → only jenis NOT claimed by ANY mapped golongan
 */
export const getFilteredJenisOptions = (golonganLabel, jenisOptions = DEFAULT_JENIS_OPTIONS) => {
  if (!golonganLabel) return []; // no golongan → no jenis available

  // Find the matching key (case-insensitive)
  const mapKey = Object.keys(GOLONGAN_JENIS_FILTER_MAP).find(
    key => key.toLowerCase() === golonganLabel.toLowerCase()
  );

  if (mapKey) {
    // Golongan is in the map → show only its allowed jenis
    const allowedNames = GOLONGAN_JENIS_FILTER_MAP[mapKey].map(n => n.toLowerCase());
    return jenisOptions.filter(opt => {
      const jenisName = (opt.jenis_limbah || '').toLowerCase();
      return allowedNames.includes(jenisName);
    });
  }

  // Golongan NOT in the map → show only jenis NOT claimed by any mapped golongan
  const allClaimedNames = Object.values(GOLONGAN_JENIS_FILTER_MAP)
    .flat()
    .map(n => n.toLowerCase());

  return jenisOptions.filter(opt => {
    const jenisName = (opt.jenis_limbah || '').toLowerCase();
    return !allClaimedNames.includes(jenisName);
  });
};

// Utility function to get display name for jenis without the code
export const getJenisDisplayName = (jenisValue, jenisOptions = DEFAULT_JENIS_OPTIONS) => {
  const foundJenis = jenisOptions.find(option => option.value === jenisValue);
  if (foundJenis) {
    // Remove the code in parentheses, e.g., "(A336-1) Bahan Baku" -> "Bahan Baku"
    return foundJenis.label.replace(/\(.*?\)\s*/, '');
  }
  return jenisValue; // Fallback if not found
};

// Utility function to get golongan display name
export const getGolonganDisplayName = (golonganValue, golonganOptions = DEFAULT_GOLONGAN_OPTIONS) => {
  const foundGolongan = golonganOptions.find(option => option.value === golonganValue);
  return foundGolongan ? foundGolongan.label : golonganValue;
};

// ---------------------------------------------------------------------------
// Nama Limbah select options for Prekursor & OOT / Recall & Prekursor golongan
// Only shown when jenis is "Bahan Baku" or starts with "Produk"
// ---------------------------------------------------------------------------

// Golongan values that trigger select-mode for Nama Limbah
export const GOLONGAN_NAMA_LIMBAH_SELECT = ['Prekursor & OOT', 'Recall & Prekursor'];

// Options when jenis_limbah === 'Bahan Baku' (alphabetically sorted)
export const NAMA_LIMBAH_BB_OPTIONS = [
  { value: 'Dextrometorphan HBr', label: 'Dextrometorphan HBr' },
  { value: 'Phenylpropanolamine HCl/ Norephedrine HCl', label: 'Phenylpropanolamine HCl/ Norephedrine HCl' },
  { value: 'Phenylpropanolamine HCl RS/ Norephedrine HCl RS', label: 'Phenylpropanolamine HCl RS/ Norephedrine HCl RS' },
  { value: 'Pseudoefedrin HCl', label: 'Pseudoefedrin HCl' },
  { value: 'Pseudoefedrin HCl RS', label: 'Pseudoefedrin HCl RS' },
  { value: 'Pseudoefedrin Sulphate', label: 'Pseudoefedrin Sulphate' },
  { value: 'Pseudoefedrin Sulphate RS', label: 'Pseudoefedrin Sulphate RS' },
  { value: 'Tramadol', label: 'Tramadol' },
];

// Options when jenis_limbah starts with 'Produk' (alphabetically sorted)
export const NAMA_LIMBAH_PRODUK_OPTIONS = [
  { value: 'Analtram.', label: 'Analtram.' },
  { value: 'Lacoldin Sirup', label: 'Lacoldin Sirup' },
  { value: 'Lacoldin Tablet', label: 'Lacoldin Tablet' },
  { value: 'Lanos Drops', label: 'Lanos Drops' },
  { value: 'Lanos Plus Sirup', label: 'Lanos Plus Sirup' },
  { value: 'Lapifed DM Sirup', label: 'Lapifed DM Sirup' },
  { value: 'Lapifed Ekspektoran Sirup', label: 'Lapifed Ekspektoran Sirup' },
  { value: 'Lapifed Sirup', label: 'Lapifed Sirup' },
  { value: 'Lapifed Tablet', label: 'Lapifed Tablet' },
  { value: 'Lapisiv Sirup', label: 'Lapisiv Sirup' },
  { value: 'Lapisiv-T Tablet', label: 'Lapisiv-T Tablet' },
  { value: 'Pseudoefedrin Drops', label: 'Pseudoefedrin Drops' },
];

// Status mapping constants
export const STATUS_MAPPINGS = {
  'Draft': 'Draft',
  'InProgress': 'In Progress',
  'Approved': 'Approved',
  'Rejected': 'Rejected',
  'Completed': 'Completed',
  'Cancelled': 'Cancelled'
};

// Detailed status mappings for better workflow representation
export const DETAILED_STATUS_MAPPINGS = {
  'Draft': 'Draft',
  'InProgress': 'In Progress',
  'WaitingManagerApproval': 'Waiting Manager Approval',
  'WaitingHSEApproval': 'Waiting HSE Approval', 
  'WaitingAPJPNApproval': 'Waiting APJ Approval',
  'WaitingAPJQAApproval': 'Waiting APJ Approval',
  'Approved': 'Approved',
  'Rejected': 'Rejected',
  'Completed': 'Completed',
  'Cancelled': 'Cancelled'
};

export const getStatusDisplayName = (status, currentStepLevel = null) => {
  // If it's InProgress, try to determine more specific status based on step level
  if (status === 'InProgress' && currentStepLevel) {
    switch (currentStepLevel) {
      case 1:
        return 'Waiting Manager Approval';
      case 2:
        return 'Waiting APJ Approval';
      case 3:
        return 'Waiting Verifikasi Lapangan';
      case 4:
        return 'Waiting HSE Manager Approval';
      default:
        return 'Completed';
    }
  }
  
  return STATUS_MAPPINGS[status] || status;
};

export const getBeritaAcaraStatusDisplayName = (status, currentStepLevel = null, opts = {}) => {
  // opts can include more context, e.g. opts.step (object) or opts.roleHint to provide finer labels
  if (status === 'InProgress' && currentStepLevel) {
    // If caller passed a step object, prefer its step_name or signers info for better label
    const step = opts.step || null;
    const roleHint = opts.roleHint || (step && step.step_name) || null;

    // Normalize roleHint to lower-case for matching
    const hint = roleHint ? String(roleHint).toLowerCase() : null;

    // Map step levels to workflow-specific labels. Because step 3 can be multiple roles (APJ PN / APJ QA / Department Manager),
    // we try to determine which label is appropriate using the roleHint. Otherwise we return a generic waiting label for step 3.
    switch (Number(currentStepLevel)) {
      case 2:
        return 'Waiting HSE Manager Approval';
      case 3:
        if (hint) {
          if (hint.includes('pn') || hint.includes('apj pn') || hint.includes('pn1')) return 'Waiting APJ PN Approval';
          if (hint.includes('qa') || hint.includes('apj qa')) return 'Waiting APJ QA Approval';
          if (/department|manager|departemen/i.test(hint)) return 'Waiting Department Manager Approval';
        }
        // Generic label for step 3 when unknown
        return 'Waiting APJ / Department Manager Approval';
      case 4:
        if (hint && (hint.includes('pl') || hint.includes('plant') || hint.includes('head'))) return 'Waiting Head of Plant Approval';
        return 'Waiting Head of Plant Approval';
      default:
        return 'Completed';
    }
  }

  return STATUS_MAPPINGS[status] || status;
};
