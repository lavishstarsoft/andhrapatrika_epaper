const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');
let uri = '';
for (const line of lines) {
  if (line.startsWith('MONGODB_URI=')) {
    uri = line.substring('MONGODB_URI='.length).replace(/["']/g, '').trim();
  }
}

if (!uri) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

async function seed() {
  console.log("Connecting to database...");
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('yellowsingam_epaper');
    
    // Check if admin already exists
    const existingAdmin = await db.collection('admins').findOne({
      email: 'admin@andhrapatrika.com'
    });

    const hashedPassword = await bcrypt.hash('admin123', 12);

    if (existingAdmin) {
      console.log("Admin user already exists. Updating password to default 'admin123'...");
      await db.collection('admins').updateOne(
        { email: 'admin@andhrapatrika.com' },
        { $set: { password: hashedPassword, role: 'admin', updatedAt: new Date() } }
      );
      console.log("Admin credentials updated successfully!");
      console.log("Email: admin@andhrapatrika.com");
      console.log("Password: admin123");
      return;
    }

    await db.collection('admins').insertOne({
      name: 'Admin',
      email: 'admin@andhrapatrika.com',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
    });

    console.log("Admin user created successfully!");
    console.log("Email: admin@andhrapatrika.com");
    console.log("Password: admin123");
  } catch (error) {
    console.error("Failed to seed admin:", error);
  } finally {
    await client.close();
  }
}

seed();
