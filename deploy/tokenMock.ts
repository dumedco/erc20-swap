import {ethers, upgrades} from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
	const lock = await ethers.deployContract("TokenMock", ['Token2', 'Token2']);

	await lock.waitForDeployment();

	console.log("TokenMock deployed at:", lock.target);
};

export default func;
func.tags = ["TokenMockDeploy"];
