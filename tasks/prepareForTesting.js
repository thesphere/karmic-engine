const { task } = require("hardhat/config");
const { ethers } = require("ethers");

/*
  deploys three test tokens
  mints 1000 units of each test token to address of recipient
  adds token addresses to karmic 
*/

const TOKENS = 3;
const AMOUNT = ethers.utils.parseEther("1000");

task("prepare", "Prepares")
  .addParam("recipient", "receives box tokens", undefined, types.string)
  .setAction(async ({ recipient }, hre) => {
    const [deployer] = await hre.ethers.getSigners();

    const boxTokenFactory = await hre.ethers.getContractFactory("BoxToken");
    const karmicInstance = await hre.ethers.getContract("Karmic");

    const boxTokenAddresses = [];

    for (let i = 0; i < TOKENS; i++) {
      const boxTokenInstance = await boxTokenFactory.deploy(
        `token_${i}`,
        `T${i}`
      );
      await boxTokenInstance.mint(recipient, AMOUNT);
      boxTokenAddresses.push(boxTokenInstance.address);
    }

    await karmicInstance.addBoxTokens(boxTokenAddresses);

    console.log(await karmicInstance.getBoxTokens());
  });