import { useState, useEffect, useCallback } from "react";
import { SUPPORTED_TOKENS, ADDRESS, ABI } from "../utils/contract";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
  useEnsName,
  useWatchContractEvent,
  useConnect,
  useDisconnect,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";

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
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState<{
    won: boolean | null;
    result: string | null;
  }>({ won: null, result: null });
  const [approvalHash, setApprovalHash] = useState<`0x${string}` | undefined>(
    undefined
  );
  const [flipHash, setFlipHash] = useState<`0x${string}` | undefined>(
    undefined
  );

  const { address, isConnected } = useAccount();
  const { data: ensName } = useEnsName({ address });
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const decimals = 18;

  // Token contract reads
  const {
    data: balanceData,
    refetch: refetchBalance,
    isFetching: isBalanceFetching,
  } = useReadContract({
    address: state.tokenAddress as `0x${string}`,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        inputs: [{ type: "address" }],
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
      },
      {
        name: "symbol",
        type: "function",
        inputs: [],
        outputs: [{ type: "string" }],
        stateMutability: "view",
      },
    ],
    functionName: "balanceOf",
    args: [address as `0x${string}`],
    query: { enabled: !!address },
  });

  const {
    data: symbolData,
    refetch: refetchSymbol,
    isFetching: isSymbolFetching,
  } = useReadContract({
    address: state.tokenAddress as `0x${string}`,
    abi: [
      {
        name: "symbol",
        type: "function",
        inputs: [],
        outputs: [{ type: "string" }],
        stateMutability: "view",
      },
    ],
    functionName: "symbol",
  });

  const { data: treasuryBalance } = useReadContract({
    address: state.tokenAddress as `0x${string}`,
    abi: [
      {
        name: "balanceOf",
        type: "function",
        inputs: [{ type: "address" }],
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
      },
    ],
    functionName: "balanceOf",
    args: [ADDRESS as `0x${string}`],
    query: { enabled: !!state.tokenAddress },
  });

  const { data: allowanceData } = useReadContract({
    address: state.tokenAddress as `0x${string}`,
    abi: [
      {
        name: "allowance",
        type: "function",
        inputs: [{ type: "address" }, { type: "address" }],
        outputs: [{ type: "uint256" }],
        stateMutability: "view",
      },
    ],
    functionName: "allowance",
    args: [address as `0x${string}`, ADDRESS as `0x${string}`],
    query: { enabled: !!address },
  });

  // Approval and Flip transactions
  const { writeContract: writeApproval } = useWriteContract();
  const { isSuccess: approvalConfirmed } = useWaitForTransactionReceipt({
    hash: approvalHash,
  });
  const { writeContract: writeFlip } = useWriteContract();
  const { isSuccess: flipConfirmed } = useWaitForTransactionReceipt({
    hash: flipHash,
  });

  // Event listeners
  useWatchContractEvent({
    address: ADDRESS,
    abi: ABI,
    eventName: "BetSent",
    onLogs(logs) {
      const log = logs[0] as (typeof logs)[0] & {
        args: { requestId: bigint; numWords: number };
      };
      if (log?.args) {
        setRequestId(log.args.requestId.toString());
        console.log("BetSent:", {
          requestId: log.args.requestId.toString(),
          numWords: log.args.numWords,
        });
      }
    },
  });

  useWatchContractEvent({
    address: ADDRESS,
    abi: ABI,
    eventName: "BetFulfilled",
    onLogs(logs) {
      const log = logs[0] as (typeof logs)[0] & {
        args: { requestId: bigint; userWon: boolean; rolled: bigint };
      };
      if (log?.args && log.args.requestId.toString() === requestId) {
        console.log("BetFulfilled:", {
          requestId: log.args.requestId.toString(),
          userWon: log.args.userWon,
        });
      }
    },
  });

  const { data: betStatus } = useReadContract({
    address: ADDRESS,
    abi: ABI,
    functionName: "getBetStatus",
    args: [requestId ? BigInt(requestId) : BigInt(0)],
    query: { enabled: !!requestId },
  }) as {
    data:
      | [bigint, boolean, boolean, bigint[], string, bigint, boolean]
      | undefined;
  };

  const { data: gameOutcome } = useReadContract({
    address: ADDRESS,
    abi: ABI,
    functionName: "getGameOutcome",
    args: [requestId ? BigInt(requestId) : BigInt(0)],
    query: { enabled: !!requestId && !!betStatus?.[1] },
  }) as { data: GameOutcome | undefined };

  const fetchTokenBalance = useCallback(() => {
    if (balanceData && symbolData) {
      setState((prev) => ({
        ...prev,
        tokenBalance: formatUnits(balanceData as bigint, decimals),
        tokenSymbol: symbolData as string,
        isBalanceLoading: false,
      }));
    }
  }, [balanceData, symbolData]);

  useEffect(() => {
    setState((prev) => ({ ...prev, isBalanceLoading: true }));
    refetchBalance();
    refetchSymbol();
  }, [state.tokenAddress, refetchBalance, refetchSymbol]);

  useEffect(() => {
    if (!isBalanceFetching && !isSymbolFetching) {
      fetchTokenBalance();
    }
  }, [isBalanceFetching, isSymbolFetching, fetchTokenBalance]);

  const validateInput = (): string | null => {
    if (!isConnected || !address) return "Please connect your wallet";
    if (!state.tokenAmount || parseFloat(state.tokenAmount) <= 0)
      return "Bet amount must be positive";
    if (parseFloat(state.tokenBalance) < parseFloat(state.tokenAmount))
      return `Insufficient ${state.tokenBalance} balance`;
    if (treasuryBalance) {
      const requiredBalance =
        parseUnits(state.tokenAmount, decimals) * BigInt(2);
      if ((treasuryBalance as bigint) < requiredBalance) {
        return `Treasury has insufficient balance: ${formatUnits(
          treasuryBalance as bigint,
          decimals
        )} available, ${formatUnits(
          requiredBalance,
          decimals
        )} needed. Contact support.`;
      }
    }
    return null;
  };

  const handleFlipCoin = async () => {
    const validationError = validateInput();
    if (validationError) {
      setState((prev) => ({ ...prev, error: validationError }));
      return;
    }

    console.log("Starting flip process", {
      allowance: allowanceData
        ? formatUnits(allowanceData as bigint, decimals)
        : "N/A",
    });
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      success: null,
    }));
    setIsFlipping(true);
    setApprovalHash(undefined);
    setFlipHash(undefined);

    const amountInWei = parseUnits(state.tokenAmount, decimals);
    const currentAllowance = allowanceData as bigint | undefined;

    try {
      if (!currentAllowance || currentAllowance < amountInWei) {
        console.log("Approval needed", {
          currentAllowance: currentAllowance
            ? formatUnits(currentAllowance, decimals)
            : "0",
          amountInWei: formatUnits(amountInWei, decimals),
        });
        setState((prev) => ({ ...prev, isApproving: true }));
        await new Promise<void>((resolve, reject) => {
          writeApproval(
            {
              address: state.tokenAddress as `0x${string}`,
              abi: [
                {
                  name: "approve",
                  type: "function",
                  inputs: [{ type: "address" }, { type: "uint256" }],
                  outputs: [{ type: "bool" }],
                  stateMutability: "nonpayable",
                },
              ],
              functionName: "approve",
              args: [ADDRESS, amountInWei],
            },
            {
              onSuccess: (hash) => {
                setApprovalHash(hash);
                console.log("Approval hash set:", hash);
                resolve();
              },
              onError: (error) => {
                console.error("Approval failed:", error);
                reject(error);
              },
            }
          );
        });

        // Wait for approval confirmation
        await new Promise<void>((resolve) => {
          const checkConfirmation = setInterval(() => {
            if (approvalConfirmed) {
              clearInterval(checkConfirmation);
              console.log("Approval confirmed");
              setState((prev) => ({ ...prev, isApproving: false }));
              resolve();
            }
          }, 500);
        });
      } else {
        console.log("Skipping approval - sufficient allowance");
        setState((prev) => ({ ...prev, isApproving: false }));
      }

      console.log("Initiating flip");
      await new Promise<void>((resolve, reject) => {
        writeFlip(
          {
            address: ADDRESS,
            abi: ABI,
            functionName: "flip",
            args: [
              state.face,
              state.tokenAddress as `0x${string}`,
              amountInWei,
            ],
          },
          {
            onSuccess: (hash) => {
              setFlipHash(hash);
              console.log("Flip hash set:", hash);
              resolve();
            },
            onError: (error) => {
              console.error("Flip failed:", error);
              reject(error);
            },
          }
        );
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Transaction failed",
        loading: false,
        isApproving: false,
      }));
      setIsFlipping(false);
    }
  };

  useEffect(() => {
    if (flipConfirmed && gameOutcome && betStatus && betStatus[1]) {
      console.log("Game outcome received:", gameOutcome);
      setFlipResult({
        won: gameOutcome.playerWon,
        result: `You ${gameOutcome.playerWon ? "Won" : "Lost"}. Choice: ${
          gameOutcome.playerChoice ? "Tails" : "Heads"
        }, Outcome: ${gameOutcome.outcome ? "Tails" : "Heads"}`,
      });
      setState((prev) => ({
        ...prev,
        success: "Game completed",
        loading: false,
      }));
      setIsFlipping(false);
      setRequestId(null);
      fetchTokenBalance();
    }
  }, [flipConfirmed, gameOutcome, betStatus, fetchTokenBalance]);

  const handleChoiceClick = () => {
    setState((prev) => ({ ...prev, face: !prev.face }));
  };

  const handleConnect = () => {
    if (!isConnected && connectors.length > 0) {
      connect({ connector: connectors[0] });
    } else if (isConnected) {
      disconnect();
    }
  };

  const resetGame = () => {
    console.log("Resetting game state");
    setFlipResult({ won: null, result: null });
    setState((prev) => ({
      ...prev,
      success: null,
      error: null,
      loading: false,
      isApproving: false,
    }));
    setRequestId(null);
    setApprovalHash(undefined);
    setFlipHash(undefined);
    setIsFlipping(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-purple-950">
      <div className="bg-[radial-gradient(circle_at_center,_rgba(88,28,135,0.15),_transparent_70%)] min-h-screen p-4 space-y-4">
        <div className="flex justify-end">
          <button
            onClick={handleConnect}
            className="bg-purple-700 text-white px-3 py-1 rounded text-sm md:px-4 md:py-2 md:text-base"
          >
            {isConnected ? "Disconnect" : "Connect Wallet"}
          </button>
        </div>

        {address && (
          <div className="text-white text-sm md:text-base">
            {ensName
              ? `${ensName} (${address.slice(0, 6)}...${address.slice(-4)})`
              : `${address.slice(0, 6)}...${address.slice(-4)}`}
          </div>
        )}

        {state.error && (
          <div className="fixed top-4 right-4 bg-red-500/90 text-white px-3 py-2 rounded-md shadow-lg z-50 animate-fade-in text-sm max-w-[90%] md:max-w-md">
            {state.error}
          </div>
        )}
        {state.success && (
          <div className="fixed top-4 right-4 bg-green-500/90 text-white px-3 py-2 rounded-md shadow-lg z-50 animate-fade-in text-sm max-w-[90%] md:max-w-md">
            {state.success}
          </div>
        )}

        {isFlipping && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 max-w-sm md:p-10 md:max-w-md">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto md:h-16 md:w-16"></div>
              <p className="mt-3 text-center text-sm md:mt-4 md:text-base">
                {state.isApproving ? "Approving..." : "Flipping..."}
              </p>
            </div>
          </div>
        )}

        {flipResult.won !== null && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 max-w-sm md:p-10 md:max-w-md">
              <h2 className="text-lg font-bold mb-2 md:text-xl">
                {flipResult.won ? "Congratulations!" : "Better luck next time!"}
              </h2>
              <p className="text-sm md:text-base">{flipResult.result}</p>
              <button
                onClick={resetGame}
                className="mt-3 bg-purple-500 text-white px-3 py-1 rounded text-sm md:mt-4 md:px-4 md:py-2 md:text-base"
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div className="w-full bg-purple-950/70 backdrop-blur-sm border border-purple-800/30 rounded-lg overflow-hidden shadow-xl">
          <div className="p-4 bg-purple-950/40 text-purple-100 backdrop-blur-sm md:p-6">
            <div className="space-y-4">
              <div className="flex justify-center items-center w-full h-full">
                <div
                  className={`w-20 h-20 rounded-full relative ${
                    isFlipping ? "animate-spin" : ""
                  } md:w-24 md:h-24`}
                  style={{
                    perspective: "1000px",
                    transformStyle: "preserve-3d",
                  }}
                  onClick={handleChoiceClick}
                >
                  <div
                    className="absolute w-full h-full bg-gradient-to-br from-[#ffd700] to-[#b8860b] rounded-full flex items-center justify-center border-2 border-[#daa520] shadow-lg"
                    style={{
                      transform: state.face
                        ? "rotateY(0deg)"
                        : "rotateY(180deg)",
                      transition: "transform 0.6s",
                      backfaceVisibility: "hidden",
                      boxShadow: "0 0 15px rgba(218, 165, 32, 0.8)",
                    }}
                  >
                    <span
                      className="text-base font-bold md:text-lg"
                      style={{ color: "#422006" }}
                    >
                      TAILS
                    </span>
                  </div>
                  <div
                    className="absolute w-full h-full bg-gradient-to-br from-[#daa520] to-[#ffd700] rounded-full flex items-center justify-center border-2 border-[#daa520] shadow-lg"
                    style={{
                      transform: state.face
                        ? "rotateY(180deg)"
                        : "rotateY(0deg)",
                      transition: "transform 0.6s",
                      backfaceVisibility: "hidden",
                      boxShadow: "0 0 15px rgba(218, 165, 32, 0.8)",
                    }}
                  >
                    <span
                      className="text-base font-bold md:text-lg"
                      style={{ color: "#422006" }}
                    >
                      HEADS
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start space-y-1">
                <p className="text-purple-200 text-sm md:text-base flex items-center">
                  {state.tokenSymbol} balance:
                  {state.isBalanceLoading ||
                  isBalanceFetching ||
                  isSymbolFetching ? (
                    <span className="ml-2 animate-pulse">Loading...</span>
                  ) : (
                    <span className="ml-2 animate-fade-in">
                      {parseFloat(state.tokenBalance).toFixed(2)}
                    </span>
                  )}
                </p>
                <p className="text-purple-200 text-sm md:text-base">
                  Choice: {state.face ? "Tails" : "Heads"}
                </p>
              </div>

              <div className="flex flex-col w-full">
                <label
                  htmlFor="token"
                  className="block text-sm font-medium text-purple-200 mb-1 md:text-md"
                >
                  Select Token
                </label>
                <select
                  id="token"
                  value={state.tokenAddress}
                  onChange={(e) => {
                    setState((prev) => ({
                      ...prev,
                      tokenAddress: e.target.value,
                      tokenSymbol:
                        Object.keys(SUPPORTED_TOKENS).find(
                          (key) =>
                            SUPPORTED_TOKENS[
                              key as keyof typeof SUPPORTED_TOKENS
                            ] === e.target.value
                        ) || "UNKNOWN",
                      isBalanceLoading: true,
                    }));
                  }}
                  className="w-full text-gray-700 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm md:text-base"
                  disabled={state.loading || state.isApproving}
                >
                  {Object.entries(SUPPORTED_TOKENS).map(([key, value]) => (
                    <option key={key} value={value}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>

              <label className="block text-purple-200 text-sm md:text-base">
                Bet amount ({state.tokenSymbol})
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
                className="w-full bg-purple-900/50 border border-purple-700/30 text-purple-100 rounded-md p-2 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-600/50 text-sm md:text-base"
                disabled={state.loading || state.isApproving}
              />

              <button
                className={`w-full py-2 flex items-center justify-center ${
                  state.loading || state.isApproving
                    ? "bg-purple-600/50 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-600 hover:to-purple-700"
                } text-white rounded-md transition duration-200 font-semibold shadow-lg text-sm md:py-3 md:text-base`}
                onClick={handleFlipCoin}
                disabled={state.loading || state.isApproving}
              >
                {state.loading || state.isApproving ? (
                  <div className="flex items-center space-x-2">
                    <svg
                      className="animate-spin h-4 w-4 text-white md:h-5 md:w-5"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>
                      {state.isApproving ? "Approving..." : "Flipping..."}
                    </span>
                  </div>
                ) : (
                  "Flip"
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
