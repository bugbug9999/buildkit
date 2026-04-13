import { StrictMode, useEffect } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { getPlatformAuth } from './platform';
import { useUIStore } from './store/uiStore';
import './i18n/i18n';
import './theme/global.css';

let vConsoleInitialized = false;

function enableDevConsole(): Promise<void> {
  if (!import.meta.env.DEV || vConsoleInitialized) {
    return Promise.resolve();
  }

  vConsoleInitialized = true;

  return import('vconsole')
    .then(({ default: VConsole }) => {
      new VConsole();
    })
    .catch((error: unknown) => {
      console.error('Failed to enable vConsole for lair-health.', error);
      vConsoleInitialized = false;
    });
}

function readStoredTheme(): 'light' | 'dark' | null {
  try {
    const raw = localStorage.getItem('lair-health:theme');
    if (raw === null) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    return parsed === 'light' || parsed === 'dark' ? parsed : null;
  } catch {
    return null;
  }
}

function Bootstrap(): ReactElement {
  useEffect(() => {
    const { setOffline, setTheme, setToken } = useUIStore.getState();
    const theme = readStoredTheme();

    setOffline(!navigator.onLine);
    if (theme) {
      setTheme(theme);
    }
    void enableDevConsole();
    void getPlatformAuth()
      .then(async (auth) => {
        await auth.initialize();

        const session = auth.getSession();
        if (session?.token) {
          setToken(session.token);
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to initialize platform auth.', error);
      });
  }, []);

  return <App />;
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
);
