// contracts/MyNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mintable is ERC20 {

    constructor() ERC20("Gold", "GLD") {
        _mint(msg.sender, 100000000000);
    }

    function getToken() public {
        _mint(msg.sender, 1000);
    }
}