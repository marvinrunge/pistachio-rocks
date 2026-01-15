const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();
const scoresCollection = db.collection('scores');
const LEADERBOARD_SIZE = 20;

module.exports = functions.https.onCall(async (data, context) => {
    try {
        const { version } = data;
        let query = scoresCollection;
        let queryVersion = version;

        if (!queryVersion) {
            const latestScoreSnapshot = await scoresCollection
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();

            if (!latestScoreSnapshot.empty) {
                queryVersion = latestScoreSnapshot.docs[0].data().version;
            } else {
                return [];
            }
        }

        if (queryVersion) {
            query = query.where('version', '==', queryVersion);
        }

        const snapshot = await query
            .orderBy('score', 'desc')
            .limit(LEADERBOARD_SIZE)
            .get();

        if (snapshot.empty) {
            return [];
        }

        const highScores = snapshot.docs.map(doc => doc.data());
        return highScores;
    } catch (error) {
        console.error("Error fetching scores:", error);
        throw new functions.https.HttpsError('internal', 'Could not fetch scores.');
    }
});
