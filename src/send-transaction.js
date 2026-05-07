import { Keypair, Horizon, TransactionBuilder, Networks, Operation, Asset, BASE_FEE } from "@stellar/stellar-sdk"

const server = new Horizon.Server("https://horizon-testnet.stellar.org");
const keypair = Keypair.fromSecret("KEY_HERE");
const publicKey = keypair.publicKey();
const destinationPublicKey = "GBFAIH5WKAJQ77NG6BZG7TGVGXHPX4SQLIJ7BENJMCVCZSUZPSISCLU5";

server.loadAccount(publicKey)
  .then(sourceAccount => {
    const transaction = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.payment({
        destination: destinationPublicKey,
        asset: Asset.native(),
        amount: "10",
      }))
      .setTimeout(30)
      .build();

    transaction.sign(keypair);

    return server.submitTransaction(transaction);
  })
  .then(result => {
    console.log(`Hash: ${result.hash}`);
  })
