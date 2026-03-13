document
    .getElementById("loginForm")
    .addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;

        // Loading State
        btn.innerHTML =
            '<i class="fa-solid fa-circle-notch fa-spin"></i> Logging In...';
        btn.classList.add("opacity-70", "cursor-not-allowed");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok) {
                // Success Logic (Green Button & Redirect)
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Success!';
                btn.classList.remove("bg-gray-800");
                btn.classList.add("bg-green-600");

                setTimeout(() => {
                    window.location.href = "/";
                }, 1000);
            } else {
                // ERROR: Alert hata diya, Modal laga diya
                showError(data.error || "Login Failed");
                resetBtn();
            }
        } catch (error) {
            console.error(error);
            // SERVER ERROR: Modal laga diya
            showError("Server Error. Please check your connection.");
            resetBtn();
        }

        function resetBtn() {
            btn.innerHTML = originalText;
            btn.classList.remove(
                "opacity-70",
                "cursor-not-allowed",
                "bg-green-600"
            );
            btn.classList.add("bg-gray-800");
        }
    });

// Show Error Modal
function showError(message) {
    const modal = document.getElementById("errorModal");
    const card = document.getElementById("errorModalCard");
    const msgElement = document.getElementById("errorModalMessage");

    // Message set karo
    msgElement.innerText =
        message || "Something went wrong. Please try again.";

    // Modal Dikhao
    modal.classList.remove("hidden");

    // Animation
    requestAnimationFrame(() => {
        modal.classList.remove("opacity-0", "pointer-events-none");
        card.classList.remove("scale-95");
        card.classList.add("scale-100");
    });
}


function toggleLoginDropdown() {
  document.getElementById("loginDropdown").classList.toggle("hidden");
}

function setRole(role) {
  localStorage.setItem("loginRole", role);
}


// Close Error Modal
function closeErrorModal() {
    const modal = document.getElementById("errorModal");
    const card = document.getElementById("errorModalCard");

    // Reverse Animation
    modal.classList.add("opacity-0", "pointer-events-none");
    card.classList.remove("scale-100");
    card.classList.add("scale-95");

    // Hide completely after animation
    setTimeout(() => {
        modal.classList.add("hidden");
    }, 300);
}

