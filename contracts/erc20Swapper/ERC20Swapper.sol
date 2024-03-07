// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../externalInterfaces/uniswapV3/IUniswapRouter02.sol";
import "../externalInterfaces/uniswapV3/IQuoter.sol";
import "../externalInterfaces/uniswapV3/IUniswapFactory.sol";
import "../externalInterfaces/weth/IWeth.sol";
import "./IERC20Swapper.sol";

import "hardhat/console.sol";

contract ERC20Swapper is
Initializable,
OwnableUpgradeable,
PausableUpgradeable,
ReentrancyGuardUpgradeable,
IERC20Swapper
{
    IUniswapRouter02 public uniswapRouter;
    IQuoter public uniswapQuoter;
    IWeth public weth;

    /**
     * @dev The weth received amount is less than the eth deposited amount
     */
    error InvalidWethReceivedAmount();

    /**
     * @dev The token received amount is less than the minimum amount
     */
    error InvalidTokenReceivedAmount();

    /**
     * @dev Triggered when an amount of eth has been swapped to a custom ERC20 token
     *
     * @param token               ERC20 token address
     * @param account             Address of the user
     * @param amountIn            Eth amount swapped
     * @param amountOut           Token amount received
     */
    event EthSwapped(address indexed token, address indexed account, uint amountIn, uint amountOut);

    /**
     * @dev Triggered when uniswapRouter has been updated
     *
     * @param oldUniswapRouter    Old uniswapRouter address
     * @param newUniswapRouter    New uniswapRouter address
     */
    event UniswapRouterUpdated(address indexed oldUniswapRouter, address indexed newUniswapRouter);

    /**
     * @dev Triggered when uniswapQuoter has been updated
     *
     * @param oldUniswapQuoter    Old uniswapQuoter address
     * @param newUniswapQuoter    New uniswapQuoter address
     */
    event UniswapQuoterUpdated(address indexed oldUniswapQuoter, address indexed newUniswapQuoter);

    /**
     * @dev Triggered when weth has been updated
     *
     * @param oldUWethAddress    Old weth address
     * @param newUWethAddress    New weth address
     */
    event WethUpdated(address indexed oldUWethAddress, address indexed newUWethAddress);

    /**
     * @dev instantiates contract
     * @param ownerAddress The address of the owner
     * @param wethAddress The address of Wrapped Ether
     * @param uniswapRouterAddress The address of the uniswap router contract
     * @param uniswapQuoterAddress The address of the uniswap quoter contract
     */
    function initialize(
        address ownerAddress,
        address wethAddress,
        address uniswapRouterAddress,
        address uniswapQuoterAddress
    ) external initializer {
        __Ownable_init(ownerAddress);
        __Pausable_init();
        __ReentrancyGuard_init();

        weth = IWeth(wethAddress);
        uniswapRouter = IUniswapRouter02(uniswapRouterAddress);
        uniswapQuoter = IQuoter(uniswapQuoterAddress);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev updates the address of the uniswapRouter contract
     * @param _newUniswapRouterAddress The address of the uniswapRouter contract
     */
    function updateUniswapRouter(address _newUniswapRouterAddress) external onlyOwner {
        address _oldAddress = address(uniswapRouter);
        uniswapRouter = IUniswapRouter02(_newUniswapRouterAddress);

        emit UniswapRouterUpdated(_oldAddress, _newUniswapRouterAddress);
    }

    /**
     * @dev updates the address of the uniswapQuoter contract
     * @param _newUniswapQuoterAddress The address of the uniswapQuoter contract
     */
    function updateUniswapQuoter(address _newUniswapQuoterAddress) external onlyOwner {
        address _oldAddress = address(uniswapQuoter);
        uniswapQuoter = IQuoter(_newUniswapQuoterAddress);

        emit UniswapQuoterUpdated(_oldAddress, _newUniswapQuoterAddress);
    }

    /**
     * @dev updates the address of the weth contract
     * @param _newWethAddress The address of the weth contract
     */
    function updateWeth(address _newWethAddress) external onlyOwner {
        address _oldAddress = address(weth);
        weth = IWeth(_newWethAddress);

        emit WethUpdated(_oldAddress, _newWethAddress);
    }

    /**
     * @dev swaps the `msg.value` Ether to at least `minAmount` of tokens in `address`, or reverts
     * @param token The address of ERC-20 token to swap
     * @param minAmount The minimum amount of tokens transferred to msg.sender
     * @return The actual amount of transferred tokens
    */
    function swapEtherToToken(address token, uint minAmount) external payable override whenNotPaused nonReentrant returns (uint) {
        _getWeth();
        return _swapWethForToken(token, minAmount);
    }

    function _getWeth() internal {
        uint _wethBalanceBefore = weth.balanceOf(address(this));
        weth.deposit{value: msg.value}();
        uint _wethBalanceAfter = weth.balanceOf(address(this));

        if (_wethBalanceAfter - _wethBalanceBefore < msg.value) {
            revert InvalidWethReceivedAmount();
        }
    }

    function _swapWethForToken(address token, uint minAmount) internal returns (uint amount) {
        uint _tokenBalanceBefore = IERC20(token).balanceOf(msg.sender);
        weth.approve(address(uniswapRouter), msg.value);

        uniswapRouter.exactInputSingle(
            IUniswapRouter02.ExactInputSingleParams({
                tokenIn: address(weth),
                tokenOut: token,
                fee: _getBestPoolFee(token),
                recipient: msg.sender,
                amountIn: msg.value,
                amountOutMinimum: minAmount,
                sqrtPriceLimitX96: 0
            })
        );

        uint _tokenBalanceAfter = IERC20(token).balanceOf(msg.sender);

        amount = _tokenBalanceAfter - _tokenBalanceBefore;

        if (amount < minAmount) {
            revert InvalidTokenReceivedAmount();
        }

        emit EthSwapped(token, msg.sender, msg.value, amount);
    }

    function _getBestPoolFee(address token) internal returns (uint24){
        console.log(1);
        uint _amountOut100 = _getPoolAmountOut(token, 100);
        console.log(2);
        uint _amountOut500 = _getPoolAmountOut(token, 500);
        console.log(3);
        uint _amountOut3000 = _getPoolAmountOut(token, 3000);
        console.log(4);
        uint _amountOut10000 = _getPoolAmountOut(token, 10000);
        console.log(5);

        if (_amountOut100 > _amountOut500) {
            if (_amountOut3000 > _amountOut10000) {
                return _amountOut100 > _amountOut3000 ? 100 : 3000;
            } else {
                return _amountOut100 > _amountOut10000 ? 100 : 10000;
            }
        } else {
            if (_amountOut3000 > _amountOut10000) {
                return _amountOut500 > _amountOut3000 ? 500 : 3000;
            } else {
                return _amountOut500 > _amountOut10000 ? 500 : 10000;
            }
        }
    }

    function _getPoolAmountOut(address token, uint24 fee) internal returns (uint amountOut){
        console.log('******************************************');
        console.log(IUniswapFactory(uniswapRouter.factory()).getPool(address(weth), token, fee));
        if (IUniswapFactory(uniswapRouter.factory()).getPool(address(weth), token, fee) != address(0)) {
            console.log('aaaaaaaaa');
            (amountOut, , , ) = uniswapQuoter.quoteExactInputSingle(IQuoter.QuoteExactInputSingleParams({
                tokenIn: address(weth),
                tokenOut: token,
                amountIn: msg.value,
                fee: fee,
                sqrtPriceLimitX96: 0
            }));
            console.log('bbbbbbb');
        } else {
            amountOut = 0;
        }
    }
}
