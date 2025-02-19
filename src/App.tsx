import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { createAppKit } from "@reown/appkit/react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { projectId, metadata, networks, wagmiAdapter } from "./config/config";
// import { ApolloProvider } from "@apollo/client";

import HomePage from "./components/HomePage";
import "./App.css";

import Pvc from "./components/PvcSection/Pvc";

const queryClient = new QueryClient();

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

// const PvPSection = () => {
//   return (
//     <ApolloProvider client={client}>
//       <div>
//         <WagmiProvider config={wagmiAdapter.wagmiConfig}>
//           <QueryClientProvider client={queryClient}>
//             <Pvp />
//           </QueryClientProvider>
//         </WagmiProvider>
//       </div>
//     </ApolloProvider>
//   );
// };

export function App() {
  return (
    // <ApolloProvider client={client}>
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            {/* <Route path="/pvp/*" element={<PvPSection />} /> */}
            <Route path="/pvc/*" element={<Pvc />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    </WagmiProvider>
    // </ApolloProvider>
  );
}

export default App;
