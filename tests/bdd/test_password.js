const bcrypt = require('bcrypt');

const storedHash = '$2a$10$djkkPh68uiL5YTa550yPteZTuTGdA9DPPr1ynWO78ETzSPxyvWFZO';

const testPasswords = ['admin123', 'password123', 'admin', 'password', 'test123', '123456'];

console.log('Testing password hash:', storedHash);
console.log('');

testPasswords.forEach(password => {
    try {
        const isMatch = bcrypt.compareSync(password, storedHash);
        console.log(`Password "${password}": ${isMatch ? '✅ MATCH' : '❌ No match'}`);
    } catch (error) {
        console.log(`Password "${password}": Error - ${error.message}`);
    }
});