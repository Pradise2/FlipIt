import React, { useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Trophy, User, Users } from 'lucide-react';
import { useAppKitAccount } from "@reown/appkit/react";
import client from '../client/apollo-client'; // Assuming you have your Apollo client setup

// GraphQL queries
const GET_CREATED_GAMES = gql`
  query GetCreatedGames {
    gameCreateds {
      gameId
      player
      betAmount
      tokenAddress
      playerChoice
    }
  }
`;

const GET_TOP_PLAYERS = gql`
  query GetTopPlayers {
    gameResolveds(first: 10, orderBy: payout, orderDirection: desc) {
      player
      payout
    }
  }
`;

const GET_PLAYER = gql`
  query GetTopPlayers {
    gameResolveds {
      gameId
      player
      playerWon
      payout
    }
  }
`;

const GET_RESOLVED = gql`
  query GetResolved {
    gameResolveds {
      gameId
      player
      playerWon
      payout
    }
  }
`;

// Types
interface Game {
  gameId: string;
  player: string;
  playerWon?: boolean;
  payout?: number;
  betAmount?: number;
  tokenAddress?: string;
  playerChoice?: boolean;
}

interface TopPlayer {
  player: string;
  payout: number;
}

const SUPPORTED_TOKENS = {
  STABLEAI: "0x07F41412697D14981e770b6E335051b1231A2bA8",
  DIG: "0x208561379990f106E6cD59dDc14dFB1F290016aF",
  WEB9: "0x09CA293757C6ce06df17B96fbcD9c5f767f4b2E1",
  BNKR: "0x22aF33FE49fD1Fa80c7149773dDe5890D3c76F3b",
  FED: "0x19975a01B71D4674325bd315E278710bc36D8e5f",
  RaTcHeT: "0x1d35741c51fb615ca70e28d3321f6f01e8d8a12d",
  GIRTH: "0xa97d71a5fdf906034d9d121ed389665427917ee4",
};

const getTokenName = (address: string): string => {
  const entry = Object.entries(SUPPORTED_TOKENS).find(([_, value]) => 
    value.toLowerCase() === address.toLowerCase()
  );
  return entry ? entry[0] : 'Unknown Token';
};

const truncateAddress = (address: string): string => 
  `${address.slice(0, 6)}...${address.slice(-4)}`;

const GameDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('myGames');
 
   const { address} = useAppKitAccount();
  // Query for created games
  const { data: createdGamesData, loading: loadingCreatedGames, error: errorCreatedGames } = useQuery<{
    gameCreateds: Game[];
  }>(GET_CREATED_GAMES, { client });

  // Query for resolved games (new for "All Games" tab)
  const { data: resolvedGamesData, loading: loadingResolvedGames, error: errorResolvedGames } = useQuery<{
    gameResolveds: Game[];
  }>(GET_RESOLVED, { client });

  // Query for top players
  const { data: topPlayersData, loading: loadingTopPlayers, error: errorTopPlayers } = useQuery<{
    gameResolveds: TopPlayer[];
  }>(GET_TOP_PLAYERS, { client });

  // Query for player payout
  const { data: playerPayoutData, loading: loadingPlayerPayout, error: errorPlayerPayout } = useQuery<{
    gameResolveds: { gameId: string; player: string; payout: number }[];
  }>(GET_PLAYER, { client });

  // Loading component
  const LoadingState = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );

  // Error component
  const ErrorDisplay = ({ error }: { error: Error }) => (
    <div className="rounded-lg border border-red-200 p-4 bg-red-50">
      <h3 className="text-red-800 font-medium">Error fetching data</h3>
      <p className="text-red-600">{error.message}</p>
      <button 
        onClick={() => window.location.reload()} 
        className="mt-2 text-sm text-red-600 underline"
      >
        Retry
      </button>
    </div>
  );

  // Game card component
  const GameCard = ({ game }: { game: Game }) => (
    <div className="border rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex space-x-6">
        <div className="flex-1">
          <div className="font-medium">Game ID</div>
          <div className="font-mono">{(game.gameId)}</div>
        </div>
        <div className="flex-1">
          <div className="font-medium">Player</div>
          <div className="font-mono">{truncateAddress(game.player)}</div>
        </div>
        <div className="flex-1">
          <div className="font-medium">Bet Amount</div>
          <div>
  {(game.betAmount ? (game.betAmount / 1e18).toLocaleString() : 0)}{' '}
  {getTokenName(game.tokenAddress || '')}
</div>

        </div>
        <div className="flex-1">
          <div className="font-medium">Choice</div>
          <div className={`px-2 py-1 rounded text-sm ${
            game.playerChoice 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {game.playerChoice ? 'Heads' : 'Tails'}
          </div>
        </div>
      </div>
    </div>
  );

  // Top player card component
  const TopPlayerCard = ({ player, index }: { player: TopPlayer; index: number }) => (
    <div className="border rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl">{index + 1}</span>
          <span className="font-mono">{truncateAddress(player.player)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">{player.payout.toLocaleString()}</span>
          <Trophy className="h-4 w-4 text-yellow-500" />
        </div>
      </div>
    </div>
  );

  // Player payout card component
  const PlayerPayoutCard = ({ game }: { game: Game }) => (
    <div className="border rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono">{truncateAddress(game.player)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {game.payout ? game.payout.toLocaleString() : 0}
          </span>
          <span className={`text-sm ${game.playerWon ? 'text-green-600' : 'text-red-600'}`}>
            {game.playerWon ? 'Won' : 'Lost'}
          </span>
        </div>
      </div>
    </div>
  );
  

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg border shadow-sm">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Game Dashboard</h1>
        
        {/* Tabs */}
        <div className="border-b mb-6">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('myGames')}
              className={`flex items-center pb-2 px-1 ${
                activeTab === 'myGames'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500'
              }`}
            >
              <User className="h-4 w-4 mr-2" />
              My Games
            </button>
            <button
              onClick={() => setActiveTab('allGames')}
              className={`flex items-center pb-2 px-1 ${
                activeTab === 'allGames'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500'
              }`}
            >
              <Users className="h-4 w-4 mr-2" />
              All Games
            </button>
            <button
              onClick={() => setActiveTab('topPlayers')}
              className={`flex items-center pb-2 px-1 ${
                activeTab === 'topPlayers'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500'
              }`}
            >
              <Trophy className="h-4 w-4 mr-2" />
              Top Players
            </button>
            <button
              onClick={() => setActiveTab('playerPayout')}
              className={`flex items-center pb-2 px-1 ${
                activeTab === 'playerPayout'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500'
              }`}
            >
              <Trophy className="h-4 w-4 mr-2" />
              Player Payout
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="mt-6">
          {activeTab === 'myGames' && (
            <>
              {errorCreatedGames ? (
                <ErrorDisplay error={errorCreatedGames} />
              ) : loadingCreatedGames ? (
                <LoadingState />
              ) : createdGamesData?.gameCreateds.length ? (
                <div className="space-y-4">
                  {createdGamesData.gameCreateds.map((game) => (
                    <GameCard key={game.gameId} game={game} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  You haven't created any games yet.
                </div>
              )}
            </>
          )}

          {activeTab === 'allGames' && (
            <>
              {errorResolvedGames ? (
                <ErrorDisplay error={errorResolvedGames} />
              ) : loadingResolvedGames ? (
                <LoadingState />
              ) : resolvedGamesData?.gameResolveds.length ? (
                <div className="space-y-4">
                  {resolvedGamesData.gameResolveds.map((game) => (
                    <GameCard key={game.gameId} game={game} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  There are no resolved games yet.
                </div>
              )}
            </>
          )}

          {activeTab === 'topPlayers' && (
            <>
              {errorTopPlayers ? (
                <ErrorDisplay error={errorTopPlayers} />
              ) : loadingTopPlayers ? (
                <LoadingState />
              ) : topPlayersData?.gameResolveds.length ? (
                <div className="space-y-4">
                  {topPlayersData.gameResolveds.map((player, index) => (
                    <TopPlayerCard key={player.player} player={player} index={index} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  There are no resolved games yet.
                </div>
              )}
            </>
          )}

          {activeTab === 'playerPayout' && (
       <>
       {errorPlayerPayout ? (
         <ErrorDisplay error={errorPlayerPayout} />
       ) : loadingPlayerPayout ? (
         <LoadingState />
       ) : playerPayoutData?.gameResolveds.length ? (
         <div className="space-y-4">
           {playerPayoutData.gameResolveds.map((gameResolved) => (
             <PlayerPayoutCard 
               key={gameResolved.gameId} // Use the gameId as the unique key
               game={gameResolved} // Pass the entire gameResolved object to the card
             />
           ))}
         </div>
       ) : (
         <div className="text-center py-8 text-gray-500">
           There are no player payouts yet.
         </div>
       )}
     </>
     
          )}
        </div>
      </div>
    </div>
  );
};

export default GameDashboard;
