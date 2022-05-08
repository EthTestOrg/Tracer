const hre = require("hardhat");
const {traceTransaction, getTransactionMethodDetails} = require("./parseTrace");
const ARTIFACT = require("../../artifacts/contracts/Greeter.sol/Greeter.json");
const ABI = ARTIFACT.abi;

async function main() {
  const [sender, receiver] = await ethers.getSigners();
  console.log("Before");
  console.log("sender "  ,ethers.utils.formatEther(await sender.getBalance()));
  console.log("receiver ",ethers.utils.formatEther(await receiver.getBalance()));
  const tx = await sender.sendTransaction({
    to: receiver.address,
    value: ethers.utils.parseEther("1.0"), // Sends exactly 1.0 ether
  });

  console.log("EtherTransaction", tx);

  console.log("After");
  console.log("sender "  ,ethers.utils.formatEther(await sender.getBalance()));
  console.log("receiver ",ethers.utils.formatEther(await receiver.getBalance()));


 /******************************************************************/


  const Greeter = await ethers.getContractFactory("Greeter");
  const greeter = await Greeter.deploy("Hello, Hardhat!");

  await greeter.deployed();

  console.log("Greeter deployed to:", greeter.address);
  const setGreetingTx = await greeter.setGreeting("Hola, mundo!");
  // wait until the transaction is mined
  await setGreetingTx.wait();

  console.log("setGreetingTransaction", setGreetingTx);
  const parsedTrace = await traceTransaction(setGreetingTx.hash);
  console.log("\n\nsetGreetingTx Trace\n\n",parsedTrace);


  const transactionMethodDetails = getTransactionMethodDetails(setGreetingTx, ABI);
  console.log("transactionMethodDetails", transactionMethodDetails)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
