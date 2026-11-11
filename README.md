# LifeXP — Personal skill progression tracker

LifeXP is a minimalist RPG-style productivity web app. Every logged activity earns XP for your overall character and the skill you practise. No login or server is needed.

## What is included

- Overall character level + individual skill levels, with increasing XP thresholds
- Dashboard, Skills, Statistics and Settings pages
- 6 starter categories, 15 starter skills and 19 starter activities
- Add, rename and archive skills and activities; create/edit categories
- Duration, training, quantity and completion activity types
- Training entries can also record optional distance and weight/load
- Intensity-based XP, editable activity rewards, customizable global XP scale
- Auto-save activity entries to browser **IndexedDB**, using **Dexie.js**
- Edit or delete history; levels and statistics recalculate from saved records
- Weekly/monthly/90-day XP chart, category totals and recent activity heatmap
- JSON backup export/restore and two-step reset confirmation
- Responsive desktop + mobile layouts, with deployment workflow for GitHub Pages

## Run on your Windows computer

1. Install [Node.js](https://nodejs.org/en/download) (version 22 LTS or newer recommended).
2. Unzip **LifeXP-GitHub-Ready.zip** and open the `LifeXP` folder (the folder that contains `package.json`).
3. In that folder, click the address bar of File Explorer, type `cmd`, press Enter.
4. Type:

   ```bash
   npm install
   npm run dev
   ```
5. Open the **Local** address Vite prints, usually `http://localhost:5173/`.
6. To stop it, press `Ctrl+C` in the terminal. To start again later, only `npm run dev` is needed.

## Publish using GitHub Pages

1. Create a new public repository on GitHub, e.g. `LifeXP` (not inside CineShuffle).
2. Upload **the contents of this `LifeXP` folder** to the repository root, including the hidden `.github/workflows/deploy.yml` file. **Do not upload the ZIP itself** or an extra wrapper folder.
3. In your repository go to **Settings → Pages**. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Open **Actions** and locate **Deploy LifeXP to GitHub Pages**; on `main` it will run after each push. You can also choose **Run workflow**.
5. Wait for the build and deploy jobs to show green checks. Your URL will be `https://YOUR-USERNAME.github.io/REPOSITORY-NAME/`.

**Important:** `vite.config.js` reads the exact repository name (including capital letters) automatically in GitHub Actions, so there is no manual `base` adjustment. You must deploy through the bundled workflow (not "Deploy from a branch").

### Uploading with Git command line

From the project folder, after creating an empty GitHub repository:

```bash
git init -b main
git add .
git commit -m "First LifeXP MVP"
git remote add origin https://github.com/YOUR-USERNAME/LifeXP.git
git push -u origin main
```

Replace `YOUR-USERNAME` and `LifeXP` with the actual account and repository name. Or use [GitHub Desktop](https://desktop.github.com/).

## How saving works

Click **Log activity** → select activity → set time/amount and focus → click **Log activity**. It saves immediately inside IndexedDB in the same browser profile. No files or folder selection are necessary. This is local browser data: GitHub Pages users do not see one another's activity histories.

Your data is *not* synchronised between browsers or devices. Clearing browser site data, private/incognito sessions or losing your device can lose the saved progress. Use **Settings → Export JSON backup** periodically, especially before changing browsers. A restored JSON file **replaces** current data, with confirmation.

## XP formula

Duration XP (standard focus, 1× activity multiplier): 15m→5, 30m→12, 45m→20, 60m→30, 90m→40, 120m→48. Interpolation fills gaps. After 120 min, XP grows slowly to 64 XP at 240 min (maximum recognised per session). Light=0.85×, Standard=1.0×, Focused=1.15×. Each activity can adjust its own multiplier. Quantity-based XP = items × XP/item. Completion XP = configured fixed amount. All kinds are multiplied by the chosen focus modifier. XP rounds to nearest integer.

Every log awards the same XP to **both** overall character and its skill. Levels are computed from log entries: deleting a log recalculates XP and levels. Changing an XP rule affects new logs, but not the historical XP amounts already saved. Editing a log recomputes it using current rules.

## Technology

React + Vite, Dexie / IndexedDB, Dexie React hooks, Recharts and Lucide React. No server, secret keys or personal API tokens. No external font or image requests are needed; the browser uses local/system fonts.

## Tests

```bash
npm test
npm run build
```

Unit tests cover XP time points, interpolation, focus multiplier, quantity/completion rewards, level thresholds and summaries.

## Known limitations of v0.1

- Local data only; no cross-device sync.
- Activity logging is manual (there is no timer).
- An imported JSON backup must be a valid LifeXP v1 file.
- No achievements/quests, PWA offline caching or skill trees yet.
- XP is a motivational measure, not scientific evidence of skill mastery.
