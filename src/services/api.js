import axios from 'axios';
import { DEFAULT_JENIS_OPTIONS, DEFAULT_GOLONGAN_OPTIONS } from '../constants/referenceData';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper function to get token from session or localStorage
const getAuthToken = () => {
  // Priority: sessionStorage first (access_token), then localStorage (token) as fallback
  return sessionStorage.getItem('access_token') || localStorage.getItem('token');
};

// Add request interceptor to include auth token from session
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      // Use Authorization: Bearer format as required by authMiddleware
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized - authentication token required or invalid/expired token
    if (error.response?.status === 401) {
      const token = getAuthToken();
      if (token) {
        // Token expired or invalid - clear session data
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('delegatedTo');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('delegatedTo');
        
        // Dispatch custom event that AuthContext can listen to
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const dataAPI = {
  // Get all destruction requests with pagination and filtering
  getDestructionRequests: async (params = {}) => {
    try {
      const { page = 1, limit = 8, searchTerm = '', selectedColumn = '', userOnly = true, statusFilter = '', group = null } = params;
      
      // Build query params
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      
      if (selectedColumn) {
        queryParams.append('column', selectedColumn);
      }
      
      // Add userOnly filter for regular users to see only their own requests
      if (userOnly) {
        queryParams.append('userOnly', 'true');
      }

      // Add status filter (for KL filtering by specific status)
      if (statusFilter) {
        queryParams.append('statusFilter', statusFilter);
      }
      
      // Add group filter
      if (group) {
        queryParams.append('group', group);
      }

      const response = await api.get(`/permohonan?${queryParams}`);
      
      // Backend returns structured response with success, data, and pagination
      if (response.data.success) {
        return {
          data: {
            success: true,
            data: response.data.data.map(item => ({
              id: item.request_id,
              tanggal: item.created_at,
              noPermohonan: item.nomor_permohonan || `DRAFT-${item.request_id}`,
              golongan_limbah_id: item.golongan_limbah_id,
              jenis_limbah_b3_id: item.jenis_limbah_b3_id,
              status: item.status || 'Draft',
              currentStepLevel: item.CurrentStep?.step_level || null,
              requesterName: item.requester_name,
              bagian: item.bagian,
              bentukLimbah: item.bentuk_limbah,
              alasanPenolakan: item.alasan_penolakan
            })),
            pagination: response.data.pagination
          }
        };
      } else {
        return {
          data: {
            success: false,
            message: response.data.message || 'Failed to fetch destruction requests',
            data: [],
            pagination: { total: 0, page: 1, limit: 8, totalPages: 0 }
          }
        };
      }
    } catch (error) {
      console.error('Error fetching destruction requests:', error);
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch destruction requests',
          data: [],
          pagination: { total: 0, page: 1, limit: 8, totalPages: 0 }
        }
      };
    }
  },

  // Get single destruction request by ID
  getDestructionRequestById: async (id) => {
    try {
      const response = await api.get(`/permohonan/${id}`);
      return {
        data: {
          success: true,
          data: response.data
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch destruction request details'
        }
      };
    }
  },

  // Create new destruction request
  createDestructionRequest: async (requestData) => {
    try {
      const response = await api.post('/permohonan', requestData);
      return {
        data: {
          success: true,
          message: 'Destruction request created successfully',
          data: response.data
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to create destruction request'
        }
      };
    }
  },

  // Save destruction request as draft (creates new request as draft)
  saveDraftDestructionRequest: async (requestData) => {
    try {
      const response = await api.post('/permohonan', requestData);
      return {
        data: {
          success: true,
          message: 'Draft saved successfully',
          data: response.data
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to save draft'
        }
      };
    }
  },

  // Get destruction request detail by ID (for editing)
  getDestructionRequestDetail: async (id) => {
    try {
      const response = await api.get(`/permohonan/${id}/detail`);
      return {
        data: {
          success: true,
          data: response.data // Use response.data directly instead of response.data.data
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch destruction request details'
        }
      };
    }
  },

  // Update destruction request
  updateDestructionRequest: async (id, requestData) => {
    try {
      const response = await api.put(`/permohonan/${id}`, requestData);
      return {
        data: {
          success: true,
          message: 'Destruction request updated successfully',
          data: response.data
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to update destruction request'
        }
      };
    }
  },

  // Delete destruction request
  deleteDestructionRequest: async (id) => {
    try {
      const response = await api.delete(`/permohonan/${id}`);
      return {
        data: {
          success: true,
          message: 'Destruction request deleted successfully'
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to delete destruction request'
        }
      };
    }
  },

  // Submit destruction request for approval
  submitDestructionRequest: async (id) => {
    try {
      const response = await api.post(`/permohonan/${id}/submit`);
      return {
        data: {
          success: true,
          message: 'Destruction request submitted for approval',
          data: response.data
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to submit destruction request'
        }
      };
    }
  },

  // Approve destruction request
  // Accept optional verifier metadata (verifierId, verifierName, verifierJabatan)
  approveDestructionRequest: async (id, comments = 'Approved', verifier = {}) => {
    try {
      const payload = { comments };
      if (verifier.verifierId) payload.verifierId = verifier.verifierId;
      if (verifier.verifierName) payload.verifierName = verifier.verifierName;
      if (verifier.verifierJabatan) payload.verifierJabatan = verifier.verifierJabatan;
      if (verifier.roleId) payload.roleId = verifier.roleId; // forward verification role id

      const response = await api.post(`/permohonan/${id}/approve`, payload);
      return {
        data: {
          success: true,
          message: 'Destruction request approved successfully',
          data: response.data
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to approve destruction request'
        }
      };
    }
  },

  // Reject destruction request - supports optional verifier metadata when frontend
  // authenticates a verifier locally in a modal (verifierId, verifierName, verifierJabatan)
  rejectDestructionRequest: async (id, reason, verifier = {}) => {
    try {
      const payload = { alasan_penolakan: reason };
      if (verifier.verifierId) payload.verifierId = verifier.verifierId;
      if (verifier.verifierName) payload.verifierName = verifier.verifierName;
      if (verifier.verifierJabatan) payload.verifierJabatan = verifier.verifierJabatan;

      const response = await api.post(`/permohonan/${id}/reject`, payload);
      return {
        data: {
          success: true,
          message: 'Destruction request rejected successfully',
          data: response.data
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to reject destruction request'
        }
      };
    }
  },

  // Get reference data (combined from options endpoints)
  getReferenceData: async () => {
    try {
      // Fetch both jenis and golongan limbah from options endpoints
      const [jenisResponse, golonganResponse] = await Promise.all([
        api.get('/options/jenis-limbah-b3'),
        api.get('/options/golongan-limbah')
      ]);
      
      // Check if we have data from both APIs
      if (jenisResponse.data?.success && golonganResponse.data?.success) {
        return {
          data: {
            success: true,
            data: {
              jenisLimbah: jenisResponse.data.data.map(item => ({
                value: item.nama,
                label: item.nama,
                id: item.type_id,
                kode_limbah: item.kode_limbah,
                jenis_limbah: item.jenis_limbah
              })),
              golonganLimbah: golonganResponse.data.data.map(item => ({
                value: item.nama,
                label: item.nama,
                id: item.category_id
              }))
            }
          }
        };
      } else {
        // Fallback to reference data if API returns empty or no data
        return {
          data: {
            success: true,
            data: {
              jenisLimbah: DEFAULT_JENIS_OPTIONS,
              golonganLimbah: DEFAULT_GOLONGAN_OPTIONS
            },
            fallback: true
          }
        };
      }
    } catch (error) {
      // Use fallback data on error
      return {
        data: {
          success: true,
          data: {
            jenisLimbah: DEFAULT_JENIS_OPTIONS,
            golonganLimbah: DEFAULT_GOLONGAN_OPTIONS
          },
          fallback: true,
          message: 'Using offline reference data'
        }
      };
    }
  },

  // Get jenis limbah options
  getJenisLimbah: async () => {
    try {
      const response = await api.get('/options/jenis-limbah-b3');
      
      // Check if we have data from API
      if (response.data?.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
        return {
          data: {
            success: true,
            data: response.data.data.map(item => ({
              value: item.nama,
              label: item.nama,
              id: item.type_id
            }))
          }
        };
      } else {
        // Fallback to reference data if API returns empty or no data
        return {
          data: {
            success: true,
            data: DEFAULT_JENIS_OPTIONS,
            fallback: true
          }
        };
      }
    } catch (error) {
      // Use fallback data on error
      return {
        data: {
          success: true,
          data: DEFAULT_JENIS_OPTIONS,
          fallback: true,
          message: 'Using offline reference data'
        }
      };
    }
  },

  // Get golongan limbah options
  getGolonganLimbah: async () => {
    try {
      const response = await api.get('/options/golongan-limbah');
      
      // Check if we have data from API
      if (response.data?.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
        return {
          data: {
            success: true,
            data: response.data.data.map(item => ({
              value: item.nama,
              label: item.nama,
              id: item.category_id
            }))
          }
        };
      } else {
        // Fallback to reference data if API returns empty or no data
        return {
          data: {
            success: true,
            data: DEFAULT_GOLONGAN_OPTIONS,
            fallback: true
          }
        };
      }
    } catch (error) {
      // Use fallback data on error
      return {
        data: {
          success: true,
          data: DEFAULT_GOLONGAN_OPTIONS,
          fallback: true,
          message: 'Using offline reference data'
        }
      };
    }
  },

  // Get current user profile
  getCurrentProfile: async () => {
    try {
      const response = await api.get('/auth/profile');
      return {
        data: {
          success: true,
          data: response.data
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch user profile'
        }
      };
    }
  },

  // Get delegation options for a user
  getDelegationOptions: async (username, password) => {
    try {
      const loginUrl = 'http://192.168.1.38/api/lms-dev/v1/login';
      const delegationUrl = 'http://192.168.1.38/api/lms-dev/v1/delegation-options';

      // 1) Try to login first to obtain a token and possibly delegation options
      const loginResp = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const loginData = await loginResp.json();

      if (!loginResp.ok) {
        // Login failed - propagate failure
        return {
          data: {
            success: false,
            message: loginData.message || 'Failed to fetch delegation options'
          }
        };
      }

      // If login response already contains delegation options, return them
      const apiDelegationOptions = loginData.delegationOptions || loginData.delegationUsers || loginData.availableDelegations || loginData.delegation_options || [];
      if (apiDelegationOptions.length > 0) {
        return {
          data: {
            success: true,
            delegationOptions: apiDelegationOptions
          }
        };
      }

      // 2) If delegation endpoint requires authenticated request, call it with the token
      const token = loginData.access_token;
      if (token) {
        try {
          const delegationResponse = await fetch(delegationUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username, password })
          });

          if (delegationResponse.ok) {
            const delegationData = await delegationResponse.json();
            return {
              data: {
                success: true,
                delegationOptions: delegationData.delegationOptions || []
              }
            };
          } else {
            // If delegation endpoint explicitly denies access, log and fall through to fallback
            console.warn('Delegation endpoint returned', delegationResponse.status);
          }
        } catch (err) {
          console.warn('Delegation endpoint error:', err);
        }
      }

      // 3) Final fallback: use a hard-coded approver list
      const approverDelegationOptions = [
        { log_NIK: "1526", Nama: "Denny", Jabatan: "Information Technology Manager", Inisial_Name: "1526", emp_DeptID: "NT", emp_JobLevelID: "MGR" },
        { log_NIK: "MYA", Nama: "Mulyana, S.Si", Jabatan: "Warehouse Manager", Inisial_Name: "MYA", emp_DeptID: "WH", emp_JobLevelID: "MGR" },
        { log_NIK: "AHI", Nama: "Alhadi", Jabatan: "Health,Safety & Environment Manager", Inisial_Name: "AHI", emp_DeptID: "KL", emp_JobLevelID: "MGR" },
        { log_NIK: "APJ3", Nama: "Rionaldo Sarano", Jabatan: "APJ", Inisial_Name: "APJ3", emp_DeptID: "QA", emp_JobLevelID: "APJ" },
        { log_NIK: "APJ4", Nama: "Paulina Polyn", Jabatan: "APJ", Inisial_Name: "APJ4", emp_DeptID: "PN1", emp_JobLevelID: "APJ" },
        { log_NIK: "PJKPO", Nama: "Noviandi", Jabatan: "APJ", Inisial_Name: "PJKPO", emp_DeptID: "HC", emp_JobLevelID: "APJ" },
        { log_NIK: "GWN", Nama: "Gunawan", Jabatan: "IT Application Development & Implementation Supervisor", Inisial_Name: "GWN", emp_DeptID: "NT", emp_JobLevelID: "SPV" },
        { log_NIK: "FRI", Nama: "Fani Rahmayanti", Jabatan: "Environmental and Chemical Section Officer", Inisial_Name: "FRI", emp_DeptID: "KL", emp_JobLevelID: "OFC" },
        { log_NIK: "YRA", Nama: "Yudith Raka Aditya", Jabatan: "Emergency Response Section and Health Section Supervisor", Inisial_Name: "YRA", emp_DeptID: "KL", emp_JobLevelID: "SPV" },
        { log_NIK: "TRS", Nama: "Tarsisius Risang Sartondo", Jabatan: "Head of Plant", Inisial_Name: "TRS", emp_DeptID: "PL", emp_JobLevelID: "HEAD" }
      ];

      return {
        data: {
          success: true,
          delegationOptions: approverDelegationOptions
        }
      };
    } catch (error) {
      console.error('Error fetching delegation options:', error);
      return {
        data: {
          success: false,
          message: 'Failed to fetch delegation options'
        }
      };
    }
  },

  // === BERITA ACARA API ENDPOINTS ===

  // Get all Berita Acara with pagination and filtering
  getBeritaAcara: async (params = {}) => {
    try {
      const { page = 1, limit = 8, searchTerm = '', selectedColumn = '', group = null } = params;
      
      // Build query params
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      
      if (selectedColumn) {
        queryParams.append('column', selectedColumn);
      }
      
      if (group) {
        queryParams.append('group', group);
      }

      const response = await api.get(`/berita-acara?${queryParams}`);
      
      // Backend now returns structured response with success, data, and pagination
      if (response.data.success) {
        // Return backend fields as-is, but ensure a stable `id` exists for lists
        // Also derive `currentStepLevel` when possible so the UI can show detailed statuses
        const formattedData = response.data.data.map((item, idx) => {
          // Copy original item
          const out = { ...item, id: item.berita_acara_id || item.id || `ba-${idx}` };

          // Normalize backend snake_case `current_step_level` to frontend `currentStepLevel`
          if (item.current_step_level != null) {
            out.currentStepLevel = item.current_step_level;
          }

          try {
            // Try to determine current signing step level similar to DetailBeritaAcara logic
            let currentStepLevel = null;

            if (item.current_signing_step_id) {
              const matching = (item.SigningWorkflowSteps || []).find(s => s.step_id === item.current_signing_step_id);
              if (matching) {
                // If current step is level 1, treat it as 2 (level 1 is auto-completed)
                currentStepLevel = matching.step_level === 1 ? 2 : matching.step_level;
              }
            }

            if (!currentStepLevel) {
              // Find first pending step >= 2 (since level 1 is auto-completed)
              const pending = (item.SigningWorkflowSteps || []).find(s =>
                (s.status || '').toString().toLowerCase() === 'pending' && (s.step_level || 0) >= 2
              );
              currentStepLevel = pending ? pending.step_level : null;
            }

            // Default fallback if still null: leave as null so getBeritaAcaraStatusDisplayName will use generic mapping
            if (currentStepLevel) {
              out.currentStepLevel = currentStepLevel;
            }
          } catch (e) {
            // ignore and fall back to original data
            console.warn('Failed to derive currentStepLevel for berita acara list item', e);
          }

          return out;
        });

        return {
          data: {
            success: true,
            data: formattedData,
            pagination: response.data.pagination
          }
        };
      } else {
        return {
          data: {
            success: false,
            message: response.data.message || 'Failed to fetch berita acara',
            data: [],
            pagination: { total: 0, page: 1, limit: 8, totalPages: 0 }
          }
        };
      }
    } catch (error) {
      console.error('Error fetching berita acara:', error);
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch berita acara',
          data: [],
          pagination: { total: 0, page: 1, limit: 8, totalPages: 0 }
        }
      };
    }
  },

  // Get single Berita Acara by ID
  getBeritaAcaraById: async (id) => {
    try {
      const response = await api.get(`/berita-acara/${id}`);
      return {
        data: {
          success: true,
          data: response.data
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch berita acara details'
        }
      };
    }
  },

  // Create/Generate new Berita Acara
  createBeritaAcara: async (beritaAcaraData) => {
    try {
      const response = await api.post('/berita-acara/generate', beritaAcaraData);
      return {
        data: {
          success: true,
          message: response.data.message || 'Berita Acara created successfully',
          data: response.data.data
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to create berita acara'
        }
      };
    }
  },

  // Get available requests for daily log generation
  getAvailableRequestsForDailyLog: async (params = {}) => {
    try {
      // params: { bagian (string|array), tanggal, startDate, endDate, group }
      const query = new URLSearchParams();
      
      // Handle bagian as string or array
      if (params.bagian) {
        if (Array.isArray(params.bagian)) {
          params.bagian.forEach(b => query.append('bagian', b));
        } else {
          query.append('bagian', params.bagian);
        }
      }
      
      // Support date range (startDate/endDate) or single date (tanggal) for backward compatibility
      if (params.startDate) query.append('startDate', params.startDate);
      if (params.endDate) query.append('endDate', params.endDate);
      if (params.tanggal) query.append('tanggal', params.tanggal);
      if (params.group) query.append('group', params.group);

      const url = '/berita-acara/available-requests' + (query.toString() ? `?${query.toString()}` : '');
      const response = await api.get(url);
      return {
        data: {
          success: true,
          data: response.data.data || [],
          message: response.data.message
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch available requests for daily log',
          data: []
        }
      };
    }
  },

  // Sign/Approve Berita Acara
  signBeritaAcara: async (id) => {
    try {
      const response = await api.post(`/berita-acara/${id}/approve`);
      return {
        data: {
          success: true,
          message: response.data.message || 'Berita Acara signed successfully',
          data: response.data.data
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to sign berita acara'
        }
      };
    }
  },

  // === CONFIG API ENDPOINTS ===

  // Get permohonan table column definitions
  getPermohonanColumns: async () => {
    try {
      const response = await api.get('/config/permohonan-pemusnahan-limbah-columns');
      return {
        data: {
          success: true,
          data: response.data.data || []
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch permohonan columns',
          data: []
        }
      };
    }
  },

  // Get berita acara table column definitions
  getBeritaAcaraColumns: async () => {
    try {
      const response = await api.get('/config/berita-acara-columns');
      return {
        data: {
          success: true,
          data: response.data.data || []
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch berita acara columns',
          data: []
        }
      };
    }
  },

  // Get status display properties for UI styling
  getStatusDisplayProperties: async () => {
    try {
      const response = await api.get('/config/status-display-properties');
      return {
        data: {
          success: true,
          data: response.data.data || {}
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch status display properties',
          data: {}
        }
      };
    }
  },

  // Get deletable status rules for berita acara
  getBeritaAcaraDeletableStatuses: async () => {
    try {
      const response = await api.get('/config/berita-acara-deletable-statuses');
      return {
        data: {
          success: true,
          data: response.data.data || []
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch deletable statuses',
          data: []
        }
      };
    }
  },

  // === LABEL API ENDPOINTS ===

  // Get label template information
  getLabelTemplate: async () => {
    try {
      const response = await api.get('/labels/template');
      return {
        data: {
          success: true,
          data: response.data.data
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch label template',
          data: {}
        }
      };
    }
  },

  // Get requests eligible for label generation
  getEligibleRequestsForLabels: async (params = {}) => {
    try {
      const { page = 1, limit = 10 } = params;
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const response = await api.get(`/labels/eligible-requests?${queryParams}`);
      
      if (response.data.success) {
        return {
          data: {
            success: true,
            data: response.data.data,
            pagination: response.data.pagination
          }
        };
      } else {
        return {
          data: {
            success: false,
            message: response.data.message || 'Failed to fetch eligible requests',
            data: [],
            pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
          }
        };
      }
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch eligible requests for labels',
          data: [],
          pagination: { total: 0, page: 1, limit: 10, totalPages: 0 }
        }
      };
    }
  },

  // Generate labels for a specific request
  generateLabelsForRequest: async (requestId) => {
    try {
      const response = await api.get(`/labels/${requestId}`);
      return {
        data: {
          success: true,
          data: response.data.data,
          message: response.data.message
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to generate labels',
          data: null
        }
      };
    }
  },

  // Generate 'Permohonan' document (A4) for a specific request
  generatePermohonanForRequest: async (requestId) => {
    try {
      // Expecting a PDF blob from backend
      const response = await api.get(`/document-generation/permohonan/${requestId}`, { responseType: 'arraybuffer' });
      // Return raw ArrayBuffer so callers can construct Blob
      return {
        data: {
          success: true,
          data: response.data,
          message: 'Document generated'
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to generate permohonan document',
          data: null
        }
      };
    }
  },

  // Call server-side print controller which uses Puppeteer to render the printable page and return PDF
  printPermohonanPemusnahan: async ({ requestId, link, createdAt }) => {
    try {
      const params = new URLSearchParams();
      if (link) params.append('link', link);
      if (requestId) params.append('requestId', requestId);
      if (createdAt) params.append('createdAt', createdAt);

  // Note: the backend mounts this route under /api/document-generation
  const url = `/document-generation/print-permohonan-pemusnahan?${params.toString()}`;
      const response = await api.get(url, { responseType: 'arraybuffer' });
      return {
        data: {
          success: true,
          data: response.data,
          message: 'PDF generated by print controller'
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to generate PDF via print controller',
          data: null
        }
      };
    }
  },

  printBeritaAcaraPemusnahan: async ({ beritaAcaraId, link, createdAt }) => {
    try {
      const params = new URLSearchParams();
      if (link) params.append('link', link);
      if (beritaAcaraId) params.append('beritaAcaraId', beritaAcaraId);
      if (createdAt) params.append('createdAt', createdAt);

      // Note: the backend mounts this route under /api/document-generation
      const url = `/document-generation/print-berita-acara-pemusnahan?${params.toString()}`;
      const response = await api.get(url, { responseType: 'arraybuffer' });
      return {
        data: {
          success: true,
          data: response.data,
          message: 'PDF generated by print controller'
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to generate PDF via print controller',
          data: null
        }
      };
    }
  },

  // Fetch formatted data (JSON) for Permohonan document (if backend provides JSON to render client-side)
  getPermohonanDataForDoc: async (requestId) => {
    try {
      const response = await api.get(`/document-generation/permohonan/${requestId}`);
      return {
        data: {
          success: true,
          data: response.data.data,
          message: response.data.message
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch permohonan data',
          data: null
        }
      };
    }
  },

  // Fetch formatted data (JSON) for Berita Acara document
  getBeritaAcaraDataForDoc: async (beritaAcaraId) => {
    try {
      const response = await api.get(`/document-generation/berita-acara/${beritaAcaraId}`);
      return {
        data: {
          success: true,
          data: response.data.data,
          message: response.data.message
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch berita acara data',
          data: null
        }
      };
    }
  },

  // Download Excel file for Permohonan Lampiran Detail Limbah
  downloadPermohonanExcel: async (requestId) => {
    try {
      const response = await api.get(`/document-generation/permohonan/${requestId}/excel`, { 
        responseType: 'arraybuffer' 
      });
      return {
        data: {
          success: true,
          data: response.data,
          message: 'Excel file generated successfully'
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to generate Excel file',
          data: null
        }
      };
    }
  },

  // Download Excel logbook file grouped by jenis limbah
  downloadLogbookExcel: async (startDate, endDate) => {
    try {
      const response = await api.get(`/document-generation/logbook/excel?start_date=${startDate}&end_date=${endDate}`, { 
        responseType: 'arraybuffer' 
      });
      return {
        data: {
          success: true,
          data: response.data,
          message: 'Logbook Excel file generated successfully'
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to generate logbook Excel file',
          data: null
        }
      };
    }
  },

  // Download Excel file with permohonan details by date range
  downloadPermohonanByDateRangeExcel: async (startDate, endDate) => {
    try {
      const response = await api.get(`/document-generation/permohonan/range/excel?start_date=${startDate}&end_date=${endDate}`, { 
        responseType: 'arraybuffer' 
      });
      return response;
    } catch (error) {
      throw error;
    }
  },

  // === WORKFLOW API ENDPOINTS ===

  // Get all approval workflows specific to a request
  getApprovalWorkflows: async (requestId) => {
    try {
      const response = await api.get(`/workflows/approval/${requestId}`);
      return {
        data: {
          success: true,
          data: response.data.data || []
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch approval workflows',
          data: []
        }
      };
    }
  },

  // Fetch external approval list directly from external service (no auth token forwarded)
  // This calls the external URL used by backend for approval list and returns items filtered by Appr_No if provided
  getExternalApprovalList: async (apprNo = null) => {
    try {
      // Use the external host directly as requested
      const externalUrl = import.meta.env.VITE_EXTERNAL_APPROVAL_URL || 'http://192.168.1.38/api/global-dev/v1/custom/list-approval-magang';

      // For this external call we don't want to include the Authorization header added by axios instance
      const externalRes = await axios.get(externalUrl, { headers: { 'Content-Type': 'application/json' } });
      const items = Array.isArray(externalRes.data) ? externalRes.data : externalRes.data?.data || [];

      // If apprNo is provided, filter by Appr_No (loose equality)
      const filtered = apprNo == null ? items : items.filter(i => String(i.Appr_No) === String(apprNo));

      return { data: { success: true, data: filtered } };
    } catch (error) {
      console.warn('External approval list fetch failed:', error.message || error);
      return { data: { success: false, message: error.response?.data?.message || 'Failed to fetch external approval list', data: [] } };
    }
  },

  // Get all signing workflows specific to a request
  getSigningWorkflows: async (requestId) => {
    try {
      const response = await api.get(`/workflows/signing/${requestId}`);
      return {
        data: {
          success: true,
          data: response.data.data || []
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch signing workflows',
          data: []
        }
      };
    }
  },

  // Get current approver for a request (dynamic assignment)
  getCurrentApprover: async (requestId) => {
    try {
      const response = await api.get(`/workflows/current-approver/${requestId}`);
      return {
        data: {
          success: true,
          data: response.data.data || null
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch current approver',
          data: null
        }
      };
    }
  },

  // Get all available approval workflows for selection
  getAllApprovalWorkflows: async () => {
    try {
      const response = await api.get('/workflows/approval-workflows');
      return {
        data: {
          success: true,
          data: response.data.data || []
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch approval workflows',
          data: []
        }
      };
    }
  },

  getApprovalWorkflowByRequest: async (requestId) => {
    try {
      const response = await api.get(`/workflows/approval/${requestId}`);
      return {
        data: {
          success: response.data.success || true,
          data: response.data.data || []
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch approval workflow for request',
          data: []
        }
      };
    }
  },

  getSigningWorkflowByRequest: async (requestId) => {
    try {
      const response = await api.get(`/workflows/signing/${requestId}`);
      return {
        data: {
          success: response.data.success || true,
          data: response.data.data || []
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch approval workflow for request',
          data: []
        }
      };
    }
  },

  // Get all users for workflow management
  getUsers: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams(params);
      const response = await api.get(`/users?${queryParams}`);
      return {
        data: {
          success: true,
          data: response.data.data || []
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch users',
          data: []
        }
      };
    }
  },

  // Get departments for filtering
  getDepartments: async () => {
    try {
      const response = await api.get('/users/departments');
      return {
        data: {
          success: true,
          data: response.data.data || []
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch departments',
          data: []
        }
      };
    }
  },

  // Get job levels for filtering
  getJobLevels: async () => {
    try {
      const response = await api.get('/users/job-levels');
      return {
        data: {
          success: true,
          data: response.data.data || []
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch job levels',
          data: []
        }
      };
    }
  },

  // Get user by NIK
  getUserByNik: async (nik) => {
    try {
      const response = await api.get(`/users/by-nik/${nik}`);
      return {
        data: {
          success: true,
          data: response.data.data || null
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch user',
          data: null
        }
      };
    }
  },

  // === WORKFLOW ADMIN API ENDPOINTS ===

  // Get all workflows for admin management
  getAllWorkflowsAdmin: async () => {
    try {
      const response = await api.get('/workflows/admin/workflows');
      return {
        data: {
          success: true,
          data: response.data.data || { approvalWorkflows: [], signingWorkflows: [] }
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch admin workflows',
          data: { approvalWorkflows: [], signingWorkflows: [] }
        }
      };
    }
  },

  // Get approvers for a specific step
  getApproversForStep: async (stepId) => {
    try {
      const response = await api.get(`/workflows/approval-steps/${stepId}/approvers`);
      return {
        data: {
          success: true,
          data: response.data.data || []
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch approvers',
          data: []
        }
      };
    }
  },

  // Get signers for a specific step
  getSignersForStep: async (stepId) => {
    try {
      const response = await api.get(`/workflows/signing-steps/${stepId}/signers`);
      return {
        data: {
          success: true,
          data: response.data.data || []
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch signers',
          data: []
        }
      };
    }
  },

  // Bulk update approvers for a step
  bulkUpdateApprovers: async (stepId, approvers) => {
    try {
      const response = await api.put(`/workflows/admin/approval-steps/${stepId}/bulk-approvers`, {
        approvers
      });
      return {
        data: {
          success: true,
          data: response.data.data || []
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to update approvers',
          data: []
        }
      };
    }
  },

  // Bulk update signers for a step
  bulkUpdateSigners: async (stepId, signers) => {
    try {
      const response = await api.put(`/workflows/admin/signing-steps/${stepId}/bulk-signers`, {
        signers
      });
      return {
        data: {
          success: true,
          data: response.data.data || []
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to update signers',
          data: []
        }
      };
    }
  },

  // Add single approver to step
  addApproverToStep: async (stepId, approverData) => {
    try {
      const response = await api.post(`/workflows/approval-steps/${stepId}/approvers`, approverData);
      return {
        data: {
          success: true,
          data: response.data.data || null
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to add approver',
          data: null
        }
      };
    }
  },

  // Remove approver from step
  removeApproverFromStep: async (approverConfigId) => {
    try {
      const response = await api.delete(`/workflows/approvers/${approverConfigId}`);
      return {
        data: {
          success: true,
          message: response.data.message || 'Approver removed successfully'
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to remove approver'
        }
      };
    }
  },

  // Add single signer to step
  addSignerToStep: async (stepId, signerData) => {
    try {
      const response = await api.post(`/workflows/signing-steps/${stepId}/signers`, signerData);
      return {
        data: {
          success: true,
          data: response.data.data || null
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to add signer',
          data: null
        }
      };
    }
  },

  // Remove signer from step
  removeSignerFromStep: async (signerConfigId) => {
    try {
      const response = await api.delete(`/workflows/signers/${signerConfigId}`);
      return {
        data: {
          success: true,
          message: response.data.message || 'Signer removed successfully'
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to remove signer'
        }
      };
    }
  },

  // Get user's pending approvals (for managers, HSE, etc.)
  getPendingApprovals: async (params = {}) => {
    try {
      const { page = 1, limit = 8, searchTerm = '', selectedColumn = '', group = null } = params;
      
      // Build query params
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        pendingApproval: 'true'
      });

      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      
      if (selectedColumn) {
        queryParams.append('column', selectedColumn);
      }
      
      if (group) {
        queryParams.append('group', group);
      }

      const response = await api.get(`/permohonan?${queryParams}`);
      if (response.data.success) {
        return {
          data: {
            success: true,
            data: response.data.data.map(item => ({
              id: item.request_id,
              tanggal: item.created_at,
              noPermohonan: item.nomor_permohonan || `DRAFT-${item.request_id}`,
              golongan_limbah_id: item.golongan_limbah_id,
              jenis_limbah_b3_id: item.jenis_limbah_b3_id,
              status: item.status || 'Draft',
              currentStepLevel: item.CurrentStep?.step_level || null,
              requesterName: item.requester_name,
              bagian: item.bagian,
              bentukLimbah: item.bentuk_limbah,
              alasanPenolakan: item.alasan_penolakan
            })),
            pagination: response.data.pagination
          }
        };
      } else {
        return {
          data: {
            success: false,
            message: response.data.message || 'Failed to fetch pending approvals',
            data: []
          }
        };
      }
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.response?.data?.message || 'Failed to fetch pending approvals',
          data: []
        }
      };
    }
  },

  // Get requests processed (approved/rejected) by the current user (not including own created requests)
  getProcessedByUser: async (params = {}) => {
    try {
      const { page = 1, limit = 8, searchTerm = '', selectedColumn = '', group = null } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        processedBy: 'true'
      });

      if (searchTerm) queryParams.append('search', searchTerm);
      if (selectedColumn) queryParams.append('column', selectedColumn);
      if (group) queryParams.append('group', group);

      const response = await api.get(`/permohonan?${queryParams}`);
      if (response.data.success) {
        return {
          data: {
            success: true,
            data: response.data.data.map(item => ({
              id: item.request_id,
              tanggal: item.created_at,
              noPermohonan: item.nomor_permohonan || `DRAFT-${item.request_id}`,
              golongan_limbah_id: item.golongan_limbah_id,
              jenis_limbah_b3_id: item.jenis_limbah_b3_id,
              status: item.status || 'Draft',
              currentStepLevel: item.CurrentStep?.step_level || null,
              requesterName: item.requester_name,
              bagian: item.bagian,
              bentukLimbah: item.bentuk_limbah,
              alasanPenolakan: item.alasan_penolakan
            })),
            pagination: response.data.pagination
          }
        };
      } else {
        return { data: { success: false, message: response.data.message || 'Failed to fetch processed requests', data: [], pagination: { total: 0, page: 1, limit: 8, totalPages: 0 } } };
      }
    } catch (error) {
      console.error('Error fetching processed requests:', error);
      return { data: { success: false, message: error.response?.data?.message || 'Failed to fetch processed requests', data: [], pagination: { total: 0, page: 1, limit: 8, totalPages: 0 } } };
    }
  },

  // Fetch rejected requests (for HSE Manager)
  getRejectedRequests: async (params = {}) => {
    try {
      const { page = 1, limit = 8, searchTerm = '', selectedColumn = '', group = null } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: 'Rejected'
      });

      if (searchTerm) queryParams.append('search', searchTerm);
      if (selectedColumn) queryParams.append('column', selectedColumn);
      if (group) queryParams.append('group', group);

      const response = await api.get(`/permohonan?${queryParams}`);
      if (response.data.success) {
        return {
          data: {
            success: true,
            data: response.data.data.map(item => ({
              id: item.request_id,
              tanggal: item.created_at,
              noPermohonan: item.nomor_permohonan || `DRAFT-${item.request_id}`,
              golongan_limbah_id: item.golongan_limbah_id,
              jenis_limbah_b3_id: item.jenis_limbah_b3_id,
              status: item.status || 'Draft',
              currentStepLevel: item.CurrentStep?.step_level || null,
              requesterName: item.requester_name,
              bagian: item.bagian,
              bentukLimbah: item.bentuk_limbah,
              alasanPenolakan: item.alasan_penolakan
            })),
            pagination: response.data.pagination
          }
        };
      } else {
        return { data: { success: false, message: response.data.message || 'Failed to fetch rejected requests', data: [], pagination: { total: 0, page: 1, limit: 8, totalPages: 0 } } };
      }
    } catch (error) {
      console.error('Error fetching rejected requests:', error);
      return { data: { success: false, message: error.response?.data?.message || 'Failed to fetch rejected requests', data: [], pagination: { total: 0, page: 1, limit: 8, totalPages: 0 } } };
    }
  },

  // Fetch verification requests (for HSE/KL team - requests waiting for verification)
  getVerificationRequests: async (params = {}) => {
    try {
      const { page = 1, limit = 8, searchTerm = '', selectedColumn = '', group = null } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: 'InProgress'  // Get InProgress requests that are awaiting verification (at verification step)
      });

      // Limit to verification step (step level 3) on the backend
      queryParams.append('verificationOnly', 'true');

      if (searchTerm) queryParams.append('search', searchTerm);
      if (selectedColumn) queryParams.append('column', selectedColumn);
      if (group) queryParams.append('group', group);

      const response = await api.get(`/permohonan?${queryParams}`);
      if (response.data.success) {
        return {
          data: {
            success: true,
            data: response.data.data.map(item => ({
              id: item.request_id,
              tanggal: item.created_at,
              noPermohonan: item.nomor_permohonan || `DRAFT-${item.request_id}`,
              golongan_limbah_id: item.golongan_limbah_id,
              jenis_limbah_b3_id: item.jenis_limbah_b3_id,
              status: item.status || 'Draft',
              currentStepLevel: item.CurrentStep?.step_level || null,
              requesterName: item.requester_name,
              bagian: item.bagian,
              bentukLimbah: item.bentuk_limbah
            })),
            pagination: response.data.pagination
          }
        };
      } else {
        return { data: { success: false, message: response.data.message || 'Failed to fetch verification requests', data: [], pagination: { total: 0, page: 1, limit: 8, totalPages: 0 } } };
      }
    } catch (error) {
      console.error('Error fetching verification requests:', error);
      return { data: { success: false, message: error.response?.data?.message || 'Failed to fetch verification requests', data: [], pagination: { total: 0, page: 1, limit: 8, totalPages: 0 } } };
    }
  },

  // Get dashboard statistics
  getDashboardStats: async () => {
    try {
      const response = await api.get('/dashboard/stats');
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return { data: { success: false, message: error.response?.data?.message || 'Failed to fetch dashboard stats', data: { myRequests: 0, pendingApprovals: 0, approved: 0 } } };
    }
  }
};

// Combine dataAPI with axios instance methods for backward compatibility
const combinedAPI = {
  ...dataAPI,
  // Axios instance methods
  get: api.get.bind(api),
  post: api.post.bind(api),
  put: api.put.bind(api),
  delete: api.delete.bind(api),
  patch: api.patch.bind(api),
};

export default combinedAPI;
