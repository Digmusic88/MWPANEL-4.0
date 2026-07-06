const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function createFamilyUser() {
  const client = new Client({
    host: 'postgres',
    port: 5432,
    database: 'mwpanel',
    user: 'mwpanel',
    password: 'mwpanel123',
  });

  await client.connect();

  try {
    // Check if user already exists
    const userCheck = await client.query('SELECT * FROM users WHERE email = $1', ['familia1@mwpanel.com']);
    if (userCheck.rows.length > 0) {
      console.log('User familia1@mwpanel.com already exists with ID:', userCheck.rows[0].id);
      return;
    }

    // Create user with hashed password
    const hashedPassword = await bcrypt.hash('familia123', 10);
    
    const userResult = await client.query(
      'INSERT INTO users (email, password, role, "firstName", "lastName", "isActive") VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      ['familia1@mwpanel.com', hashedPassword, 'family', 'Familia', 'Test', true]
    );

    console.log('Family user created with ID:', userResult.rows[0].id);

    // Create family record
    await client.query(
      'INSERT INTO families ("primaryContactId", "familyName", "contactEmail", "contactPhone") VALUES ($1, $2, $3, $4)',
      [userResult.rows[0].id, 'Familia Test', 'familia1@mwpanel.com', '123456789']
    );

    console.log('Family record created successfully');

  } catch (error) {
    console.error('Error creating family user:', error);
  } finally {
    await client.end();
  }
}

createFamilyUser().catch(console.error);