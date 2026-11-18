import { connectToDb, closeDb } from './connect.js';

const roleNames = ['customer', 'admin'];

try {
    const db = await connectToDb();
    const roles = db.collection('roles');

    for (const name of roleNames) {
        await roles.updateOne(
            { name },
            { $setOnInsert: { name } },
            { upsert: true }
        );

        console.log(`Role initialized: ${name}`);
    }

    console.log('Authentication roles initialized successfully.');
} catch (error) {
    console.error('Failed to initialize authentication roles:', error);
    process.exitCode = 1;
} finally {
    await closeDb();
}