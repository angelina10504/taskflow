/**
 * One-off password reset utility.
 *
 * Usage:
 *   node resetPassword.js <email> <newPassword>
 *
 * Example:
 *   node resetPassword.js me@example.com NewPass123
 *
 * The new password is set on the user document and re-hashed by the User model's
 * pre('save') bcrypt hook. Delete this file when you're done — it's a maintenance tool.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const [, , emailArg, newPassword] = process.argv;

if (!emailArg || !newPassword) {
  console.error('Usage: node resetPassword.js <email> <newPassword>');
  process.exit(1);
}
if (newPassword.length < 6) {
  console.error('Password must be at least 6 characters.');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const email = emailArg.toLowerCase().trim();

    // password has `select: false`, so request it explicitly
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.error(`No user found with email: ${email}`);
      process.exit(1);
    }

    user.password = newPassword; // marks modified -> pre('save') hook hashes it
    await user.save();

    console.log(`✅ Password reset for ${user.name} <${user.email}>. You can now log in with the new password.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Reset failed:', err.message);
    process.exit(1);
  }
})();
