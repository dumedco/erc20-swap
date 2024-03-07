// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

/// @title Router token swapping functionality
interface IUniswapFactory {
    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address pool);
}
