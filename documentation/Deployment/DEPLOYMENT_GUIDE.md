# Deployment Guide: AudioBook Organizer

This guide provides step-by-step instructions for deploying the AudioBook Organizer application. The backend is deployed to DigitalOcean's App Platform, and the frontend is deployed to Vercel.

## Important Note on `storage.js`

Due to a tool limitation, one file was not automatically updated. Before you proceed, you must **manually** edit `frontend/js/modules/storage.js`:

1.  **Add the import:** At the top of the file, add this line:
    ```javascript
    import { apiFetch } from './api.js';
    ```

2.  **Replace `fetch` calls:**
    *   In the `saveToDatabase` function, change `fetch` to `apiFetch`.
    *   In the `loadFromDatabase` function, change `fetch` to `apiFetch`.

This is a critical step. The frontend will not be able to communicate with the backend without this change.

---

## Part 1: Backend Deployment (DigitalOcean)

The backend is containerized with Docker and ready to be deployed on DigitalOcean's App Platform.

### Prerequisites

*   A [DigitalOcean](https://www.digitalocean.com/) account.
*   A [GitHub](https://github.com/) account.
*   Your project code pushed to a GitHub repository.

### Deployment Steps

1.  **Log in to DigitalOcean:** Access your DigitalOcean account.
2.  **Navigate to "Apps":** In the left-hand menu, click on "Apps".
3.  **Launch Your App:** Click the "Launch App" or "Create App" button.
4.  **Connect to GitHub:**
    *   Select GitHub as the source for your code.
    *   Authorize DigitalOcean to access your GitHub repositories.
    *   Choose the repository containing your AudioBook project.
5.  **Configure Your App:**
    *   **Branch:** Select the branch you want to deploy (e.g., `main` or `prod1`).
    *   **Autodeploy:** Keep "Autodeploy code changes" enabled.
    *   DigitalOcean will detect the `Dockerfile` and automatically configure the application.
6.  **Review Resources:**
    *   DigitalOcean will suggest a plan. For a small project, the basic plan is usually sufficient.
    *   Click "Next" to proceed.
7.  **Environment Variables:**
    *   This is a critical step for connecting to Supabase.
    *   Add the following environment variables, ensuring they are **encrypted for security**:
        *   `SUPABASE_URL`: Your Supabase project URL.
        *   `SUPABASE_KEY`: Your Supabase `anon` key.
        *   `SUPABASE_JWT_SECRET`: Your Supabase JWT secret.
    *   Click "Next".
8.  **App Info and Finalize:**
    *   Give your app a name (e.g., `audiobook-backend`).
    *   Choose a region closest to your users.
    *   Click "Next".
9.  **Review and Launch:**
    *   Review all the settings.
    *   Click the **"Launch App"** button.
10. **Wait for Deployment:**
    *   DigitalOcean will now build and deploy your application. This may take several minutes.
    *   Once the deployment is complete, you will see a "Deployed successfully" message.
11. **Get Your Backend URL:**
    *   On the app's overview page, you will find the URL for your live application. It will look something like `https://<your-app-name>-<random-string>.ondigitalocean.app`.
    *   **Copy this URL.** You will need it for the frontend deployment.

---

## Part 2: Frontend Deployment (Vercel)

The frontend is a static application, which is perfect for Vercel's fast and reliable hosting.

### Prerequisites

*   A [Vercel](https://vercel.com/) account.
*   Your project code pushed to a GitHub repository (the same one as before).

### Deployment Steps

1.  **Update the Backend URL:**
    *   In your code, open `frontend/js/modules/api.js`.
    *   Replace the placeholder URL `'https://your-backend-url.ondigitalocean.app'` with the actual URL of your deployed DigitalOcean backend.
    *   Commit and push this change to your GitHub repository.
2.  **Log in to Vercel:** Access your Vercel account.
3.  **Create a New Project:**
    *   From your dashboard, click "Add New..." and select "Project".
4.  **Import Your Git Repository:**
    *   Select your GitHub account and choose the repository for your AudioBook project.
    *   Click "Import".
5.  **Configure Your Project:**
    *   Vercel will automatically detect that you have a static site and should not require any build commands.
    *   **Root Directory:** Ensure the root directory is set to `frontend`.
    *   The "Framework Preset" should be "Other".
    *   The "Build and Output Settings" can be left at their defaults.
6.  **Deploy:**
    *   Click the **"Deploy"** button.
7.  **Wait for Deployment:**
    *   Vercel will build and deploy your frontend. This is usually very fast.
8.  **Visit Your Live Site:**
    *   Once the deployment is complete, you can visit your live application at the URL provided by Vercel.

Your AudioBook Organizer should now be fully operational, with the frontend on Vercel communicating with the backend on DigitalOcean. 