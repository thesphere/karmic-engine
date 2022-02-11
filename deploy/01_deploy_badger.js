const deployFunction = async ({ deployments, network }) => {
    const { deploy } = deployments;
    const [deployer] = await ethers.getSigners();
  
    await deploy("Badger", {
      from: deployer.address,
      args: ["https://gateway.pinata.cloud/ipfs/"],
      log: true,
    });
  };
  
  module.exports = deployFunction;
  module.exports.tags = ["Badger"];