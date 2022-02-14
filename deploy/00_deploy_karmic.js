const deployFunction = async ({ getSigners, deployments, ethers }) => {
  const { deploy } = deployments;
  const [deployer] = await ethers.getSigners();
  const fee = ethers.utils.parseUnits("0.1", 18); // 10%

  const baseUri = "http://localhost:3000/";

  await deploy("Karmic", {
    from: deployer.address,
    args: [baseUri, fee],
    log: true,
  });
};

module.exports = deployFunction;
module.exports.tags = ["Karmic"];
