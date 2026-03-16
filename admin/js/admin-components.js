document.addEventListener('DOMContentLoaded', () => {
    loadComponents();
});

async function loadComponents() {
    try {
        // Load Sidebar
        const sidebarContainer = document.getElementById('admin-sidebar-container');
        if (sidebarContainer) {
            const sidebarHtml = await fetch('components/sidebar.html?v=' + new Date().getTime()).then(res => res.text());
            sidebarContainer.innerHTML = sidebarHtml;
            initSidebarBehavior();
        }

        // Load Header
        const headerContainer = document.getElementById('admin-header-container');
        if (headerContainer) {
            const headerHtml = await fetch('components/header.html?v=' + new Date().getTime()).then(res => res.text());
            headerContainer.innerHTML = headerHtml;
            initHeaderBehavior();
        }

    } catch (error) {
        console.error('Error loading admin components:', error);
    }
}

function initSidebarBehavior() {
    // Determine active page
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        if (item.getAttribute('data-page') === currentPath) {
            item.classList.add('active');
            
            // Set header title based on active item
            const headerTitle = document.getElementById('headerTitle');
            if(headerTitle) {
                headerTitle.textContent = item.textContent.trim();
            }
        } else {
            item.classList.remove('active');
        }
    });

    // Mobile overlay click to close
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.addEventListener('click', toggleSidebar);
    }
}

function initHeaderBehavior() {
    const toggleBtn = document.getElementById('sidebarToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleSidebar);
    }
}

function toggleSidebar() {
    const container = document.getElementById('admin-sidebar-container');
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && overlay && container) {
        container.classList.toggle('active');
        sidebar.classList.toggle('show');
        overlay.classList.toggle('show');
    }
}

// Make globally available for inline onclick handlers
window.toggleSidebar = toggleSidebar;
