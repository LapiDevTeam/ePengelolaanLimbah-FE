// Token management utilities
export const TokenManager = {
  // Get token dari session atau localStorage
  getToken: () => {
    return sessionStorage.getItem('access_token') || localStorage.getItem('token');
  },

  // Set token ke session dan localStorage
  setToken: (token) => {
    sessionStorage.setItem('access_token', token);
    localStorage.setItem('token', token); // Backup ke localStorage
  },

  // Clear token dari semua storage
  clearToken: () => {
    sessionStorage.removeItem('access_token');
    localStorage.removeItem('token');
  },

  // Check apakah user sudah login
  isAuthenticated: () => {
    const token = TokenManager.getToken();
    return !!token;
  },

  // Get user data dari session atau localStorage
  getUser: () => {
    const userData = sessionStorage.getItem('user') || localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  },

  // Set user data ke session dan localStorage
  setUser: (userData) => {
    const userString = JSON.stringify(userData);
    sessionStorage.setItem('user', userString);
    localStorage.setItem('user', userString);
  },

  // Clear user data dari semua storage
  clearUser: () => {
    sessionStorage.removeItem('user');
    localStorage.removeItem('user');
  },

  // Clear semua auth data
  clearAll: () => {
    TokenManager.clearToken();
    TokenManager.clearUser();
    sessionStorage.removeItem('delegatedTo');
    localStorage.removeItem('delegatedTo');
  }
};

export default TokenManager;
