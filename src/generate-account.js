import { Keypair, Horizon } from "@stellar/stellar-sdk"

const server = new Horizon.Server("https://horizon-testnet.stellar.org");
const keypair = Keypair.random();

console.log(`Public key: ${keypair.publicKey()}`);
console.log(`Secret key: ${keypair.secret()}`);

const publicKey = "GCIVRS5IKPMDT3U4PB7LWYY36WR52EIZV2EAI4ODQG22WBKAFJRKPA27"

fetch(`https://friendbot.stellar.org?addr=${publicKey}`)
  .then(response => response.json())
  .then(({ successful }) => {
    if (successful) return server.loadAccount(publicKey);
  })
  .then(account => {
    if (!account) return;

    account.balances.forEach(balance => {
      const asset = balance.asset_type === "native" ? "XLM" : balance.asset_code;

      console.log(`Balance: ${balance.balance} ${asset}`);
    });
  })
