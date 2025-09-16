const bcrypt = require('bcrypt');

const password = 'admin123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Error generating hash:', err);
    } else {
        console.log(`Password: ${password}`);
        console.log(`Hash: ${hash}`);
        
        // Verify the hash works
        bcrypt.compare(password, hash, (err, result) => {
            if (err) {
                console.error('Error verifying hash:', err);
            } else {
                console.log(`Verification: ${result ? '✅ SUCCESS' : '❌ FAILED'}`);
            }
        });
    }
});