# 🚀 Deploying Your Leaderboard Backend

Follow these instructions to deploy the secure leaderboard backend to Google Cloud Functions.

## 1. Prerequisites

- **Google Cloud Account**: You need a GCP account with billing enabled. New users get a generous free tier.
- **Node.js**: Make sure you have Node.js (version 20 or higher) and `npm` installed on your machine.
- **Google Cloud SDK**: Install and initialize the `gcloud` command-line tool. [Installation Guide](https://cloud.google.com/sdk/docs/install).

## 2. Google Cloud Project Setup

1.  **Create a New Project**:
    - Go to the [GCP Console](https://console.cloud.google.com/).
    - Click the project selector dropdown in the top bar and click **"New Project"**.
    - Give it a name like `pistachio-game` and click **"Create"**.

2.  **Enable Required APIs**:
    - Make sure your new project is selected.
    - Go to the [API Library](https://console.cloud.google.com/apis/library).
    - Search for and **Enable** the following APIs one by one:
        - `Cloud Functions API`
        - `Cloud Build API`
        - `Cloud Firestore API`
        - `Identity and Access Management (IAM) API`

3.  **Create a Firestore Database**:
    - In the GCP Console navigation menu (☰), go to **Databases > Firestore**.
    - Click **"Create Database"**.
    - Choose **Native mode** and select a location (e.g., `us-central1`). Click **"Create Database"**.

4.  **Create Firestore Index (Required for Leaderboard)**:
    - The leaderboard query requires a composite index to function correctly.
    - Go to your Firestore database.
    - Click on the **"Indexes"** tab, then select the **"Composite"** sub-tab.
    - Click **"Create Index"**.
    - **Collection ID**: `scores`
    - **Fields to index**:
        - Add Field: `version`, Order: `Ascending`
        - Add Field: `score`, Order: `Descending`
    - **Query Scopes**: Leave as `Collection`.
    - Click **"Create"**. Building the index can take a few minutes. You can proceed with deployment while it builds.

5.  **Configure Firestore TTL (Crucial for Security!)**:
    - Time-to-Live (TTL) will automatically clean up old, unused game sessions.
    - Go to your Firestore database.
    - Click on the **"TTL"** tab.
    - Click **"Create Policy"**.
    - **Collection ID**: `sessions`
    - **Field**: `expireAt`
    - **TTL State**: `Enabled`
    - Click **"Save"**. This ensures that any session document will be automatically deleted after its `expireAt` timestamp, which the backend sets to 8 hours after creation.

## 3. Configure and Deploy the Cloud Function

1.  **Open a Terminal**: Navigate to the `backend` directory of your project.

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **IMPORTANT: Configure CORS**:
    - For security, the backend must be configured to only accept requests from your game's URL.
    - Open `backend/index.js` in your code editor.
    - Find this line:
      ```javascript
      app.use(cors({ origin: 'https://last-pistach.io' }));
      ```
    - **You must change this URL** to match the domain where you are hosting your game. If you use a different domain, the leaderboard will not work.

4.  **Log in to Google Cloud**:
    ```bash
    gcloud auth login
    gcloud config set project [YOUR_PROJECT_ID]
    ```
    Replace `[YOUR_PROJECT_ID]` with the ID of the project you created.

5.  **Deploy the Function**:
    - Run the following command. Replace `[YOUR_CHOSEN_REGION]` with the same region you chose for Firestore (e.g., `us-central1`).
    ```bash
    gcloud functions deploy pistachio-leaderboard-s7w6x0f3 --gen2 --runtime=nodejs20 --region=us-west1 --source=. --entry-point=api --trigger-http --allow-unauthenticated``
    - The deployment might take a few minutes.

## 4. Update the Frontend

1.  **Get the Function URL**:
    - Once deployment is complete, the terminal will output the `url` for your function. It will look something like this:
      `https://pistachio-leaderboard-s7w6x0f3-uc.a.run.app`
    - You can also find this URL in the GCP Console under Cloud Functions.

2.  **Update `constants.ts`**:
    - Copy the URL.
    - In your frontend code, open the file `constants.ts`.
    - Replace the placeholder URL with your new function URL:
      ```typescript
      // Before
      export const LEADERBOARD_API_URL = 'https://pistachio-leaderboard-s7w6x0f3.uc.gateway.dev';

      // After
      export const LEADERBOARD_API_URL = 'YOUR_NEW_FUNCTION_URL'; 
      ```

3.  **Redeploy Frontend**:
    - Commit and push your changes to the `constants.ts` file to trigger the GitHub Action that deploys your frontend.

That's it! Your game now has a secure, global leaderboard.