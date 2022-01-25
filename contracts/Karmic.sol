//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Badger.sol";

contract Karmic is Badger{
    mapping(address => uint256) private boxTokenTiers;
    uint256 boxTokenCounter;

    constructor(string memory _newBaseUri) Badger(_newBaseUri) {}

    function addBoxTokens(address[] memory tokens, string[] calldata tierUris) external onlyOwner {
        uint256 counter = boxTokenCounter;

        for(uint8 i; i< tokens.length; i++) {
            address token = tokens[i];
            require(boxTokenTiers[token] == 0, "DUPLICATE_TOKEN");
            boxTokenTiers[token] = counter + 1;
            createTokenTier(counter + 1, tierUris[i], false, token);
            counter++;
        }

        boxTokenCounter = counter;
    }

    function getBoxTokens() public view returns (address[] memory boxTokens){
        boxTokens = new address[](boxTokenCounter);
        for(uint8 i = 1; i <= boxTokenCounter; i++) {
            boxTokens[i-1] = tokenTiers[i].boxToken;
        }
    }

    function claimGovernanceTokens(address[] memory boxTokens) external {
        bytes memory data;

        address token;
        for(uint8 i; i < boxTokens.length; i++) {
            token = boxTokens[i];
            uint256 amount = IERC20(token).balanceOf(msg.sender);
            uint256 tokenId = boxTokenTiers[token];
            IERC20(token).transferFrom(msg.sender, address(this), amount);
            _mint(msg.sender, tokenId, amount, data);
        }
    }

    function allBalancesOf(address holder) external view returns (uint256[] memory balances) {
        balances = new uint256[](boxTokenCounter);
        for(uint8 i; i < boxTokenCounter; i++) {
            balances[i] = balanceOf(holder, i + 1);
        }
    } 
}
