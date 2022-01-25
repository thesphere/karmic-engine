const deployFunction = async ({ getSigners, deployments, ethers }) => {
  const { deploy } = deployments;
  const [deployer] = await ethers.getSigners();

  const baseUri = "www.sphere.com/";
  const minimalThreshold = ethers.BigNumber.from('100');

  await deploy("Karmic", {
    from: deployer.address,
    args: [baseUri, minimalThreshold],
    log: true,
  });
};

module.exports = deployFunction;
