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


// Function to create a new game
export const createGame = async (
  tokenAddress: string,
  betAmount: string,
  player1Choice: boolean,
) => {
  try {
    // Set up contract with signer
    const { signer, contract } = await setupContractWithSigner();
    console.log("Creating game with amount:", betAmount, "and token address:", tokenAddress);

    // Create token contract instance
    const tokenContract = new ethers.Contract(
      tokenAddress,
      [
        // ERC-20 ABI for allowance function
        "function allowance(address owner, address spender) external view returns (uint256)",
        "function approve(address spender, uint256 amount) external returns (bool)",
        "function balanceOf(address owner) external view returns (uint256)",
      ],
      signer
    );
    

    console.log("Token contract:", tokenContract);

    // Convert betAmount to the correct token decimals (18 decimals)
    const betAmountInWei = ethers.parseUnits(betAmount, 18);
    console.log("betAmountInWei:", betAmountInWei.toString());

    
 const Player = await signer.getAddress();

 console.log('playeradress', Player)


    // Step 1: Check Player 1's balance to make sure they have enough tokens
    const balance = await tokenContract.balanceOf(await signer.getAddress());
    console.log("Player balance:", balance.toString());

    // Ensure the balance is sufficient
    if (balance < (betAmountInWei)) {
      const errorMessage = "Not enough tokens to create game";
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Step 2: Check if the token is supported
    const supportedTokens = await contract.supportedTokens(tokenAddress);
    if (!supportedTokens) {
      const errorMessage = "Token not supported for this game";
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Step 3: Check treasury balance to ensure it can match the bet
    const treasuryBalance = await contract.getTreasuryBalance(tokenAddress);
    console.log("Treasury balance:", treasuryBalance.toString());

    if (treasuryBalance < (betAmountInWei)) {
      const errorMessage = "Treasury has insufficient funds to match the bet";
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Step 3: Approve token spending to the contract address
    const approveTx = await tokenContract.approve(ADDRESS, betAmountInWei);
    console.log("Approval transaction sent, waiting for confirmation...");
    await approveTx.wait();
    console.log("Token approved successfully.");

    console.log("Creating game with:", betAmountInWei, tokenAddress, player1Choice);

    const allowance = await tokenContract.allowance(await signer.getAddress(), ADDRESS);
    console.log("Allowance for user:", allowance.toString());
    

    // Step 3: Create the game by calling the contract's createGame function
    const tx = await contract.createGame(
      betAmountInWei,
      tokenAddress,
      player1Choice
    );
    console.log("Game creation transaction sent, waiting for confirmation...");
    console.log("Creating game with:", betAmountInWei, tokenAddress, player1Choice);

    await tx.wait();
    console.log("Game created successfull:", tx);

  } catch (error) {
    console.error("Error creating game:", error);
    
    handleContractError(error as ContractError);
  }
};

// resolve an existing game
export const resolveGame = async (gameId: number) => {
  try {
    console.log("Attempting to resolve game with ID:", gameId);

    // Set up contract with signer
    const { signer, contract } = await setupContractWithSigner();

    console.log("Contract:", contract);
    console.log("Signer:", signer);

    // Fetch game details
    const game = await contract.games(gameId);
    console.log("Fetched game details:", game);

    // Check if the game has already been resolved or completed
    if (game.state === 2) {  // '2' corresponds to 'COMPLETED' state in the enum
      console.log(`Game with ID ${gameId} has already been completed.`);
      alert("Game has already been completed.");
      return;
    }

    // Ensure that the game state is created and can be resolved
    if (game.state !== 0) {  // Only 'CREATED' (0) games can be resolved
      console.log(`Game with ID ${gameId} is not in a valid state to be resolved.`);
      alert("Game is not in a valid state to be resolved.");
      return;
    }

    // Step 1: Get the current nonce (optional, Ethereum typically handles this automatically)
    const currentNonce = await signer.getNonce();
    console.log("Current nonce:", currentNonce);

    // Step 2: Call resolveGame function from the contract to resolve the game
    const tx = await contract.resolveGame(gameId, { nonce: currentNonce });
    console.log("Transaction sent! Hash:", tx.hash);

    // Step 3: Wait for the transaction to be confirmed
    const receipt = await tx.wait();
    if (receipt.status === 1) {
      console.log(`Game with ID ${gameId} resolved successfully.`);
      alert(`Game with ID ${gameId} resolved successfully.`);
    } else {
      console.log(`Transaction failed for Game ID: ${gameId}`);
      alert(`Transaction failed for Game ID: ${gameId}`);
    }
  } catch (error) {
    console.error("Error resolving game:", error);
    alert("An error occurred. Check the console for details.");
  }
};

// Join an existing game
export const expireGame = async (gameId: number) => {
  try {
    console.log("Attempting to join game with ID:", gameId);

    // Set up contract with signer
    const { signer, contract } = await setupContractWithSigner();

    console.log("Contract:", contract);
    console.log("Signer:", signer);

    // Fetch game details
    const game = await contract.games(gameId);
    console.log("Fetched game details:", game);

    // Check if the game has already been completed
    if (game.state === 2) { // 2 corresponds to 'COMPLETED' state
      console.log(`Game with ID ${gameId} has already been completed.`);
      alert("Game has already been completed.");
      return;
    }

    // Create token contract instance
    const tokenContract = new ethers.Contract(
      game.tokenAddress,
      [
        "function approve(address spender, uint256 amount) public returns (bool)",
        "function balanceOf(address owner) public view returns (uint256)",
      ],
      signer
    );

    // Step 1: Check Player's token balance to make sure they have enough tokens
    const balance = await tokenContract.balanceOf(await signer.getAddress());
    console.log("Player token balance:", balance.toString());

    // Check if player has enough tokens to join
    if (balance < game.betAmount) {
      console.log(`Player does not have enough balance to join the game.`);
      alert("You do not have enough balance to join the game.");
      return;
    }

    // Step 2: Approve the contract to spend the tokens
    const approveTx = await tokenContract.approve(contract.address, game.betAmount);
    await approveTx.wait();
    console.log("Token approved successfully.");

    // Step 3: Check if the player is allowed to join (this logic can be customized)
    // If needed, validate the player as Player 2 or other logic specific to your game contract

    // Step 4: Send the transaction to expire the game
    const tx = await contract.expireGame(gameId);
    
    const currentTime = Math.floor(Date.now() / 1000); // Convert to seconds
    const gameCreatedBlockTime = await contract.getGameCreatedTime(gameId); // This function would need to be added to your contract
    
    const timeElapsed = currentTime - gameCreatedBlockTime;

    if (timeElapsed < 20) {
      alert(`Wait for ${20 - timeElapsed} more seconds before joining.`);
      return;
    }

    // Wait for the transaction receipt
    const receipt = await tx.wait();
    console.log("Transaction sent! Hash:", tx.hash);
    if (receipt.status === 1) {
      console.log(`Successfully expired game with ID: ${gameId}`);
      alert(`Successfully expired game with ID: ${gameId}`);
    } else {
      console.log(`Transaction failed for Game ID: ${gameId}`);
      alert(`Transaction failed for Game ID: ${gameId}`);
    }
  } catch (error) {
    console.error("Error joining game:", error);
    alert("An error occurred. Check the console for details.");
  }
};


export const depositToTreasury = async (tokenAddress: string, depositAmount: string) => {
  try {
    // Set up contract with signer
    const { signer, contract } = await setupContractWithSigner();
    console.log("Depositing to treasury. Amount:", depositAmount, "and Token Address:", tokenAddress);

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

    // Convert depositAmount to the correct token decimals (18 decimals for most ERC-20 tokens)
    const depositAmountInWei = ethers.parseUnits(depositAmount, 18);
    console.log("Deposit amount in wei:", depositAmountInWei.toString());

    const Player = await signer.getAddress();

 console.log('playeradress', Player)

    // Step 1: Check Player's token balance
    const balance = await tokenContract.balanceOf(await signer.getAddress());
    console.log("Player's token balance:", balance.toString());

    if (balance < (depositAmountInWei)) {
      const errorMessage = "Not enough tokens to deposit";
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    // Step 2: Check allowance for the contract to spend tokens
    const allowance = await tokenContract.allowance(await signer.getAddress(), ADDRESS);
    console.log("Allowance for the contract:", allowance.toString());

    // If allowance is less than deposit amount, approve the contract to spend tokens
    if (allowance < depositAmountInWei) {
      console.log("Insufficient allowance, approving contract to spend tokens...");

      // approve token
      const approveTx = await tokenContract.approve(ADDRESS, depositAmountInWei);
      console.log("Approval transaction sent, waiting for confirmation...");
      await approveTx.wait();
      console.log("Tokens approved for deposit.");
    } else {
      console.log("Sufficient allowance, no need to approve.");
    }

    // Step 3: Deposit tokens to the treasury via the contract
    const tx = await contract.depositToTreasury(tokenAddress, depositAmountInWei);
    console.log("Deposit transaction sent, waiting for confirmation...");
    await tx.wait();

    console.log("Tokens successfully deposited to the treasury:", tx);
    alert("Deposit successful!");
  } catch (error) {
    console.error("Error depositing to treasury:", error);
    handleContractError(error as ContractError);
  }
};
