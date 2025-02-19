import { useState } from "react";
import { depositToTreasury } from "../utils/contractfunction"; // Import the deposit function

const TreasuryDeposit = () => {
  const [tokenAddress, setTokenAddress] = useState(""); // State for token address input
  const [amount, setAmount] = useState(""); // State for amount input
  const [status, setStatus] = useState(""); // Status message (success/error)
  const [loading, setLoading] = useState(false); // Loading state (while transaction is processing)

  // Handle deposit button click
  const handleDeposit = async () => {
    try {
      setLoading(true); // Set loading to true while transaction is being processed
      setStatus("Processing deposit...");

      // Call depositToTreasury function (your implementation of deposit logic)
      await depositToTreasury(tokenAddress, amount);

      // On success, update the status
      setStatus("Deposit successful!");
    } catch (error: unknown) {
      // Make sure to type error as `unknown`
      // Check if the error is an instance of Error
      if (error instanceof Error) {
        setStatus("Error: " + error.message); // Safely access error.message
      } else {
        // If it's not an instance of Error, handle it differently
        setStatus("Unknown error occurred.");
      }
    } finally {
      // Reset loading state after transaction is finished
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-semibold text-center mb-6">
        Deposit Tokens to Treasury
      </h2>

      {/* Token Address Input */}
      <div className="mb-4">
        <label
          htmlFor="tokenAddress"
          className="block text-sm font-medium text-gray-700"
        >
          Token Address:
        </label>
        <input
          type="text"
          id="tokenAddress"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          placeholder="Enter Token Contract Address"
          className="mt-1 px-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Deposit Amount Input */}
      <div className="mb-4">
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700"
        >
          Amount to Deposit:
        </label>
        <input
          type="number"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount to Deposit"
          className="mt-1 px-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Deposit Button */}
      <div className="mb-4">
        <button
          onClick={handleDeposit}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md disabled:opacity-50 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {loading ? "Processing..." : "Deposit"}
        </button>
      </div>

      {/* Status Message */}
      <div>
        {status && (
          <p
            className={`text-center ${
              status.includes("Error") ? "text-red-600" : "text-green-600"
            }`}
          >
            {status}
          </p>
        )}
      </div>
    </div>
  );
};

export default TreasuryDeposit;
