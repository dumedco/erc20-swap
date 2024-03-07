// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../externalInterfaces/uniswapV3/IUniswapRouter02.sol";
import "../../erc20Swapper/IERC20Swapper.sol";

//used only for testing
contract UniswapRouterMock2 {
    IUniswapRouter02 public originalUniswapRouter;
    address public erc20SwapperAddress;

    constructor(address originalUniswapRouterAddress) {
        originalUniswapRouter = IUniswapRouter02(originalUniswapRouterAddress);
    }

    function factory() external view returns(address) {
        return originalUniswapRouter.factory();
    }

    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function updateErc20Swapper(address newErc20SwapperAddress) external {
        erc20SwapperAddress = newErc20SwapperAddress;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
    external
    payable
    returns (uint256 amountOut)
    {
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);
        IERC20Swapper(erc20SwapperAddress).swapEtherToToken(params.tokenIn, 0);

        return 0;
    }
}
