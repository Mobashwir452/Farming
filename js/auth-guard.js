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

    if (!token && !isPublicPage && !isAdminPage) {
        // Immediately redirect to login
        window.location.replace('login.html');
    }
})();
