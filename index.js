const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const simpleGit = require('simple-git');
const { exec } = require('child_process');
const fs = require('fs');
// Configuration
const PORT = process.env.PORT || 3000;
const SECRET = 'tonye';
const REPO_PATH = 'C:\\Users\\tonye\\webhook';
const BRANCH = 'main';  // Branch you want to track

if (!fs.existsSync(REPO_PATH)) {
    console.error(`Le chemin du dépôt local n'existe pas: ${REPO_PATH}`);
  
}
// Initialize express app
const app = express();
app.use(bodyParser.json());

// Middleware to verify GitHub webhook signature
app.post('/webhook', (req, res) => {
    //console.log("webhook req ",req)
    const sig = `sha256=${crypto.createHmac('sha256', SECRET).update(JSON.stringify(req.body)).digest('hex')}`;
    if (req.headers['x-hub-signature-256'] !== sig) {
        return res.status(401).send('Request body was not signed or verification failed');
    }

    const payload = req.body;

    // Verify it's a push to the specific branch
    if (payload.ref === `refs/heads/${BRANCH}`) {
        console.log(`Changes detected in branch ${BRANCH}. Pulling latest code...`);

        // Initialize simple-git
        const git = simpleGit(REPO_PATH);

        // Pull the latest code and build
        git.pull('origin', BRANCH, (err, update) => {
            if (err) {
                console.error('Failed to pull latest code:', err);
                return res.status(500).send('Internal Server Error');
            }

            if (update && update.summary.changes) {
                console.log('Code pulled successfully. Building the project...');

                // Run your build command (adjust as necessary)
                exec('npm install && npm run build', { cwd: REPO_PATH }, (buildErr, stdout, stderr) => {
                    if (buildErr) {
                        console.error('Build failed:', buildErr);
                        console.error(stderr);
                        return res.status(500).send('Internal Server Error');
                    }
                    console.log('Build completed successfully:', stdout);
                    res.status(200).send('Webhook received and processed');
                });
            } else {
                console.log('No changes detected.');
                res.status(200).send('No changes detected');
            }
        });
    } else {
        res.status(200).send('Not a push to the specified branch');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
