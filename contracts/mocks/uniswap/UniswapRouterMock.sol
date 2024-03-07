// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../externalInterfaces/uniswapV3/IUniswapRouter02.sol";

//used only for testing
contract UniswapRouterMock {
    IUniswapRouter02 public originalUniswapRouter;

    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    constructor(address originalUniswapRouterAddress) {
        originalUniswapRouter = IUniswapRouter02(originalUniswapRouterAddress);
    }

    function factory() external view returns(address) {
        return originalUniswapRouter.factory();
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
    external
    payable
    returns (uint256 amountOut)
    {
        amountOut = params.amountOutMinimum / 2;

        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        IERC20(params.tokenOut).transfer(params.recipient, amountOut);
    }
}
