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

module.exports = { transporter, sendOTP };
