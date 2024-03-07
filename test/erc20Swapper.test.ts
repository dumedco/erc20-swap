import chai, {should} from "chai";
import chaiAsPromised from "chai-as-promised";
import {
  createPool,
  getExactInputSingle,
  uniswapQuoterAddress,
  uniswapRouterAddress,
} from "../utils/uniswap";
import {ethers, upgrades} from "hardhat";
import type {HardhatEthersSigner} from "@nomicfoundation/hardhat-ethers/src/signers";
import {parseEther} from "ethers";
import {ERC20Swapper, ERC20SwapperTest, TokenMock, WethMock} from "../typechain-types";

chai.use(chaiAsPromised);
should();

describe("ERC20Swapper", () => {
  let deployer: HardhatEthersSigner;
  let owner: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let user3: HardhatEthersSigner;
  let user4: HardhatEthersSigner;

  let token1: TokenMock;
  let token2: TokenMock;
  let token3: TokenMock;
  let weth: WethMock;
  let erc20Swapper: ERC20Swapper;

  const initialERC20SwapperToken1Balance = parseEther('1000000');
  const initialUser1Token1Balance = parseEther('10000');
  const initialUser2Token1Balance = parseEther('20000');

  const initialERC20SwapperToken2Balance = parseEther('2000000');
  const initialUser1Token2Balance = parseEther('30000');
  const initialUser2Token2Balance = parseEther('40000');

  const initialERC20SwapperToken3Balance = parseEther('3000000');
  const initialUser1Token3Balance = parseEther('40000');
  const initialUser2Token3Balance = parseEther('50000');

  let initialERC20SwapperEthBalance: bigint;
  let initialUser1EthBalance: bigint;
  let initialUser2EthBalance: bigint;

  const deploy = async () => {
    [deployer, owner, user1, user2, user3, user4] = await ethers.getSigners();

    const erc20SwapperDeploy = await upgrades.deployProxy(
      await ethers.getContractFactory("ERC20Swapper"),
      [
        owner.address,
        process.env.WETH_ADDRESS,
        uniswapRouterAddress,
        uniswapQuoterAddress
      ]);

    erc20Swapper = await ethers.getContractAt(
      "ERC20Swapper",
      erc20SwapperDeploy.target
    );

    const tokenFactory = await ethers.getContractFactory("TokenMock");
    token1 = await tokenFactory.deploy("Token0", "Token0");
    token2 = await tokenFactory.deploy("Token1", "Token1");
    token3 = await tokenFactory.deploy("Token2", "Token2");
    weth = await ethers.getContractAt(
      "WethMock",
      process.env.WETH_ADDRESS
    );

    await token1.mint(erc20Swapper, initialERC20SwapperToken1Balance);
    await token1.mint(user1, initialUser1Token1Balance);
    await token1.mint(user2, initialUser2Token1Balance);
    await token2.mint(erc20Swapper, initialERC20SwapperToken2Balance);
    await token2.mint(user1, initialUser1Token2Balance);
    await token2.mint(user2, initialUser2Token2Balance);
    await token3.mint(erc20Swapper, initialERC20SwapperToken3Balance);
    await token3.mint(user1, initialUser1Token3Balance);
    await token3.mint(user2, initialUser2Token3Balance);

    await ethers.provider.send("hardhat_setBalance", [deployer.address, '0x1111111111111111111111111111111111111111']);

    await createPools();

    initialERC20SwapperEthBalance = await ethers.provider.getBalance(erc20Swapper)
    initialUser1EthBalance = await ethers.provider.getBalance(user1)
    initialUser2EthBalance = await ethers.provider.getBalance(user2)
  }

  async function createPools() {
    await token1.mint(deployer, parseEther('1000000000'));
    await token2.mint(deployer, parseEther('1000000000'));
    await token3.mint(deployer, parseEther('1000000000'));
    await weth.deposit({value: parseEther('500')});

    await createPool(
      deployer,
      weth,
      token1,
      parseEther('100'),
      parseEther('100'),
      3000
    );

    await createPool(
      deployer,
      weth,
      token2,
      parseEther('100'),
      parseEther('2000'),
      3000
    );
  }

  describe("ERC20Swapper - basic", () => {
    before(async function () {
    });

    beforeEach(async () => {
      await deploy();
    });

    it("should have correct params after deploy", async function () {
      (await erc20Swapper.owner()).should.eq(owner);
      (await erc20Swapper.uniswapRouter()).should.eq(uniswapRouterAddress);
      (await erc20Swapper.weth()).should.eq(process.env.WETH_ADDRESS);
      (await erc20Swapper.paused()).should.eq(false);
    });

    it("Should update uniswapRouter if owner", async function () {
      const newUniswapRouterAddress = '0x0000000000000000000000000000000000000001';
      (await erc20Swapper.uniswapRouter()).should.eq(uniswapRouterAddress);

      await erc20Swapper.connect(owner)
        .updateUniswapRouter(newUniswapRouterAddress)
        .should.emit(erc20Swapper, 'UniswapRouterUpdated')
        .withArgs(uniswapRouterAddress, newUniswapRouterAddress);

      (await erc20Swapper.uniswapRouter()).should.eq(newUniswapRouterAddress);
    });

    it("Should not update uniswapRouter if not owner", async function () {
      const newUniswapRouterAddress = '0x0000000000000000000000000000000000000001'
      await erc20Swapper.connect(user1)
        .updateUniswapRouter(newUniswapRouterAddress)
        .should.be.rejectedWith(`OwnableUnauthorizedAccount("${user1.address}")`);
    });

    it("Should update weth if owner", async function () {
      const newWethAddress = '0x0000000000000000000000000000000000000001';
      (await erc20Swapper.weth()).should.eq(process.env.WETH_ADDRESS);

      await erc20Swapper.connect(owner)
        .updateWeth(newWethAddress)
        .should.emit(erc20Swapper, 'WethUpdated')
        .withArgs(process.env.WETH_ADDRESS, newWethAddress);

      (await erc20Swapper.weth()).should.eq(newWethAddress);
    });

    it("Should not update weth if not owner", async function () {
      const newWethAddress = '0x0000000000000000000000000000000000000001'
      await erc20Swapper.connect(user1)
        .updateWeth(newWethAddress)
        .should.be.rejectedWith(`OwnableUnauthorizedAccount("${user1.address}")`);
    });

    it("Should pause if owner", async function () {
      (await erc20Swapper.paused()).should.eq(false);
      await erc20Swapper.connect(owner).pause()
        .should.be.fulfilled;
      (await erc20Swapper.paused()).should.eq(true);
    });

    it("Should not pause if not owner", async function () {
      await erc20Swapper.connect(deployer).pause()
        .should.be.rejectedWith(`OwnableUnauthorizedAccount("${deployer.address}")`);
    });

    it("Should unpause if owner", async function () {
      await erc20Swapper.connect(owner).pause()
        .should.be.fulfilled;
      (await erc20Swapper.paused()).should.eq(true);
      await erc20Swapper.connect(owner).unpause()
        .should.be.fulfilled;
      (await erc20Swapper.paused()).should.eq(false);
    });

    it("Should not unpause if not owner", async function () {
      await erc20Swapper.connect(owner).pause()
        .should.be.fulfilled;
      await erc20Swapper.connect(deployer).unpause()
        .should.be.rejectedWith(`OwnableUnauthorizedAccount("${deployer.address}")`);
    });
  });

  describe("ERC20Swapper - swap", () => {
    before(async function () {
    });

    beforeEach(async () => {
      await deploy();
    });

    it("Should not swap when paused", async function () {
      await erc20Swapper.connect(owner).pause()
        .should.be.fulfilled;

      const amountIn = parseEther('1');

      await erc20Swapper.connect(user2)
        .swapEtherToToken(token2, parseEther('1'), {value: amountIn})
        .should.be.rejectedWith('EnforcedPause()');
    });

    it("Should swap custom token for eth #1", async function () {
      const amountIn = parseEther('1');
      const amountOut = parseEther('0.980295078720665412');

      (await getExactInputSingle(weth, token1, amountIn, 10000)).should.eq(
        amountOut,
        'Uniswap has changed swap price formula'
      );

      await erc20Swapper.connect(user1)
        .swapEtherToToken(token1, parseEther('0.9'), {value: amountIn})
        .should.be.fulfilled;

      (await token1.balanceOf(user1)).should.eq(initialUser1Token1Balance + amountOut);
    });

    it("Should swap custom token for eth #2", async function () {
      const amountIn = parseEther('10');
      const amountOut = parseEther('180.163785259326669089');

      (await getExactInputSingle(weth, token2, amountIn, 10000)).should.eq(
        amountOut,
        'Uniswap has changed swap price formula'
      );

      await erc20Swapper.connect(user2)
        .swapEtherToToken(token2, parseEther('150'), {value: amountIn})
        .should.be.fulfilled;

      (await token2.balanceOf(user2)).should.eq(initialUser2Token2Balance + amountOut);
    });

    it("Should receive at least minAmount tokens", async function () {
      const amountIn = parseEther('1');
      const amountOut = parseEther('0.980295078720665412');
      const amountOutMin = parseEther('0.98');

      (await getExactInputSingle(weth, token1, amountIn, 10000)).should.eq(
        amountOut,
        'Uniswap has changed swap price formula'
      );

      await erc20Swapper.connect(user1)
        .swapEtherToToken(token1, parseEther('0.9'), {value: amountIn})
        .should.be.fulfilled;


      (await token1.balanceOf(user1)).should.gte(initialUser1Token1Balance + amountOutMin);
    });

    it("Should swap when amountOutMin == amountReceived ", async function () {
      const amountIn = parseEther('1');
      const amountOut = parseEther('0.980295078720665412');
      const amountOutMin = amountOut;

      (await getExactInputSingle(weth, token1, amountIn, 10000)).should.eq(
        amountOut,
        'Uniswap has changed swap price formula'
      );

      await erc20Swapper.connect(user1)
        .swapEtherToToken(token1, parseEther('0.9'), {value: amountIn})
        .should.be.fulfilled;


      (await token1.balanceOf(user1)).should.gte(initialUser1Token1Balance + amountOutMin);
    });

    it("Should swap custom token for eth #2", async function () {
      const amountIn = parseEther('10');
      const amountOut = parseEther('180.163785259326669089');

      (await getExactInputSingle(weth, token2, amountIn, 10000)).should.eq(
        amountOut,
        'Uniswap has changed swap price formula'
      );

      await erc20Swapper.connect(user2)
        .swapEtherToToken(token2, parseEther('150'), {value: amountIn})
        .should.be.fulfilled;

      (await token2.balanceOf(user2)).should.eq(initialUser2Token2Balance + amountOut);
    });

    it("Should emit event when swapping #1", async function () {
      const amountIn = parseEther('1');
      const amountOut = parseEther('0.980295078720665412');

      (await getExactInputSingle(weth, token1, amountIn, 10000)).should.eq(
        amountOut,
        'Uniswap has changed swap price formula'
      );

      await erc20Swapper.connect(user1)
        .swapEtherToToken(token1, parseEther('0.9'), {value: amountIn})
        .should.emit(erc20Swapper, 'EthSwapped')
        .withArgs(token1, user1, amountIn, amountOut);

      (await token1.balanceOf(user1)).should.eq(initialUser1Token1Balance + amountOut);
    });

    it("Should emit event when swapping #2", async function () {
      const amountIn = parseEther('0.5');
      const amountOut = parseEther('9.851236379919399482');

      (await getExactInputSingle(weth, token2, amountIn, 10000)).should.eq(
        amountOut,
        'Uniswap has changed swap price formula'
      );

      await erc20Swapper.connect(user2)
        .swapEtherToToken(token2, parseEther('9'), {value: amountIn})
        .should.emit(erc20Swapper, 'EthSwapped')
        .withArgs(token2, user2, amountIn, amountOut);

      (await token2.balanceOf(user2)).should.eq(initialUser2Token2Balance + amountOut);
    });

    it("Should return amountOut when swapping #1", async function () {
      const amountIn = parseEther('2');
      const amountOut = parseEther('1.941557168072171013');

      (await getExactInputSingle(weth, token1, amountIn, 10000)).should.eq(
        amountOut,
        'Uniswap has changed swap price formula'
      );

      (await erc20Swapper.connect(user1)
        .swapEtherToToken.staticCall(token1, parseEther('1.9'), {value: amountIn}))
        .should.eq(amountOut);
    });

    it("Should return amountOut when swapping #2", async function () {
      const amountIn = parseEther('5');
      const amountOut = parseEther('94.330633635064320995');

      (await getExactInputSingle(weth, token2, amountIn, 10000)).should.eq(
        amountOut,
        'Uniswap has changed swap price formula'
      );

      (await erc20Swapper.connect(user2)
        .swapEtherToToken.staticCall(token2, parseEther('94'), {value: amountIn}))
        .should.eq(amountOut);
    });

    it.only("Should choose best pool #1", async function () {
      const amountIn = parseEther('1');
      const amountOut = parseEther('0.986743745639390012');
      const amountOutMin = parseEther('0.98');

      // await createPool(
      //   deployer,
      //   weth,
      //   token1,
      //   parseEther('100'),
      //   parseEther('100'),
      //   3000
      // );
      // await createPool(
      //   deployer,
      //   weth,
      //   token1,
      //   parseEther('100'),
      //   parseEther('100'),
      //   500
      // );

      // (await getExactInputSingle(weth, token1, amountIn, 10000)).should.eq(
      //   amountOut,
      //   'Uniswap has changed swap price formula'
      // );

      console.log('dddddddd')


      await erc20Swapper.connect(user2)
        .swapEtherToToken(token1, amountOutMin, {value: amountIn})
        .should.be.rejectedWith('aaa');

      (await token1.balanceOf(user1)).should.eq(initialUser1Token1Balance + amountOut);
    });

    it("Should revert when user doesn't have enough eth", async function () {
      const amountIn = parseEther('10000');
      const amountOut = parseEther('99.000000000000000004');
      const minAmountOut = parseEther('99');

      await erc20Swapper.connect(user2)
        .swapEtherToToken(token2, minAmountOut, {value: amountIn})
        .should.be.rejectedWith(new RegExp('sender doesn\'t have enough funds to send tx\. The max upfront cost is: .*'));
    });
  });

  describe("ERC20Swapper - uniswap reverts", () => {
    before(async function () {
    });

    beforeEach(async () => {
      await deploy();
    });

    it("Should revert when amountOut is smaller them minAmount", async function () {
      const amountIn = parseEther('5');
      const amountOut = parseEther('94.330633635064320995');
      const minAmountOut = parseEther('95');

      (await getExactInputSingle(weth, token2, amountIn, 10000)).should.eq(
        amountOut,
        'Uniswap has changed swap price formula'
      );

      await erc20Swapper.connect(user2)
        .swapEtherToToken(token2, minAmountOut, {value: amountIn})
        .should.be.rejectedWith('Too little received');
    });

    it("Should revert when there is no weth-token pair", async function () {
      const amountIn = parseEther('1');
      const amountOut = parseEther('1');
      const minAmountOut = parseEther('1');

      await erc20Swapper.connect(user2)
        .swapEtherToToken(token3, minAmountOut, {value: amountIn})
        .should.be.rejected;
    });
  });

  describe("ERC20Swapper - uniswap is malicious #1", () => {
    before(async function () {
    });

    beforeEach(async () => {
      [deployer, owner, user1, user2, user3, user4] = await ethers.getSigners();

      const uniswapRouterFactory = await ethers.getContractFactory("UniswapRouterMock");
      const uniswapRouter = await uniswapRouterFactory.deploy(uniswapRouterAddress);

      const erc20SwapperDeploy = await upgrades.deployProxy(
        await ethers.getContractFactory("ERC20Swapper"),
        [
          owner.address,
          process.env.WETH_ADDRESS,
          uniswapRouter.target,
          uniswapQuoterAddress
        ]);

      erc20Swapper = await ethers.getContractAt(
        "ERC20Swapper",
        erc20SwapperDeploy.target
      );

      const tokenFactory = await ethers.getContractFactory("TokenMock");
      token1 = await tokenFactory.deploy("Token0", "Token0");
      token2 = await tokenFactory.deploy("Token1", "Token1");
      token3 = await tokenFactory.deploy("Token2", "Token2");
      weth = await ethers.getContractAt(
        "WethMock",
        process.env.WETH_ADDRESS
      );

      await token1.mint(erc20Swapper, initialERC20SwapperToken1Balance);
      await token1.mint(user1, initialUser1Token1Balance);
      await token1.mint(uniswapRouter, parseEther('1000000000'));

      createPools();
    });

    it("Should revert when amountOut received from uniswap is smaller them minAmount", async function () {
      const amountIn = parseEther('1');
      const amountOut = parseEther('0.5');
      const minAmountOut = parseEther('9.5');

      await erc20Swapper.connect(user2)
        .swapEtherToToken(token1, minAmountOut, {value: amountIn})
        .should.be.rejectedWith('InvalidTokenReceivedAmount()');
    });
  });

  describe("ERC20Swapper - uniswap is malicious #2", () => {
    before(async function () {
    });

    beforeEach(async () => {
      [deployer, owner, user1, user2, user3, user4] = await ethers.getSigners();

      const uniswapRouterFactory = await ethers.getContractFactory("UniswapRouterMock2");
      const uniswapRouter = await uniswapRouterFactory.deploy(uniswapRouterAddress);

      const erc20SwapperDeploy = await upgrades.deployProxy(
        await ethers.getContractFactory("ERC20Swapper"),
        [
          owner.address,
          process.env.WETH_ADDRESS,
          uniswapRouter.target,
          uniswapQuoterAddress
        ]);

      erc20Swapper = await ethers.getContractAt(
        "ERC20Swapper",
        erc20SwapperDeploy.target
      );

      uniswapRouter.updateErc20Swapper(erc20Swapper);

      const tokenFactory = await ethers.getContractFactory("TokenMock");
      token1 = await tokenFactory.deploy("Token0", "Token0");
      token2 = await tokenFactory.deploy("Token1", "Token1");
      token3 = await tokenFactory.deploy("Token2", "Token2");
      weth = await ethers.getContractAt(
        "WethMock",
        process.env.WETH_ADDRESS
      );

      await token1.mint(erc20Swapper, initialERC20SwapperToken1Balance);
      await token1.mint(user1, initialUser1Token1Balance);
      await token1.mint(uniswapRouter, parseEther('1000000000'));

      createPools();
    });

    it("Should revert when uniswap tries reentrancy attack", async function () {
      const amountIn = parseEther('1');
      const minAmountOut = parseEther('9.5');

      await erc20Swapper.connect(user2)
        .swapEtherToToken(token1, minAmountOut, {value: amountIn})
        .should.be.rejectedWith('ReentrancyGuardReentrantCall()');
    });
  });

  describe("ERC20Swapper - weth is malicious #1", () => {
    before(async function () {
    });

    beforeEach(async () => {
      [deployer, owner, user1, user2, user3, user4] = await ethers.getSigners();

      const wethFactory = await ethers.getContractFactory("WethMock");

      weth = await wethFactory.deploy("Weth", "Weth");

      const erc20SwapperDeploy = await upgrades.deployProxy(
        await ethers.getContractFactory("ERC20Swapper"),
        [
          owner.address,
          weth.target,
          uniswapRouterAddress,
          uniswapQuoterAddress
        ]);

      erc20Swapper = await ethers.getContractAt(
        "ERC20Swapper",
        erc20SwapperDeploy.target
      );

      const tokenFactory = await ethers.getContractFactory("TokenMock");
      token1 = await tokenFactory.deploy("Token0", "Token0");
    });

    it("Should revert when weth contract doesn't sent same omount of weth", async function () {
      const amountIn = parseEther('1');
      const amountOut = parseEther('0.980295078720665412');
      const minAmountOut = parseEther('0.98');

      await erc20Swapper.connect(user2)
        .swapEtherToToken(token1, minAmountOut, {value: amountIn})
        .should.be.rejectedWith('InvalidWethReceivedAmount()');
    });
  });

  describe("ERC20Swapper - weth is malicious #2", () => {
    before(async function () {
    });

    beforeEach(async () => {
      [deployer, owner, user1, user2, user3, user4] = await ethers.getSigners();

      const wethFactory = await ethers.getContractFactory("WethMock2");

      const weth = await wethFactory.deploy("Weth", "Weth");

      const erc20SwapperDeploy = await upgrades.deployProxy(
        await ethers.getContractFactory("ERC20Swapper"),
        [
          owner.address,
          weth.target,
          uniswapRouterAddress,
          uniswapQuoterAddress
        ]);

      erc20Swapper = await ethers.getContractAt(
        "ERC20Swapper",
        erc20SwapperDeploy.target
      );

      weth.updateErc20Swapper(erc20Swapper);

      const tokenFactory = await ethers.getContractFactory("TokenMock");
      token1 = await tokenFactory.deploy("Token0", "Token0");
    });

    it("Should revert when weth tries reentrancy attack", async function () {
      const amountIn = parseEther('1');
      const minAmountOut = parseEther('9.5');

      await erc20Swapper.connect(user2)
        .swapEtherToToken(token1, minAmountOut, {value: amountIn})
        .should.be.rejectedWith('ReentrancyGuardReentrantCall()');
    });
  });

  describe("ERC20Swapper - Swap from other contract", () => {
    let erc20SwapperTest: ERC20SwapperTest;

    before(async function () {
    });

    beforeEach(async () => {
      await deploy();

      const erc20SwapperTesFactory = await ethers.getContractFactory("ERC20SwapperTest");
      erc20SwapperTest = await erc20SwapperTesFactory.deploy(
        erc20Swapper.target
      );
    });

    it("Should call swap from another contract", async function () {
      const initialEthAmount = parseEther('10');
      const initialTokenAmount = parseEther('100000000');
      const amountIn = parseEther('1');
      const amountOut = parseEther('0.980295078720665412');
      const amountOutMin = parseEther('0.98');

      await user1.sendTransaction({
        to: erc20SwapperTest,
        value: initialEthAmount
      });

      await token1.mint(erc20SwapperTest, initialTokenAmount);

      (await getExactInputSingle(weth, token1, amountIn, 10000)).should.eq(
        amountOut,
        'Uniswap has changed swap price formula'
      );

      await erc20SwapperTest.connect(user1)
        .testSwapEtherToToken(token1, amountIn, amountOutMin)
        .should.be.fulfilled;

      (await token1.balanceOf(erc20SwapperTest)).should.eq(initialTokenAmount + amountOut);
      (await ethers.provider.getBalance(erc20SwapperTest)).should.eq(initialEthAmount - amountIn);
    });

    it("Should funds remain in the original account on revert", async function () {
      const initialEthAmount = parseEther('10');
      const initialTokenAmount = parseEther('100000000');
      const amountIn = parseEther('1');
      const amountOut = parseEther('0.980295078720665412');
      const amountOutMin = parseEther('1');

      await user1.sendTransaction({
        to: erc20SwapperTest,
        value: initialEthAmount
      });

      await token1.mint(erc20SwapperTest, initialTokenAmount);

      (await getExactInputSingle(weth, token1, amountIn, 10000)).should.eq(
        amountOut,
        'Uniswap has changed swap price formula'
      );

      await erc20SwapperTest.connect(user1)
        .testSwapEtherToToken(token1, amountIn, amountOutMin)
        .should.be.rejectedWith('Too little received');

      (await token1.balanceOf(erc20SwapperTest)).should.eq(initialTokenAmount );
      (await ethers.provider.getBalance(erc20SwapperTest)).should.eq(initialEthAmount);
    });

  });

});
