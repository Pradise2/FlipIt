import { useState, useEffect, useCallback } from "react";
import { SUPPORTED_TOKENS } from "../utils/contract";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { publicProvider, getGameOutcome } from "../utils/contractfunction";
import { ethers } from "ethers";
import { BrowserProvider } from "ethers";

import { ABI, ADDRESS } from "../utils/contract";

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
  });

  const [requestId, setRequestId] = useState<string | null>(null);
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");

  const [isFlipping, setIsFlipping] = useState(false);
  const [flipResult, setFlipResult] = useState<{
    won: boolean | null;
    result: string | null;
  }>({ won: null, result: null });

  async function setupContract() {
    if (!isConnected )
      throw new Error("User is disconnected");
    if (!walletProvider) throw new Error("Wallet provider not found");
    const ethersProvider = new BrowserProvider(walletProvider as any);
    const signer = await ethersProvider.getSigner();
    const userAddress = await signer.getAddress();
    console.log("Address:", userAddress);
    const contract = new ethers.Contract(ADDRESS, ABI, signer);
    return { signer, contract };
  }

  const flip = async (
    tokenAddress: string,
    tokenAmount: string,
    face: boolean
  ) => {
    try {
      const { signer, contract } = await setupContract();
      const tokenAmountInWei = ethers.parseUnits(tokenAmount, 18);
      const requiredBalance = tokenAmountInWei * BigInt(2);

      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          "function allowance(address owner, address spender) external view returns (uint256)",
          "function approve(address spender, uint256 amount) external returns (bool)",
          "function balanceOf(address owner) external view returns (uint256)",
        ],
        signer
      );

      // Check contract balance
      const contractBalance = await tokenContract.balanceOf(ADDRESS);
      console.log(
        "Contract Balance (raw):",
        contractBalance,
        typeof contractBalance
      ); // Debug log
      console.log(
        "Required Balance (raw):",
        requiredBalance,
        typeof requiredBalance
      ); // Debug log
      if (contractBalance < requiredBalance) {
        throw new Error(
          `Contract has insufficient balance: ${ethers.formatUnits(
            contractBalance,
            18
          )} available, ${ethers.formatUnits(
            requiredBalance,
            18
          )} needed. Please contact support to fund the game.`
        );
      }

      // Check user balance
      const balance = await tokenContract.balanceOf(await signer.getAddress());
      if (balance < tokenAmountInWei) {
        throw new Error(`Insufficient ${state.tokenSymbol} balance`);
      }

      // Approval step
      setState((prev) => ({ ...prev, isApproving: true }));
      const currentAllowance = await tokenContract.allowance(
        await signer.getAddress(),
        ADDRESS
      );
      if (currentAllowance < tokenAmountInWei) {
        const approveTx = await tokenContract.approve(
          ADDRESS,
          tokenAmountInWei
        );
        await approveTx.wait();
      }
      setState((prev) => ({ ...prev, isApproving: false }));

      // Flip transaction
      const tx = await contract.flip(face, tokenAddress, tokenAmountInWei);
      const receipt = await tx.wait();

      const betSentEvent = receipt.logs
        .map((log: any) => {
          try {
            return contract.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find((event: any) => event?.name === "BetSent");

      const requestId = betSentEvent ? betSentEvent.args.requestId : null;
      return { receipt, requestId };
    } catch (error) {
      setState((prev) => ({ ...prev, isApproving: false }));
      throw error instanceof Error ? error : new Error("Failed to flip coin");
    }
  };

  const getBetStatus = async (requestId: string) => {
    const { contract } = await setupContract();
    return await contract.getBetStatus(requestId);
  };

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

      setState((prev) => ({
        ...prev,
        tokenBalance: ethers.formatUnits(balance, 18),
        tokenSymbol: symbol,
      }));
    } catch (error) {
      console.error("Error fetching token balance:", error);
    }
  }, [address, state.tokenAddress, isConnected]);

  useEffect(() => {
    fetchTokenBalance();
  }, [fetchTokenBalance]);

  const validateInput = (): string | null => {
    if (!isConnected) return "Please connect your wallet";
    if (!state.tokenAmount || parseFloat(state.tokenAmount) <= 0) {
      return "Bet amount must be positive";
    }
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
              success: "Game completed",
              loading: false,
            }));
            setIsFlipping(false);
            fetchTokenBalance(); // Update balance after flip
          }
        } catch (error) {
          clearInterval(intervalId);
          setState((prev) => ({
            ...prev,
            error: "Error checking bet status",
            loading: false,
          }));
          setIsFlipping(false);
        }
      }, 2000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [requestId, fetchTokenBalance]);

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
      fetchTokenBalance(); // Update balance after successful flip initiation
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message.includes("Token not allowed")
            ? "This token is not allowed for betting"
            : error.message.includes("Treasury has insufficient balance")
            ? error.message
            : error.message
          : "Failed to flip coin";
      setState((prev) => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
      setIsFlipping(false);
    }
  };

  const handleChoiceClick = () => {
    setState((prev) => ({ ...prev, face: !prev.face }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-purple-950">
      <div className="bg-[radial-gradient(circle_at_center,_rgba(88,28,135,0.15),_transparent_70%)] min-h-screen p-6 space-y-4">
        <appkit-button size="sm" balance="show" />
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
                  setFlipResult({ won: null, result: null });
                  setState((prev) => ({ ...prev, success: null }));
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
                  className={`w-24 h-24 rounded-full relative ${
                    isFlipping ? "animate-spin" : ""
                  }`}
                  style={{
                    perspective: "1000px",
                    transformStyle: "preserve-3d",
                  }}
                  onClick={handleChoiceClick}
                >
                  <div
                    className="absolute w-full h-full backface-hidden bg-gradient-to-br from-[#ffd700] to-[#b8860b] rounded-full flex items-center justify-center border-2 border-[#daa520] shadow-lg"
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
                      className="text-lg font-bold"
                      style={{ color: "#422006" }}
                    >
                      TAILS
                    </span>
                  </div>
                  <div
                    className="absolute w-full h-full backface-hidden bg-gradient-to-br from-[#daa520] to-[#ffd700] rounded-full flex items-center justify-center border-2 border-[#daa520] shadow-lg"
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
                      className="text-lg font-bold"
                      style={{ color: "#422006" }}
                    >
                      HEADS
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
              </div>

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