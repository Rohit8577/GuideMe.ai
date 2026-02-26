// ==============================
// 🟢 MODULE: UI & NAVIGATION
// ==============================

import { loadExploreSuggestions } from './dashboard.js';
import { loadProfile } from './dashboard.js';

export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    sidebar.classList.toggle('sidebar-collapsed');
    if (sidebar.classList.contains('sidebar-collapsed')) {
        mainContent.classList.remove('ml-64');
        mainContent.classList.add('ml-20');
    } else {
        mainContent.classList.add('ml-64');
        mainContent.classList.remove('ml-20');
    }
}

export function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('fade-in');
    });

    const target = document.getElementById(`section-${sectionId}`);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('fade-in');
    }

    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('bg-violet-50', 'text-primary');
        link.classList.add('text-gray-500');
    });

    const activeLink = document.querySelector(`a[onclick*="showSection('${sectionId}')"]`);
    if (activeLink) {
        activeLink.classList.remove('text-gray-500');
        activeLink.classList.add('bg-violet-50', 'text-primary');
    }

    if (sectionId === 'explore') {
        loadExploreSuggestions();
    }

    if (sectionId === 'profile') {
        loadProfile();
    }
}

export function copyCode(btn) {
    const codeBlock = btn.closest('.code-block');
    const code = codeBlock.querySelector('code').innerText;
    navigator.clipboard.writeText(code);
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
    setTimeout(() => btn.innerHTML = originalHtml, 2000);
}

// Notifications toggle
export function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    dropdown.classList.toggle('hidden');
}
