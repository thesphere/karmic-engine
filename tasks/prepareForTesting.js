const { task } = require("hardhat/config");
const { ethers } = require("ethers");

/*
  deploys six test tokens
  mints 1000 units of two test token to address of recipient
  adds token addresses to karmic 
*/

const TOTAL_TOKENS = 6;
const TOKENS = 2;
const AMOUNT = ethers.utils.parseEther("1000");

task("prepare", "Prepares")
  .addParam("recipient", "receives box tokens", undefined, types.string)
  .setAction(async ({ recipient }, hre) => {
    const [deployer] = await hre.ethers.getSigners();

    const boxTokenFactory = await hre.ethers.getContractFactory("BoxToken");

    const karmicInstance = await hre.ethers.getContract("Karmic");
    const boxTokenAddresses = [];
    const boxTokenMetadataUris = [];
    const boxTokenThresholds = [];
    const boxTokens = [];
    const boxPromises = [];

    for (let i = 0; i < TOTAL_TOKENS; i++) {
      const boxTokenInstance = await boxTokenFactory.deploy(
        `token_${i}`,
        `T${i}`
      );

      if (i < TOKENS) {
        boxPromises.push(boxTokenInstance.mint(recipient, AMOUNT, {value: AMOUNT.div(1000)}));
      } else {
        boxPromises.push(boxTokenInstance.mint(recipient, AMOUNT.div(10), {value: AMOUNT.div(10000)}));
      }

      boxTokens.push(boxTokenInstance);
      boxTokenAddresses.push(boxTokenInstance.address);
      boxTokenMetadataUris.push(`metadata.json`);
      boxTokenThresholds.push(AMOUNT.div(1000))
    }

    await Promise.all(boxPromises);
    await karmicInstance.addBoxTokens(boxTokenAddresses, boxTokenMetadataUris, boxTokenThresholds);

    for(let i = 0; i<TOTAL_TOKENS; i++) {
      if (i < TOKENS) {
        await boxTokens[i].pay(karmicInstance.address, AMOUNT.div(1000));
      } else {
        await boxTokens[i].pay(karmicInstance.address, AMOUNT.div(10000));
      }
    }

    console.log("contracts were prepared for testing");
  });
