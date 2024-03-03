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
//    constructor() {
//        _disableInitializers();
//    }

    function updateUniswapRouter(address _newUniswapRouterAddress) external onlyOwner {
        uniswapRouter = IUniswapRouter02(_newUniswapRouterAddress);
    }

    /**
     * @dev instantiates contract
     */
    function initialize(
        address _ownerAddress,
        address _wethAddress,
        address _uniswapRouterAddress
    ) external initializer {
        __Ownable_init(_ownerAddress);
        __Pausable_init();
        __ReentrancyGuard_init();

        uniswapRouter = IUniswapRouter02(_uniswapRouterAddress);
        weth = IWeth(_wethAddress);
    }

    /// @dev swaps the `msg.value` Ether to at least `minAmount` of tokens in `address`, or reverts
    /// @param token The address of ERC-20 token to swap
    /// @param minAmount The minimum amount of tokens transferred to msg.sender
    /// @return The actual amount of transferred tokens
    function swapEtherToToken(address token, uint minAmount) external payable  override whenNotPaused nonReentrant returns (uint) {
        return 2;
    }
}
