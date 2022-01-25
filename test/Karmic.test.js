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
      expectedUris = boxTokens.map((boxToken, idx) => `boxToken${idx+1}`);
    });

    context("when all conditions are fulfilled (happy path)", () => {
      beforeEach(async () => {
        await karmicInstance.addBoxTokens(expectedAddresses, expectedUris);
      });

      it("stores the tokens on the contract", async () => {
        const tokens = await karmicInstance.getBoxTokens();
        expect(tokens).to.eql(boxTokens.map((boxToken) => boxToken.address).concat(['0x0000000000000000000000000000000000000000']));
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

  describe("#claimGovernanceTokens", () => {
    const boxesAmounts = [ethers.utils.parseEther("50"), ethers.utils.parseEther("100"), ethers.utils.parseEther("150"), ethers.utils.parseEther("10")];
    const boxesPayments = [ethers.utils.parseEther("1"), ethers.utils.parseEther("1.5"), ethers.utils.parseEther("2"), ethers.utils.parseEther("0.5")];
    let aliceBalanceBeforeWithdrawal;
    let aliceBalanceAfterWithdrawal;

    context("when all conditions are fulfilled (happy path)", () => {
      beforeEach("add box tokens to Karmic", async () => {
        const expectedAddresses = boxTokens.map((boxToken) => boxToken.address);
        const expectedUris = boxTokens.map(
          (boxToken, idx) => `boxToken${idx}`
        );
        await karmicInstance.addBoxTokens(expectedAddresses, expectedUris);
      });

      beforeEach("mint box tokens to alice and approve Karmic", async () => {
        for(let i = 0; i < boxesPayments.length; i++) {
          await boxTokens[i].mint(alice.address, boxesAmounts[i]);
          await boxTokens[i]
              .connect(alice)
              .approve(karmicInstance.address, boxesAmounts[i]);
          await alice.sendTransaction({
            to: boxTokens[i].address,
            value: boxesPayments[i],
          });
          await boxTokens[i].pay(karmicInstance.address, boxesPayments[i]);
        }
      });

      it("reverts 'Can withdraw only funds for tokens that didn't pass threshold'", async () => {
        await expect(karmicInstance.withdraw(boxTokens[0].address, boxesAmounts[0])).
          to.be.revertedWith("Can withdraw only funds for tokens that didn't pass threshold");
      });

      beforeEach("call claimGovernanceTokens", async () => {
        await karmicInstance
          .connect(alice)
          .claimGovernanceTokens([boxTokens[0].address, boxTokens[1].address]);
      });

      beforeEach("call bondToMint", async () => {
        await karmicInstance
            .connect(alice)
            .bondToMint(boxTokens[2].address, boxesAmounts[2]);
      });

      beforeEach("Withdraw half and mint half", async() => {
        await karmicInstance
            .connect(alice)
            .bondToMint(boxTokens[3].address, boxesAmounts[3].div(2));
        aliceBalanceBeforeWithdrawal = await alice.getBalance();
        await karmicInstance
            .connect(alice)
            .withdraw(boxTokens[3].address, boxesAmounts[3].div(2));
      })



      it("mints the correct amount of gov tokens to alice", async () => {
        const firstGovTokenAmount = await karmicInstance.balanceOf(
          alice.address,
          1
        );
        const secondGovTokenAmount = await karmicInstance.balanceOf(
          alice.address,
          2
        );
        const thirdGovTokenAmount = await karmicInstance.balanceOf(
          alice.address,
          3
        );
        const fourthGovTokenAmount = await karmicInstance.balanceOf(
            alice.address,
            0
        );

        expect(firstGovTokenAmount).to.equal(boxesAmounts[0]);
        expect(secondGovTokenAmount).to.equal(boxesAmounts[1]);
        expect(thirdGovTokenAmount).to.equal(boxesAmounts[2]);
        expect(fourthGovTokenAmount).to.equal(boxesAmounts[3].div(2));
      });

      it("removes the box tokens from alice", async () => {
        const amountBoxTokens1 = await boxTokens[0].balanceOf(alice.address);
        const amountBoxTokens2 = await boxTokens[1].balanceOf(alice.address);
        const amountBoxTokens3 = await boxTokens[2].balanceOf(alice.address);
        aliceBalanceAfterWithdrawal = await alice.getBalance();

        expect(amountBoxTokens1).to.equal(0);
        expect(amountBoxTokens2).to.equal(0);
        expect(amountBoxTokens3).to.equal(0);
        expect(Number(aliceBalanceBeforeWithdrawal.sub(aliceBalanceAfterWithdrawal))).to.be.lessThan(0);
      });
    });
  });
});
