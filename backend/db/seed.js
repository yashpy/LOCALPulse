// Creates (or confirms) your admin account directly in Supabase Auth.
require('dotenv').config();
const { supabaseAdmin } = require('./supabase');

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first.');
    process.exit(1);
  }

  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'admin', name: 'Admin' }
  });

  if (error) {
    if (error.message && error.message.toLowerCase().includes('already')) {
      console.log(`Admin already exists: ${email}`);
      return;
    }
    console.error('Failed to create admin:', error.message);
    process.exit(1);
  }

  console.log(`Admin created -> email: ${email}  password: ${password}`);
  console.log(`Supabase user id: ${created.user.id}`);
}

main();
