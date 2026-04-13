import { StrictMode, useEffect } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { lairClient } from './lib/lairClient';
import { useUIStore } from './store/uiStore';
import './i18n/i18n';
import './theme/global.css';

let vConsoleInitialized = false;
let readyCall: Promise<void> | null = null;

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

function ensureLairReady(): Promise<void> {
  readyCall ??= Promise.resolve(lairClient.ready())
    .then(() => undefined)
    .catch((error: unknown) => {
      console.error('Failed to initialize Lair mini app client.', error);
    });

  return readyCall;
}

function Bootstrap(): ReactElement {
  useEffect(() => {
    const initData = lairClient.auth.getInitData();
    const { setOffline, setTheme, setToken } = useUIStore.getState();

    if (initData?.token) {
      setToken(initData.token);
    }

    if (initData?.theme === 'light' || initData?.theme === 'dark') {
      setTheme(initData.theme);
    }

    setOffline(!navigator.onLine);
    void enableDevConsole();
    void ensureLairReady();
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
