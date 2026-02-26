let userEmail = "";
let originalOTP = 0;

// Handle Step 1: Send OTP
document.getElementById("emailForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    userEmail = document.getElementById("email").value;
    const btn = e.target.querySelector("button");
    const originalText = btn.innerHTML;

    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending...';
    btn.disabled = true;

    try {
        const res = await fetch("/api/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userEmail }),
        });
        const data = await res.json();

        if (res.ok) {
            alert("OTP sent to your email!");
            // Hide Email Form, Show Reset Form
            originalOTP = data.otp;
            document.getElementById("emailForm").classList.add("hidden");
            document.getElementById("resetForm").classList.remove("hidden");

        } else {
            alert(data.error);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (err) {
        alert("Server Error");
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});

// Handle Step 2: Reset Password
document.getElementById("resetForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const otp = document.getElementById("otp").value;
    const newPassword = document.getElementById("newPassword").value;
    const btn = e.target.querySelector("button");

    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Resetting...';
    btn.disabled = true;

    if (otp != originalOTP) return alert("Wrong OTP");

    try {
        const res = await fetch("/api/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: userEmail, newPassword }),
        });
        const data = await res.json();

        if (res.ok) {
            alert("Password Reset Successful! Please Login.");
            window.location.href = "login.html";
        } else {
            alert(data.error);
            btn.disabled = false;
            btn.innerHTML = "RESET PASSWORD";
        }
    } catch (err) {
        alert("Server Error");
        btn.disabled = false;
        btn.innerHTML = "RESET PASSWORD";
    }
});
