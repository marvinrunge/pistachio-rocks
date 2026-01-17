import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const submit = onCall(async (request) => {
  const { data } = request;
  const db = admin.firestore();
  const sessionsCollection = db.collection("sessions");
  const scoresCollection = db.collection("scores");

  try {
    const {
      gameId,
      name,
      score,
      year,
      month,
      rocksDestroyed,
      maxHealth,
      finalSpeed,
      acquiredSkills,
      characterId,
      version,
    } = data;

    if (!gameId || !name || typeof score !== "number" || !version) {
      throw new HttpsError("invalid-argument", "Missing required score data.");
    }

    const sessionRef = sessionsCollection.doc(gameId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      console.warn(`Attempt to submit with invalid or expired gameId: ${gameId}`);
      throw new HttpsError(
        "not-found",
        "Game session ID is invalid or has expired."
      );
    }

    const sessionData = sessionDoc.data();
    if (sessionData?.status !== "pending") {
      console.warn(`Attempt to re-use completed gameId: ${gameId}`);
      throw new HttpsError(
        "failed-precondition",
        "This game session has already been used."
      );
    }

    const totalMonths = (year || 0) * 12 + (month || 0);
    const secondsSurvived = totalMonths * 30;
    const maxPossibleScore =
            (rocksDestroyed || 0) * 50 + secondsSurvived * 15 + 5000;

    if (score > maxPossibleScore * 1.1) {
      console.error(
        `Score rejected by anti-cheat. Submitted: ${score}, Calculated Max: ${maxPossibleScore}`
      );
      await sessionRef.update({ status: "completed" });
      throw new HttpsError("permission-denied", "Score is not valid.");
    }

    const newScoreEntry = {
      id: Date.now(),
      name: name.substring(0, 12),
      score,
      year: year || 0,
      month: month || 0,
      rocksDestroyed: rocksDestroyed || 0,
      maxHealth: maxHealth || 0,
      finalSpeed: finalSpeed || 0,
      acquiredSkills: acquiredSkills || [],
      characterId: characterId || "pistachio",
      version: version,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const newScoreRef = scoresCollection.doc();
    await newScoreRef.set(newScoreEntry);

    await sessionRef.update({ status: "completed" });

    const higherScoresSnapshot = await scoresCollection
      .where("version", "==", version)
      .where("score", ">", score)
      .count()
      .get();
    const rank = (higherScoresSnapshot.data() as any).count + 1;

    console.log(
      `Score submitted successfully for ${name} (v${version}): ${score}. Rank: ${rank}`
    );
    return { success: true, rank, userScore: newScoreEntry };
  } catch (error) {
    console.error("Error submitting score:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Could not submit score.");
  }
});
