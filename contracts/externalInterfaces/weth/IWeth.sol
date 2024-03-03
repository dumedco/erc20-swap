// SPDX-License-Identifier: MIT

pragma solidity 0.8.24;

interface IWeth {
    function deposit() external payable;
    function withdraw(uint wad) external;
}
