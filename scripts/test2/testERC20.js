const hre = require("hardhat");
const {traceTransaction, getTransactionMethodDetails} = require("./parseTrace");
const ABI = (require("../../artifacts/contracts/ERC20Mintable.sol/ERC20Mintable.json")).abi;

async function main() {
//   const [sender, receiver] = await ethers.getSigners();
//   console.log("Before");
//   console.log("sender "  ,ethers.utils.formatEther(await sender.getBalance()));
//   console.log("receiver ",ethers.utils.formatEther(await receiver.getBalance()));
//   const tx = await sender.sendTransaction({
//     to: receiver.address,
//     value: ethers.utils.parseEther("1.0"), // Sends exactly 1.0 ether
//   });

//   console.log("EtherTransaction", tx);

//   console.log("After");
//   console.log("sender"  ,ethers.utils.formatEther(await sender.getBalance()));
//   console.log("receiver",ethers.utils.formatEther(await receiver.getBalance()));


  // Generates Empty trace ???
//   await tracer.process(tx);
//   console.log("Ether Transfer parsedTrace",tracer.parsedTrace);
//   await tracer.saveTrace();

 /******************************************************************/


  const ERC20Mintable = await ethers.getContractFactory("ERC20Mintable");
  const erc20Mintable = await ERC20Mintable.deploy();

  await erc20Mintable.deployed();

  console.log("erc20Mintable deployed to:", erc20Mintable.address);
  await console.log("Total Supply: ", await erc20Mintable.totalSupply());

  const getTokenTx = await erc20Mintable.getToken();
  await getTokenTx.wait();
  console.log("getTokenTx", getTokenTx);

  await console.log("Total Supply: ", await erc20Mintable.totalSupply());

  const parsedTrace = await traceTransaction(getTokenTx.hash);
  console.log("Parsed Trace", parsedTrace);
  
  const transactionMethodDetails = getTransactionMethodDetails(getTokenTx, ABI);
  console.log("transactionMethodDetails", transactionMethodDetails);

  const jsonInterface = new ethers.utils.Interface(ABI);
  const transactionDescription = jsonInterface.parseTransaction({ data: parsedTrace[0].input });
  console.log("transactionDescription",transactionDescription);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
