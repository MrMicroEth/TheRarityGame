// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

let fee = ethers.utils.parseEther("0.1") // this should be pulled from contract
async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

let fee = ethers.utils.parseEther("0.1") // this should be pulled from contract
  const Rarity = await ethers.getContractFactory("Rarity");
  const rarity = await Rarity.deploy(4, fee, 9);

  await rarity.deployed();

  console.log("rarity deployed to:", rarity.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
