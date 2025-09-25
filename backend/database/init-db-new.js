const bcrypt = require('bcryptjs');
const database = require('./db-new');

// Initialize database with sample users
async function initializeDatabase() {
    console.log('🔄 Initializing database with sample data...');
    
    try {
        // Wait for database connection
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Hash the default password
        const defaultPassword = 'password123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        // Create sample users
        const sampleUsers = [
            { username: 'admin', email: 'admin@example.com', password: hashedPassword },
            { username: 'testuser', email: 'test@example.com', password: hashedPassword }
        ];

        for (const user of sampleUsers) {
            try {
                const existingUser = await database.checkUserExists(user.username, user.email);
                
                if (!existingUser) {
                    const userId = await database.createUser(user.username, user.email, user.password);
                    console.log(`✅ Sample user created: ${user.username} (ID: ${userId})`);
                    console.log(`   Email: ${user.email}`);
                    console.log(`   Password: ${defaultPassword}`);
                } else {
                    console.log(`ℹ️ User ${user.username} already exists`);
                }
            } catch (error) {
                console.error(`Error creating user ${user.username}:`, error.message);
            }
        }
        
        console.log('✅ Database initialization completed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        process.exit(1);
    }
}

// Run initialization
initializeDatabase();