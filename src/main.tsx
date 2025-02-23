import FrameSDK from '@farcaster/frame-sdk';
import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { projectId, metadata, networks, wagmiAdapter } from './config/config';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

function FarcasterFrameProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const init = async () => {
      FrameSDK.actions.ready();
    };

    init();
  }, []);

  return <>{children}</>;
}

// Create a new query client
const queryClient = new QueryClient();

// General config object for AppKit
const generalConfig = {
  projectId,
  metadata,
  networks,
};

// Initialize AppKit modal
createAppKit({
  adapters: [wagmiAdapter],
  ...generalConfig,
});

// Render the app with WagmiProvider and QueryClientProvider
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <FarcasterFrameProvider>
          <App />
        </FarcasterFrameProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
