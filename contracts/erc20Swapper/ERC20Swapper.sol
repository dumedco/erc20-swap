// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./IERC20Swapper.sol";
import "../externalInterfaces/uniswapV3/IUniswapRouter02.sol";
import "../externalInterfaces/weth/IWeth.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "hardhat/console.sol";

contract ERC20Swapper is
    Initializable,
    OwnableUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    IERC20Swapper
{
    IUniswapRouter02 public uniswapRouter;
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
     * @dev instantiates contract
     * @param ownerAddress The address of the owner
     * @param wethAddress The address of Wrapped Ether
     * @param uniswapRouterAddress The address of the uniswap router contract
     */
    function initialize(
        address ownerAddress,
        address wethAddress,
        address uniswapRouterAddress
    ) external initializer {
        __Ownable_init(ownerAddress);
        __Pausable_init();
        __ReentrancyGuard_init();

        uniswapRouter = IUniswapRouter02(uniswapRouterAddress);
        weth = IWeth(wethAddress);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function updateUniswapRouter(address _newUniswapRouterAddress) external onlyOwner {
        address _oldAddress = address(uniswapRouter);
        uniswapRouter = IUniswapRouter02(_newUniswapRouterAddress);

        emit UniswapRouterUpdated(_oldAddress, _newUniswapRouterAddress);
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
            revert InvalidWethReceivedAmount();     //todo: add test
        }
    }

    function _swapWethForToken(address token, uint minAmount) internal returns(uint amount) {
        uint _tokenBalanceBefore = IERC20(token).balanceOf(msg.sender);

        weth.approve(address(uniswapRouter), msg.value);

        uniswapRouter.exactInputSingle(
            IUniswapRouter02.ExactInputSingleParams({
                tokenIn: address(weth),
                tokenOut: token,
                fee: 10000,
                recipient: msg.sender,
                amountIn: msg.value,
                amountOutMinimum: minAmount,
                sqrtPriceLimitX96: 0
            })
        );

        uint _tokenBalanceAfter = IERC20(token).balanceOf(msg.sender);

        amount = _tokenBalanceAfter - _tokenBalanceBefore;

        if (amount < minAmount) {
            revert InvalidTokenReceivedAmount();     //todo: add test
        }

        emit EthSwapped(token, msg.sender, msg.value, amount);
    }
}
