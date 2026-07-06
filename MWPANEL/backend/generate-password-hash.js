const bcrypt = require('bcrypt');

async function generatePasswordHash() {
  const password = 'familia123';
  const saltRounds = 10;
  
  try {
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('Password:', password);
    console.log('Generated hash:', hash);
    
    // Verify the hash works
    const isValid = await bcrypt.compare(password, hash);
    console.log('Hash verification:', isValid);
    
  } catch (error) {
    console.error('Error generating hash:', error);
  }
}

generatePasswordHash();