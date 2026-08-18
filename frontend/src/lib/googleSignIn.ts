/*!
  Shared Google Identity Services loader. The GIS <script> and the
  google.accounts.id.initialize() call happen exactly once per browser
  session — pages swap their credential handler through a module-level
  ref instead of re-initializing (fixes the GSI "initialize() is called
  multiple times" warning when navigating between /login and /register).
*/

"use client";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (r: { credential: string }) => void;
          }): void;
          renderButton(
            parent: HTMLElement,
            options: Record<string, string>
          ): void;
        };
      };
    };
  }
}

let credentialHandler: ((credential: string) => void) | null = null;
let booted: Promise<void> | null = null;

/**
 * Installs `onCredential` as the active Google callback (replacing any
 * previous page's handler) and makes sure GIS is loaded + initialized.
 * Returns a cleanup that detaches the handler on unmount.
 */
export function setupGoogleSignIn(
  clientId: string,
  onCredential: (credential: string) => void
): () => void {
  credentialHandler = onCredential;

  if (!booted) {
    booted = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => {
        window.google?.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => credentialHandler?.(response.credential),
        });
        resolve();
      };
      script.onerror = () => reject(new Error("Could not load Google Sign-In."));
      document.head.appendChild(script);
    }).catch(() => {
      // Allow a later page to retry the load.
      booted = null;
    });
  }

  return () => {
    if (credentialHandler === onCredential) {
      credentialHandler = null;
    }
  };
}

/** Resolves once GIS is ready for renderButton(); never rejects. */
export function whenGoogleReady(): Promise<void> {
  return booted ?? Promise.resolve();
}
