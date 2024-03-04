// SPDX-License-Identifier: MIT

pragma solidity 0.8.24;

interface IWeth {
    function balanceOf(address account) external view returns (uint256);
    function deposit() external payable;
    function withdraw(uint wad) external;
    function approve(address spender, uint256 value) external returns (bool);
}
