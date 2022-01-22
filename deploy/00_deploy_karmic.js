const deployFunction = async ({ getSigners, deployments, ethers }) => {
  const { deploy } = deployments;
  const [deployer] = await ethers.getSigners();

  await deploy("Karmic", {
    from: deployer.address,
    args: [],
    log: true,
  });
};

module.exports = deployFunction;
