import { useState, useEffect } from "react";
import { useQuery } from "@apollo/client";
import { GET_AVAILABLE_GAMES } from "../client/queries";
import { CircleDollarSign, XCircle, GamepadIcon } from "lucide-react";
import { joinGame,  getGameStatus } from "../../../utils/contractFunction";
import client from "../client/apollo-client"
import { weiToEther } from "../client/other";

interface Available {
  id: string;
  gameId: string;
  player1: string;
  betAmount: string;
  player1Choice: boolean;
  tokenName: string;
  tokenSymbol: string;
}

interface GameStatus {
  state: number;
  createdAt: number;
  timeoutDuration: number;
  timeLeft: number;
}




const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center h-64 gap-8">
    <div className="coin">
      <div className="coin-face coin-front">
        <CircleDollarSign className="w-full h-full text-white/90 p-6" />
      </div>
      <div className="coin-face coin-back">
        <CircleDollarSign className="w-full h-full text-white/90 p-6" />
      </div>
    </div>
    <span className="text-xl font-semibold loading-text">
      Loading available games...
    </span>
  </div>
);

function GameList() {

  const { loading, error, data } = useQuery<{ gameCreateds: Available[] }>(GET_AVAILABLE_GAMES, {
    client,
  });
  

  const [loadingGameId, setLoadingGameId] = useState<number | null>(null);
  const [errorMessage, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const gamesPerPage = 5;

  const [gameStatuses, setGameStatuses] = useState<Record<string, GameStatus>>({});

  useEffect(() => {
    const fetchGameStatuses = async () => {
      const statusMap: Record<string, GameStatus> = {};
      for (const game of data?.gameCreateds || []) {
        try {
          const status = await getGameStatus(Number(game.gameId));
          statusMap[game.gameId] = status;
        } catch (error) {
          console.error("Error fetching status for game:", game.gameId, error);
        }
      }
      setGameStatuses(statusMap);
    };

    if (data?.gameCreateds) {
      fetchGameStatuses();
    }
  }, [data]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div>{error.message}</div>;

  const games = data?.gameCreateds || [];
  const sortedGames = [...games].sort((a, b) => Number(b.gameId) - Number(a.gameId));

  // Filter out games where the time has expired (timeLeft <= 0)
  const filteredGames = sortedGames.filter((game) => {
    const gameStatus = gameStatuses[game.gameId];
    // Keep only games that are available (state === 0) and have time left
    return gameStatus && gameStatus.state === 0 && gameStatus.timeLeft > 0;
  });
  

  const indexOfLastGame = currentPage * gamesPerPage;
  const indexOfFirstGame = indexOfLastGame - gamesPerPage;
  const currentGames = filteredGames.slice(indexOfFirstGame, indexOfLastGame);

  const handleJoinGame = async (gameId: string) => {
    setLoadingGameId(Number(gameId));  // Convert to number before updating the loadingGameId state
    setError(null); 
    try {
      console.log(`Joining game ${gameId}...`);
      await joinGame(Number(gameId));  // Convert the gameId to a number when passing to joinGame
      console.log(`Successfully joined game ${gameId}`);
    } catch (err: any) {
      console.error("Error joining game:", err);
      setError(err instanceof Error ? `Failed to join game: ${err.message}` : "An unknown error occurred while trying to join the game.");
    } finally {
      setLoadingGameId(null); 
    }
  };
  
  function formatTimeLeft(seconds: number): string {
    const hours = Math.floor(seconds / 3600); // 1 hour = 3600 seconds
    const minutes = Math.floor((seconds % 3600) / 60); // 1 minute = 60 seconds
    const remainingSeconds = seconds % 60;
  
    // Format the result as "hr:min:sec"
    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  }
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="pl-6 pr-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Display Error Message */}
        {errorMessage && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
            <p className="flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              {errorMessage}
            </p>
          </div>
        )}

        {/* Table and other UI */}
        {filteredGames?.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 shadow-xl p-8 text-center">
            <GamepadIcon className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Available Games
            </h3>
            <p className="text-white/70">
              There are currently no active games to join. Check back later or
              create a game.
            </p>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-white/10">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Game ID</th>
                    <th className="px-6 py-4 text-sm font-semibold text-white">Required Bet</th>
                   
                    <th className="px-6 py-4 text-sm font-semibold text-white">P1 Choice</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white">Status</th>
                    <th className="px-6 py-4 text-sm font-semibold text-white">Time Left</th>
                    <th className="px-6 py-4  text-sm font-semibold text-white">Action</th>
                   
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                {currentGames.map((game) => {
  const gameStatus = gameStatuses[game.gameId] || null;

  return (
    <tr key={game.id} className="bg-white/10">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{game.gameId}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{weiToEther(game.betAmount)} {game.tokenSymbol}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{game.player1Choice ? "Head" : "Tail"}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
        {gameStatus ? (
          gameStatus.state === 0 ? "Available" :
          gameStatus.state === 1 ? "Active" :
          gameStatus.state === 2 ? "Claim" :
          gameStatus.state === 3 ? "Completed" :
          "Invalid State"
        ) : "Loading..."}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
        {gameStatus ? (
          gameStatus.timeLeft > 0 
            ? formatTimeLeft(gameStatus.timeLeft) 
            : "Expired"
        ) : "Loading..."}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-white">
        {/* Only show "Join" button if game state is 0 (Available) */}
        {gameStatus && gameStatus.state === 0 ? (
          <button
            onClick={() => handleJoinGame(game.gameId)}
            disabled={Number(gameStatus?.state) === 2}  // Ensure it's a number for comparison
            className="text-white hover:text-white/90 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg"
          >
            {loadingGameId === Number(game.gameId) ? "Joining..." : "Join"}
          </button>
        ) : null}
      </td>
    </tr>
  );
})}

                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center p-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg"
              >
                Previous
              </button>
              <span className="text-white">{`Page ${currentPage}`}</span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={indexOfLastGame >= games.length}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameList;