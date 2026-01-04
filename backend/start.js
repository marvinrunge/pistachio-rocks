const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

const db = admin.firestore();
const sessionsCollection = db.collection('sessions');

module.exports = functions.https.onCall(async (data, context) => {
    try {
        const gameId = uuidv4();
        const now = new Date();
        const expireAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);

        await sessionsCollection.doc(gameId).set({
            createdAt: now,
            expireAt: expireAt,
            status: 'pending',
        });

        console.log(`New game session started: ${gameId}`);
        return { gameId };
    } catch (error) {
        console.error("Error starting game session:", error);
        throw new functions.https.HttpsError('internal', 'Could not start game session.');
    }
});
