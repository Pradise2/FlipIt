import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { base } from "@reown/appkit/networks";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { QueryClient } from "@tanstack/react-query";
import {
  coinbaseWallet,
  injected,
  safe,
  walletConnect,
} from "wagmi/connectors";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { createConfig, http } from "wagmi";
import { createClient } from "viem";

import logo from "../assets/logo.png";

// Define WC_PARAMS
const WC_PARAMS = {
  projectId: import.meta.env.VITE_PROJECT_ID, // Replace with your actual project ID
  chainId: 8453, // Example: Ethereum Mainnet (1)
  rpc: {
    8453: "https://base-mainnet.g.alchemy.com/v2/os5WiDtgiyV3YXhsy2P-Cc0IX5IwFbYy", // Example RPC URL
  },
};

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    farcasterFrame(),
    injected(),
    walletConnect(WC_PARAMS),
    coinbaseWallet({
      appName: "FlipIt",

      appLogoUrl: `https://flip-it-three.vercel.app/${logo}`,
      reloadOnDisconnect: false,
      enableMobileWalletLink: true,
    }),
    safe(),
  ],
  client({ chain }) {
    return createClient({
      chain,
      batch: { multicall: true },
      pollingInterval: 12_000,
      transport: http(chain.rpcUrls.default.http[0]), // Corrected this line
    });
  },
});

export const queryClient = new QueryClient();

// Get projectId from https://cloud.reown.com
export const projectId = import.meta.env.VITE_PROJECT_ID;

if (!projectId) {
  throw new Error("Project ID is not defined");
}

export const metadata = {
  name: "Flip-it",
  description: "A coin flip game",
  url: "https://flip-it-three.vercel.app", // origin must match your domain & subdomain
  icons: ["https://flip-it-three.vercel.app/icon.png"],
  email: "",
};

// for custom networks visit -> https://docs.reown.com/appkit/react/core/custom-networks
export const networks = [base] as [AppKitNetwork, ...AppKitNetwork[]];

//Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
});

export const config = wagmiAdapter.wagmiConfig;