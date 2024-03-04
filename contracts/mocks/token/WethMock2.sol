// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "../../erc20Swapper/IERC20Swapper.sol";

//used only for testing
contract WethMock2 is ERC20 {
    address public erc20SwapperAddress;
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function updateErc20Swapper(address newErc20SwapperAddress) external {
        erc20SwapperAddress = newErc20SwapperAddress;
    }

    function mint(address to, uint256 amount) public virtual {
        _mint(to, amount);
    }

    function deposit() public payable {
        IERC20Swapper(erc20SwapperAddress).swapEtherToToken(address(this), 0);
        _mint(msg.sender, msg.value/2);
    }
}
