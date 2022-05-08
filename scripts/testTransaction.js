const hre = require("hardhat");
const {Tracer} = require("./tracer");

async function main() {

  const [sender, receiver] = await ethers.getSigners();

  console.log("Before");
  console.log(ethers.utils.formatEther(await sender.getBalance()));
  console.log(ethers.utils.formatEther(await receiver.getBalance()));
  const tx = await sender.sendTransaction({
    to: receiver.address,
    value: ethers.utils.parseEther("1.0"), // Sends exactly 1.0 ether
  });

  console.log("EtherTransaction", tx);

  console.log("After");
  console.log(ethers.utils.formatEther(await sender.getBalance()));
  console.log(ethers.utils.formatEther(await receiver.getBalance()));

  // console.log(Tracer);
  const tracer = new Tracer('http://localhost:8545');
  // Generates Empty trace ???
  await tracer.process(tx);
  await tracer.saveTrace();
  console.log("Ether Transfer",tracer.parsedTrace);
// ******************************************************************


  const Greeter = await ethers.getContractFactory("Greeter");
  const greeter = await Greeter.deploy("Hello, Hardhat!");

  await greeter.deployed();

  console.log("Greeter deployed to:", greeter.address);
  const setGreetingTx = await greeter.setGreeting("Hola, mundo!");
  // wait until the transaction is mined
  await setGreetingTx.wait();

  console.log("setGreetingTransaction", setGreetingTx);
  await tracer.process(setGreetingTx);
  console.log("setGreetingTx parsedTrace",tracer.parsedTrace);
  await tracer.saveTrace();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
