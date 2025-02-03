import { Hbar, TransferTransaction, Client, ScheduleCreateTransaction, PrivateKey, Transaction } from '@hashgraph/sdk'
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

async function main() {
  const serializedTx = await createScheduled()
  const receipt = await processScheduled(serializedTx)
  console.log('Successfully created and executed scheduled transaction with status', receipt.status)
}

async function createScheduled() {
  // Load accounts and setup client
  const accs = await readFromFile('accounts.json');
  const acc1 = accs[0]
  const acc2 = accs[1]

  const client = Client.forName('testnet')
  client.setOperator(acc1.id, acc1.privateKey)

  // Create a child transaction to nest in the scheduled
  const trx = new TransferTransaction()
    .addHbarTransfer(acc1.id, new Hbar(-10))
    .addHbarTransfer(acc2.id, new Hbar(10))

  const scheduleTransaction = new ScheduleCreateTransaction()
    .setScheduledTransaction(trx)
    .setScheduleMemo('Take this')
    .setAdminKey(PrivateKey.fromString(acc1.privateKey))
    .freezeWith(client)

  const serialized = Buffer.from(scheduleTransaction.toBytes()).toString('hex')

  console.log('Serialized transaction:', serialized)

  return serialized
}

async function processScheduled(serializedTx) {
  const accs = await readFromFile('accounts.json');
  const acc1 = accs[0]
  const client = Client.forName('testnet')
  client.setOperator(acc1.id, acc1.privateKey)

  // Deserialize the transaction
  const txn = Transaction.fromBytes(Buffer.from(serializedTx, 'hex'))

  txn.sign(PrivateKey.fromString(acc1.privateKey))

  const executed = await txn.execute(client)

  return executed.getReceipt(client)
}

await main()