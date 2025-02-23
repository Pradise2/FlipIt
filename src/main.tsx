import FrameSDK from '@farcaster/frame-sdk';
import { createAppKit } from '@reown/appkit/react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { projectId, metadata, networks, wagmiAdapter } from './config/config';
import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import farcasterFrame from '@farcaster/frame-wagmi-connector'
import { wagmiConfig } from './config/config'
import { connect } from 'wagmi/actions'

function FarcasterFrameProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const init = async () => {
      const context = await FrameSDK.context

      // Autoconnect if running in a frame.
      if (context?.client.clientFid) {
        connect(wagmiConfig, { connector: farcasterFrame() })
      }

      // Hide splash screen after UI renders.
      setTimeout(() => {
        FrameSDK.actions.ready()
      }, 500)
    }
    init()
  }, [])

  return <>{children}</>
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
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <FarcasterFrameProvider>
          <App />
        </FarcasterFrameProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
