import { useState, useRef, useEffect, useMemo } from "react";
import { dataAPI } from "../services/api";
import { toJakartaIsoFromLocal, formatDateID } from "../utils/time";

// Preview component using the same drawing logic
const PreviewCanvas = ({ drawLabel, currentContainerIndex }) => {
  const canvasRef = useRef();

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set high resolution for better quality
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = 600 * pixelRatio;
      canvas.height = 360 * pixelRatio;
      canvas.style.width = '600px';
      canvas.style.height = '360px';
      
      // Scale context to ensure correct drawing operations
      ctx.scale(pixelRatio, pixelRatio);
      
      drawLabel(canvas, ctx, 0.75, currentContainerIndex).catch(console.error);
    }
  }, [currentContainerIndex, drawLabel]);

  return (
    <canvas 
      ref={canvasRef}
      style={{ 
        border: '1px solid #ccc',
        borderRadius: '8px',
        backgroundColor: '#fff'
      }}
    />
  );
};

const DownloadLabelModal = ({ isOpen, onClose, requestId, useMockData = false }) => {
  const [selectedSize, setSelectedSize] = useState("800px");
  const [currentContainerIndex, setCurrentContainerIndex] = useState(1);
  const [labelData, setLabelData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mock data for testing
  // Build Jakarta ISO and format date helpers
  const getLocalDateISO = (d = null) => {
    // Use Jakarta-local date components so mock data matches Jakarta wall-clock
    const iso = d ? toJakartaIsoFromLocal(new Date(d)) : toJakartaIsoFromLocal();
    return iso.split('T')[0];
  };

  const mockLabelData = useMemo(() => ({
    request_info: {
      request_id: "5630",
      nomor_permohonan: "5630",
      status: "Completed",
      bentuk_limbah: "Cair"
    },
    labels: [
      {
        nomor_wadah: 1,
        request_id: "5630",
        company_name: "PT. Lapi Laboratories",
        company_address: "Kawasan Industri Modern Cikande Kav., Serang",
        company_phone: "0254 - 402150",
        company_fax: "0254 - 402151",
        nomor_permohonan: "5630",
        nomor_penghasil: "KLH - 10410",
        tgl_pengemasan: getLocalDateISO(),
        jenis_limbah: "Produk jadi",
        kode_limbah: "A336-1",
        jumlah_limbah: 3,
        sifat_limbah: "Sefalosporin",
        container_details: {
          nama_limbah: "Limbah Test 1",
          jumlah_item: 1,
          satuan: "gr",
          bobot: "25.5",
          nomor_analisa: "BT001",
          nomor_referensi: "REF001",
          alasan_pemusnahan: "Sisa Produksi"
        },
  generated_at: toJakartaIsoFromLocal(),
        generated_by: "test_user",
        generated_by_name: "Test User"
      },
      {
        nomor_wadah: 2,
        request_id: "5630",
        company_name: "PT. Lapi Laboratories",
        company_address: "Kawasan Industri Modern Cikande Kav., Serang",
        company_phone: "0254 - 402150",
        company_fax: "0254 - 402151",
        nomor_permohonan: "5630",
        nomor_penghasil: "KLH - 10410",
        tgl_pengemasan: getLocalDateISO(),
        jenis_limbah: "Produk jadi",
        kode_limbah: "A336-1",
        jumlah_limbah: 3,
        sifat_limbah: "Sefalosporin",
        container_details: {
          nama_limbah: "Limbah Test 2",
          jumlah_item: 1,
          satuan: "gr",
          bobot: "30.2",
          nomor_analisa: "BT002",
          nomor_referensi: "REF002",
          alasan_pemusnahan: "Sisa Produksi"
        },
  generated_at: toJakartaIsoFromLocal(),
        generated_by: "test_user",
        generated_by_name: "Test User"
      },
      {
        nomor_wadah: 3,
        request_id: "5630",
        company_name: "PT. Lapi Laboratories",
        company_address: "Kawasan Industri Modern Cikande Kav., Serang",
        company_phone: "0254 - 402150",
        company_fax: "0254 - 402151",
        nomor_permohonan: "5630",
        nomor_penghasil: "KLH - 10410",
        tgl_pengemasan: getLocalDateISO(),
        jenis_limbah: "Produk jadi",
        kode_limbah: "A336-1",
        jumlah_limbah: 3,
        sifat_limbah: "Sefalosporin",
        container_details: {
          nama_limbah: "Limbah Test 3",
          jumlah_item: 1,
          satuan: "gr",
          bobot: "28.7",
          nomor_analisa: "BT003",
          nomor_referensi: "REF003",
          alasan_pemusnahan: "Sisa Produksi"
        },
  generated_at: toJakartaIsoFromLocal(),
        generated_by: "test_user",
        generated_by_name: "Test User"
      }
    ],
    total_labels: 3,
    total_waste_items: 3
  }), []);

  // Fetch label data from backend when modal opens
  useEffect(() => {
    const fetchLabelData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await dataAPI.generateLabelsForRequest(requestId);
        
        if (response.data.success) {
          setLabelData(response.data.data);
        } else {
          setError(response.data.message || 'Failed to generate labels');
        }
      } catch (err) {
        setError('Error fetching label data');
        console.error('Error fetching label data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && requestId) {
      setCurrentContainerIndex(1);
      if (useMockData) {
        // Use mock data for testing
        setLoading(true);
        setTimeout(() => {
          setLabelData(mockLabelData);
          setLoading(false);
        }, 500); // Simulate API delay
      } else {
        fetchLabelData();
      }
    }
  }, [isOpen, requestId, useMockData, mockLabelData]);



  if (!isOpen) return null;

  // Show loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
            <span>Generating labels...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error</h3>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Show message if no label data
  if (!labelData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Data</h3>
          <p className="text-gray-700 mb-4">No label data available for this request.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Get company info from backend data (fallback to defaults if not provided)
  // eslint-disable-next-line no-unused-vars
  const companyInfo = labelData.labels?.[0] ? {
    penghasil: labelData.labels[0].company_name || "PT. Lapi Laboratories",
    alamat: labelData.labels[0].company_address || "Kawasan Industri Modern Cikande Kav., Serang",
    telp: labelData.labels[0].company_phone || "0254 - 402150",
    fax: labelData.labels[0].company_fax || "0254 - 402151",
    nomorPenghasil: labelData.labels[0].nomor_penghasil || "KLH - 10410"
  } : {
    penghasil: "PT. Lapi Laboratories",
    alamat: "Kawasan Industri Modern Cikande Kav., Serang",
    telp: "0254 - 402150",
    fax: "0254 - 402151",
    nomorPenghasil: "KLH - 10410"
  };

  const totalLabels = labelData.total_labels || 0;

  const sizeOptions = [
    { value: "400px", label: "400px", width: 400, height: 240 },
    { value: "600px", label: "600px", width: 600, height: 360 },
    { value: "800px", label: "800px", width: 800, height: 480 },
    { value: "1000px", label: "1000px", width: 1000, height: 600 },
    { value: "1200px", label: "1200px", width: 1200, height: 720 }
  ];

  // Helper function to determine waste symbols based on waste properties
  const getWasteSymbols = (kodeLimbah, sifatLimbah, bentukLimbah) => {
    const symbols = [];
    const sifatLower = (sifatLimbah || "").toLowerCase();
    const bentuk = bentukLimbah || "Unknown";

    // Special case for A106d - requires checking bentuk_limbah for flame symbol type
    if (kodeLimbah === "A106d") {
      // A106d always has toxic symbol
      symbols.push("/ePemusnahanLimbah-dev/hazard/beracun.png");

      // A106d has "mudah menyala/mudah terbakar" - check bentuk limbah for appropriate symbol
      if (bentuk === "Cair") {
        // For liquid A106d, use the available liquid flammable symbol
        symbols.push("/ePemusnahanLimbah-dev/hazard/cairan_muda_terbakar.png");
      } else if (bentuk === "Padat") {
        // For solid A106d, use padatan mudah menyala symbol
        symbols.push("/ePemusnahanLimbah-dev/hazard/padatan_mudah_menyala.png");
      }
    } else {
      // General rules for other waste codes - sifat_limbah already contains "cairan" or "padatan"

      // 1. Check for toxic/poisonous
      if (sifatLower.includes("beracun") || sifatLower.includes("toxic")) {
        symbols.push("/ePemusnahanLimbah-dev/hazard/beracun.png");
      }

      // 2. Check for specific flammable types - using updated file names
      if (sifatLower.includes("cairan mudah menyala") || sifatLower.includes("cairan mudah terbakar")) {
        symbols.push("/ePemusnahanLimbah-dev/hazard/cairan_muda_terbakar.png");
      }

      if (sifatLower.includes("padatan mudah menyala")) {
        symbols.push("/ePemusnahanLimbah-dev/hazard/padatan_mudah_menyala.png");
      }

      if (sifatLower.includes("padatan mudah terbakar")) {
        // Use padatan mudah menyala as fallback since padatan_mudah_terbakar.png doesn't exist
        symbols.push("/ePemusnahanLimbah-dev/hazard/padatan_mudah_menyala.png");
      }

      // 3. Check for explosive - now available!
      if (sifatLower.includes("mudah meledak") || sifatLower.includes("explosive")) {
        symbols.push("/ePemusnahanLimbah-dev/hazard/mudah_meledak.png");
      }

      // 4. Check for campuran (mixture) - file no longer available
      if (sifatLower.includes("campuran") || sifatLower.includes("mixture")) {
        console.log("Campuran detected but symbol file not available");
        // No symbol added since campuran.jpg is not available
      }
    }

    // Default fallback - if no symbols found, add general toxic
    if (symbols.length === 0) {
      symbols.push("/ePemusnahanLimbah-dev/hazard/beracun.png");
    }

    // Remove duplicates and limit to maximum 3 symbols
    return [...new Set(symbols)].slice(0, 3);
  };

  const drawLabel = async (canvas, ctx, scale, wadahNumber) => {
    // Get the specific label data for the wadahNumber being drawn
    const specificLabel = labelData.labels?.[wadahNumber - 1];
    if (!specificLabel) return;

    // Create label display data for this specific label
    const specificDisplayData = {
      nomorPermohonan: specificLabel.nomor_permohonan || labelData.request_info?.nomor_permohonan,
      tanggalPengemasan: specificLabel.tgl_pengemasan ? formatDateID(specificLabel.tgl_pengemasan) : formatDateID(toJakartaIsoFromLocal()),
      jenisLimbah: specificLabel.jenis_limbah || "Unknown",
      kodeLimbah: specificLabel.kode_limbah || "Unknown",
      bobot: specificLabel.container_details?.bobot || "0",
      satuan: "gr",
      sifatLimbah: specificLabel.sifat_limbah || "Unknown",
      nomorWadah: specificLabel.nomor_wadah || wadahNumber
    };

    // Get company info from the specific label
    const specificCompanyInfo = {
      penghasil: specificLabel.company_name || "PT. Lapi Laboratories",
      alamat: specificLabel.company_address || "Kawasan Industri Modern Cikande Kav., Serang",
      telp: specificLabel.company_phone || "0254 - 402150",
      fax: specificLabel.company_fax || "0254 - 402151",
      nomorPenghasil: specificLabel.nomor_penghasil || "KLH - 10410"
    };

    // Get waste symbols (enhancement: hazard symbols)
    const kodeLimbah = specificLabel.kode_limbah;
    const sifatLimbah = specificLabel.sifat_limbah;
    const bentukLimbah = labelData.request_info?.bentuk_limbah || specificLabel.bentuk_limbah;
    
    console.log("=== HAZARD SYMBOLS DEBUG ===");
    console.log("Kode Limbah:", kodeLimbah);
    console.log("Sifat Limbah:", sifatLimbah);
    console.log("Bentuk Limbah:", bentukLimbah);
    
    const wasteSymbols = getWasteSymbols(kodeLimbah, sifatLimbah, bentukLimbah);
    console.log("Generated Symbol Paths:", wasteSymbols);
    console.log("Number of symbols:", wasteSymbols.length);

    // Scale all dimensions
    const s = scale;
    const width = 800;
    const height = 480;
    
    // Improve canvas rendering quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Function to load image with better quality
    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Handle CORS if needed
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };
    
    // Load logo image first
    let logoImg;
    try {
      logoImg = await loadImage('/logo_bnw.png');
    } catch (error) {
      console.warn('Failed to load logo image:', error);
      logoImg = null;
    }

    // Load waste symbols (enhancement: hazard symbols)
    const wasteSymbolImages = [];
    if (wasteSymbols.length > 0) {
      console.log("=== LOADING HAZARD SYMBOLS ===");
      for (let i = 0; i < wasteSymbols.length; i++) {
        const symbolPath = wasteSymbols[i];
        console.log(`Attempting to load symbol ${i + 1}/${wasteSymbols.length}: ${symbolPath}`);
        try {
          const symbolImg = await loadImage(symbolPath);
          wasteSymbolImages.push({
            img: symbolImg,
            path: symbolPath,
          });
          console.log(`✓ Successfully loaded: ${symbolPath}`);
        } catch (error) {
          console.error(`✗ Failed to load hazard symbol: ${symbolPath}`, error);
          console.error(`Error details:`, error.message);
        }
      }
      console.log(`=== SUMMARY: Loaded ${wasteSymbolImages.length} out of ${wasteSymbols.length} hazard symbols ===`);
    } else {
      console.log("No hazard symbols to load for this waste item.");
    }
    
    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width * s, height * s);
    
    // Outer border (thick black border)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5 * s;
    ctx.strokeRect(3 * s, 3 * s, (width - 6) * s, (height - 6) * s);
    
    // Header section with title (white background)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10 * s, 10 * s, (width - 20) * s, 60 * s);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3 * s;
    ctx.strokeRect(10 * s, 10 * s, (width - 20) * s, 60 * s);
    
    // Logo area (no box border needed)
    
    // Draw logo image if loaded, otherwise show fallback text
    if (logoImg) {
      // Calculate logo dimensions to maintain aspect ratio
      const logoWidth = 76 * s;
      const logoHeight = 40 * s;
      const logoX = 20 * s;
      const logoY = 20 * s;
      
      // Save context state
      ctx.save();
      
      // Enable better image rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw logo image with proper scaling
      ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
      
      // Restore context state
      ctx.restore();
    } else {
      // Fallback to text if image fails to load
      ctx.fillStyle = '#000000';
      ctx.font = `bold ${10 * s}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText('LAPI', 58 * s, 35 * s);
      ctx.font = `${8 * s}px Arial`;
      ctx.fillText('LABORATORIES', 58 * s, 45 * s);
    }
    
    // Main title (center) - much larger and bolder
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${22 * s}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('LABEL LIMBAH BERBAHAYA DAN BERACUN', (width / 2) * s, 45 * s);
    
    // Nomor Permohonan section (white background with border)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10 * s, 70 * s, (width - 20) * s, 35 * s);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3 * s;
    ctx.strokeRect(10 * s, 70 * s, (width - 20) * s, 35 * s);
    
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${16 * s}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText(`Nomor Permohonan : ${specificDisplayData.nomorPermohonan}`, 25 * s, 92 * s);
    
    // Main warning section (bright yellow background)
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(10 * s, 105 * s, (width - 20) * s, (height - 115) * s);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3 * s;
    ctx.strokeRect(10 * s, 105 * s, (width - 20) * s, (height - 115) * s);
    
    // Warning title - positioned on the left to avoid collision with hazard symbols
    ctx.fillStyle = '#FF0000';
    ctx.font = `bold ${38 * s}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText('PERINGATAN !', 25 * s, 145 * s);
    
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${24 * s}px Arial`;
    ctx.textAlign = 'left';
    ctx.fillText('LIMBAH BERBAHAYA DAN BERACUN', 25 * s, 175 * s);

    // Render hazard symbols (enhancement: positioned in top-right of yellow area)
    if (wasteSymbolImages.length > 0) {
      console.log(`=== RENDERING ${wasteSymbolImages.length} HAZARD SYMBOLS ===`);
      // Calculate symbol positioning in top-right area of yellow warning section
      const yellowAreaTop = 105 * s; // Top of yellow warning area
      const separatorLineY = 195 * s; // Where the black line is
      const availableHeight = separatorLineY - yellowAreaTop - 20 * s; // 20*s padding
      const symbolSize = Math.min(availableHeight * 0.8, 60 * s); // Reasonable symbol size
      const symbolSpacing = symbolSize + 8 * s; // Symbol spacing
      const rightMargin = 25 * s; // Right margin

      console.log(`Symbol positioning: yellowAreaTop=${yellowAreaTop}, symbolSize=${symbolSize}, rightMargin=${rightMargin}`);

      // Calculate symbols position - align to right side of warning area
      const symbolsEndX = width * s - rightMargin;
      const totalSymbolsWidth = wasteSymbolImages.length > 0
        ? wasteSymbolImages.length * symbolSize + (wasteSymbolImages.length - 1) * 8 * s
        : 0;
      const symbolsStartX = symbolsEndX - totalSymbolsWidth;

      // Position symbols starting from top of yellow area with padding
      const symbolsY = yellowAreaTop + 15 * s; // Small padding from top

      console.log(`Symbols will be rendered from X=${symbolsStartX} to X=${symbolsEndX}, Y=${symbolsY}`);

      wasteSymbolImages.forEach((symbolObj, index) => {
        const symbolX = symbolsStartX + index * symbolSpacing;
        
        console.log(`Rendering symbol ${index + 1}: ${symbolObj.path} at position (${symbolX}, ${symbolsY}) size ${symbolSize}x${symbolSize}`);

        // Save context state for symbol rendering
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw hazard symbol
        ctx.drawImage(symbolObj.img, symbolX, symbolsY, symbolSize, symbolSize);

        // Restore context state
        ctx.restore();
      });

      console.log(`✓ Successfully rendered ${wasteSymbolImages.length} hazard symbols in yellow warning area`);
    } else {
      console.log("No hazard symbols to render.");
    }
    
    // Horizontal separator line (very thick black line)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(30 * s, 195 * s);
    ctx.lineTo((width - 30) * s, 195 * s);
    ctx.stroke();
    
    // Information fields - much larger fonts for better readability
    ctx.fillStyle = '#000000';
    ctx.font = `bold ${18 * s}px Arial`;
    ctx.textAlign = 'left';
    
    // Company and waste information with better spacing
    const allFields = [
      { label: 'PENGHASIL', value: specificCompanyInfo.penghasil, y: 220 },
      { label: 'ALAMAT', value: specificCompanyInfo.alamat, y: 250 },
      { label: '', value: `TELP. : ${specificCompanyInfo.telp}  FAX : ${specificCompanyInfo.fax}`, y: 275 },
      { label: 'NOMOR PENGHASIL', value: specificCompanyInfo.nomorPenghasil, y: 300 },
      { label: 'TGL. PENGEMASAN', value: specificDisplayData.tanggalPengemasan, y: 330 },
      { label: 'JENIS LIMBAH', value: specificDisplayData.jenisLimbah, y: 360 },
      { label: 'KODE LIMBAH', value: specificDisplayData.kodeLimbah, y: 390 },
      { label: 'JUMLAH LIMBAH', value: `${specificDisplayData.bobot} ${specificDisplayData.satuan}`, y: 420 },
      { label: 'SIFAT LIMBAH', value: specificDisplayData.sifatLimbah, y: 450 }
    ];
    
    // Draw all fields with larger fonts and better spacing
    allFields.forEach(field => {
      if (field.label) {
        ctx.textAlign = 'left';
        ctx.fillText(field.label, 35 * s, field.y * s);
        ctx.fillText(':', 220 * s, field.y * s);
        ctx.fillText(field.value, 240 * s, field.y * s);
      } else {
        // For phone/fax line without label
        ctx.fillText(field.value, 240 * s, field.y * s);
      }
    });
    
    // Nomor wadah (aligned with SIFAT LIMBAH) - same font size as content
    const nomorText = `NOMOR : ${wadahNumber}/${totalLabels}`;
    ctx.font = `bold ${18 * s}px Arial`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'right';
    ctx.fillText(nomorText, (width - 35) * s, 450 * s);
  };

  const handleDownload = async (labelIndex) => {
    const sizeOption = sizeOptions.find(opt => opt.value === selectedSize);
    if (!sizeOption) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Use high resolution for better quality download
    const pixelRatio = window.devicePixelRatio || 1;
    const highResMultiplier = 2; // Additional multiplier for even better quality
    
    // Set canvas size with high resolution
    canvas.width = sizeOption.width * pixelRatio * highResMultiplier;
    canvas.height = sizeOption.height * pixelRatio * highResMultiplier;
    
    // Scale context for high resolution
    ctx.scale(pixelRatio * highResMultiplier, pixelRatio * highResMultiplier);
    
    // Calculate scale based on original size
    const scale = sizeOption.width / 800;
    
    // Draw the label
    await drawLabel(canvas, ctx, scale, labelIndex);
    
    // Get the specific label data for filename
    const specificLabel = labelData.labels[labelIndex - 1];
    const wadahNumber = specificLabel?.nomor_wadah || labelIndex;
    
    // Convert to blob and download with high quality
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `label-limbah-${specificLabel?.nomor_permohonan || 'unknown'}-wadah-${wadahNumber}-${sizeOption.width}x${sizeOption.height}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png', 1.0); // Maximum quality
  };

  const handleDownloadAll = async () => {
    for (let i = 1; i <= totalLabels; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      await handleDownload(i);
    }
  };

  const handleDownloadSingle = async (labelIndex) => {
    await handleDownload(labelIndex);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100 opacity-100">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Download Label Limbah</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Show message if no labels */}
          {totalLabels === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-lg mb-2">Tidak ada label yang dapat dibuat</div>
              <div className="text-gray-400 text-sm">Pastikan request sudah completed dan memiliki container yang valid</div>
            </div>
          ) : (
            <>
              {/* Preview Label */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Preview Label:
                </h3>
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50 overflow-auto">
                  <div className="flex justify-center">
                    <PreviewCanvas drawLabel={drawLabel} currentContainerIndex={currentContainerIndex} />
                  </div>
                </div>
                
                {/* Preview Navigation */}
                {totalLabels > 1 && (
                  <div className="flex justify-center mt-4 space-x-2">
                    <button
                      onClick={() => setCurrentContainerIndex(Math.max(1, currentContainerIndex - 1))}
                      disabled={currentContainerIndex === 1}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Previous
                    </button>
                    <span className="px-4 py-2 bg-white border border-gray-300 rounded-lg">
                      {currentContainerIndex} / {totalLabels}
                    </span>
                    <button
                      onClick={() => setCurrentContainerIndex(Math.min(totalLabels, currentContainerIndex + 1))}
                      disabled={currentContainerIndex === totalLabels}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>

              {/* Size Selection */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Pilih Ukuran Download:</h3>
                <div className="grid grid-cols-5 gap-3">
                  {sizeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedSize(option.value)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors border ${
                        selectedSize === option.value
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div>{option.label}</div>
                      <div className="text-xs opacity-75">{option.width} x {option.height}</div>
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  * File akan didownload dalam format PNG dengan kualitas tinggi
                </p>
              </div>

              {/* Download Options */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Opsi Download:</h3>
                <div className="space-y-4">
                  {/* Download All */}
                  <button
                    onClick={handleDownloadAll}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium border border-green-600 shadow-sm"
                  >
                    Download Semua Label ({totalLabels} file)
                  </button>
                  
                  {/* Individual Downloads with professional green styling */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center mb-4">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                      <h4 className="text-base font-semibold text-green-800">Download Individual</h4>
                    </div>
                    <p className="text-sm text-green-600 mb-4">Pilih label wadah yang ingin diunduh secara terpisah</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {labelData.labels.map((label, index) => (
                        <button
                          key={`label-${index + 1}`}
                          onClick={() => handleDownloadSingle(index + 1)}
                          className="group relative px-4 py-3 bg-white text-green-700 border border-green-300 rounded-lg hover:bg-green-50 hover:border-green-400 hover:shadow-md transition-all duration-200 text-sm font-medium"
                        >
                          <div className="flex items-center justify-center">
                            <svg className="w-4 h-4 mr-2 text-green-600 group-hover:text-green-700" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <span>Wadah {label.nomor_wadah}</span>
                          </div>
                          <div className="text-xs text-green-500 mt-1">{index + 1}/{totalLabels}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DownloadLabelModal;
