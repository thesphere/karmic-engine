const deployFunction = async ({ getSigners, deployments, ethers }) => {
  const { deploy } = deployments;
  const [deployer] = await ethers.getSigners();
  const fee = ethers.utils.parseUnits("0.4", 18); // 40%

  const baseUri = "ipfs://";
  // this is the metadata hash of Sphere common pool
  const defaultTokenMetadata = ' ';

  await deploy("Karmic", {
    from: deployer.address,
    args: [baseUri, defaultTokenMetadata, fee],
    log: true,
  });
};

module.exports = deployFunction;
module.exports.tags = ["Karmic"];
