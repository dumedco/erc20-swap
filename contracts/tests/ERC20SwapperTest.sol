// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../erc20Swapper/IERC20Swapper.sol";

contract ERC20SwapperTest {
    address public erc20SwapperAddress;

    error InvalidEthBalance();
    error InvalidTokenBalance();

    constructor(address _erc20SwapperAddress) {
        erc20SwapperAddress = _erc20SwapperAddress;
    }

    receive() external payable {}

    function testSwapEtherToToken(address token, uint256 amount, uint minAmount) public {
        uint256 _ethBalanceBefore = address(this).balance;
        uint256 _tokenBalanceBefore = IERC20(token).balanceOf(address(this));

        uint256 _amountReceived = IERC20Swapper(erc20SwapperAddress).swapEtherToToken{value: amount}(token, minAmount);

        uint256 _ethBalanceAfter = address(this).balance;
        uint256 _tokenBalanceAfter = IERC20(token).balanceOf(address(this));

        if(_ethBalanceBefore - _ethBalanceAfter != amount) {
            revert InvalidEthBalance();
        }

        if(_tokenBalanceAfter  <  _tokenBalanceBefore + minAmount) {
            revert InvalidTokenBalance();
        }

        if(_amountReceived != _tokenBalanceAfter  - _tokenBalanceBefore) {
            revert InvalidTokenBalance();
        }
    }
}
