import { Client, TransferTransaction } from '@hashgraph/sdk'
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


async function fundAccounts(from, to, amount, client) {
  const trx = await new TransferTransaction()
    .addHbarTransfer(from.id, -amount)
    .addHbarTransfer(to.id, amount)
    .execute(client)

  const receipt = await trx.getReceipt(client)

  console.log(`Receipt: ${receipt.status}`);
}

async function main() {
  const accountList = await readFromFile('accounts.json');
  const accountId = process.env.MY_ACCOUNT_ID;
  console.log("Accountid", accountId);
  const privateKey = process.env.MY_PRIVATE_KEY;

  const client = Client.forName('testnet');
  client.setOperator(accountId, privateKey);

  for await (const acc of accountList) {
    await fundAccounts({ id: accountId }, acc, 500, client)
  }
}

dotenv.config()

await main()

process.exit(0)