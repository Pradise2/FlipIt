import { gql } from "@apollo/client";

export const GET_CREATED_GAMES = gql`
  query {
    gameCreateds(first: 5, orderBy: blockTimestamp, orderDirection: desc) {
      id
      gameId
      player1
      betAmount
      tokenAddress
      player1Choice
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

export const GET_AVAILABLE_GAMES = gql`
query {
  gameCreateds {
    id
    gameId
    player1
    player1Choice
    betAmount
    tokenName
    tokenSymbol
  }
}
`;

export const Get_GAMESTATS = gql`
  query GetGameStats($id: ID) {
    gameStats(id: $id) {
      id
      gameID
      betAmount
      tokenName
      tokenSymbol
      player1Choice
      state
      winner
      payout
    }
  }
`;

// LEADERBOARD
export const GET_TOP_PLAYERS_BY_PAYOUT = gql`
  query getTopPlayersByPayout($tokenAddress: String!) {
    playerPayouts(first: 10, orderBy: payoutAmount, orderDirection: desc, where: { tokenAddress: $tokenAddress }) {
      id  # This is the player address + token address
      payoutAmount
    }
  }
`;

export const GET_TOP_PLAYERS_BY_BET = gql`
  query getTopPlayersByBetAmount($tokenAddress: String!) {
    playerBets(first: 10, orderBy: betAmount, orderDirection: desc, where: { tokenAddress: $tokenAddress }) {
      id  # This is the player address + token address
      betAmount
    }
  }
`;

export const GET_TOP_PLAYERS_BY_WINS = gql`
  query getTopPlayersByWins($tokenAddress: String!) {
    playerWins(first: 10, orderBy: winAmount, orderDirection: desc, where: { tokenAddress: $tokenAddress }) {
      id  # This is the player address + token address
      winAmount
    }
  }
`;

//PROFILE
export const GET_GAMES_CREATED = gql`
query GetGamesCreated($playerAddress: Bytes!) {
  gameCreateds(where: { player1: $playerAddress }) {
    gameId
    betAmount
    player1Choice
    tokenAddress
  }
}
`;

export const GET_GAMES_JOINED = gql`
  query GetGamesJoined($playerAddress: Bytes!) {
    gameJoineds(where: { player2: $playerAddress }) {
      gameId
      betAmount
    }
  }
`;
export const GET_GAMES_RESOLVED = gql`
query GetGamesResolved($playerAddress: Bytes!) {
  gameResolveds(where: { winner: $playerAddress }) {
    gameId
    betAmount
    payout
  }
}
`;

// RESOLVED 
export const GET_GAME_RESOLVED_BY_ID = gql`
  query GetGameResolvedById($gameId: Bytes!) {
    gameResolved(id: $gameId) {
      id
      gameId
      winner
      payout
    }
  }
`;


export interface GameReward {
  gameId: string;
  player: string;
  amount: string;
}
export const CHECK_REWARD_CLAIMED = gql`
  query CheckRewardClaimed($walletAddress: Bytes!) {
    rewardClaimeds(where: { player: $walletAddress }) {
      gameId
      player
      amount
    }
  }
`;