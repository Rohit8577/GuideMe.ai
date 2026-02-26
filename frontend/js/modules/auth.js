// ==============================
// 🟢 MODULE: AUTH & USER
// ==============================

// Yeh variable ab script.js se pass hoga ya shared state se aayega. 
// Lekin filhal hum isko export kar denge taaki doosre modules read kar sakein.
export let currentUser = null;

export async function fetchUserInfo() {
    try {
        const res = await fetch('/api/user');
        if (!res.ok) throw new Error("Unauthorized");
        currentUser = await res.json();

        const avatarEl = document.getElementById('userAvatar');
        if (avatarEl && currentUser.name) {
            avatarEl.innerText = currentUser.name.charAt(0).toUpperCase();
        }
    } catch (err) {
        window.location.href = '/login.html';
    }
}

export function handleLogout() {
    const modal = document.getElementById('logoutModal');
    const card = document.getElementById('logoutModalCard');

    // Show Modal
    modal.classList.remove('hidden');

    // Animation Play (Fade In & Zoom In)
    requestAnimationFrame(() => {
        modal.classList.remove('opacity-0', 'pointer-events-none');
        card.classList.remove('scale-95');
        card.classList.add('scale-100');
    });
}

export function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    const card = document.getElementById('logoutModalCard');

    // Reverse Animation (Fade Out & Zoom Out)
    modal.classList.add('opacity-0', 'pointer-events-none');
    card.classList.remove('scale-100');
    card.classList.add('scale-95');

    // Hide after animation ends
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

export async function confirmLogout() {
    const btn = document.querySelector('button[onclick="confirmLogout()"]');

    // Button Loading State
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Logging out...';
    btn.disabled = true;

    try {
        await fetch('/api/auth/logout');
        // Thoda delay taaki animation smooth lage
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 500);
    } catch (err) {
        console.error("Logout failed", err);
        alert("Logout failed. Please try again.");
        closeLogoutModal();
    }
}

export async function loadUserName() {
    try {
        const res = await fetch('/api/user');

        if (res.ok) {
            const user = await res.json();
            const nameSpan = document.getElementById('userName');

            if (user && user.name) {
                const firstName = user.name.split(' ')[0].toUpperCase();
                nameSpan.innerText = firstName;
            }
        }
    } catch (err) {
        console.error("User name load nahi hua", err);
    }
}
