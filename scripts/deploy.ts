// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";

async function main() {
  let accounts = await ethers.getSigners();
  let deployer, alice, aliceSecondKey, bob;
  [deployer, alice, aliceSecondKey, bob] = accounts;

  const EthereumDIDRegistry = await ethers.getContractFactory("EthereumDIDRegistry");
  const registerInstance = await EthereumDIDRegistry.deploy();
  await registerInstance.deployed();
  console.log("EthereumDIDRegistry deployed to:", registerInstance.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
