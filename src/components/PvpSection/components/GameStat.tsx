import React, { useEffect } from "react";
import { useQuery } from "@apollo/client";
import { Get_GAMESTATS } from "../client/queries";

interface GameStat {
  id: string;
  gameID: string;
  betAmount: string;
  tokenName: string;
  tokenSymbol: string;
  player1Choice: boolean;
  state: string;
  winner: string;
  payout: string;
}

interface GameStatsQueryData {
  gameStats: GameStat[];
}

const GameStats: React.FC = () => {
  const gameId = "some-valid-id";  // Replace with dynamic ID

  const { loading, error, data } = useQuery<GameStatsQueryData>(Get_GAMESTATS, {
    variables: { id: gameId },
  });

  useEffect(() => {
    if (data) {
      console.log("Game Stats Data:", data);
    }
  }, [data]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  // Ensure that 'data' and 'gameStats' exist before trying to map
  if (!data || !data.gameStats || data.gameStats.length === 0) {
    return <p>Coming Soon </p>;
  }

  return (
    <div>
      <h2>Game Stats</h2>
      <ul>
        {data.gameStats.map((game) => (
          <li key={game.id}>
            <strong>Game ID:</strong> {game.gameID} <br />
            <strong>Player 1:</strong> {game.player1Choice ? "Heads" : "Tails"} <br />
            <strong>Bet Amount:</strong> {game.betAmount} <br />
            <strong>Token:</strong> {game.tokenName} ({game.tokenSymbol}) <br />
            <strong>State:</strong> {game.state} <br />
            <strong>Winner:</strong> {game.winner} <br />
            <strong>Payout:</strong> {game.payout} <br />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GameStats;
