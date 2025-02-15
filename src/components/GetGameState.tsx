import { useState, useEffect } from "react";
import {
  getGameState,
  // hasPlayerWithdrawn,
  getGameIdCounter,
  // getGameDetails,
  getTimeLeftToExpire,
} from "../utils/contractFunction"; // Import the functions
import { GamepadIcon, Trophy, XCircle } from "lucide-react";

const GetGameState = () => {
  const [gameStates, setGameStates] = useState<any[]>([]); // Array to hold past game states
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGameStates = async () => {
      try {
        const gameIdCounter = await getGameIdCounter();
        console.log("Game ID Counter:", gameIdCounter);

        if (gameIdCounter === undefined || gameIdCounter === 0) {
          return;
        }

        // Fetch all games and filter out active ones (completed or expired games only)
        const states = await Promise.all(
          Array.from({ length: gameIdCounter }, async (_, gameId) => {
            // const gameDetails = await getGameDetails(gameId);
            const timeLeft = await getTimeLeftToExpire(gameId); // Get remaining time for expiration
            const state = await getGameState(gameId);

            // Log timeLeft to check if it's being returned correctly
            console.log(`Time left for game ${gameId}:`, timeLeft);

            // Check if the game is completed (has a winner) or expired
            const isGameExpiredOrCompleted =
              state.winner || (timeLeft && timeLeft.seconds <= 0);

            // Handle the case where timeLeft is null (assuming game has expired or doesn't have a time limit)
            if (!timeLeft) {
              return { ...state, gameId, timeLeft: { seconds: 0 } }; // Treat as expired if no timeLeft data
            }

            if (isGameExpiredOrCompleted) {
              return { ...state, gameId, timeLeft };
            } else {
              return null; // Filter out active games
            }
          })
        );

        // Remove null values (active games) and set the remaining past games
        const filteredStates = states.filter((state) => state !== null);
        setGameStates(filteredStates);
      } catch (error) {
        console.error("Error fetching game states:", error);
        setError("Failed to fetch game states");
      }
    };

    fetchGameStates();
  }, []);

  return (
    <div className="p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Displaying Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
            <p className="flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              {error}
            </p>
          </div>
        )}

        {/* Past Games */}
        {gameStates.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 shadow-xl p-8 text-center">
            <GamepadIcon className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Past Games
            </h3>
            <p className="text-white/70">
              No past games available. Check back later.
            </p>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-white/10">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                      Game ID
                    </th>

                    {/* <th className="px-6 py-4 text-left text-sm font-semibold text-white">
                      Betamount
                    </th> */}
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white">
                      Winner
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white">
                      WinAmount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {gameStates.map((state) => (
                    <tr
                      key={state.gameId}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-yellow-400" />
                          <span className="text-white font-semibold">
                            {state.gameId}
                          </span>
                        </div>
                      </td>

                      {/* <td className="px-6 py-4">
                        <span className="text-white/90">{state.betAmount}</span>
                      </td> */}
                      <td className="px-6 py-4">
                        <span className="text-white/90">
                          {state.winner
                            ? state.winner === state.player1
                              ? "Player 1"
                              : state.winner === state.player2
                              ? "Player 2"
                              : "Unknown"
                            : "Not resolved yet"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-white/90">{state.winAmount}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GetGameState;
