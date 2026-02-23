import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { dataAPI } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // Changed from boolean to null for loading state
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [error, setError] = useState(null);

  // Function to fetch user profile when only token is available
  const fetchProfileFromToken = useCallback(async (token) => {
    try {
      const result = await dataAPI.getCurrentProfile();
      if (result.data.success) {
        // Determine role based on job title/level
        let userRole = result.data.data.user.role || "Pemohon";

        // Role mapping logic based on job title
        if (result.data.data.user.Jabatan) {
          const jabatan = result.data.data.user.Jabatan.toLowerCase();
          if (jabatan.includes("manager") || jabatan.includes("mgr")) {
            userRole = "Manager";
          } else if (jabatan.includes("hse") || jabatan.includes("safety")) {
            userRole = "HSE";
          } else if (jabatan.includes("apj") || jabatan.includes("assistant plant")) {
            userRole = "APJ";
          } else if (jabatan.includes("head of plant") || jabatan.includes("plant head") || jabatan === "pl") {
            userRole = "PL";
          } else if (jabatan.includes("qa") || jabatan.includes("quality")) {
            userRole = "QA";
          }
        }

        // Check job level ID for additional role mapping
        if (result.data.data.user.emp_JobLevelID) {
          const jobLevel = result.data.data.user.emp_JobLevelID.toLowerCase();
          if (jobLevel === "mgr" || jobLevel === "manager") {
            userRole = "Manager";
          }
        }

        const userData = {
          ...result.data.data.user,
          role: userRole,
          delegatedTo: result.data.data.delegatedTo,
        };

        setUser(userData);
        setIsAuthenticated(true);
        sessionStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("user", JSON.stringify(userData));

        if (result.data.data.delegatedTo) {
          sessionStorage.setItem("delegatedTo", JSON.stringify(result.data.data.delegatedTo));
          localStorage.setItem("delegatedTo", JSON.stringify(result.data.data.delegatedTo));
        }

        return { success: true, data: result.data.data };
      } else {
        setError(result.data.message);
        setIsAuthenticated(false);
        setUser(null);
        return { success: false, error: result.data.message };
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      setError("Failed to fetch user profile");
      setIsAuthenticated(false);
      setUser(null);
      return { success: false, error: "Failed to fetch user profile" };
    }
  }, []);

  // Effect to initialize auth state from sessionStorage and localStorage
  useEffect(() => {
    // Check for token from query parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const authFromQuery = urlParams.get("auth");

    // Priority: query parameter, sessionStorage, localStorage
    let token = authFromQuery || sessionStorage.getItem("access_token") || localStorage.getItem("token");
    let storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");

    // If token comes from query parameter, save it to storage
    if (authFromQuery) {
      sessionStorage.setItem("access_token", authFromQuery);
      localStorage.setItem("token", authFromQuery);
      // Clear query parameter from URL
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete("auth");
      window.history.replaceState({}, "", newUrl.toString());

      // If we have token from query but no user data, fetch user profile
      if (!storedUser && authFromQuery) {
        fetchProfileFromToken(authFromQuery);
        return;
      }
    }

    if (token && storedUser) {
      const userData = JSON.parse(storedUser);
      // Ensure role is set for existing users with role mapping logic
      if (!userData.role) {
        // Determine role based on job title/level if not already set
        let userRole = "Pemohon"; // Default fallback

        // Map job titles to roles
        if (userData.Jabatan) {
          const jabatan = userData.Jabatan.toLowerCase();
          if (jabatan.includes("mgr") || jabatan.includes("manager")) {
            userRole = "Manager";
          } else if (jabatan.includes("hse") || jabatan.includes("safety")) {
            userRole = "HSE";
          } else if (jabatan.includes("apj") || jabatan.includes("assistant plant")) {
            userRole = "APJ";
          } else if (jabatan.includes("head of plant") || jabatan.includes("plant head") || jabatan === "pl") {
            userRole = "PL";
          } else if (jabatan.includes("qa") || jabatan.includes("quality")) {
            userRole = "QA";
          }
        }

        // Also check job level ID for additional role mapping
        if (userData.emp_JobLevelID) {
          const jobLevel = userData.emp_JobLevelID.toLowerCase();
          if (jobLevel === "mgr" || jobLevel === "manager") {
            userRole = "Manager";
          }
        }

        userData.role = userRole;
        sessionStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("user", JSON.stringify(userData));
      }
      setIsAuthenticated(true);
      setUser(userData);
    } else if (token && !storedUser) {
      // We have token but no user data, fetch profile
      fetchProfileFromToken(token);
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }

    // Listen for logout events from API interceptor
    const handleAuthLogout = () => {
      setIsAuthenticated(false);
      setUser(null);
    };

    window.addEventListener("auth:logout", handleAuthLogout);

    return () => {
      window.removeEventListener("auth:logout", handleAuthLogout);
    };
  }, [fetchProfileFromToken]);

  // Initial login to check user credentials and get delegation options
  const checkCredentials = useCallback(async (username, password) => {
    try {
      const response = await fetch("http://192.168.1.38/api/lms-dev/v1/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok) {
        // Check if the response includes delegation options
        const delegationOptions =
          data.delegationOptions || data.delegationUsers || data.availableDelegations || data.delegation_options || [];

        // Return success with user data and delegation info if available
        return {
          success: true,
          data: {
            ...data,
            hasDelegation: delegationOptions.length > 0,
            delegationOptions: delegationOptions,
          },
        };
      } else {
        setError(data.message || "Login failed");
        return { success: false, error: data.message || "Login failed" };
      }
    } catch (err) {
      console.error("Credential check error:", err);
      setError("An error occurred during login. Please check your connection.");
      return { success: false, error: "An error occurred during login. Please check your connection." };
    }
  }, []);

  // Final login with optional delegation
  const login = useCallback(async (username, password, delegatedAs) => {
    try {
      const requestBody = { username, password };
      if (delegatedAs) {
        requestBody.delegatedAs = delegatedAs;
      }

      const response = await fetch("http://192.168.1.38/api/lms-dev/v1/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();

      if (response.ok) {
        // Simpan access token ke sessionStorage (lebih aman untuk session)
        sessionStorage.setItem("access_token", data.access_token);
        // Juga simpan ke localStorage sebagai backup
        localStorage.setItem("token", data.access_token);

        // Store complete user data including delegatedTo info
        // Determine role based on job title/level
        let userRole = data.user.role || "Pemohon"; // Default fallback

        // Map job titles to roles
        if (data.user.Jabatan) {
          const jabatan = data.user.Jabatan.toLowerCase();
          if (jabatan.includes("manager") || jabatan.includes("mgr")) {
            userRole = "Manager";
          } else if (jabatan.includes("hse") || jabatan.includes("safety")) {
            userRole = "HSE";
          } else if (jabatan.includes("apj") || jabatan.includes("assistant plant")) {
            userRole = "APJ";
          } else if (jabatan.includes("head of plant") || jabatan.includes("plant head") || jabatan === "pl") {
            userRole = "PL";
          } else if (jabatan.includes("qa") || jabatan.includes("quality")) {
            userRole = "QA";
          }
        }

        // Also check job level ID for additional role mapping
        if (data.user.emp_JobLevelID) {
          const jobLevel = data.user.emp_JobLevelID.toLowerCase();
          if (jobLevel === "mgr" || jobLevel === "manager") {
            userRole = "Manager";
          }
        }

        const userData = {
          ...data.user,
          role: userRole,
          delegatedTo: data.delegatedTo,
        };

        // Simpan user data ke sessionStorage dan localStorage
        sessionStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("user", JSON.stringify(userData));

        if (data.delegatedTo) {
          sessionStorage.setItem("delegatedTo", JSON.stringify(data.delegatedTo));
          localStorage.setItem("delegatedTo", JSON.stringify(data.delegatedTo));
        }

        setIsAuthenticated(true);
        setUser(userData);
        setError(null);

        console.log("Login successful, access token saved to session");
        return { success: true, data };
      } else {
        setError(data.message || "Login failed");
        return { success: false, error: data.message || "Login failed" };
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An error occurred during login. Please check your connection.");
      return { success: false, error: "An error occurred during login. Please check your connection." };
    }
  }, []);

  // Get delegation options for a user
  const getDelegationOptions = useCallback(async (username, password) => {
    try {
      const result = await dataAPI.getDelegationOptions(username, password);
      if (result.data.success) {
        return { success: true, data: result.data.delegationOptions || [] };
      } else {
        return { success: false, error: result.data.message || "Failed to fetch delegation options" };
      }
    } catch (err) {
      console.error("Delegation options fetch error:", err);
      return { success: false, error: "Failed to fetch delegation options" };
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      return { success: false, error: "No token found" };
    }

    try {
      const result = await dataAPI.getCurrentProfile();
      if (result.data.success) {
        // Determine role based on job title/level
        let userRole = result.data.data.user.role || "Pemohon"; // Default fallback

        // Map job titles to roles
        if (result.data.data.user.Jabatan) {
          const jabatan = result.data.data.user.Jabatan.toLowerCase();
          if (jabatan.includes("manager") || jabatan.includes("mgr")) {
            userRole = "Manager";
          } else if (jabatan.includes("hse") || jabatan.includes("safety")) {
            userRole = "HSE";
          } else if (jabatan.includes("apj") || jabatan.includes("assistant plant")) {
            userRole = "APJ";
          } else if (jabatan.includes("head of plant") || jabatan.includes("plant head") || jabatan === "pl") {
            userRole = "PL";
          } else if (jabatan.includes("qa") || jabatan.includes("quality")) {
            userRole = "QA";
          }
        }

        // Also check job level ID for additional role mapping
        if (result.data.data.user.emp_JobLevelID) {
          const jobLevel = result.data.data.user.emp_JobLevelID.toLowerCase();
          if (jobLevel === "mgr" || jobLevel === "manager") {
            userRole = "Manager";
          }
        }

        const userData = {
          ...result.data.data.user,
          role: userRole,
          delegatedTo: result.data.data.delegatedTo,
        };
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        if (result.data.data.delegatedTo) {
          localStorage.setItem("delegatedTo", JSON.stringify(result.data.data.delegatedTo));
        }
        return { success: true, data: result.data.data };
      } else {
        setError(result.data.message);
        return { success: false, error: result.data.message };
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      setError("Failed to fetch user profile");
      return { success: false, error: "Failed to fetch user profile" };
    }
  }, []);

  const logout = useCallback(() => {
    // Hapus dari sessionStorage dan localStorage
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("delegatedTo");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("delegatedTo");

    setIsAuthenticated(false);
    setUser(null);

    console.log("Logout successful, all session data cleared");
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkAuth = useCallback(() => {
    // Check for token from query parameters first
    const urlParams = new URLSearchParams(window.location.search);
    const authFromQuery = urlParams.get("auth");

    let token = authFromQuery || sessionStorage.getItem("access_token") || localStorage.getItem("token");
    let storedUser = sessionStorage.getItem("user") || localStorage.getItem("user");

    // If token comes from query parameter, save it to storage
    if (authFromQuery) {
      sessionStorage.setItem("access_token", authFromQuery);
      localStorage.setItem("token", authFromQuery);
      // Clear query parameter from URL
      const newUrl = new URL(window.location);
      newUrl.searchParams.delete("auth");
      window.history.replaceState({}, "", newUrl.toString());

      // If we have token from query but no user data, fetch user profile
      if (!storedUser && authFromQuery) {
        fetchProfileFromToken(authFromQuery);
        return;
      }
    }

    if (token && storedUser) {
      const userData = JSON.parse(storedUser);
      if (!userData.role) {
        // Determine role based on job title/level if not already set
        let userRole = "Pemohon"; // Default fallback

        // Map job titles to roles
        if (userData.Jabatan) {
          const jabatan = userData.Jabatan.toLowerCase();
          if (jabatan.includes("manager") || jabatan.includes("mgr")) {
            userRole = "Manager";
          } else if (jabatan.includes("hse") || jabatan.includes("safety")) {
            userRole = "HSE";
          } else if (jabatan.includes("apj") || jabatan.includes("assistant plant")) {
            userRole = "APJ";
          } else if (jabatan.includes("head of plant") || jabatan.includes("plant head") || jabatan === "pl") {
            userRole = "PL";
          } else if (jabatan.includes("qa") || jabatan.includes("quality")) {
            userRole = "QA";
          }
        }

        // Also check job level ID for additional role mapping
        if (userData.emp_JobLevelID) {
          const jobLevel = userData.emp_JobLevelID.toLowerCase();
          if (jobLevel === "mgr" || jobLevel === "manager") {
            userRole = "Manager";
          }
        }

        userData.role = userRole;
        sessionStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("user", JSON.stringify(userData));
      }
      setIsAuthenticated(true);
      setUser(userData);
    } else if (token && !storedUser) {
      // We have token but no user data, fetch profile
      fetchProfileFromToken(token);
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [fetchProfileFromToken]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        error,
        login,
        checkCredentials,
        getDelegationOptions,
        logout,
        clearError,
        fetchProfile,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
