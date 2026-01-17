import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";

admin.initializeApp();

// Set global options for v2 functions
setGlobalOptions({
  region: "europe-west3",
  maxInstances: 10,
});

export { scores } from "./scores";
export { start } from "./start";
export { submit } from "./submit";
