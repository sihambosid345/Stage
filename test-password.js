import bcrypt from 'bcryptjs';

const passwordHash = '$2b$12$M/RNxtbQLKoGFjZMvYHdM.rYK/RFLyhu7kyRs3koVZWYRyeRXkqaa';
const plainPassword = '123456';

async function testPassword() {
  const isValid = await bcrypt.compare(plainPassword, passwordHash);
  console.log('Password valid:', isValid);
  if (isValid) {
    console.log('✓ Password matches the hash!');
  } else {
    console.log('✗ Password does NOT match the hash');
    
    // Try to hash it and compare
    const newHash = await bcrypt.hash(plainPassword, 12);
    console.log('New hash for comparison:', newHash);
  }
}

testPassword().catch(e => console.error('Error:', e.message));
