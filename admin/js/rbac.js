/**
 * rbac.js - Role-Based Access Control and Authentication for Frontend
 * This script runs on every page load to ensure the user is authenticated.
 */

const API_BASE_URL = 'http://127.0.0.1:8787/api'; // Change to production worker URL when deployed

// Function to check if user is authenticated
function requireAuth() {
    const token = localStorage.getItem('agritech_admin_token');
    const isLoginPage = window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('/login');
    
    // If no token and not on login page, redirect to login
    if (!token && !isLoginPage) {
        window.location.href = 'login.html';
        return false;
    }
    
    // If token exists and on login page, redirect to dashboard
    if (token && isLoginPage) {
        window.location.href = 'index.html';
        return false;
    }
    
    return token;
}

// Function to fetch API securely with token
async function fetchSecure(endpoint, options = {}) {
    const token = localStorage.getItem('agritech_admin_token');
    
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
    
    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        // Handle 401 Unauthorized (Token expired or invalid)
        if (response.status === 401) {
            localStorage.removeItem('agritech_admin_token');
            localStorage.removeItem('agritech_admin_user');
            window.location.href = 'login.html';
            return null;
        }

        // Handle 403 Forbidden (RBAC block)
        if (response.status === 403) {
            alert('Access Denied: You do not have permission to perform this action or view this page.');
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('Fetch Error:', error);
        throw error;
    }
}

// Function to check if user has a specific permission
function hasPermission(permissionName) {
    const userStr = localStorage.getItem('agritech_admin_user');
    if (!userStr) return false;
    
    try {
        const user = JSON.parse(userStr);
        // If super admin, allow everything
        if (user.role_name === 'Super Admin') return true;
        
        return user.permissions && user.permissions.includes(permissionName);
    } catch (e) {
        return false;
    }
}

// Global Logout function
function logout() {
    localStorage.removeItem('agritech_admin_token');
    localStorage.removeItem('agritech_admin_user');
    window.location.href = 'login.html';
}

// Run auth check immediately upon loading
document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
});
