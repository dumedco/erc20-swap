import chai, {should} from "chai";
import chaiAsPromised from "chai-as-promised";
import {createPool, uniswapRouterAddress,} from "../utils/uniswap";
import {ethers, upgrades} from "hardhat";
import type {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/src/signers";
import {BaseContract, formatEther, parseEther} from "ethers";

chai.use(chaiAsPromised);
should();

describe.only("ERC20Swapper", () => {
  let deployer: HardhatEthersSigner;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let user3: HardhatEthersSigner;
  let user4: HardhatEthersSigner;

  let token0: BaseContract;
  let token1: BaseContract;
  let token2: BaseContract;
  let weth: BaseContract;
  let ERC20Swapper: BaseContract;

  const initialERC20SwapperToken0Balance = parseEther('1000000');
  const initialUser1token0Balance = parseEther('10000');
  const initialUser2token0Balance = parseEther('20000');

  const initialERC20SwapperToken1Balance = parseEther('2000000');
  const initialUser1Token1Balance = parseEther('30000');
  const initialUser2Token1Balance = parseEther('40000');
  
  const initialERC20SwapperToken2Balance = parseEther('3000000');
  const initialUser1Token2Balance = parseEther('40000');
  const initialUser2Token2Balance = parseEther('50000');

  const deploy = async () => {
    [deployer, owner, user1, user2, user3, user4] = await ethers.getSigners();

    // if (hardhatConfig.networks!.hardhat!.forking !== undefined) {
    //   //reset network to have same initial setup for every test
    //   await ethers.provider.send("hardhat_reset", [{
    //     forking: {
    //       jsonRpcUrl: hardhatConfig.networks!.hardhat!.forking.url,
    //       blockNumber: hardhatConfig.networks!.hardhat!.forking.blockNumber,
    //     },
    //   }]);
    // }

    const erc20SwapperDeploy = await upgrades.deployProxy(
      await ethers.getContractFactory("ERC20Swapper"),
      [
        owner.address,
        process.env.WETH_ADDRESS,
        process.env.UNISWAP_ROUTER_ADDRESS
      ]);

    ERC20Swapper = await ethers.getContractAt(
      "ERC20Swapper",
      await erc20SwapperDeploy.getAddress()
    );

    const tokenFactory = await ethers.getContractFactory("TokenMock");
    token0 = await tokenFactory.deploy("Token0", "Token0");
    token1 = await tokenFactory.deploy("Token1", "Token1");
    token2 = await tokenFactory.deploy("Token2", "Token2");
    weth = await ethers.getContractAt(
      "TokenMock",
      process.env.WETH_ADDRESS
    );

    await token0.mint(ERC20Swapper.target, initialERC20SwapperToken0Balance);
    await token0.mint(user1.address, initialUser1token0Balance);
    await token0.mint(user2.address, initialUser2token0Balance);
    await token1.mint(ERC20Swapper.target, initialERC20SwapperToken1Balance);
    await token1.mint(user1.address, initialUser1Token1Balance);
    await token1.mint(user2.address, initialUser2Token1Balance);
    await token2.mint(ERC20Swapper.target, initialERC20SwapperToken2Balance);
    await token2.mint(user1.address, initialUser1Token2Balance);
    await token2.mint(user2.address, initialUser2Token2Balance);

    await createPools();
  }

  async function createPools() {
    await token0.mint(deployer.address, parseEther('1000000000'));
    await token1.mint(deployer.address, parseEther('1000000000'));
    await token2.mint(deployer.address, parseEther('1000000000'));
    await weth.deposit({value: parseEther('500')});

    await createPool(
      deployer,
      weth,
      token0,
      parseEther('100'),
      parseEther('100')
    );

    await createPool(
      deployer,
      weth,
      token1,
      parseEther('200'),
      parseEther('200')
    );

    await createPool(
      deployer,
      token0,
      token1,
      parseEther('100'),
      parseEther('100')
    );
  }

  describe("ERC20Swapper - basic", () => {
    before(async function () {
    });

    beforeEach(async () => {
      await deploy();
    });

    it("should have correct values", async function () {
      (await ERC20Swapper.owner()).should.eq(owner.address);
      (await ERC20Swapper.uniswapRouter()).should.eq(process.env.UNISWAP_ROUTER_ADDRESS);
    });

    it("Should update uniswapRouter if owner", async function () {
      (await ERC20Swapper.uniswapRouter()).should.eq(uniswapRouterAddress);
      await ERC20Swapper.connect(owner).updateUniswapRouter(user1.address)
        .should.be.fulfilled;
      (await ERC20Swapper.uniswapRouter()).should.eq(user1.address);
    });

    it("Should not update uniswapRouter if not owner", async function () {
      await ERC20Swapper.connect(user1)
        .updateUniswapRouter(user1.address)
        .should.be.rejectedWith(`OwnableUnauthorizedAccount("${user1.address}")`);
    });

    it.only("Should work swapTokenToToken", async function () {
      await token0.mint(ERC20Swapper.target, parseEther('1000000000'))
      await token1.mint(ERC20Swapper.target, parseEther('1000000000'))
      await ERC20Swapper.connect(user1)
        .swapTokenToToken(token0.target, token1.target)
        .should.be.rejectedWith(`OwnableUnauthorizedAccount("${user1.address}")`);
    });
  });
});
