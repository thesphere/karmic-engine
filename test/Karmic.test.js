const { expect } = require("chai");
const { ethers, deployments } = require("hardhat");

const NUMBER_BOX_TOKENS = 6;
const baseUri = "www.sphere.com/";

const setupTest = deployments.createFixture(async ({ deployments, ethers }) => {
  await deployments.fixture();

  const karmicInstance = await ethers.getContract("Karmic");

  const tokenFactory = await ethers.getContractFactory("BoxToken");
  const boxTokens = [];
  for (let i = 0; i < NUMBER_BOX_TOKENS; i++) {
    const boxToken = await tokenFactory.deploy(`boxToken${i}`, `BT${1}`);
    boxTokens.push(boxToken);
  }

  return { karmicInstance, boxTokens };
});

describe("Karmic", () => {
  let karmicInstance, boxTokens, deployer, alice, bob;

  before("get array of signers", async () => {
    [deployer, alice, bob] = await ethers.getSigners();
  });

  beforeEach("setup fresh karmic contract", async () => {
    ({ karmicInstance, boxTokens } = await setupTest());
  });

  describe("#addBoxTokens", () => {
    let expectedAddresses, expectedUris;

    beforeEach(async () => {
      expectedAddresses = boxTokens.map((boxToken) => boxToken.address);
      expectedUris = boxTokens.map((boxToken, idx) => `boxToken${idx + 1}`);
    });

    context("when all conditions are fulfilled (happy path)", () => {
      beforeEach(async () => {
        await karmicInstance.addBoxTokens(expectedAddresses, expectedUris);
      });

      it("stores the tokens on the contract", async () => {
        const tokens = await karmicInstance.getBoxTokens();
        expect(tokens).to.eql(boxTokens.map((boxToken) => boxToken.address));
      });

      for (let i = 1; i <= NUMBER_BOX_TOKENS; i++) {
        it(`creates a new gov tier for boxToken${i}`, async () => {
          const uri = await karmicInstance.uri(i);
          expect(uri).to.equal(baseUri + `boxToken${i}`);
        });
      }
    });

    context("when boxToken exists already", () => {
      beforeEach(async () => {
        await karmicInstance.addBoxTokens(expectedAddresses, expectedUris);
      });

      it("reverts 'DUPLICATE_TOKEN'", async () => {
        const tx = karmicInstance.addBoxTokens(expectedAddresses, expectedUris);
        await expect(tx).to.be.revertedWith("DUPLICATE_TOKEN");
      });
    });

    context("when called by non-owner", () => {
      it("reverts 'Ownable: caller is not the owner'", async () => {
        const tx = karmicInstance
          .connect(alice)
          .addBoxTokens(expectedAddresses, expectedUris);
        await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
      });
    });
  });
});
