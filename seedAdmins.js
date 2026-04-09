const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./models/user');
require('dotenv').config();

const connectDB = require('./config/db');

async function seedAdmins() {
    await connectDB();

    const admins = [
        { email: 'harsh@admin.com', name: 'Harsh Admin' },
        { email: 'gaurav@admin.com', name: 'Gaurav Admin' }
    ];

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('12345', salt);

    for (let adminInfo of admins) {
        let user = await User.findOne({ email: adminInfo.email });
        if (!user) {
            user = new User({
                name: adminInfo.name,
                email: adminInfo.email,
                password: hashedPassword,
                role: 'admin'
            });
            await user.save();
            console.log(`Created admin: ${adminInfo.email}`);
        } else {
            user.password = hashedPassword;
            user.role = 'admin';
            await user.save();
            console.log(`Updated admin: ${adminInfo.email}`);
        }
    }

    mongoose.connection.close();
    console.log("Done seeding admins.");
}

seedAdmins();
