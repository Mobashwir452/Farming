// js/auth-guard.js
(function () {
    const token = localStorage.getItem('farmer_jwt');
    const path = window.location.pathname;

    // Define pages that do NOT require authentication
    const publicPages = [
        '/login.html',
        '/index.html',
        '/',
        '/signup.html',
        '/onboarding.html'
    ];

    // Check if current path matches any public page
    const isPublicPage = publicPages.some(page => path.endsWith(page)) || path === '/';

    // Exclude Admin pages (they have their own auth logic)
    const isAdminPage = path.includes('/admin/');

    function isTokenExpired(t) {
        try {
            const parts = t.split('.');
            if (parts.length !== 3) return true;
            const payload = JSON.parse(atob(parts[1]));
            if (payload && payload.exp) {
                // Return true if expired (Date.now() is greater than exp timestamp)
                return Date.now() >= payload.exp;
            }
            return false;
        } catch (e) {
            return true;
        }
    }

    if (token) {
        if (isTokenExpired(token)) {
            // Token is dead
            localStorage.removeItem('farmer_jwt');
            if (!isPublicPage && !isAdminPage) {
                window.location.replace('login.html');
            }
        }
    } else if (!isPublicPage && !isAdminPage) {
        // Immediately redirect to login
        window.location.replace('login.html');
    }
})();
