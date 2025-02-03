import { TransferTransaction, Wallet, Client, TokenCreateTransaction, AccountBalanceQuery, TokenUnpauseTransaction, TokenPauseTransaction, TokenType, TokenSupplyType, TokenAssociateTransaction, PrivateKey } from "@hashgraph/sdk";
import dotenv from 'dotenv'
dotenv.config()
import fs from 'fs'


/**
 * Attempts to return an array of account IDs from the specified file.
 * Returns an empty array if the file doesn't exist
 * @param {string} filePath
 * @returns {Promise<Array<string>>}
 */
export async function readFromFile(filePath) {
    try {
      const accs = fs.readFileSync(filePath)
      return JSON.parse(accs)?.accounts
    } catch (error) {
      return []
    }
  }

async function createToken({ name, symbol, initialSupply, maxSupply }, treasuryAccount, supplyAccount) {
  const supplyUser = new Wallet(
    supplyAccount.id,
    supplyAccount.privateKey
  )

  const client = Client.forName('testnet');
  client.setOperator(treasuryAccount.id, treasuryAccount.privateKey);

  let tokenCreateTx = await new TokenCreateTransaction()
    .setTokenName(name)
    .setTokenSymbol(symbol)
    .setTokenType(TokenType.FungibleCommon)
    .setDecimals(2)
    .setInitialSupply(initialSupply)
    .setTreasuryAccountId(treasuryAccount.id)
    .setSupplyType(TokenSupplyType.Finite)
    .setSupplyKey(supplyUser.publicKey)
    .setMaxSupply(maxSupply)
    .setPauseKey(supplyUser.publicKey)
    .freezeWith(client);

  let tokenCreateSign = await tokenCreateTx.sign(PrivateKey.fromString(treasuryAccount.privateKey));
  let tokenCreateSubmit = await tokenCreateSign.execute(client);
  let tokenCreateRx = await tokenCreateSubmit.getReceipt(client);

  let tokenId = tokenCreateRx.tokenId;

  console.log(`- Created token with ID: ${tokenId} \n`);

  return tokenId;
}


/**
 * 
 * @param {string} tokenId Token ID (0.0.xxx)
 * 
 * @typedef {Object} account
 * @property {string} id Account ID
 * @property {string} privateKey Private key
 * @property {string} publicKey Public key
 * @param {account} account Object containing ID, private key, public key
 * @param {account} treasury Object containing ID, private key, public key
 * 
 * @returns {Promise<Object>} Returns receipt object
 */
export async function associateTokenToAccount(tokenId, account, treasury) {
  const client = Client.forName('testnet');
  client.setOperator(treasury.id, treasury.privateKey);

  const transaction = await new TokenAssociateTransaction()
    .setAccountId(account.id)
    .setTokenIds([tokenId])
    .freezeWith(client)
    .sign(PrivateKey.fromString(account.privateKey));

  const transactionSubmit = await transaction.execute(client);

  const transactionReceipt = await transactionSubmit.getReceipt(client);

  console.log(`- Token association with account ${account.id}: ${transactionReceipt.status} \n`);

  return transactionReceipt;
}

/**
 * 
 * @param {string} tokenId Token ID (0.0.xxx)
 * 
 * @typedef {Object} account
 * @property {string} id Account ID
 * @property {string} privateKey Private key
 * @property {string} publicKey Public key
 * @param {account} from Object containing ID, private key, public key
 * @param {account} to Object containing ID, private key, public key
 * @param {number} amount Amount of Tokens to send
 */
async function sendTokens(tokenId, from, to, amount) {
  const client = Client.forName('testnet');
  client.setOperator(from.id, from.publicKey);

  const senderBalance = await new AccountBalanceQuery().setAccountId(from.id).execute(client);
  console.log(`- Sender balance: ${senderBalance.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
  const receiverBalance = await new AccountBalanceQuery().setAccountId(to.id).execute(client);
  console.log(`- Receiver balance: ${receiverBalance.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);

  let tokenTransferTx;
  let tokenTransferSubmit;
  let tokenTransferRx;
  try {
    tokenTransferTx = await new TransferTransaction()
      .addTokenTransferWithDecimals(tokenId, from.id, -amount, 2)
      .addTokenTransferWithDecimals(tokenId, to.id, amount, 2)
      .setMaxTransactionFee(amount)
      .freezeWith(client)
      .sign(PrivateKey.fromString(from.privateKey));

    tokenTransferSubmit = await tokenTransferTx.execute(client);

    tokenTransferRx = await tokenTransferSubmit.getReceipt(client);
  } catch (error) {
    console.log('\n- Could not transfer tokens')
    return null
  }

  console.log(`\n- Stablecoin transfer from Treasury to ${to.id}: ${tokenTransferRx.status} \n`);

  const senderBalance2 = await new AccountBalanceQuery().setAccountId(from.id).execute(client);
  console.log(`- Sender balance: ${senderBalance2.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);
  const receiverBalance2 = await new AccountBalanceQuery().setAccountId(to.id).execute(client);
  console.log(`- Receiver balance: ${receiverBalance2.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`);

  return tokenTransferRx
}

async function pauseToken(tokenId, supplyUser) {
  const client = Client.forName('testnet');
  client.setOperator(supplyUser.id, supplyUser.privateKey);

  const transaction = await new TokenPauseTransaction()
    .setTokenId(tokenId)
    .freezeWith(client);

  const signTx = await transaction.sign(PrivateKey.fromString(supplyUser.publicKey));
  const txResponse = await signTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  const transactionStatus = receipt.status;

  console.log("The transaction consensus status " + transactionStatus.toString());

  return receipt;
}

async function unpauseToken(tokenId, supplyUser) {
  const client = Client.forName('testnet');
  client.setOperator(supplyUser.id, supplyUser.privateKey);

  const transaction = new TokenUnpauseTransaction()
    .setTokenId(tokenId)
    .freezeWith(client);

  const signTx = await transaction.sign(PrivateKey.fromString(supplyUser.publicKey));

  const txResponse = await signTx.execute(client);

  const receipt = await txResponse.getReceipt(client);

  const transactionStatus = receipt.status;

  console.log("The transaction consensus status " + transactionStatus.toString());

  return receipt;
}

async function main() {
  const accountList = await readFromFile('accounts.json');

  const treasuryAccount = accountList[0]
  const supplyAccount = accountList[1]

  const tokenId = await createToken({
    name: "Barrage GIGA Token v2",
    symbol: "BGT",
    initialSupply: 35050,
    maxSupply: 50000
  }, treasuryAccount, supplyAccount);

  const account3 = accountList[2]
  const account4 = accountList[3]

  await associateTokenToAccount(tokenId, account3, treasuryAccount)
  await associateTokenToAccount(tokenId, account4, treasuryAccount)

  await sendTokens(tokenId, treasuryAccount, account3, 2525)
  await sendTokens(tokenId, treasuryAccount, account4, 2525)

  await pauseToken(tokenId, supplyAccount)
  await sendTokens(tokenId, treasuryAccount, account4, 135)

  await unpauseToken(tokenId, supplyAccount)
  await sendTokens(tokenId, treasuryAccount, account4, 135)
}

await main();

process.exit(0)