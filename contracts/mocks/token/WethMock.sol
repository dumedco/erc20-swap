// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

//used only for testing
contract WethMock is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) public virtual {
        _mint(to, amount);
    }

    function deposit() public payable {
        _mint(msg.sender, msg.value/2);
    }
}
