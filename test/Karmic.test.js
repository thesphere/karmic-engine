const { expect } = require("chai");
const { parseUnits } = require("ethers/lib/utils");
const { ethers, deployments } = require("hardhat");

const NUMBER_BOX_TOKENS = 6;
const baseUri = "ipfs://";
const defaultTokenMetadata = 'defaultToken';
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const tokensPerEth = 1000;

const setupTest = deployments.createFixture(async ({ deployments, ethers }) => {
  await deployments.fixture();

  const karmicInstance = await ethers.getContract("Karmic");

  const tokenFactory = await ethers.getContractFactory("BoxToken");
  const boxTokens = [];
  const thresholds = [];
  for (let i = 0; i < NUMBER_BOX_TOKENS; i++) {
    const boxToken = await tokenFactory.deploy(`boxToken${i}`, `BT${1}`);
    boxTokens.push(boxToken);
    thresholds.push(ethers.utils.parseEther("1"));
  }

  return { karmicInstance, boxTokens, thresholds };
});

describe("Karmic", () => {
  const boxesAmounts = [
    ethers.utils.parseEther("1000"),
    ethers.utils.parseEther("1500"),
    ethers.utils.parseEther("2000"),
    ethers.utils.parseEther("500"),
  ];

  let karmicInstance, boxTokens, thresholds, deployer, alice, bob;

  before("get array of signers", async () => {
    [deployer, alice, bob] = await ethers.getSigners();
  });

  beforeEach("setup fresh karmic contract", async () => {
    ({ karmicInstance, boxTokens, thresholds } = await setupTest());
  });

  describe("#addBoxTokens", () => {
    let expectedAddresses, expectedUris;

    beforeEach(async () => {
      expectedAddresses = boxTokens.map((boxToken) => boxToken.address);
      expectedUris = boxTokens.map((boxToken, idx) => `boxToken${idx + 1}`);
    });

    context("when all conditions are fulfilled (happy path)", () => {
      beforeEach(async () => {
        await karmicInstance.addBoxTokens(
          expectedAddresses,
          expectedUris,
          thresholds
        );
      });

      it("stores the tokens on the contract", async () => {
        const tokens = await karmicInstance.getBoxTokens();
        expect(tokens).to.eql(
          boxTokens
            .map((boxToken) => boxToken.address)
            .concat(["0x0000000000000000000000000000000000000000"])
        );
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
        await karmicInstance.addBoxTokens(
          expectedAddresses,
          expectedUris,
          thresholds
        );
      });

      it("reverts 'DUPLICATE_TOKEN'", async () => {
        const tx = karmicInstance.addBoxTokens(
          expectedAddresses,
          expectedUris,
          thresholds
        );
        await expect(tx).to.be.revertedWith("DUPLICATE_TOKEN");
      });
    });

    context("when called by non-owner", () => {
      it("reverts 'Ownable: caller is not the owner'", async () => {
        const tx = karmicInstance
          .connect(alice)
          .addBoxTokens(expectedAddresses, expectedUris, thresholds);
        await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
      });
    });
  });

  describe("#updateFees", () => {
    const newFees = ethers.utils.parseUnits("0.05", 18);
    context(" when called by non-owner", () => {
      it("can only be updated by owner", async () => {
        await expect(
          karmicInstance.connect(alice).setFee(newFees)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });
    });
    context(" when called by owner", () => {
      it("successfully updates the fees", async () => {
        await karmicInstance.setFee(newFees);
        expect((await karmicInstance.fee()).eq(newFees)).to.be.true;
      });
    });
  });

  describe("#withdraw", () => {
    context("when contract is paused", () => {
      it("reverts 'Pausable: paused'", async () => {
        await karmicInstance.pause();
        await expect(
          karmicInstance.withdraw(boxTokens[0].address, boxesAmounts[0])
        ).to.be.revertedWith("Pausable: paused");
      });
    });
  });

  // describe()

  describe("#claimGovernanceTokens", () => {
    const boxesPayments = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1.5"),
      ethers.utils.parseEther("2"),
      ethers.utils.parseEther("0.5"),
    ];
    const karmicDonation = ethers.utils.parseEther("4");
    let aliceBalanceBeforeWithdrawal;
    let aliceBalanceAfterWithdrawal;

    context("when contract is paused", () => {
      beforeEach("add box tokens to Karmic", async () => {
        const expectedAddresses = boxTokens.map((boxToken) => boxToken.address);
        const expectedUris = boxTokens.map((boxToken, idx) => `boxToken${idx}`);
        await karmicInstance.addBoxTokens(
          expectedAddresses,
          expectedUris,
          thresholds
        );
      });

      beforeEach("mint box tokens to alice and approve Karmic", async () => {
        for (let i = 0; i < boxesPayments.length; i++) {
          await boxTokens[i].mint(alice.address, boxesAmounts[i]);
          await alice.sendTransaction({
            to: boxTokens[i].address,
            value: boxesPayments[i],
          });
          await boxTokens[i]
            .connect(alice)
            .approve(karmicInstance.address, boxesAmounts[i].mul(1000));
          await boxTokens[i].pay(karmicInstance.address, boxesPayments[i]);
        }
        await alice.sendTransaction({
          to: karmicInstance.address,
          value: karmicDonation,
        });
      });

      beforeEach("activate failsafe", async () => {
        await karmicInstance.pause();
      });

      it("reverts 'Pausable: paused'", async () => {
        await expect(
          karmicInstance
            .connect(alice)
            .claimGovernanceTokens([boxTokens[0].address, boxTokens[1].address])
        ).to.be.revertedWith("Pausable: paused");
      });
    });

    context("when all conditions are fulfilled (happy path)", () => {
      beforeEach("add box tokens to Karmic", async () => {
        const expectedAddresses = boxTokens.map((boxToken) => boxToken.address);
        const expectedUris = boxTokens.map((boxToken, idx) => `boxToken${idx}`);
        await karmicInstance.addBoxTokens(
          expectedAddresses,
          expectedUris,
          thresholds
        );
      });

      beforeEach("mint box tokens to alice and approve Karmic", async () => {
        for (let i = 0; i < boxesPayments.length; i++) {
          await boxTokens[i].mint(alice.address, boxesAmounts[i]);
          await alice.sendTransaction({
            to: boxTokens[i].address,
            value: boxesPayments[i],
          });
          await boxTokens[i]
            .connect(alice)
            .approve(karmicInstance.address, boxesAmounts[i].mul(1000));
          await boxTokens[i].pay(karmicInstance.address, boxesPayments[i]);
        }
        await alice.sendTransaction({
          to: karmicInstance.address,
          value: karmicDonation,
        });
      });

      it("reverts 'Can withdraw only funds for tokens that didn't pass threshold'", async () => {
        await expect(
          karmicInstance.withdraw(boxTokens[0].address, boxesAmounts[0])
        ).to.be.revertedWith(
          "Can withdraw only funds for tokens that didn't pass threshold"
        );
      });

      it(" reverts 'It is not a box token'", async () => {
        await expect(
          karmicInstance.withdraw(ZERO_ADDRESS, boxesAmounts[0])
        ).to.be.revertedWith("It is not a box token");
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

      beforeEach("Withdraw half and mint half", async () => {
        await karmicInstance
          .connect(alice)
          .bondToMint(boxTokens[3].address, boxesAmounts[3].div(2));
        aliceBalanceBeforeWithdrawal = await alice.getBalance();
        await karmicInstance
          .connect(alice)
          .withdraw(boxTokens[3].address, boxesAmounts[3].div(2));
      });

      it("can't mint box tokens", async () => {
        await expect(
          karmicInstance.connect(deployer).mint(bob.address, 1, boxesAmounts[0])
        ).to.be.revertedWith("only on general tokens");
      });

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
          4
        );
        const fifthGovTokenAmount = await karmicInstance.balanceOf(
          alice.address,
          0
        );

        expect(firstGovTokenAmount).to.equal(boxesAmounts[0].div(tokensPerEth));
        expect(secondGovTokenAmount).to.equal(
          boxesAmounts[1].div(tokensPerEth)
        );
        expect(thirdGovTokenAmount).to.equal(boxesAmounts[2].div(tokensPerEth));
        expect(fourthGovTokenAmount).to.equal(
          boxesAmounts[3].div(2).div(tokensPerEth)
        );
        expect(fifthGovTokenAmount).to.equal(karmicDonation);
      });

      it("mints general tokens", async () => {
        await karmicInstance
          .connect(deployer)
          .mint(alice.address, 0, boxesAmounts[0]);
        const generalGovTokenAmount = await karmicInstance.balanceOf(
          alice.address,
          0
        );
        expect(BigInt(generalGovTokenAmount)).to.equal(
          BigInt(karmicDonation) + BigInt(boxesAmounts[0])
        );
      });

      it("gets correct balance of all tokens", async () => {
        const zeroBn = ethers.BigNumber.from(0);
        let totalBalance = zeroBn;
        for (let i = 0; i <= NUMBER_BOX_TOKENS; i++) {
          totalBalance = totalBalance.add(
            await karmicInstance.balanceOf(alice.address, i)
          );
        }
        const allBalance = await karmicInstance.allBalancesOf(alice.address);
        const accumulatedBalance = allBalance.reduce((prev = zeroBn, current) =>
          prev.add(current)
        );
        expect(accumulatedBalance.eq(totalBalance)).to.be.true;
      });

      it("removes the box tokens from alice", async () => {
        const amountBoxTokens1 = await boxTokens[0].balanceOf(alice.address);
        const amountBoxTokens2 = await boxTokens[1].balanceOf(alice.address);
        const amountBoxTokens3 = await boxTokens[2].balanceOf(alice.address);
        aliceBalanceAfterWithdrawal = await alice.getBalance();

        expect(amountBoxTokens1).to.equal(0);
        expect(amountBoxTokens2).to.equal(0);
        expect(amountBoxTokens3).to.equal(0);
        expect(
          Number(aliceBalanceBeforeWithdrawal.sub(aliceBalanceAfterWithdrawal))
        ).to.be.lessThan(0);
      });
    });
  });

  describe("#distributeFunding", () => {
    const balances = [];
    let tx;
    const boxesAmounts = [
      ethers.utils.parseEther("50"),
      ethers.utils.parseEther("100"),
      ethers.utils.parseEther("150"),
      ethers.utils.parseEther("10"),
    ];
    const boxesPayments = [
      ethers.utils.parseEther("1"),
      ethers.utils.parseEther("1.5"),
      ethers.utils.parseEther("2"),
      ethers.utils.parseEther("0.5"),
    ];
    const karmicDonation = ethers.utils.parseEther("4");
    let aliceBalanceBeforeWithdrawal;
    let aliceBalanceAfterWithdrawal;

    beforeEach("add box tokens to Karmic", async () => {
      const expectedAddresses = boxTokens.map((boxToken) => boxToken.address);
      const expectedUris = boxTokens.map((boxToken, idx) => `boxToken${idx}`);
      await karmicInstance.addBoxTokens(
        expectedAddresses,
        expectedUris,
        thresholds
      );
    });

    beforeEach("mint box tokens to alice and approve Karmic", async () => {
      for (let i = 0; i < boxesPayments.length; i++) {
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
      await alice.sendTransaction({
        to: karmicInstance.address,
        value: karmicDonation,
      });
    });

    beforeEach("!! check balance of each box", async () => {
      balances.push((await karmicInstance.boxTokenTiers(ZERO_ADDRESS)).funds);
      for (let i = 0; i < NUMBER_BOX_TOKENS; i++) {
        balances.push(
          (await karmicInstance.boxTokenTiers(boxTokens[i].address)).funds
        );
      }
    });

    for (let i = 0; i <= NUMBER_BOX_TOKENS; i++) {
      it(`tries to transfer some funds to recipient from ${
        i === 0 ? `common pool` : `box ${i}`
      }`, async () => {
        await expect(
          karmicInstance
            .connect(alice)
            .distribute(alice.address, i, balances[i])
        ).to.be.revertedWith("Ownable: caller is not the owner");
        if (balances[i].gt(0)) {
          await expect(
            karmicInstance.distribute(alice.address, i, balances[i])
          ).to.emit(karmicInstance, "FundsDistributed");
        } else {
          await expect(
            karmicInstance.distribute(alice.address, i, balances[i])
          ).to.be.revertedWith("nothing to distribute");
        }
      });
      it(`reverts when trying to trsnafer excess funds from ${
        i === 0 ? `common pool` : `box ${i}`
      }`, async () => {
        if (balances[i].gt(0)) {
          await karmicInstance.distribute(alice.address, i, balances[i]);
          await expect(
            karmicInstance.distribute(alice.address, i, balances[i])
          ).to.be.revertedWith("exceeds balance");
        }
      });
    }
  });

  describe("#pause", () => {
    it("reverts if called ny non-owner", async () => {
      await expect(karmicInstance.connect(alice).pause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("#unpause", () => {
    beforeEach("pause contract", async () => {
      await karmicInstance.pause();
    });

    it("reverts if called ny non-owner", async () => {
      await expect(karmicInstance.connect(alice).unpause()).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });
  });

  describe("#bondToMint", () => {
    context("when contract is paused", () => {
      beforeEach("pause contract", async () => {
        await karmicInstance.pause();
      });

      it("reverts 'Pausable: paused'", async () => {
        await expect(
          karmicInstance
            .connect(alice)
            .bondToMint(boxTokens[2].address, boxesAmounts[2])
        ).to.be.revertedWith("Pausable: paused");
      });
    });
  });
});
