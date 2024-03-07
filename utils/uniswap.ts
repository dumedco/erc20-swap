import { ethers } from "hardhat";
import { BigNumberish, parseEther} from "ethers";
import type {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/src/signers";
import {OwnableUpgradeable, TokenMock} from "../typechain-types";

const NFTPositionManagerABI =
  require("./abi/uniswap/periphery/NonfungiblePositionManager.json").abi;

const SwapRouterABI =
  require("./abi/uniswap/periphery/SwapRouter.json").abi;
const QuoterABI = require("./abi/uniswap/periphery/Quoter.json").abi;

export const uniswapRouterAddress = process.env.UNISWAP_ROUTER_ADDRESS;
export const uniswapQuoterAddress = process.env.UNISWAP_QUOTER_ADDRESS;
export const uniswapNFTPositionManagerAddress = process.env.UNISWAP_POSITION_MANAGER_ADDRESS;

export async function createPool(
  creator: HardhatEthersSigner,
  token0: TokenMock,
  token1: TokenMock,
  amount0: BigNumberish,
  amount1: BigNumberish,
  fee: number,
  ownerAddress?: string | null
): Promise<number> {
  const NFTPositionManager = await ethers.getContractAt(
    NFTPositionManagerABI,
    uniswapNFTPositionManagerAddress
  );

  await token0.connect(creator).approve(NFTPositionManager.target, amount0);
  await token1.connect(creator).approve(NFTPositionManager.target, amount1);

  if (token0.target.toString().toLowerCase() > token1.target.toString().toLowerCase()) {
    const token0Copy = token0;
    token0 = token1;
    token1 = token0Copy;

    const amount0Copy = amount0;
    amount0 = amount1;
    amount1 = amount0Copy;
  }

  console.log('1111')
  await NFTPositionManager.connect(
    creator
  ).createAndInitializePoolIfNecessary(
    token0.target,
    token1.target,
    fee,
    calculateSqrtPriceX96(amount0, amount1),
    {gasLimit: 5000000}
  ).should.be.fulfilled;
  console.log('2222')

  await NFTPositionManager.connect(creator).mint({
    token0: token0.target,
    token1: token1.target,
    fee: fee,
    tickLower: -887200,
    tickUpper: 887200,
    amount0Desired: amount0,
    amount1Desired: amount1,
    amount0Min: 0, //don't let it 0 into production
    amount1Min: 0, //don't let it 0 into production
    recipient: creator.address, // ownerAddress ? ownerAddress : creator.address,
    deadline: 1773341392,
  }).should.be.rejectedWith('aaaaaaaa');
  console.log('3333')

  const tokenId = await NFTPositionManager.tokenByIndex(
    Number(await NFTPositionManager.totalSupply()) - 1
  );
  console.log('4444')

  if (ownerAddress) {
    // await NFTPositionManager.connect(creator).approve();
    await NFTPositionManager.connect(creator).transferFrom(
      creator.address,
      ownerAddress,
      tokenId
    );
  }

  return tokenId;
}

export function getExchangePath(
  token0: TokenMock,
  token1: TokenMock,
  token2?: TokenMock
) {
  if (token2) {
    return ethers.solidityPacked(
      ["address", "uint24", "address", "uint24", "address"],
      [token0.target, 10000, token1.target, 10000, token2.target]
    );
  } else {
    return ethers.solidityPacked(
      ["address", "uint24", "address"],
      [token0.target, 10000, token1.target]
    );
  }
}

function calculateSqrtPriceX96(token0Amount: BigNumberish, token1Amount: BigNumberish): bigint {
  // Calculate the square root of token0Amount and token1Amount
  const sqrtToken0 = Math.sqrt(Number(token0Amount / parseEther('1')));
  const sqrtToken1 = Math.sqrt(Number(token1Amount / parseEther('1')));

  // Calculate the value of sqrtPriceX96
  const sqrtPriceX96: bigint = BigInt((sqrtToken1 * Math.pow(2, 96)) / sqrtToken0);

  // Return the result as a string
  return sqrtPriceX96;
}

export async function getExactInput(
  token0: TokenMock,
  token1: TokenMock,
  amount: BigNumberish
): Promise<BigNumberish> {
  const Quoter: OwnableUpgradeable = await ethers.getContractAt(QuoterABI, uniswapQuoterAddress);

  console.log(getExchangePath(token0, token1));
  return (
    await Quoter.quoteExactInput.staticCall(
      getExchangePath(token0, token1),
      amount
    )
  ).amountOut;
}

export async function getExactInputSingle(
  token0: TokenMock,
  token1: TokenMock,
  amount: BigNumberish,
  fee: number,
): Promise<BigNumberish> {
  const Quoter: OwnableUpgradeable = await ethers.getContractAt(QuoterABI, uniswapQuoterAddress);

  return (
    await Quoter.quoteExactInputSingle.staticCall({
        tokenIn: token0,
        tokenOut: token1,
        amountIn: amount,
        fee: fee,
        sqrtPriceLimitX96: 0
      }
    )
  ).amountOut;
}
