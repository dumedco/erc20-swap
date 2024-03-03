import {ethers, upgrades} from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
	const erc20SwapperDeploy = await upgrades.deployProxy(
		await ethers.getContractFactory("ERC20Swapper"),
		[
			process.env.OWNER_ADDRESS,
			process.env.WETH_ADDRESS,
			process.env.UNISWAP_ROUTER_ADDRESS
		]);

	const erc20Swapper = await ethers.getContractAt(
		"ERC20Swapper",
		await erc20SwapperDeploy.getAddress()
	);

	console.log("ERC20Swapper deployed at:", await erc20SwapperDeploy.getAddress());
};

export default func;
func.tags = ["ERC20SwapperDeploy"];
