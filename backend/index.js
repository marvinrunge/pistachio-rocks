const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

const app = express();

// Allow cross-origin requests specifically from your game's deployed URL.
// This is a crucial security step for production.
app.use(cors({ origin: 'https://pistachio-899228832025.us-west1.run.app' }));
// For local development, you might temporarily use: app.use(cors({ origin: true }));

// --- Firestore Collection References ---
const sessionsCollection = db.collection('sessions');
const scoresCollection = db.collection('scores');

const LEADERBOARD_SIZE = 20;

/**
 * POST /start
 * Creates a new, short-lived game session ID to prevent score submission spam.
 * The session will automatically be deleted after 8 hours by Firestore's TTL policy.
 */
app.post('/start', async (req, res) => {
    try {
        const gameId = uuidv4();
        const now = new Date();
        const expireAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);

        // We use a timestamp from the server's clock.
        await sessionsCollection.doc(gameId).set({
            createdAt: now,
            expireAt: expireAt, // This field will be used by the TTL policy.
            status: 'pending', // Status can be 'pending' or 'completed'
        });

        console.log(`New game session started: ${gameId}`);
        return res.status(200).json({ gameId });
    } catch (error) {
        console.error("Error starting game session:", error);
        return res.status(500).send("Internal Server Error: Could not start game session.");
    }
});

/**
 * POST /submit
 * Receives game results, validates them, and adds them to the leaderboard.
 */
app.post('/submit', async (req, res) => {
    try {
        const { gameId, name, score, year, month, rocksDestroyed, maxHealth, finalSpeed, acquiredSkills, characterId, version } = req.body;

        // --- Basic Input Validation ---
        if (!gameId || !name || typeof score !== 'number' || !version) {
            return res.status(400).json({ message: "Bad Request: Missing required score data." });
        }

        // --- Session Validation ---
        const sessionRef = sessionsCollection.doc(gameId);
        const sessionDoc = await sessionRef.get();
        
        if (!sessionDoc.exists) {
            console.warn(`Attempt to submit with invalid or expired gameId: ${gameId}`);
            return res.status(404).json({ message: "Game session ID is invalid or has expired."});
        }
        if (sessionDoc.data().status !== 'pending') {
             console.warn(`Attempt to re-use completed gameId: ${gameId}`);
            return res.status(403).json({ message: "This game session has already been used."});
        }

        // --- Anti-Cheat Validation ---
        const totalMonths = year * 12 + month;
        const secondsSurvived = totalMonths * 30;
        // A generous upper bound for scoring potential
        const maxPossibleScore = (rocksDestroyed * 50) + (secondsSurvived * 15) + 5000;
        
        if (score > maxPossibleScore * 1.1) {
            console.error(`Score rejected by anti-cheat. Submitted: ${score}, Calculated Max: ${maxPossibleScore}`);
            await sessionRef.update({ status: 'completed' });
            return res.status(403).json({ message: "Score is not valid."});
        }

        // --- Save the Score ---
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
        
        // Mark session as used
        await sessionRef.update({ status: 'completed' });

        // Calculate the user's rank within their game version
        const higherScoresSnapshot = await scoresCollection
            .where('version', '==', version)
            .where('score', '>', score)
            .count()
            .get();
        const rank = higherScoresSnapshot.data().count + 1;
        
        console.log(`Score submitted successfully for ${name} (v${version}): ${score}. Rank: ${rank}`);
        return res.status(200).json({ success: true, rank, userScore: newScoreEntry });

    } catch (error) {
        console.error("Error submitting score:", error);
        return res.status(500).json({ message: "Internal Server Error: Could not submit score."});
    }
});


/**
 * GET /scores
 * Fetches the top scores for the leaderboard.
 * Supports filtering by `version` query parameter.
 */
app.get('/scores', async (req, res) => {
    try {
        const { version } = req.query;
        let query = scoresCollection;
        let queryVersion = version;

        if (!queryVersion) {
            // Find the version of the most recently submitted score to show as default
            const latestScoreSnapshot = await scoresCollection
                .orderBy('createdAt', 'desc')
                .limit(1)
                .get();

            if (!latestScoreSnapshot.empty) {
                queryVersion = latestScoreSnapshot.docs[0].data().version;
            } else {
                // If there are no scores at all, return empty.
                return res.status(200).json([]);
            }
        }
        
        // If we have a version (either from query or fallback), filter by it.
        // This requires a composite index on (version, score).
        // See backend/INSTRUCTIONS.md for how to create this in your Firestore database.
        if (queryVersion) {
            query = query.where('version', '==', queryVersion);
        }

        const snapshot = await query
            .orderBy('score', 'desc')
            .limit(LEADERBOARD_SIZE)
            .get();

        if (snapshot.empty) {
            return res.status(200).json([]);
        }

        const highScores = snapshot.docs.map(doc => doc.data());
        return res.status(200).json(highScores);
    } catch (error) {
        console.error("Error fetching scores:", error);
        return res.status(500).send("Internal Server Error: Could not fetch scores.");
    }
});

// Expose Express API as a single Cloud Function
exports.api = functions.https.onRequest(app);