import React, { useState, useCallback, useEffect } from "react";
import { createGame, publicProvider, fallbackProvider, resolveGame } from "../utils/contractfunction";
import { Check, XCircle } from "lucide-react";
import { SUPPORTED_TOKENS } from "../utils/contract";
import { useAppKitAccount } from "@reown/appkit/react";
import { ethers } from "ethers";
import { gql, useQuery } from '@apollo/client';
import client from '../client/apollo-client';
import ResolvedGames from './Resolved'

export const GET_CREATED_GAMES = gql`
  query GetCreatedGames {
    gameCreateds {
      gameId
      player
      betAmount
      tokenAddress
      playerChoice
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

export const GET_RESOLVED = gql`
  query GetResolved{
    gameResolveds{
      gameId
      player
      playerWon
      payout
    }
  }
`;

export const GET_ALERT = gql`
  query GetResolved{
    gameResolveds{
      gameId
      player
      playerWon
      payout
    }
  }
`;


interface Game {
  gameId: string;
  player: string;
  playerWon?: boolean;
  payout?: number;
  betAmount?: number;
  tokenAddress?: string;
  playerChoice?: boolean;
}

interface GameState {
  tokenAddress: string;
  betAmount: string;
  player1Choice: boolean;
  status: string | null;
  isLoading: boolean;
  error: string | null;
  tokenBalance: string;
  tokenSymbol: string;
}

interface Resolved {
  gameId: string;
  player: string;
  playerWon: string;
  payout: string;
}

const CreateGameVsComp: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    tokenAddress: SUPPORTED_TOKENS.STABLEAI,
    betAmount: "",
    player1Choice: true,
    status: null,
    isLoading: false,
    error: null,
    tokenBalance: "0",
    tokenSymbol: "STABLEAI",
  });

  const { address, isConnected } = useAppKitAccount();

  // State for Alert
  const [alert, setAlert] = useState<{
    show: boolean;
    gameId: string;
    playerWon: boolean;
    payout: string;
  }>({
    show: false,
    gameId: "",
    playerWon: false,
    payout: "",
  });

  // Fetch created games
  const { data: createdGamesData, loading: loadingCreatedGames, error: errorCreatedGames } = useQuery<{
    gameCreateds: Game[];
  }>(GET_CREATED_GAMES, {
    client,
  });

  const { data: resolvedData, loading: loadingResolved } = useQuery<{
    gameResolveds: Resolved[];
  }>(GET_RESOLVED, {
    variables: { playerAddress: address },
    skip: !address,
  });

  // Fetch token balance
  const fetchTokenBalance = useCallback(async () => {
    if (!address || !gameState.tokenAddress || !isConnected) return;

    const tokenAbi = [
      "function balanceOf(address owner) view returns (uint256)",
      "function symbol() view returns (string)",
    ];

    try {
      const tokenContract = new ethers.Contract(gameState.tokenAddress, tokenAbi, publicProvider);
      const [balance, symbol] = await Promise.all([
        tokenContract.balanceOf(address),
        tokenContract.symbol(),
      ]);

      setGameState((prevState) => ({
        ...prevState,
        tokenBalance: ethers.formatUnits(balance, 18),
        tokenSymbol: symbol,
      }));
    } catch (primaryError) {
      console.warn("Primary provider failed, attempting fallback...", primaryError);

      try {
        const fallbackTokenContract = new ethers.Contract(gameState.tokenAddress, tokenAbi, fallbackProvider);
        const [balance, symbol] = await Promise.all([
          fallbackTokenContract.balanceOf(address),
          fallbackTokenContract.symbol(),
        ]);

        setGameState((prevState) => ({
          ...prevState,
          tokenBalance: ethers.formatUnits(balance, 18),
          tokenSymbol: symbol,
        }));
      } catch (fallbackError) {
        console.error("Both providers failed:", fallbackError);
        setGameState((prevState) => ({
          ...prevState,
          error: "Failed to fetch token details",
        }));
      }
    }
  }, [address, gameState.tokenAddress, isConnected]);

  useEffect(() => {
    fetchTokenBalance();
  }, [fetchTokenBalance]);

  const validateInput = (): string | null => {
    if (!isConnected) return "Please connect your wallet";
    if (!gameState.betAmount || parseFloat(gameState.betAmount) <= 0)
      return "Bet amount must be positive";
    if (parseFloat(gameState.tokenBalance) < parseFloat(gameState.betAmount)) {
      return `Insufficient ${gameState.tokenSymbol} balance`;
    }
    return null;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGameState((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value.replace(/[^0-9.]/g, ""),
    }));
  };

  const handleChoiceToggle = () => {
    setGameState({
      ...gameState,
      player1Choice: !gameState.player1Choice,
    });
  };

  const handleTokenChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const selectedTokenAddress = event.target.value as string;
    const selectedTokenKey = Object.keys(SUPPORTED_TOKENS).find(
      (key) => SUPPORTED_TOKENS[key as keyof typeof SUPPORTED_TOKENS] === selectedTokenAddress
    ) as keyof typeof SUPPORTED_TOKENS;

    setGameState((prevState) => ({
      ...prevState,
      tokenAddress: selectedTokenAddress,
      tokenSymbol: selectedTokenKey || "STABLEAI",
    }));
  };

  const handleCreateGame = async () => {
    const validationError = validateInput();
    if (validationError) {
      setGameState({
        ...gameState,
        error: validationError,
      });
      return;
    }

    try {
      setGameState({
        ...gameState,
        status: null,
        error: null,
        isLoading: true,
      });

      const tokenAddress = gameState.tokenAddress;
      if (!tokenAddress) throw new Error("Selected token is not supported.");

      await createGame(tokenAddress, gameState.betAmount, gameState.player1Choice);

      setGameState({
        ...gameState,
        status: "Game created successfully!",
        isLoading: false,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setGameState({
          ...gameState,
          error: "Error creating game: " + err.message,
          isLoading: false,
        });
      } else {
        console.error("An unknown error occurred:", err);
        setGameState({
          ...gameState,
          error: "Unknown error occurred",
          isLoading: false,
        });
      }
    }
  };

  const handleResolve = async (gameId: string) => {
    try {
      await resolveGame(Number(gameId));
      console.log(`Successfully resolved game ${gameId}`);

      // Simulate delay before showing the alert
      setTimeout(async () => {
        const resolvedGame = resolvedData?.gameResolveds.find(
          (game) => game.gameId === gameId
        );
        if (resolvedGame) {
          setAlert({
            show: true,
            gameId: resolvedGame.gameId,
            playerWon: resolvedGame.playerWon === "true",
            payout: resolvedGame.payout,
          });
        }
      }, 30000); // 5 seconds delay
    } catch (err) {
      console.error("Error resolving game:", err);
      setGameState({
        ...gameState,
        error: "Failed to resolve game: " + err.message,
      });
    }
  };

  // Check if the player has created any games
  const filteredGames = createdGamesData?.gameCreateds.filter((game) => game.player === address);
  const games = filteredGames?.map((game) => game.gameId) || [];

  return (
    <div className="flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-primary text-center mb-6">Create Game</h1>

        {/* Token Selection Dropdown */}
        <div className="mb-4">
          <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">Choose Token</label>
          <select
            id="token"
            className="w-full p-2 border rounded-md bg-white"
            value={gameState.tokenAddress || ""}
            onChange={handleTokenChange}
          >
            {Object.entries(SUPPORTED_TOKENS).map(([tokenName, tokenAddress]) => (
              <option key={tokenName} value={tokenAddress}>
                {tokenName}
              </option>
            ))}
          </select>
        </div>

        {/* Display Token Balance */}
        <div className="mb-4">
          <p className="text-gray-600">
            {gameState.tokenBalance !== "0" ? `Balance: ${gameState.tokenBalance} ${gameState.tokenSymbol}` : "Fetching balance..."}
          </p>
        </div>

        {/* Bet Amount Input */}
        <div className="mb-4">
          <input
            type="text"
            name="betAmount"
            className="w-full p-2 border rounded-md"
            placeholder="Enter bet amount"
            value={gameState.betAmount}
            onChange={handleChange}
          />
        </div>

        {/* Player 1 Choice */}
        <div className="mb-6">
          <button
            className={`w-full p-3 rounded-md ${gameState.player1Choice ? "bg-blue-500 text-white" : "bg-red-500 text-white"}`}
            onClick={handleChoiceToggle}
          >
            {gameState.player1Choice ? (
              <span className="flex items-center">
                <Check className="mr-2" /> Heads (Player 1)
              </span>
            ) : (
              <span className="flex items-center">
                <XCircle className="mr-2" /> Tails (Player 1)
              </span>
            )}
          </button>
        </div>

        {/* Conditionally render Bet or Flip */}
        {games.length > 0 ? (
          // Flip Button for resolving the game
          <button
            className="w-full p-3 bg-red-500 text-white rounded-md"
            onClick={() => handleResolve(games[0])}  // Using the first game to resolve
          >
            Flip
          </button>
        ) : (
          // Bet Button for creating a game
          gameState.isLoading ? (
            <div className="flex justify-center mb-4">
              <div className="spinner-border" role="status">
                <span className="sr-only">Loading...</span>
              </div>
            </div>
          ) : (
            <button
              className="w-full p-3 bg-blue-500 text-white rounded-md"
              onClick={handleCreateGame}
              disabled={gameState.isLoading || !gameState.tokenAddress || !gameState.betAmount}
            >
              Bet
            </button>
          )
        )}

        {/* Status and Error Messages */}
        {gameState.status && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md">
            {gameState.status}
          </div>
        )}

        {gameState.error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
            {gameState.error}
          </div>
        )}
      </div>

      {/* Alert Pop-Up */}
      {alert.show && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-2xl font-semibold text-center">
              Game {alert.gameId} Result
            </h2>
            <p className="text-center mt-4">
              {alert.playerWon ? (
                <span className="text-green-600">You Won! </span>
              ) : (
                <span className="text-red-600">You Lost! </span>
              )}
              <br />
              Payout: {alert.payout}
            </p>
            <button
              onClick={() => setAlert({ ...alert, show: false })}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="w-full pt-4">
        <ResolvedGames />
      </div>
    </div>
  );
};

export default CreateGameVsComp;
