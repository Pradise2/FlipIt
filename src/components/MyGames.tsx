import { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  getGameIdCounter,
  getGameDetails,
  cancelGame,
  claimRewards,
} from "../utils/contractFunction";

// Define GameDetails interface for better type safety
interface GameDetails {
  gameId: number;
  betAmount: string;
  tokenSymbol: string;
  isCompleted: boolean;
  player1: string;
  player2?: string;
}

const MyGamesSection = () => {
  const [createdGames, setCreatedGames] = useState<GameDetails[]>([]);
  const [joinedGames, setJoinedGames] = useState<GameDetails[]>([]);
  const [currentUserAddress, setCurrentUserAddress] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch user's address and their games
  const fetchUserAddressAndGames = async () => {
    try {
      setIsLoading(true); // Start loading
      setErrorMessage(null); // Clear previous errors

      if (!window.ethereum) {
        setErrorMessage("MetaMask is not detected. Please install MetaMask.");
        return;
      }

      const provider = new ethers.BrowserProvider(
        window.ethereum as unknown as ethers.Eip1193Provider
      );
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setCurrentUserAddress(address);

      const totalGames = await getGameIdCounter();
      const createdGamesList: GameDetails[] = [];
      const joinedGamesList: GameDetails[] = [];

      for (let gameId = 1; gameId <= totalGames; gameId++) {
        const gameDetails = await getGameDetails(gameId);

        if (gameDetails.player1.toLowerCase() === address.toLowerCase()) {
          createdGamesList.push({ ...gameDetails, gameId });
        } else if (
          gameDetails.player2 &&
          gameDetails.player2.toLowerCase() === address.toLowerCase()
        ) {
          joinedGamesList.push({ ...gameDetails, gameId });
        }
      }

      setCreatedGames(createdGamesList);
      setJoinedGames(joinedGamesList);
    } catch (error) {
      console.error("Error fetching user games:", error);
      setErrorMessage("Failed to load your games. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAddressAndGames();
  }, []);

  // Handle game cancellation
  const handleCancelGame = async (gameId: number) => {
    try {
      await cancelGame(gameId);
      alert(`Game ${gameId} canceled successfully.`);
      await fetchUserAddressAndGames(); // Refresh games without full reload
    } catch (error) {
      console.error("Error canceling game:", error);
      alert("Failed to cancel the game. Please try again.");
    }
  };

  // Handle reward claiming
  const handleClaimReward = async (gameId: number) => {
    try {
      await claimRewards(gameId);
      alert(`Reward for game ${gameId} claimed successfully.`);
      await fetchUserAddressAndGames(); // Refresh games without full reload
    } catch (error) {
      console.error("Error claiming reward:", error);
      alert("Failed to claim the reward. Please try again.");
    }
  };

  return (
    <div className="p-6 bg-slate-800 text-white rounded-lg shadow-lg mt-6 mx-4">
      <h2 className="text-2xl font-bold mb-4 text-center">My Games</h2>

      {errorMessage && (
        <p className="text-red-500 text-center mb-4">{errorMessage}</p>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          <p className="ml-4 text-white">Loading your games...</p>
        </div>
      ) : (
        <>
          <p className="text-center mb-6 text-sm text-gray-400">
            Your Address: {currentUserAddress}
          </p>

          {/* Created Games Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-2">Created Games</h3>
            {createdGames.length === 0 ? (
              <p>No games created.</p>
            ) : (
              createdGames.map((game) => (
                <div key={game.gameId} className={gameCardClasses}>
                  <p>Game ID: {game.gameId}</p>
                  <p>
                    Bet Amount: {game.betAmount} {game.tokenSymbol}
                  </p>
                  <p>Is Completed: {game.isCompleted ? "Yes" : "No"}</p>
                  {!game.isCompleted && (
                    <button
                      onClick={() => handleCancelGame(game.gameId)}
                      className={cancelButtonClasses}
                    >
                      Withdraw (Cancel Game)
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Joined Games Section */}
          <div>
            <h3 className="text-xl font-semibold mb-2">Joined Games</h3>
            {joinedGames.length === 0 ? (
              <p>No games joined.</p>
            ) : (
              joinedGames.map((game) => (
                <div key={game.gameId} className={gameCardClasses}>
                  <p>Game ID: {game.gameId}</p>
                  <p>
                    Bet Amount: {game.betAmount} {game.tokenSymbol}
                  </p>
                  <p>Is Completed: {game.isCompleted ? "Yes" : "No"}</p>
                  {game.isCompleted && (
                    <button
                      onClick={() => handleClaimReward(game.gameId)}
                      className={claimButtonClasses}
                    >
                      Claim Reward
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Tailwind CSS classes for consistent styling
const gameCardClasses =
  "border border-gray-700 p-4 rounded-lg mb-4 bg-slate-900 shadow-md";

const cancelButtonClasses =
  "mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition duration-300";

const claimButtonClasses =
  "mt-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition duration-300";

export default MyGamesSection;
