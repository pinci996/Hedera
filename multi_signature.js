import { TransferTransaction, Hbar, HbarUnit, Client, AccountAllowanceApproveTransaction, PrivateKey, AccountId, TransactionId, AccountBalanceQuery } from '@hashgraph/sdk'


// Acount 1
const account1 = PrivateKey.fromString("1723a6c82f58befa5cff1ec02113243d9caa172090b22f590acca28c45ccc6ee")
const account1Id = "0.0.49354686"

// Acount 2
const account2 = PrivateKey.fromString("815e555357e26a34fa1bb390f0c0f6c4233f947c494fe4b58c358f4cb5b42d2a")
const account2Id = "0.0.49354687"

// Acount 3
const account3 = PrivateKey.fromString("e94108ef9e3ee28e623ea74a7b4f778cee8813d5288fa32bec919fe60a745c7c")
const account3Id = "0.0.49354688"


const client = Client.forTestnet();
client.setOperator(account2Id, account2);
client.setDefaultMaxTransactionFee(new Hbar(10));

async function createAllowance() {
    const tx = await new AccountAllowanceApproveTransaction()
        .approveHbarAllowance(account1Id, account2Id, new Hbar(20))
        .freezeWith(client)
        .sign(account1);

    const allowanceSubmit = await tx.execute(client);
    return await allowanceSubmit.getReceipt(client);
}

async function spendAllowance() {
    const approvedSendTx = await new TransferTransaction()
        .addApprovedHbarTransfer(account1Id, new Hbar(-20))
        .addHbarTransfer(account3Id, new Hbar(20))
        .setTransactionId(TransactionId.generate(account2Id))
        .freezeWith(client)
        .sign(account2);

    const approvedSendSubmit = await approvedSendTx.execute(client);
    return await approvedSendSubmit.getReceipt(client);
}

async function printBalance(accountId) {
    let balanceCheckTx = await new AccountBalanceQuery().setAccountId(accountId).execute(client);
    console.log(`- Account ${accountId}: ${balanceCheckTx.hbars.toString()}`);
}

async function main() {
    await createAllowance();
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await printBalance(account1Id);
    await printBalance(account2Id);
    await printBalance(account3Id);

    await spendAllowance();
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await printBalance(account1Id);
    await printBalance(account2Id);
    await printBalance(account3Id);
    process.exit()
}

main().catch((error) => console.log(`Error: ${error}`))