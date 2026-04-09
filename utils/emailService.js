const nodemailer = require('nodemailer');
require('dotenv').config();

// Create Nodemailer Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendOTP = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset OTP",
        html: `
            <div style="font-family: Arial; text-align: center; padding: 20px;">
                <h2>Password Reset Request</h2>
                <p>Your OTP for password reset is:</p>
                <h1 style="color: #4facfe;">${otp}</h1>
                <p>DO NOT share this code with anyone.</p>
            </div>
        `
    };

    return await transporter.sendMail(mailOptions);
};

const sendQuotaAlert = async (quotaUsed, quotaTotal) => {
    const adminEmail = process.env.ADMINEMAIL;
    if (!adminEmail) {
        console.log('⚠️ ADMINEMAIL not set in .env — skipping quota alert.');
        return;
    }

    const percentage = ((quotaUsed / quotaTotal) * 100).toFixed(1);

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: adminEmail,
        subject: `⚠️ GuideMe.AI — API Quota Alert (${percentage}% Used)`,
        html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; border-radius: 16px; border: 1px solid #e5e7eb;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="width: 56px; height: 56px; border-radius: 50%; background: #FEF3C7; display: inline-flex; align-items: center; justify-content: center; font-size: 24px;">
                        ⚠️
                    </div>
                </div>
                <h2 style="text-align: center; color: #1f2937; margin-bottom: 8px;">API Quota Warning</h2>
                <p style="text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 24px;">
                    Your platform's AI generation usage has crossed <strong style="color: #DC2626;">${percentage}%</strong> of the monthly quota.
                </p>
                <div style="background: #f9fafb; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
                    <p style="font-size: 12px; color: #9ca3af; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px;">Usage</p>
                    <p style="font-size: 28px; font-weight: 700; color: #1f2937; margin: 0;">${quotaUsed} / ${quotaTotal}</p>
                    <div style="margin-top: 12px; background: #e5e7eb; border-radius: 999px; height: 8px; overflow: hidden;">
                        <div style="width: ${percentage}%; height: 100%; background: ${percentage >= 90 ? '#DC2626' : '#F59E0B'}; border-radius: 999px;"></div>
                    </div>
                </div>
                <p style="text-align: center; color: #6b7280; font-size: 13px;">
                    Consider upgrading your API plan or limiting student generation quotas to avoid service interruption.
                </p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Quota alert email sent to ${adminEmail}`);
    } catch (err) {
        console.error('❌ Failed to send quota alert email:', err.message);
    }
};

module.exports = { transporter, sendOTP, sendQuotaAlert };
