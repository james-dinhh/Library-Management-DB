import bcrypt from 'bcryptjs';
const hash = await bcrypt.hash('chi123', 10);
console.log(hash);