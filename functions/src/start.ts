import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { v4 as uuidv4 } from "uuid";

export const start = onCall(async (request) => {
  const db = admin.firestore();
  const sessionsCollection = db.collection("sessions");

  try {
    const gameId = uuidv4();
    const now = new Date();
    const expireAt = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    await sessionsCollection.doc(gameId).set({
      createdAt: now,
      expireAt: expireAt,
      status: "pending",
    });

    console.log(`New game session started: ${gameId}`);
    return { gameId };
  } catch (error) {
    console.error("Error starting game session:", error);
    throw new HttpsError("internal", "Could not start game session.");
  }
});
