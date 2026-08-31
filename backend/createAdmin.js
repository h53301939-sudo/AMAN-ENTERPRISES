const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');

dotenv.config({ path: path.join(__dirname, '.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pepsi_done';

// Read CLI arguments: node createAdmin.js <email> <password> <name> <phone>
const args = process.argv.slice(2);
const email = args[0] || 'admin@pepsi.com';
const password = args[1] || 'admin123';
const name = args[2] || 'Rajesh Sharma (Admin)';
const phone = args[3] || '+91 98765 43210';

async function createAdmin() {
  try {
    console.log('Connecting to database:', mongoUri.replace(/:([^:@]+)@/, ':****@'));
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });
    console.log('✅ Connected to MongoDB');

    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user) {
      user.name = name;
      user.password = password; // pre-save hook will hash it
      user.role = 'admin';
      user.active = true;
      user.phone = phone;
      await user.save();
      console.log('\n========================================');
      console.log('🎉 Existing Admin Account Updated!');
      console.log(`👤 Name:     ${user.name}`);
      console.log(`📧 Email:    ${user.email}`);
      console.log(`🔑 Password: ${password}`);
      console.log(`🛡️ Role:     ${user.role}`);
      console.log(`⚡ Status:   Active (Unblocked)`);
      console.log('========================================\n');
    } else {
      user = await User.create({
        name,
        email: email.toLowerCase().trim(),
        password,
        role: 'admin',
        phone,
        active: true
      });
      console.log('\n========================================');
      console.log('🎉 New Admin Account Created Successfully!');
      console.log(`👤 Name:     ${user.name}`);
      console.log(`📧 Email:    ${user.email}`);
      console.log(`🔑 Password: ${password}`);
      console.log(`🛡️ Role:     ${user.role}`);
      console.log(`⚡ Status:   Active`);
      console.log('========================================\n');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating Admin account:', err.message);
    process.exit(1);
  }
}

createAdmin();
