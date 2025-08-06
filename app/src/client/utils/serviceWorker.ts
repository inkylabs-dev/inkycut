// Service Worker Registration and Management for InkyCut
// Handles registration, updates, and communication with the service worker

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

type ServiceWorkerConfig = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
};

export function registerServiceWorker(config?: ServiceWorkerConfig) {
  if ('serviceWorker' in navigator) {
    const publicUrl = new URL(import.meta.env.BASE_URL || '/', window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      // Service worker won't work if BASE_URL is on a different origin
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${import.meta.env.BASE_URL || '/'}sw.js`;

      if (isLocalhost) {
        // This is running on localhost. Check if a service worker exists
        checkValidServiceWorker(swUrl, config);

        navigator.serviceWorker.ready.then(() => {
          // Service worker ready on localhost
        });
      } else {
        // Is not localhost. Just register service worker
        registerValidServiceWorker(swUrl, config);
      }
    });
  }
}

function registerValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older
              // content until all client tabs are closed.

              // Execute callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // At this point, everything has been precached.
              // It's the perfect time to display a
              // "Content is cached for offline use." message.

              // Execute callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('Service Worker - Registration error:', error);
      if (config && config.onError) {
        config.onError(error);
      }
    });
}

function checkValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig) {
  // Check if the service worker can be found. If it can't reload the page.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // Ensure service worker exists, and that we really are getting a JS file.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found. Probably a different app. Reload the page.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found. Proceed as normal.
        registerValidServiceWorker(swUrl, config);
      }
    })
    .catch(() => {
      // No internet connection - service worker will work offline
    });
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
        // Service worker unregistered
      })
      .catch((error) => {
        console.error('Service Worker - Unregistration error:', error.message);
      });
  }
}

// Utility functions for communicating with the service worker

export function sendMessageToServiceWorker(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker.controller) {
      reject(new Error('No service worker controller found'));
      return;
    }

    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };

    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
}

export async function getServiceWorkerVersion(): Promise<string> {
  try {
    const response = await sendMessageToServiceWorker({ type: 'GET_VERSION' });
    return response.version;
  } catch (error) {
    console.error('Error getting service worker version:', error);
    return 'unknown';
  }
}

export async function clearServiceWorkerCache(): Promise<boolean> {
  try {
    const response = await sendMessageToServiceWorker({ type: 'CLEAR_CACHE' });
    return response.success;
  } catch (error) {
    console.error('Error clearing service worker cache:', error);
    return false;
  }
}

// Hook for React components to interact with service worker
export function useServiceWorker() {
  const [isSupported] = useState('serviceWorker' in navigator);
  const [isRegistered, setIsRegistered] = useState(false);
  const [version, setVersion] = useState<string>('unknown');

  useEffect(() => {
    if (isSupported) {
      navigator.serviceWorker.ready.then(() => {
        setIsRegistered(true);
        getServiceWorkerVersion().then(setVersion);
      });
    }
  }, [isSupported]);

  return {
    isSupported,
    isRegistered,
    version,
    clearCache: clearServiceWorkerCache,
    sendMessage: sendMessageToServiceWorker
  };
}

// Import React hooks
import { useState, useEffect } from 'react';