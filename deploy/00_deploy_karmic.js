const deployFunction = async ({ getSigners, deployments, ethers }) => {
  const { deploy } = deployments;
  const [deployer] = await ethers.getSigners();

  const baseUri = "http://localhost:3000/";

  await deploy("Karmic", {
    from: deployer.address,
    args: [baseUri],
    log: true,
  });
};

module.exports = deployFunction;
