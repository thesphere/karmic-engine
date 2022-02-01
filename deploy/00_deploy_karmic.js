const deployFunction = async ({ getSigners, deployments, ethers }) => {
  const { deploy } = deployments;
  const [deployer] = await ethers.getSigners();

  const baseUri = "www.sphere.com/";

  await deploy("Karmic", {
    from: deployer.address,
    args: [baseUri],
    log: true,
  });
};

module.exports = deployFunction;
