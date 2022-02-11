//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Badger.sol";

contract Karmic is Badger{
    mapping(address => BoxToken) public boxTokenTiers;
    uint256 boxTokenCounter;

    struct BoxToken{
        uint256 id;
        uint256 amount;
        uint256 funds;
        bool passedThreshold;
        uint256 threshold;
    }

    modifier isBoxToken(address token){
        require(boxTokenTiers[token].id != 0, "It is not a box token");
        _;
    }


    constructor(string memory _newBaseUri) Badger(_newBaseUri) {
        boxTokenCounter = 1;
        createTokenTier(0, _newBaseUri, false, address(0));
    }

    receive() external payable{
        if(boxTokenTiers[msg.sender].id != 0){
            boxTokenTiers[msg.sender].amount = ERC20(msg.sender).totalSupply();
            boxTokenTiers[msg.sender].funds = msg.value;
        } else {
            bytes memory data;
            _mint(msg.sender, 0, msg.value, data);
        }
    }

    function bondToMint(address token, uint256 amount) public isBoxToken(token) {

        require(ERC20(token).transferFrom(msg.sender, address(this), amount),
            "Failed to withdraw stakeholder's ERC20 tokens");
        bytes memory data;
        _mint(msg.sender, boxTokenTiers[token].id, amount, data);
    }

    function addBoxTokens(address[] memory tokens, string[] calldata tierUris, uint256[] calldata threshold) external onlyOwner {
        uint256 counter = boxTokenCounter;

        for(uint8 i; i< tokens.length; i++) {
            address token = tokens[i];
            require(boxTokenTiers[token].id == 0, "DUPLICATE_TOKEN");
            boxTokenTiers[token].id = counter;
            boxTokenTiers[token].threshold = threshold[i];
            createTokenTier(counter, tierUris[i], false, token);
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

    function withdraw(address token, uint256 amount) external{
        require(!(boxTokenTiers[token].funds >= boxTokenTiers[token].threshold),
            "Can withdraw only funds for tokens that didn't pass threshold");
        require(boxTokenTiers[token].id != 0,
            "Can withdraw only funds for crowdfund tokens");
        uint256 withdrawnFunds = amount * boxTokenTiers[token].funds / boxTokenTiers[token].amount;
        require(ERC20(token).transferFrom(msg.sender, address(this), amount),
            "Failed to withdraw stakeholder's ERC20 tokens");
        Address.sendValue(payable(msg.sender), withdrawnFunds);
    }


    function claimGovernanceTokens(address[] memory boxTokens) external {
        bytes memory data;

        address token;
        for(uint8 i; i < boxTokens.length; i++) {
            token = boxTokens[i];
            uint256 amount = IERC20(token).balanceOf(msg.sender);
            uint256 tokenId = boxTokenTiers[token].id;
            require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Failed ERC20 transfer");
            if(boxTokenTiers[token].id != 0){
                _mint(msg.sender, tokenId, amount, data);
            }
        }
    }

    function allBalancesOf(address holder) external view returns (uint256[] memory balances) {
        balances = new uint256[](boxTokenCounter);
        for(uint8 i; i < boxTokenCounter; i++) {
            balances[i] = balanceOf(holder, i + 1);
        }
    } 
}
