# Pistachio 🌰

Welcome to Pistachio, a fast-paced survival arcade game where you play as a resilient little pistachio nut trying to survive the harsh elements. Can you withstand the changing seasons, chaotic weather, and an endless barrage of rocks?

## 🎮 [Play Pistachio Live!](https://last-pistach.io/) 🎮

[![Pistachio Gameplay Screenshot](https://user-images.githubusercontent.com/1052733/215403014-7e504c3c-8291-4c28-912a-436f937e289f.gif)](https://last-pistach.io/)

---

## 🚀 Easiest Way to Publish to App Stores

The manual process for submitting to the Apple App Store and Google Play is very complex. The easiest way is to use an automated build service.

This project is pre-configured to use **[Codemagic](https://codemagic.io/)**, a service that builds and publishes your app for you in the cloud.

1.  **Sign Up**: Create a free account on [Codemagic](https://codemagic.io/) and connect it to your GitHub account.
2.  **Add App**: Point Codemagic to this repository. It will automatically detect the `codemagic.yaml` file.
3.  **Configure Signing**: Follow their guides to upload your Apple and Android signing credentials into their secure storage. This is the hardest part, but you only have to do it once.
4.  **Start Build**: Click "Start new build" and choose a workflow (e.g., `android-release`).

Codemagic will handle everything else, including uploading the final app file directly to the app stores for you.

---

## 🕹️ Gameplay

### The Goal
Survive for as long as you can! Smash rocks and score points, but be careful—each hit damages your fragile shell. Collect falling water drops to repair your shell and keep going.

### Progression
Every 30 seconds, you advance to a new month. At the end of each month, you get to choose a powerful new skill to aid your survival. Every three months, the season changes, culminating in a dangerous weather event!

### Controls

| Action | Keyboard                  | Touch Screen             |
| :----- | :------------------------ | :----------------------- |
| **Move** | `A / D` or `← / →` keys   | Tap left/right side      |
| **Jump** | `W`, `↑`, or `Space`      | Swipe up                 |

---

## ✨ Features

- **Endless Survival Gameplay:** The challenge ramps up over time with faster elements and tougher conditions. How many years can you survive?
- **Dynamic Seasons & Weather:** Experience Spring, Summer, Autumn, and Winter. Brace yourself for thunderstorms, blizzards, earthquakes, and wind storms that dramatically change the gameplay.
- **RPG-like Skill System:** Level up every month and choose from a pool of permanent and legendary skills to create a unique build with every run.
- **Responsive Controls:** Smooth and intuitive controls for both keyboard and touch devices.
- **Procedural Audio:** All sound effects are generated on-the-fly using the **Web Audio API**, creating a lightweight and dynamic audio experience.
- **Global Leaderboard:** Compete against players worldwide!
- **Cross-Platform**: Ready for Web, iOS, and Android thanks to Capacitor.

---

## 🛠️ Building and Running

### Running the Web Version Locally

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/marvinrunge/Pistachio.git
    ```

2.  **Navigate to the project directory:**
    ```bash
    cd Pistachio
    ```

3.  **Install dependencies:**
    *(You'll need [Node.js](https://nodejs.org/) installed)*
    ```bash
    npm install
    ```

4.  **Start the development server:**
    ```bash
    npm start
    ```
    The game will open in your default browser.

### Building and Running on iOS and Android (Manual Way)

If you prefer not to use an automated service, you can build the apps locally.

**Prerequisites:**
- **iOS:** A Mac with Xcode installed.
- **Android:** Android Studio installed.

**Steps:**

1.  **Build the web app:**
    ```bash
    npm run build
    ```
2.  **Add the native platforms (only need to do this once):**
    ```bash
    npx cap add ios
    npx cap add android
    ```
3.  **Sync your web build with the native projects:**
    ```bash
    npx cap sync
    ```
4.  **Open the native project in its IDE:**
    ```bash
    npx cap open ios
    # OR
    npx cap open android
    ```
5.  From Xcode or Android Studio, you can run the app on a simulator or a physical device.

### Running the Godot Version

The `godot/` folder holds a stand-alone [Godot 4](https://godotengine.org/) rework of the
same game, written in GDScript. It is completely independent from the web build —
nothing in the repository root is needed to run it.

**Prerequisites:** Godot **4.3** or newer (the standard build; no C#/.NET needed).

1.  **Open the project:** start Godot, choose *Import*, and select
    `godot/project.godot`.
2.  **Play:** press <kbd>F5</kbd> (or the ▶ button).

To run it from the command line instead:

```bash
godot --path godot
```

**Exporting:** use *Project → Export…* and add the preset you need (Windows, Linux,
macOS, Android, iOS or Web). Export templates for your Godot version have to be
installed once via *Editor → Manage Export Templates…*.

Differences from the web build:

- Scores are stored **locally** (in Godot's `user://savegame.cfg`) instead of on the
  global leaderboard, so the Godot build runs fully offline.
- Sound effects are synthesised at runtime with Godot's audio server rather than the
  Web Audio API. All gameplay, characters, skills, weather events and achievements
  behave the same.

---

## 💻 Tech Stack

- **Engine:** React with TypeScript
- **Godot Rework:** Godot 4 with GDScript (see `godot/`)
- **Native Wrapper:** Capacitor
- **Styling:** Tailwind CSS
- **Audio:** Web Audio API
- **Backend:** Google Cloud Functions & Firestore (for the leaderboard)

---

## 📄 License

This project is licensed under the MIT License.