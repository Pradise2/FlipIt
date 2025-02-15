import { gql } from "@apollo/client";

export const GET_RESOLVED = gql`
  query GetResolvedGamesByPlayer($playerAddress: Bytes!) {
    gameResolveds(where: { player: $playerAddress }) {
      id
      gameId
      player
      playerWon
      payout
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;
