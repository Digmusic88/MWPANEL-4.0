const bcrypt = require('bcrypt');

async function generatePasswordHash() {
  const password = 'familia123';
  const saltRounds = 10;
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Password hash para familia123:', hash);
    return hash;
  } catch (error) {
    console.error('Error generating hash:', error);
    return null;
  }
}

generatePasswordHash();