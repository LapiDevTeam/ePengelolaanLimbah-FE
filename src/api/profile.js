import { API_URL } from "../config/url";

// API functions for user profile
const API_BASE_URL = API_URL; // Use same base URL as main API

export const profileAPI = {
  // Get current user profile
  getCurrentProfile: async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Profile fetch error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch profile' 
      };
    }
  }
};
