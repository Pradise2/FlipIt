import { useState, useEffect, useCallback } from "react";
import { SUPPORTED_TOKENS } from "../utils/contract";
import { useAppKitAccount } from "@reown/appkit/react";
import {
  flip,
  publicProvider,
  getBetStatus,
  getGameOutcome,
} from "../utils/contractfunction";
import { ethers } from "ethers";

interface FlipCoin {
  tokenAddress: string;
  tokenAmount: string;
  face: boolean;
  error: string | null;
  loading: boolean;
  success: string | null;
  tokenBalance: string;
  tokenSymbol: string;
  isApproving: boolean;
}

const FlipCoin = () => {
  const { address, isConnected } = useAppKitAccount();
  const [state, setState] = useState<FlipCoin>({
    face: false,
    tokenAmount: "",
    tokenAddress: SUPPORTED_TOKENS.STABLEAI,
    loading: false,
    error: null,
    success: null,
    tokenBalance: "0",
    tokenSymbol: "STABLEAI",
    isApproving: false,
  });

  const [requestId, setRequestId] = useState<string | null>(null);

  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState<{
    won: boolean | null;
    result: string | null;
  }>({ won: null, result: null });

  // Fetch token balance
  const fetchTokenBalance = useCallback(async () => {
    if (!address || !state.tokenAddress || !isConnected) return;

    const tokenAbi = [
      "function balanceOf(address owner) view returns (uint256)",
      "function symbol() view returns (string)",
    ];

    try {
      const tokenContract = new ethers.Contract(
        state.tokenAddress,
        tokenAbi,
        publicProvider
      );
      const [balance, symbol] = await Promise.all([
        tokenContract.balanceOf(address),
        tokenContract.symbol(),
      ]);

      setState((prevState) => ({
        ...prevState,
        tokenBalance: ethers.formatUnits(balance, 18),
        tokenSymbol: symbol,
      }));
    } catch (error) {
      console.error("Error fetching token balance:", error);
      // Optionally, switch to fallback provider here
    }
  }, [address, state.tokenAddress, isConnected]);

  useEffect(() => {
    fetchTokenBalance();
  }, [fetchTokenBalance]);

  const validateInput = (): string | null => {
    if (!isConnected) return "Please connect your wallet";
    if (!state.tokenAmount || parseFloat(state.tokenAmount) <= 0)
      return "Bet amount must be positive";
    if (parseFloat(state.tokenBalance) < parseFloat(state.tokenAmount)) {
      return `Insufficient ${state.tokenSymbol} balance`;
    }
    return null;
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (requestId) {
      intervalId = setInterval(async () => {
        try {
          const status = await getBetStatus(requestId);

          if (status.fulfilled) {
            clearInterval(intervalId);
            const outcome = await getGameOutcome(requestId);

            setFlipResult({
              won: outcome.playerWon,
              result: `You ${outcome.playerWon ? "Won" : "Lost"}. Choice: ${
                outcome.playerChoice ? "Tails" : "Heads"
              }, Outcome: ${outcome.outcome ? "Tails" : "Heads"}.`,
            });

            setState((prev) => ({
              ...prev,
              success: "Flip completed",
              loading: false,
            }));

            // Refresh token balance
            fetchTokenBalance();
          }
        } catch (error) {
          console.error("Error checking bet status:", error);
          clearInterval(intervalId);
          setState((prev) => ({
            ...prev,
            error: "Error checking bet status",
            loading: false,
          }));
        }
      }, 2000); // Poll every 2 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [requestId]);

  const handleFlipCoin = async () => {
    const validationError = validateInput();
    if (validationError) {
      setState((prev) => ({ ...prev, error: validationError }));
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      success: null,
    }));

    setIsFlipping(true);

    try {
      const { requestId: newRequestId } = await flip(
        state.tokenAddress,
        state.tokenAmount,
        state.face
      );

      setRequestId(newRequestId);
    } catch (error: any) {
      console.error("Error flipping coin:", error);
      let errorMessage = "Failed to flip coin";
      if (error.message?.includes("Token not allowed")) {
        errorMessage = "This token is not allowed for betting";
      }
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
      setIsFlipping(false);
    }
  };

  const handleChoiceClick = () => {
    setState((prevState) => ({ ...prevState, face: !prevState.face }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-purple-950">
      <div className="bg-[radial-gradient(circle_at_center,_rgba(88,28,135,0.15),_transparent_70%)] min-h-screen p-6 space-y-4">
        <appkit-button size="sm" balance="show" />
        {/* Error/Success Notifications */}
        {state.error && (
          <div className="fixed top-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-md shadow-lg z-50 animate-fade-in">
            {state.error}
          </div>
        )}
        {state.success && (
          <div className="fixed top-4 right-4 bg-green-500/90 text-white px-4 py-2 rounded-md shadow-lg z-50 animate-fade-in">
            {state.success}
          </div>
        )}

        {/* Flipping Animation */}
        {isFlipping && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-10 rounded-lg shadow-lg">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
              <p className="mt-4 text-center">Flipping Coin...</p>
            </div>
          </div>
        )}

        {/* Flip Result */}
        {flipResult.won !== null && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-10 rounded-lg shadow-lg">
              <h2 className="text-lg font-bold mb-2">
                {flipResult.won ? "Congratulations!" : "Better luck next time!"}
              </h2>
              <p>{flipResult.result}</p>
              <button
                onClick={() => setFlipResult({ won: null, result: null })}
                className="mt-4 bg-purple-500 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div className="w-full bg-purple-950/70 backdrop-blur-sm border border-purple-800/30 rounded-lg overflow-hidden shadow-xl">
          <div className="p-6 bg-purple-950/40 text-purple-100 backdrop-blur-sm">
            <div className="space-y-4">
              <div className="flex justify-center items-center w-full h-full">
                <div
                  className={`w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 relative ${
                    isFlipping ? "animate-spin" : ""
                  }`}
                  style={{
                    perspective: "1000px",
                    transformStyle: "preserve-3d",
                  }}
                  onClick={handleChoiceClick}
                >
                  <div
                    className="absolute w-full h-full backface-hidden bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center shadow-lg"
                    style={{
                      transform:
                        state.face === false
                          ? "rotateY(180deg)"
                          : "rotateY(0deg)",
                      transition: "transform 0.6s",
                      backfaceVisibility: "hidden",
                    }}
                  >
                    <span className="text-lg text-purple-100 font-bold">
                      TAIL
                    </span>
                  </div>
                  <div
                    className="absolute w-full h-full backface-hidden bg-gradient-to-br from-purple-700 to-purple-900 rounded-full flex items-center justify-center shadow-lg"
                    style={{
                      transform:
                        state.face === true
                          ? "rotateY(180deg)"
                          : "rotateY(0deg)",
                      transition: "transform 0.6s",
                      backfaceVisibility: "hidden",
                    }}
                  >
                    <span className="text-lg text-purple-100 font-bold">
                      HEAD
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start space-y-1">
                <p className="text-purple-200">
                  {state.tokenSymbol} balance:{" "}
                  {parseFloat(state.tokenBalance).toFixed(2)}
                </p>
                <div className="text-purple-200">
                  <p>Choice: {state.face ? "Tails" : "Heads"}</p>
                </div>

                {/* ... rest of your input fields and button */}
              </div>

              {/* Token Selection and Bet Amount */}
              <div className="flex flex-col w-full">
                <label
                  htmlFor="token"
                  className="block text-md font-medium text-purple-200 mb-1"
                >
                  Select Token
                </label>
                <select
                  id="token"
                  value={state.tokenAddress}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      tokenAddress: e.target.value,
                    }))
                  }
                  className="w-full text-gray-700 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  disabled={state.loading || state.isApproving}
                >
                  {Object.entries(SUPPORTED_TOKENS).map(([key, value]) => (
                    <option key={key} value={value}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>

              <label className="block text-purple-200">
                Bet amount ({state.tokenAmount}${state.tokenSymbol})
              </label>
              <input
                id="betAmount"
                type="number"
                step="0.001"
                min="0"
                placeholder="0.00"
                value={state.tokenAmount}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, tokenAmount: e.target.value }))
                }
                className="w-full bg-purple-900/50 border border-purple-700/30 text-purple-100 rounded-md p-2 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-600/50"
                disabled={state.loading || state.isApproving}
              />

              <button
                className={`w-full py-3 flex items-center justify-center ${
                  state.loading || state.isApproving
                    ? "bg-purple-600/50 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-600 hover:to-purple-700"
                } text-white rounded-md transition duration-200 font-semibold shadow-lg`}
                onClick={handleFlipCoin}
                disabled={state.loading || state.isApproving}
              >
                {state.loading || state.isApproving ? (
                  <div className="flex items-center space-x-2">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>
                      {state.isApproving
                        ? "Approving Token..."
                        : "Processing..."}
                    </span>
                  </div>
                ) : (
                  "Flip Coin"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipCoin;
