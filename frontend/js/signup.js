document
    .getElementById("signupForm")
    .addEventListener("submit", async (e) => {
        e.preventDefault();

        // Gather Data
        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const schoolCollege = document.getElementById("class").value; // Updated variable name
        const interestedTopic = document.getElementById("interest").value;
        const password = document.getElementById("password").value;

        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;

        // Loading UI
        btn.innerHTML =
            '<i class="fa-solid fa-circle-notch fa-spin"></i> Creating Account...';
        btn.classList.add("opacity-75", "cursor-wait");

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    schoolCollege,
                    interestedTopic,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                // Success UI
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Success!';
                btn.classList.remove("bg-gray-900");
                btn.classList.add("bg-green-600");

                // Redirect to Dashboard
                setTimeout(() => {
                    window.location.href = "/";
                }, 1000);
            } else {
                // ERROR HANDLING (Modal Trigger)
                // Agar email exist karta hai ya koi aur error hai, to ye chalega
                showSignupError(data.error || "Signup Failed");
                resetBtn();
            }
        } catch (error) {
            console.error(error);
            // Network/Server Error handling
            showSignupError(
                "Server Error. Please check your internet connection."
            );
            resetBtn();
        }

        function resetBtn() {
            btn.innerHTML = originalText;
            btn.classList.remove("opacity-75", "cursor-wait", "bg-green-600");
            btn.classList.add("bg-gray-900");
        }
    });

// Show Error Modal Function
function showSignupError(message) {
    const modal = document.getElementById("signupErrorModal");
    const card = document.getElementById("signupErrorCard");
    const msgElement = document.getElementById("signupErrorMessage");

    // Message set karo
    msgElement.innerText = message || "Something went wrong during signup.";

    // Modal dikhao
    modal.classList.remove("hidden");

    // Smooth Animation (Fade In & Zoom)
    requestAnimationFrame(() => {
        modal.classList.remove("opacity-0", "pointer-events-none");
        card.classList.remove("scale-95");
        card.classList.add("scale-100");
    });
}

// Close Error Modal Function
function closeSignupError() {
    const modal = document.getElementById("signupErrorModal");
    const card = document.getElementById("signupErrorCard");

    // Reverse Animation
    modal.classList.add("opacity-0", "pointer-events-none");
    card.classList.remove("scale-100");
    card.classList.add("scale-95");

    // Hide completely after animation ends
    setTimeout(() => {
        modal.classList.add("hidden");
    }, 300);
}
