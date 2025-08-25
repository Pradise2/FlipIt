
---

# FlipIt 🪙

A decentralized, provably fair coin-flipping game built on the Base blockchain. Experience the thrill of the flip in two exciting modes: classic Player-vs-Player (PVP) battles and an instant Player-vs-Computer (PVC) mode powered by Chainlink VRF.

**Live Demo:** [**https://flip-it-steel.vercel.app/**](https://flip-it-steel.vercel.app/)

<!-- It's highly recommended to replace this with a real screenshot of your app -->

---

## ✨ Features

-   **✌️ Dual Game Modes:**
    -   **PVP Battle:** Create a game with your chosen token and bet amount, or join an existing game to challenge another player.
    -   **VS Computer (PVC):** Place a bet and get an instant, provably fair result from our smart contract using Chainlink VRF for randomness.
-   **💹 Multi-Token Support:** Bet with a variety of supported ERC20 tokens on the Base network.
-   **⛓️ Provably Fair & On-Chain:** All game logic is executed through smart contracts, ensuring transparency and fairness. The PVC mode's randomness is verifiable on-chain.
-   **📊 Game Dashboard:** Track your game history, view overall game stats, and see top players on the leaderboard, powered by The Graph.
-   **social:farcaster: Farcaster Frame Integration:** Share and interact with the game directly within the Farcaster ecosystem.
-   **💳 Modern Wallet Integration:** Connect seamlessly with MetaMask and other wallets via Wagmi and AppKit.

---

## 🛠️ Technology Stack

-   **Frontend:** React, TypeScript, Vite
-   **Styling:** Tailwind CSS
-   **Blockchain Interaction:** Ethers.js, Wagmi, Viem
-   **Smart Contracts:** Solidity
-   **On-chain Data Indexing:** The Graph (GraphQL)
-   **Provable Randomness (PVC):** Chainlink VRF
-   **Wallet Connectivity:** `@reown/appkit`, `@farcaster/frame-wagmi-connector`

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later recommended)
-   [Git](https://git-scm.com/)
-   A Web3 wallet extension in your browser (e.g., MetaMask)

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/Pradise2/FlipIt.git
    ```2.  **Navigate to the project directory:**
    ```sh
    cd FlipIt
    ```
3.  **Install NPM packages:**
    ```sh
    npm install
    ```
4.  **Run the development server:**
    ```sh
    npm run dev
    ```
    The application should now be running on `http://localhost:5173` (or the next available port).

---

## 📖 How It Works

FlipIt operates using two primary on-chain mechanisms to facilitate its game modes.

### Player-vs-Player (PVP)

The PVP mode is governed by a smart contract that acts as an escrow and referee.

1.  **Game Creation:** A player initiates a game by specifying a bet amount, an ERC20 token, and their choice (Heads or Tails). They approve the contract and deposit their tokens.
2.  **Joining a Game:** Another player can view the list of available games. To join, they must approve and deposit the same bet amount.
3.  **Game Resolution:** Once two players are in, either player can trigger the `resolveGame` function, which uses on-chain randomness to determine the winner and transfer the pooled funds.
4.  **Timeouts:** If no one joins a created game within a set timeout period, the original creator can cancel the game and withdraw their funds.

### Player-vs-Computer (PVC)

The PVC mode provides instant, provably fair outcomes using a Chainlink VRF (Verifiable Random Function) subscription.

1.  **Placing a Bet:** A player selects a token, a bet amount, and their choice (Heads or Tails).
2.  **Requesting Randomness:** The `flip` function in the smart contract locks the player's bet and sends a request for a random number to the Chainlink VRF Coordinator.
3.  **Fulfilling the Request:** The Chainlink oracle network generates a random number and delivers it back to our contract in a separate transaction via the `rawFulfillRandomWords` callback function.
4.  **Determining Outcome:** The contract uses the verified random number to determine the coin flip's outcome, calculates if the player won, and transfers the payout accordingly.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📜 License

Distributed under the MIT License.

---

## 📧 Contact

**Pradise2**

**Project Link:** [https://github.com/Pradise2/FlipIt](https://github.com/Pradise2/FlipIt)

