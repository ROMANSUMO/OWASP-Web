const bcrypt = require('bcryptjs');
const database = require('./db');

// Initialize database with sample users
async function initializeDatabase() {
    console.log('🔄 Initializing database with sample data...');
    
    try {
        // Hash the default password
        const defaultPassword = 'password123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        // Create sample users
        const sampleUsers = [
            { username: 'admin', email: 'admin@example.com', password: hashedPassword },
            { username: 'testuser', email: 'test@example.com', password: hashedPassword }
        ];

        for (const user of sampleUsers) {
            database.checkUserExists(user.username, user.email, (err, existingUser) => {
                if (err) {
                    console.error('Error checking user existence:', err);
                    return;
                }

                if (!existingUser) {
                    database.createUser(user.username, user.email, user.password, (err, userId) => {
                        if (err) {
                            console.error(`Error creating user ${user.username}:`, err.message);
                        } else {
                            console.log(`✅ Sample user created: ${user.username} (ID: ${userId})`);
                            console.log(`   Email: ${user.email}`);
                            console.log(`   Password: ${defaultPassword}`);
                        }
                    });
                } else {
                    console.log(`ℹ️ User ${user.username} already exists`);
                }
            });
        }
        
        console.log('✅ Database initialization completed');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// Run initialization
initializeDatabase();