import React from "react";
import { useQuery } from "@apollo/client";
import client from "./apollo-client";
import { GET_CREATED_GAMES } from "./queries";

interface GameCreated {
  id: string;
  gameId: string;
  player1: string;
  betAmount: string;
  tokenAddress: string;
  player1Choice: boolean;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

const GameCreatedList: React.FC = () => {
  const { loading, error, data } = useQuery<{ gameCreateds: GameCreated[] }>(
    GET_CREATED_GAMES,
    { client }
  );

  console.log("GraphQL Query Result:", data); // Log the entire response

  if (loading) {
    console.log("Loading...");
    return <p>Loading...</p>;
  }

  if (error) {
    console.error("GraphQL Error:", error);
    return <p>Error: {error.message}</p>;
  }

  if (!data || !data.gameCreateds || data.gameCreateds.length === 0) {
    console.log("No games found.");
    return <p>No games found.</p>;
  }

  return (
    <div>
      <h2>Created Games</h2>
      <ul>
        {data.gameCreateds.map((game, index) => {
          console.log(`Game ${index + 1}:`, game); // Log each game object
          return (
            <li key={game.id}>
              <strong>Game ID:</strong> {game.gameId} <br />
              <strong>Player 1:</strong> {game.player1} <br />
              <strong>Bet Amount:</strong> {game.betAmount} <br />
              <strong>Token Address:</strong> {game.tokenAddress} <br />
              <strong>Player 1 Choice:</strong> {game.player1Choice ? "Yes" : "No"} <br />
              <strong>Block Number:</strong> {game.blockNumber} <br />
              <strong>Timestamp:</strong>{" "}
              {new Date(Number(game.blockTimestamp) * 1000).toLocaleString()}{" "}
              <br />
              <strong>Transaction:</strong>{" "}
              <a
                href={`https://etherscan.io/tx/${game.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on Etherscan
              </a>
              <hr />
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default GameCreatedList;
