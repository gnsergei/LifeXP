import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Actions automatically supplies GITHUB_REPOSITORY (owner/repo).
// The exact case of your GitHub repository name is used in all asset paths.
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.GITHUB_ACTIONS === 'true' && repo ? `/${repo}/` : '/';

export default defineConfig({ plugins: [react()], base });
