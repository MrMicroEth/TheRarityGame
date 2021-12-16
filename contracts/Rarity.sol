//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

/// @title The Rarity Game
/// @author MrMicro.eth
/// @notice This game is for demonstration purposes only
contract Rarity is Ownable{

    event newPattern(address indexed _creator, uint indexed _id);
    event patternBurned(address indexed _creator, uint indexed _id);

    uint public squares;
    uint public patternLimit;
    uint public fee;

    struct playerData {
        uint reward;
        uint[] patternId;
    }

    mapping(address => playerData ) public players;

    struct patternStruct {
        uint8[] pattern;
        bool burned;
        address creator;
    }

    patternStruct[] public patterns;

    uint public totalPatternCount;
    uint[] public patternTotals;
    uint public liveAddressCount; 

    /// @notice  Set the game variables
    /// @param _patternLimit the new pattern Limit  
    /// @param _fee the submission fee
    constructor(uint _patternLimit, uint _fee, uint _squares) {
        patternLimit = _patternLimit;
        fee = _fee;
        squares = _squares;
    }
    
    /// @notice  Set the game pattern Limit
    /// @param _patternLimit the new pattern Limit  
    /// @return uint the new pattern limit if successful
    function setPatternLimit(uint _patternLimit) external onlyOwner returns (uint) {
        patternLimit = _patternLimit;
        return patternLimit;
    }

    /// @notice Set the submission fee
    /// @param _fee  the new submission fee
    /// @return uint returns the new fee
    function setFee(uint _fee) external onlyOwner returns (uint) {
        fee = _fee;
        return fee;
    }
    
    /// @notice Submit a pattern 
    /// @param _pattern is a uint8 array of length "squares" 
    /// @return uint if successful, the generated pattern id is returned 
    function submitPattern(uint8[] memory _pattern) public payable returns (uint) {
        //require that they send ether
        console.log("submitting pattern id:%s" , totalPatternCount);
        require(msg.value == fee, "please send ether");

        //check pattern data
        for (uint i = 0; i<squares; i++ ){
            require(_pattern[i] < 2, "Pattern index not a one or zero");
            if(patternTotals.length < i+1) patternTotals.push(0); //initializes array
        } 

       //save the msg senders pattern in the mapping
        patterns.push(patternStruct(_pattern, false, msg.sender));
        players[msg.sender].patternId.push(totalPatternCount);

        //increase the total guesses
        liveAddressCount++;
        totalPatternCount++;

        //add submitted pattern to pattern totals
        for (uint i = 0; i<squares; i++ ){
            patternTotals[i] += _pattern[i];
        } 

        //find a burn most common pattern holder
        uint idToCancel = patterns.length - 1; //default address to burn is the newest
        uint lowestRarity = squares * patternLimit; //start with highest possible rarity, then find and eliminate lowest rarity pattern, ie the most common

       //burn most rare by looping through all patterns
        for(uint i = 0; i<patterns.length; i++){
            //skip burned addresses
            if(patterns[i].burned) continue;

            //calculate rarity by comparing each pattern component to the avg
            uint _rarity;
            //uint[8] memory debug;
            //console.log("\nLOOP:%s " , i);

            for(uint j = 0; j<squares; j++){
                uint patternComponent =patterns[i].pattern[j];             
                uint inflatedPattern = liveAddressCount * patternComponent; 
                _rarity += inflatedPattern > patternTotals[j] ? inflatedPattern - patternTotals[j] : patternTotals[j] - inflatedPattern; 

                //debug[j] = inflatedPattern;
                //debug[j+4] = patternTotals[j];
            }
            /*
                console.log("\nLOOP: %s",i);
                console.log(debug[0], debug[1], debug[2], debug[3] );
                console.log(debug[4], debug[5], debug[6], debug[7] );
                console.log("old ratity: %s " , lowestRarity);
                console.log("new rarity %s ", _rarity);
                */

            //save the loswest rarity address for burn if we are over limit
            if(_rarity < lowestRarity ) { // < favors new patterns <= would favor older pattens
                idToCancel = i;
                lowestRarity = _rarity;
            }
        }
        
        //if we are over the limit, burn address
        if( liveAddressCount > patternLimit) {
            // if the submitted pattern is going to lose right away, revert cause thats not nice.
            console.log("pattern to cancel: %s", idToCancel);
            require(idToCancel != (totalPatternCount - 1), "Pattern would be most common, please try a new Pattern");
            patterns[idToCancel].burned = true;
            liveAddressCount--;

            //remove burned patterns from totals
            for (uint j = 0; j<squares; j++ ){
                patternTotals[j] -= patterns[idToCancel].pattern[j];
            } 
            emit patternBurned(patterns[idToCancel].creator, idToCancel);
            console.log("cancelling Mr:%s",patterns[idToCancel].creator);
        }

        //  updateRewards
        for(uint i = 0; i<patterns.length; i++){
            if(patterns[i].burned ) continue; //no fee if you just submitted. This portion will accummulte in the contract if not burned which will help the contract not become negative due to rounding error
            address _address = patterns[i].creator;
            players[_address].reward += fee/liveAddressCount;
            //console.log("rewarding: %s", players[_address].reward);
            //console.log("Address: %s", _address);
        } 
        emit newPattern(msg.sender, (totalPatternCount - 1));

        return totalPatternCount-1;
    }

    /// @notice Checks the callers reward
    /// @return uint The callers reward in wei
    function checkReward() public view returns (uint) {
        return (players[msg.sender].reward);
        //console.log("CheckReward %s", players[msg.sender].reward);
    }

    /// @notice Claims the users reward
    function claimReward() external payable { // Prevent DoS with (Unexpected) revert (SWC-113) by using a pull rather than push reward distribution
        uint _reward = players[msg.sender].reward;
        require(_reward > 0, "No reward to claim");
        players[msg.sender].reward = 0; //updating reward before sending value to prevent re-entrency attack SWC-107
        (bool sent, ) = msg.sender.call{value: _reward}("");
        require(sent, "Failed to claim Reward");
    }

    /// @notice Lookup a users pattern ids
    /// @return uint[] Returns an array of the users pattern ids
    function fetchPatternIDs() public view returns (uint[] memory){
        return (players[msg.sender].patternId);
    }

    /// @notice Lookup whether a pattern is actice or inactive (canceled)
    /// @param id The pattern id
    /// @return bool Rerurns true for active, false for Inactive
    function patternIsActive(uint id) public view returns(bool){
        return (!patterns[id].burned);
    }

    /// @notice Lookup a pattern by id
    /// @param id the pattern id
    /// @return uint8[] a uint array of length squares 
    function fetchPattern(uint id) public view returns(uint8[] memory){
        return (patterns[id].pattern);
    }

}