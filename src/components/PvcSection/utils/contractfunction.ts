import { ethers } from "ethers";
import { ABI, ADDRESS } from "./contract";

// Set up provider and contract for public access (read-only)
export const publicProvider = new ethers.JsonRpcProvider(
  "https://base-mainnet.g.alchemy.com/v2/os5WiDtgiyV3YXhsy2P-Cc0IX5IwFbYy"
);

export const fallbackProvider = new ethers.JsonRpcProvider(
  "https://base-mainnet.infura.io/v3/b17a040a14bc48cfb3928a73d26f3617"
);

export const publicContract = new ethers.Contract(ADDRESS, ABI, publicProvider);
export const depositToTreasury = async (
  _tokenAddress: string,
  _amount: string
) => {
  // implementation
};
// Function to set up signer and contract for wallet interaction
async function setupContractWithSigner() {
  try {
    if (window.ethereum) {
      // Type assertion to tell TypeScript that window.ethereum is Eip1193Provider
      const provider = new ethers.BrowserProvider(
        window.ethereum as unknown as ethers.Eip1193Provider
      );
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(ADDRESS, ABI, signer);
      return { signer, contract };
    } else {
      throw new Error(
        "Ethereum provider is not available. Please install a wallet like MetaMask."
      );
    }
  } catch (error) {
    console.error("Error setting up contract with signer:", error);
    throw error;
  }
}

// Function to handle contract errors with additional info
interface ContractError extends Error {
  code?: string;
  transaction?: any;
  revert?: string;
}

function handleContractError(error: ContractError) {
  if (error.code === "CALL_EXCEPTION") {
    console.error("Transaction data:", error.transaction);
    if (error.revert) {
      console.error("Revert reason:", error.revert);
    }
  } else if (error.code === "ACTION_REJECTED") {
    console.error("User rejected the action:", error);
  } else {
    console.error("Unexpected error:", error);
  }
}
// Function to monitor bet status
export const getBetStatus = async (requestId: string) => {
  try {
    const { contract } = await setupContractWithSigner();
    const status = await contract.getBetStatus(requestId);
    return status;
  } catch (error) {
    console.error("Error getting bet status:", error);
    handleContractError(error as ContractError);
    throw error;
  }
};

export const getGameOutcome = async (requestId: string) => {
  try {
    const { contract } = await setupContractWithSigner();
    const outcome = await contract.getGameOutcome(requestId);
    return outcome;
  } catch (error) {
    console.error("Error getting game outcome:", error);
    handleContractError(error as ContractError);
    throw error;
  }
};

// Function to create a new game
// export const flip = async (
//   tokenAddress: string,
//   tokenAmount: string,
//   face: boolean
// ) => {
//   try {
//     // Set up contract with signer
//     const { signer, contract } = await setupContractWithSigner();

//     console.log(
//       "Creating game with amount:",
//       tokenAmount,
//       "and token address:",
//       tokenAddress
//     );

//     // Create token contract instance
//     const tokenContract = new ethers.Contract(
//       tokenAddress,
//       [
//         // ERC-20 ABI for allowance function
//         "function allowance(address owner, address spender) external view returns (uint256)",
//         "function approve(address spender, uint256 amount) external returns (bool)",
//         "function balanceOf(address owner) external view returns (uint256)",
//       ],
//       signer
//     );

//     console.log("Token contract:", tokenContract);

//     // Convert betAmount to the correct token decimals (18 decimals)
//     const tokenAmountInWei = ethers.parseUnits(tokenAmount, 18);

//     console.log("betAmountInWei:", tokenAmountInWei.toString());

//     const Player = await signer.getAddress();

//     console.log("playeradress", Player);

//     // Step 1: Check Player 1's balance to make sure they have enough tokens
//     const balance = await tokenContract.balanceOf(await signer.getAddress());
//     console.log("Player balance:", balance.toString());

//     // Ensure the balance is sufficient
//     if (balance < tokenAmountInWei) {
//       const errorMessage = "Not enough tokens to create game";
//       console.error(errorMessage);
//       throw new Error(errorMessage);
//     }

//     // Step 3: Approve token spending to the contract address
//     const approveTx = await tokenContract.approve(ADDRESS, tokenAmountInWei);

//     console.log("Approval transaction sent, waiting for confirmation...");

//     await approveTx.wait();
//     console.log("Token approved successfully.");

//     console.log("Creating game with:", tokenAmountInWei, tokenAddress, face);

//     const allowance = await tokenContract.allowance(
//       await signer.getAddress(),
//       ADDRESS
//     );
//     console.log("Allowance for user:", allowance.toString());

//     // Step 3: Create the game by calling the contract's createGame function
//     const tx = await contract.flip(tokenAmountInWei, tokenAddress, face);
//     console.log("Game creation transaction sent, waiting for confirmation...");
//     console.log("Creating game with:", tokenAmountInWei, tokenAddress, face);

//     const receipt = await tx.wait();
//     console.log("Game created successfull:", tx);

//     return receipt;
//   } catch (error) {
//     console.error("Error creating game:", error);

//     handleContractError(error as ContractError);
//   }
// };

export const flip = async (
  tokenAddress: string,
  tokenAmount: string,
  face: boolean
) => {
  try {
    const { signer, contract } = await setupContractWithSigner();

    // Convert betAmount to the correct token decimals
    const tokenAmountInWei = ethers.parseUnits(tokenAmount, 18);

    // Create token contract instance
    const tokenContract = new ethers.Contract(
      tokenAddress,
      [
        "function allowance(address owner, address spender) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address owner) external view returns (uint256)",
      ],
      signer
    );

    // Check balance
    const balance = await tokenContract.balanceOf(await signer.getAddress());
    if (balance < tokenAmountInWei) {
      throw new Error("Insufficient token balance");
    }

    // Approve tokens
    const approveTx = await tokenContract.approve(ADDRESS, tokenAmountInWei);
    await approveTx.wait();

    // Send the flip transaction
    const tx = await contract.flip(face, tokenAddress, tokenAmountInWei);

    const receipt = await tx.wait();

    // Get the requestId from the event
    const betSentEvent = receipt.logs
      .map((log: any) => {
        try {
          return contract.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .find((event: any) => event && event.name === "BetSent");

    const requestId = betSentEvent ? betSentEvent.args.requestId : null;

    return {
      receipt,
      requestId,
    };
  } catch (error) {
    console.error("Error in flip function:", error);
    handleContractError(error as ContractError);
    throw error;
  }
};
