import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
// FIX: Correct the import path to resolve the module not found error.
import App from './App.tsx';

/**
 * Initializes and renders the React application.
 */
function main() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Fatal Error: Could not find the root element to mount the application to.");
    // Optionally, display a message to the user in the UI
    document.body.innerHTML = '<div style="text-align: center; margin-top: 50px; font-family: sans-serif;"><h1>Application Error</h1><p>Could not start the application. The main container is missing.</p></div>';
    return;
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <Auth0Provider
        domain="pictocat-vib.us.auth0.com"
        clientId="Paj4KYinyLpTmKSUXYzcSZqU9AyATKG3"
        authorizationParams={{
          // FIX: Explicitly set the redirect_uri to the current window origin.
          // This resolves potential mismatches between the browser's URL and the Auth0 dashboard configuration,
          // which can cause "Unable to issue redirect for OAuth 2.0 transaction" errors.
          redirect_uri: window.location.origin,
          audience: `https://pictocat-vib.us.auth0.com/api/v2/`,
          scope: "openid profile email"
        }}
      >
        <App />
      </Auth0Provider>
    </React.StrictMode>
  );
}

// Ensures that the script runs only after the entire DOM is parsed and ready.
// This is a robust way to prevent errors from trying to access DOM elements that haven't been created yet.
if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', main);
} else {
    // DOM is already ready
    main();
}