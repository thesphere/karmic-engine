const { expect } = require("chai");
const { ethers, deployments } = require("hardhat");
const { utils, BigNumber } = require("ethers");

const setupTest = deployments.createFixture(async ({ deployments, ethers }) => {
  await deployments.fixture();
  return await ethers.getContract("Karmic");
});

describe("Karmic", () => {
  let karmicInstance, deployer, alice, bob;

  before("get array of signers/addresses", async () => {
    [deployer, alice, bob] = await ethers.getSigners();
  });

  beforeEach("create fresh Reputation contract", async () => {
    karmicInstance = await setupTest();
  });

  describe("!deployment", () => {
    it("deploys the Reputation contract", async () => {
      const reputationInstance = await ethers.getContract("Karmic");

      expect(reputationInstance.address).to.be.properAddress;
    });
  });
});
