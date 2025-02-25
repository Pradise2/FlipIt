import { useState, useEffect, useCallback } from "react";
import { SUPPORTED_TOKENS, ADDRESS, ABI } from "../utils/contract";
import { 
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount
} from 'wagmi';
import { parseUnits, formatUnits } from 'viem';

interface FlipCoinState {
  tokenAddress: string;
  tokenAmount: string;
  face: boolean;
  error: string | null;
  loading: boolean;
  success: string | null;
  tokenBalance: string;
  tokenSymbol: string;
  isApproving: boolean;
  isBalanceLoading: boolean;
}

interface BetStatus {
  paid: bigint;
  fulfilled: boolean;
  bet: boolean;
  randomWords: bigint[];
  status: string;
  rolled: bigint;
  userWon: boolean;
}

interface GameOutcome {
  isComplete: boolean;
  playerWon: boolean;
  playerChoice: boolean;
  outcome: boolean;
  betAmount: bigint;
  potentialPayout: bigint;
  resultDescription: string;
}

const FlipCoin = () => {
  const [state, setState] = useState<FlipCoinState>({
    face: false,
    tokenAmount: "",
    tokenAddress: SUPPORTED_TOKENS.STABLEAI,
    loading: false,
    error: null,
    success: null,
    tokenBalance: "0",
    tokenSymbol: "STABLEAI",
    isApproving: false,
    isBalanceLoading: false,
  });

  const [requestId, setRequestId] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState<{
    won: boolean | null;
    result: string | null;
  }>({ won: null, result: null });

  const decimals = 18;

  // Token contract interactions
  const { 
    data: balanceData, 
    refetch: refetchBalance, 
    isFetching: isBalanceFetching 
  } = useReadContract({
    address: state.tokenAddress as `0x${string}`,
    abi: [
      { name: "balanceOf", type: "function", inputs: [{ name: "owner", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
      { name: "symbol", type: "function", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
    ],
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  });

  const { 
    data: symbolData, 
    refetch: refetchSymbol, 
    isFetching: isSymbolFetching 
  } = useReadContract({
    address: state.tokenAddress as `0x${string}`,
    abi: [
      { name: "symbol", type: "function", inputs: [], outputs: [{ name: "", type: "string" }], stateMutability: "view" },
    ],
    functionName: "symbol",
  });

  // Approval
  const { writeContract: writeApproval, data: approvalHash } = useWriteContract();
  const { isSuccess: approvalConfirmed } = useWaitForTransactionReceipt({ hash: approvalHash });

  // Flip
  const { writeContract: writeFlip, data: flipHash, isPending: isFlipPending } = useWriteContract();
  const {  isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: flipHash });

  // Bet status
  const { data: betStatus } = useReadContract({
    address: ADDRESS,
    abi: ABI,
    functionName: "getBetStatus",
    args: [requestId ? BigInt(requestId) : BigInt(0)],
    query: { enabled: !!requestId },
  }) as { data: BetStatus | undefined };

  // Game outcome
  const { data: gameOutcome } = useReadContract({
    address: ADDRESS,
    abi: ABI,
    functionName: "getGameOutcome",
    args: [requestId ? BigInt(requestId) : BigInt(0)],
    query: { enabled: !!requestId && !!betStatus?.fulfilled },
  }) as { data: GameOutcome | undefined };

  const fetchTokenBalance = useCallback(() => {
    console.log("Fetching Token Balance...");
    console.log("Current balanceData:", balanceData?.toString());
    console.log("Current symbolData:", symbolData);
    if (balanceData && symbolData) {
      setState(prev => ({
        ...prev,
        tokenBalance: formatUnits(balanceData as bigint, decimals),
        tokenSymbol: symbolData as string,
        isBalanceLoading: false,
      }));
      console.log("Updated State - Balance:", formatUnits(balanceData as bigint, decimals));
      console.log("Updated State - Symbol:", symbolData);
    }
  }, [balanceData, symbolData]);

  // Update balance and symbol when tokenAddress changes
  useEffect(() => {
    console.log("Token Address Changed:", state.tokenAddress);
    setState(prev => ({ ...prev, isBalanceLoading: true }));
    refetchBalance();
    refetchSymbol();
  }, [state.tokenAddress, refetchBalance, refetchSymbol]);

  // Sync state with fetched data
  useEffect(() => {
    if (!isBalanceFetching && !isSymbolFetching) {
      fetchTokenBalance();
    }
  }, [isBalanceFetching, isSymbolFetching, fetchTokenBalance]);

  // Update balance after flip completes
  useEffect(() => {
    if (isConfirmed && flipHash) {
      console.log("Flip Confirmed, Refetching Balance...");
      setState(prev => ({ ...prev, isBalanceLoading: true }));
      refetchBalance();
    }
  }, [isConfirmed, flipHash, refetchBalance]);

  const validateInput = (): string | null => {
    if (!isConnected || !address) return "Please connect your wallet";
    if (!state.tokenAmount || parseFloat(state.tokenAmount) <= 0) return "Bet amount must be positive";
    if (parseFloat(state.tokenBalance) < parseFloat(state.tokenAmount)) return `Insufficient ${state.tokenSymbol} balance`;
    return null;
  };

  const handleFlipCoin = async () => {
    const validationError = validateInput();
    if (validationError) {
      console.log("Validation Error:", validationError);
      setState(prev => ({ ...prev, error: validationError }));
      return;
    }

    console.log("Starting Flip Process...");
    setState(prev => ({ ...prev, loading: true, error: null, success: null }));
    setIsFlipping(true);

    try {
      const amountInWei = parseUnits(state.tokenAmount, decimals);
      console.log("Amount in Wei:", amountInWei.toString());

      console.log("Initiating Approval...");
      setState(prev => ({ ...prev, isApproving: true }));
      writeApproval({
        address: state.tokenAddress as `0x${string}`,
        abi: [
          { name: "approve", type: "function", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" }
        ],
        functionName: "approve",
        args: [ADDRESS, amountInWei],
      });
    } catch (error) {
      console.error("Flip Error:", error);
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : "Failed to flip", loading: false, isApproving: false }));
      setIsFlipping(true);
    }
  };

  useEffect(() => {
    if (approvalConfirmed && !isFlipPending && !flipHash) {
      console.log("Approval Confirmed, Initiating Flip...");
      const amountInWei = parseUnits(state.tokenAmount, decimals);
      writeFlip({
        address: ADDRESS,
        abi: ABI,
        functionName: "flip",
        args: [state.face, state.tokenAddress as `0x${string}`, amountInWei],
      });
      setState(prev => ({ ...prev, isApproving: false }));
    }
  }, [approvalConfirmed, isFlipPending, flipHash, state.face, state.tokenAmount, state.tokenAddress]);

  useEffect(() => {
    if (isConfirmed && flipHash) {
      console.log("Flip Transaction Confirmed:", flipHash);
      setState(prev => ({ ...prev, loading: false }));
      setRequestId("1"); // Placeholder
    }
  }, [isConfirmed, flipHash]);

  useEffect(() => {
    if (betStatus && requestId) {
      console.log("Bet Status:", betStatus);
      if (betStatus.fulfilled && gameOutcome) {
        console.log("Game Outcome:", gameOutcome);
        setFlipResult({
          won: gameOutcome.playerWon,
          result: `You ${gameOutcome.playerWon ? "Won" : "Lost"}. Choice: ${gameOutcome.playerChoice ? "Tails" : "Heads"}, Outcome: ${gameOutcome.outcome ? "Tails" : "Heads"}`,
        });
        setState(prev => ({ ...prev, success: "Game completed", loading: false }));
        setIsFlipping(false);
        fetchTokenBalance();
      }
    }
  }, [betStatus, gameOutcome, requestId, fetchTokenBalance]);

  const handleChoiceClick = () => {
    console.log("Choice toggled from", state.face ? "Tails" : "Heads", "to", !state.face ? "Tails" : "Heads");
    setState(prev => ({ ...prev, face: !prev.face }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-purple-950">
      <div className="bg-[radial-gradient(circle_at_center,_rgba(88,28,135,0.15),_transparent_70%)] min-h-screen p-6 space-y-4">
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

        {isFlipping && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-10 rounded-lg shadow-lg">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
              <p className="mt-4 text-center">
                {state.isApproving ? "Approving..." : "Flipping..."}
              </p>
            </div>
          </div>
        )}

        {flipResult.won !== null && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-10 rounded-lg shadow-lg">
              <h2 className="text-lg font-bold mb-2">
                {flipResult.won ? "Congratulations!" : "Better luck next time!"}
              </h2>
              <p>{flipResult.result}</p>
              <button
                onClick={() => {
                  console.log("Closing result modal");
                  setFlipResult({ won: null, result: null });
                  setState(prev => ({ ...prev, success: null }));
                }}
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
                  className={`w-24 h-24 rounded-full relative ${isFlipping ? "animate-spin" : ""}`}
                  style={{ perspective: "1000px", transformStyle: "preserve-3d" }}
                  onClick={handleChoiceClick}
                >
                  <div
                    className="absolute w-full h-full backface-hidden bg-gradient-to-br from-[#ffd700] to-[#b8860b] rounded-full flex items-center justify-center border-2 border-[#daa520] shadow-lg"
                    style={{
                      transform: state.face ? "rotateY(0deg)" : "rotateY(180deg)",
                      transition: "transform 0.6s",
                      backfaceVisibility: "hidden",
                      boxShadow: "0 0 15px rgba(218, 165, 32, 0.8)",
                    }}
                  >
                    <span className="text-lg font-bold" style={{ color: "#422006" }}>
                      TAILS
                    </span>
                  </div>
                  <div
                    className="absolute w-full h-full backface-hidden bg-gradient-to-br from-[#daa520] to-[#ffd700] rounded-full flex items-center justify-center border-2 border-[#daa520] shadow-lg"
                    style={{
                      transform: state.face ? "rotateY(180deg)" : "rotateY(0deg)",
                      transition: "transform 0.6s",
                      backfaceVisibility: "hidden",
                      boxShadow: "0 0 15px rgba(218, 165, 32, 0.8)",
                    }}
                  >
                    <span className="text-lg font-bold" style={{ color: "#422006" }}>
                      HEADS
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start space-y-1">
                <p className="text-purple-200 flex items-center">
                  {state.tokenSymbol} balance: 
                  {state.isBalanceLoading || isBalanceFetching || isSymbolFetching ? (
                    <span className="ml-2 animate-pulse">Loading...</span>
                  ) : (
                    <span className="ml-2 animate-fade-in">{parseFloat(state.tokenBalance).toFixed(2)}</span>
                  )}
                </p>
                <div className="text-purple-200">
                  <p>Choice: {state.face ? "Tails" : "Heads"}</p>
                </div>
              </div>

              <div className="flex flex-col w-full">
                <label htmlFor="token" className="block text-md font-medium text-purple-200 mb-1">
                  Select Token
                </label>
                <select
                  id="token"
                  value={state.tokenAddress}
                  onChange={(e) => {
                    console.log("Token changed to:", e.target.value);
                    setState(prev => ({
                      ...prev,
                      tokenAddress: e.target.value,
                      tokenSymbol: Object.keys(SUPPORTED_TOKENS).find(key => SUPPORTED_TOKENS[key as keyof typeof SUPPORTED_TOKENS] === e.target.value) || "UNKNOWN",
                    }));
                  }}
                  className="w-full text-gray-700 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  disabled={state.loading || state.isApproving}
                >
                  {Object.entries(SUPPORTED_TOKENS).map(([key, value]) => (
                    <option key={key} value={value}>{key}</option>
                  ))}
                </select>
              </div>

              <label className="block text-purple-200">
                Bet amount ({state.tokenSymbol})
              </label>
              <input
                id="betAmount"
                type="number"
                step="0.001"
                min="0"
                placeholder="0.00"
                value={state.tokenAmount}
                onChange={(e) => {
                  console.log("Bet amount changed to:", e.target.value);
                  setState(prev => ({ ...prev, tokenAmount: e.target.value }));
                }}
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
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>{state.isApproving ? "Approving..." : "Flipping..."}</span>
                  </div>
                ) : "Flip"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipCoin;