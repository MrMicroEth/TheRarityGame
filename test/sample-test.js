const { SignerWithAddress } = require("@nomiclabs/hardhat-ethers/signers");
const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");

let fee = ethers.utils.parseEther("0.1") // this should be pulled from contract
let overrides = {value: fee};     // ether in this case MUST be a string
let Rarity;
let rarity;
let patternLimit;
let accounts;

beforeEach(async function() { 
  Rarity = await ethers.getContractFactory("Rarity");
  rarity = await Rarity.deploy(4, fee, 4);
  accounts = await ethers.getSigners();
  patternLimit = await rarity.patternLimit();
  /*
  for (let i = 0; i<patternLimit; i++){
    //console.log(accounts[i].address);
    const setPattern = await rarity.connect(accounts[i]).submitPattern( [1,1,1,1], overrides);
    await setPattern.wait();
}*/ 

  // Play the Game!! Submit 5 patterns, 2 will be elimanated if our limit is at 3
  let setPattern = await rarity.connect(accounts[0]).submitPattern( [1,0,1,0], overrides);
  setPattern = await rarity.connect(accounts[1]).submitPattern( [0,1,0,1], overrides);
  setPattern = await rarity.connect(accounts[2]).submitPattern( [1,1,1,1], overrides);
  setPattern = await rarity.connect(accounts[3]).submitPattern( [1,1,1,1], overrides);
  setPattern = await rarity.connect(accounts[4]).submitPattern( [0,0,0,0], overrides);
});

describe("Rarity Game", function () {

  //this tests the totalPatternCount to make sure that it equals 5 after we have submitted 5 patterns
  it("Should increase the pattern count after patterns are submitted", async function () {
    expect(await rarity.totalPatternCount()).to.equal(5);
  });

  //this tests to see that the least rare pattern is burned after we have exceeded the pattern limit
  it("should have burned the first pattern because it is least rare", async function () {
    expect(await rarity.patternIsActive(2)).to.equal(false);
  });
  
  //Tests to see that we have not exceeded our live pattern limit
  it("should limit the number of patterns to the pattern limit", async function () {
    const count = await rarity.liveAddressCount();
    expect(count).to.equal(patternLimit);
  });
  
  //Test to see that a player earns the correct amount of eth for playing the game. This number looks random, but it is the expected outcome after some players submitted patterns after this player
  it("should earn the correct reward amount by playing", async function () {
    const expectedReward = BigNumber.from("233333333333333333");
    const actualReward = await rarity.connect(accounts[0]).checkReward();
    expect(actualReward).to.equal(expectedReward);
  });
  
  //Test whether the the wallet balance decreases after we claim a reward
  it("should claim a reward and increase wallet balance", async function () {
    provider = ethers.provider;
    let originalAmount = await provider.getBalance(accounts[0].address);
    //console.log("balance after tx ", ethers.utils.formatEther(originalAmount.toString()));
    const claim = await rarity.claimReward();
    let newBalance = await provider.getBalance(accounts[0].address);
    //console.log("New Balance ", ethers.utils.formatEther(newBalance.toString()));
    expect(newBalance).to.be.above(originalAmount);
  });

});
