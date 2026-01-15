const functions = require('firebase-functions');
const admin = require('firebase-admin');

const db = admin.firestore();
const sessionsCollection = db.collection('sessions');
const scoresCollection = db.collection('scores');

module.exports = functions.https.onCall(async (data, context) => {
    try {
        const { gameId, name, score, year, month, rocksDestroyed, maxHealth, finalSpeed, acquiredSkills, characterId, version } = data;

        if (!gameId || !name || typeof score !== 'number' || !version) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required score data.');
        }

        const sessionRef = sessionsCollection.doc(gameId);
        const sessionDoc = await sessionRef.get();

        if (!sessionDoc.exists) {
            console.warn(`Attempt to submit with invalid or expired gameId: ${gameId}`);
            throw new functions.https.HttpsError('not-found', 'Game session ID is invalid or has expired.');
        }

        if (sessionDoc.data().status !== 'pending') {
            console.warn(`Attempt to re-use completed gameId: ${gameId}`);
            throw new functions.https.HttpsError('failed-precondition', 'This game session has already been used.');
        }

        const totalMonths = year * 12 + month;
        const secondsSurvived = totalMonths * 30;
        const maxPossibleScore = (rocksDestroyed * 50) + (secondsSurvived * 15) + 5000;

        if (score > maxPossibleScore * 1.1) {
            console.error(`Score rejected by anti-cheat. Submitted: ${score}, Calculated Max: ${maxPossibleScore}`);
            await sessionRef.update({ status: 'completed' });
            throw new functions.https.HttpsError('permission-denied', 'Score is not valid.');
        }

        const newScoreEntry = {
            id: Date.now(),
            name: name.substring(0, 12),
            score,
            year,
            month,
            rocksDestroyed,
            maxHealth,
            finalSpeed,
            acquiredSkills: acquiredSkills || [],
            characterId: characterId || 'pistachio',
            version: version,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const newScoreRef = scoresCollection.doc();
        await newScoreRef.set(newScoreEntry);

        await sessionRef.update({ status: 'completed' });

        const higherScoresSnapshot = await scoresCollection
            .where('version', '==', version)
            .where('score', '>', score)
            .count()
            .get();
        const rank = higherScoresSnapshot.data().count + 1;

        console.log(`Score submitted successfully for ${name} (v${version}): ${score}. Rank: ${rank}`);
        return { success: true, rank, userScore: newScoreEntry };

    } catch (error) {
        console.error("Error submitting score:", error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Could not submit score.');
    }
});
