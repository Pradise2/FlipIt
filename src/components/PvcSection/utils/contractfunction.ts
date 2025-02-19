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

// Function to create a new game
// Function to create a new game

// Previous provider setup code remains the same...

// Add a function to check if token is approved in the contract
async function isTokenApprovedInContract(
  tokenAddress: string,
  userAddress: string
) {
  try {
    const { contract } = await setupContractWithSigner();
    return await contract.approvedTokens(userAddress, tokenAddress);
  } catch (error) {
    console.error("Error checking token approval status:", error);
    return false;
  }
}

// Add a function to approve token in the contract
async function approveTokenInContract(tokenAddress: string) {
  try {
    const { contract } = await setupContractWithSigner();
    const tx = await contract.approveToken(tokenAddress);
    await tx.wait();
    console.log("Token approved in contract with unlimited amount");
    return true;
  } catch (error) {
    console.error("Error approving token in contract:", error);
    throw error;
  }
}

// Add a function to check ERC20 allowance
async function checkTokenAllowance(tokenAddress: string, amount: string) {
  try {
    const { signer } = await setupContractWithSigner();
    const tokenContract = new ethers.Contract(
      tokenAddress,
      [
        "function allowance(address owner, address spender) public view returns (uint256)",
      ],
      signer
    );

    const userAddress = await signer.getAddress();
    const allowance = await tokenContract.allowance(userAddress, ADDRESS);
    const requiredAmount = ethers.parseUnits(amount, 18);

    return allowance >= requiredAmount;
  } catch (error) {
    console.error("Error checking token allowance:", error);
    return false;
  }
}

// Updated flip function with proper approval flow
export const flip = async (
  tokenAddress: string,
  tokenAmount: string,
  face: boolean
) => {
  try {
    const { signer, contract } = await setupContractWithSigner();
    const userAddress = await signer.getAddress();
    const betAmountInWei = ethers.parseUnits(tokenAmount, 18);

    // Step 1: Check if token is approved in the contract
    const isApprovedInContract = await isTokenApprovedInContract(
      tokenAddress,
      userAddress
    );
    // Inside flip function, after checking token approval
    if (!isApprovedInContract) {
      console.log("Token not approved in contract, approving...");
      try {
        await approveTokenInContract(tokenAddress);
      } catch (approvalError) {
        throw new Error(
          "Failed to approve token for betting: " +
            (approvalError as Error).message
        );
      }
    }

    // Step 2: Check and set token allowance
    const hasAllowance = await checkTokenAllowance(tokenAddress, tokenAmount);
    if (!hasAllowance) {
      console.log("Setting token allowance...");
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          "function approve(address spender, uint256 amount) public returns (bool)",
        ],
        signer
      );

      const approveTx = await tokenContract.approve(ADDRESS, betAmountInWei);
      await approveTx.wait();
      console.log("Token allowance set successfully");
    }

    // Step 3: Check balance
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ["function balanceOf(address owner) public view returns (uint256)"],
      signer
    );

    const balance = await tokenContract.balanceOf(userAddress);
    if (balance < betAmountInWei) {
      throw new Error("Insufficient token balance");
    }

    // Step 4: Execute the flip
    console.log("Creating game with amount:", tokenAmount, "and face:", face);
    const tx = await contract.flip(face, tokenAddress, betAmountInWei);
    const receipt = await tx.wait();
    console.log("Game created successfully:", receipt);

    return receipt;
  } catch (error: any) {
    console.error("Error creating game:", error);

    // Enhanced error handling
    if (error.code === "CALL_EXCEPTION") {
      if (error.reason?.includes("Token not allowed")) {
        throw new Error("This token is not allowed for betting");
      } else if (error.reason?.includes("Please approve")) {
        throw new Error("Token approval failed. Please try again");
      } else if (error.reason?.includes("Insufficient")) {
        throw new Error("Insufficient token balance");
      }
    } else if (error.code === "ACTION_REJECTED") {
      throw new Error("Transaction rejected by user");
    }

    throw error;
  }
};
