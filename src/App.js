import './App.css';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers' 
import Rarity from './artifacts/contracts/Rarity.sol/Rarity.json'

// Update with the contract address logged out to the CLI when it was deployed 
//const rarityAddress = "" //mainnet
const rarityAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3" // localhost
//const networkID = 3 //ropsten
//const networkID = 1 //mainnet
const networkID = 1337 //localhost
let provider 
let signer
let contract 
let accounts
const  numSquares = 9
let  connectedNetwork  

function App() {

  const [msg, setMsg] = useState()
  const [walletStatus, setWalletStatus] = useState("Connect Wallet")
  const [reward, setReward] = useState("0.0")
  const sp = new Array(numSquares).fill(0)
  const [squarePattern, setSquarePattern] = useState(sp)
  const s = new Array(numSquares)
  const [patternLimit, setPatternLimit] = useState("?")
  const [address, setAddress] = useState()
  const [submissionFee, setFee] = useState("?")
  const [footer, setFooter] = useState()

  useEffect(() => {
    initialize()
  },[])
  
  async function connectWallet() {
    if(walletConnected())return
      accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      initialize()
  }
  
  async function initialize() {
    if (window.ethereum) {
      try {
        accounts = await window.ethereum.request({ method: 'eth_accounts' });
        provider = new ethers.providers.Web3Provider(window.ethereum)
        connectedNetwork  = await provider.getNetwork()
        signer = provider.getSigner()
        const _address = await signer.getAddress()
        setAddress(_address)
        contract = new ethers.Contract(rarityAddress, Rarity.abi, signer)
        const pL = await contract.patternLimit()
        setPatternLimit(pL.toString())
        const sFee = ethers.utils.formatEther(await contract.fee())
        const fFee = (+sFee).toFixed(2)
        setFee(fFee)

      } catch (err) {
        console.log("Error connecting Wallet: "+ err.message)
        walletConnected()
        return false
      }
      setMsg("")
      refreshAccount()
    } else {
      setMsg("Please install Metamask")
      return false
    }
  }

  function refreshAccount() { 
      fetchPatterns()
      checkReward()
  }

  function walletConnected() {
    if (window.ethereum && accounts && accounts.length > 0) {
      setWalletStatus("Wallet Connected")
      if (connectedNetwork.chainId !== networkID && ethers.providers){ 
        setMsg("Please connect to the " + ethers.providers.getNetwork(networkID).name + " Network")
        return false
      }
      return true
    } else {
      setWalletStatus("Connect Wallet")
      setAddress("")
      setMsg("Please Connect Wallet")
      return false
    }
  }

  async function submitPattern() {
    if (!walletConnected()) return
    let overrides = {
      value: ethers.utils.parseEther("0.1")     // ether in this case MUST be a string
    }; 
    console.log("send tx: ", squarePattern);
    let transaction;
    try {
      transaction = await contract.submitPattern(squarePattern, overrides)
    } catch (err) {
      setMsg(err.message)
      setMsg("Pattern is too common, please try another")
      return false
    }
    setMsg("Tx Pending")
    
    //set event listener
    const newPatternFilter = contract.filters.newPattern(address, null)
    contract.on(newPatternFilter, (  _address, _id) => {
      console.log('Address  :', _address);
      console.log('Pattern Id : ', _id.toString());  //Event object
      setMsg(`Pattern ID No. ${_id.toString()} has been submitted!`)
      refreshAccount()
    });
    
    const burnFilter = contract.filters.patternBurned(address, null)
    contract.on(burnFilter, (  _address, _id) => {
      console.log('Address  :', _address);
      console.log('Pattern Id Burned : ', _id.toString());  //Event object
      setFooter(`Pattern ID No. ${_id.toString()} has been burned`)
      refreshAccount()
    });       
    /* Instead of using a receipt we are listening for the event now
    const receipt = await transaction.wait()
    if(receipt.status === 1) {
      setMsg("Pattern submission sucessful!")
    } else {
      setMsg("There was an error submitting your pattern, please try again")
      return false;
    }
    */
  }
  

  async function claimReward() {
    if (!walletConnected()) return
    if (reward === 0) {
      setMsg("No Reward to Claim")
      return
    }
    let claim
    try {
    claim = await contract.claimReward();
    } catch (err) {
      setMsg(err.message)
      return false
    }
    setMsg("Tx Pending")
    const receipt = await claim.wait()
    //wait for transaction to finish
    //check the reward amount, update msg, check that reward is zeroed out
    const _reward = await checkReward() 
    if(receipt.status === 1 && parseInt(_reward) === 0) {
      setMsg(reward + " Eth Reward Claimed Sucessfully")
    } else {
      setMsg("There was an error, please try again")
      return false;
    }
  }

  async function checkReward() {
    if (!walletConnected()) return
    try {
      const _reward = ethers.utils.formatEther(await contract.checkReward())
      const res = (+_reward).toFixed(2);
      setReward(res)
      return _reward
    } catch (err) {
      setMsg(err)
    }
  }

  const [patternGrid, setPatternGrid]  = useState(s)

  async function fetchPatterns() {
    if (!walletConnected()) return

      try {
        const newGrid = new Array() 
        const data = await contract.fetchPatternIDs()
        if(data.length > 0){
          for (let i = 0; i < data.length; i++) {
            const pattern = await contract.fetchPattern(data[i])
            const active = await contract.patternIsActive(data[i])
            if(active){
              newGrid[i] = new Array()
              newGrid[i] = pattern// = pattern.map(x => x.toNumber())
            }
          }
          setPatternGrid(newGrid)
        } else {
          //setSavedPatterns("No Patterns Found")
        }

      } catch (err) {
        setMsg(err)
      }
  }

  function changeStyle(i){
    const newPattern = squarePattern.slice()
    if(!newPattern[i]) {
      newPattern[i] = 1
    }else {
      newPattern[i] = 0
    }
    setSquarePattern(newPattern)
  }
  
  function multiGrid(gridArray){
    if(gridArray && gridArray.length){
      const grids = new Array()
      for (let i = 0; i < gridArray.length; i++) {
        if(gridArray[i]){
          grids.push(
          <div className = "activePatterns">
            <span className = "id" >ID: {i}</span>
            {grid(gridArray[i])}
          </div>
          )
        }
      }
      return grids
    }
  }

  function grid(selected, squareClicked = () => {}){
    let newStyle = new Array(numSquares)
    //use the array to set square style
    if(!selected) return 
    for (let i = 0; i < selected.length; i++) {

    if(selected[i]) {
      newStyle[i] = { background : 'grey'}
    }else {
      newStyle[i] = {background : 'white'}
    }
  }

    return(
      <div className="game">
        <div className="game-board">
          <div className="board-row">
            <button className="square" style={newStyle[0]} onClick={() =>squareClicked(0)}></button>
            <button className="square" style={newStyle[1]} onClick={() =>squareClicked(1)}></button>
            <button className="square" style={newStyle[2]} onClick={() =>squareClicked(2)}></button>
          </div>
          <div className="board-row">
            <button className="square" style={newStyle[3]} onClick={() =>squareClicked(3)}></button>
            <button className="square" style={newStyle[4]} onClick={() =>squareClicked(4)}></button>
            <button className="square" style={newStyle[5]} onClick={() =>squareClicked(5)}></button>
          </div>
          <div className="board-row">
            <button className="square" style={newStyle[6]} onClick={() =>squareClicked(6)}></button>
            <button className="square" style={newStyle[7]} onClick={() =>squareClicked(7)}></button>
            <button className="square" style={newStyle[8]} onClick={() =>squareClicked(8)}></button>
          </div>
        </div>
      </div>
      //<input onChange={e => setPatternValue(e.target.value)} placeholder="Submit Pattern" />
    )
  }

  return (
    <div className="App">
      <div className="topBar">
        <div className="claim">
          <button onClick={claimReward}>Claim Reward</button>
          <span className="reward">Reward: {reward} Eth</span>
        </div>

        <div className="wallet">
          <button onClick={connectWallet}>{walletStatus}</button>
          <div className="address">{address && address.slice(0,5) + "..." + address.slice(-4)}</div>
        </div>
      </div>
      <div className="msg">{msg}</div>
      <h1 className="Title">The Rarity Game</h1>
      <div className="gameContainer">
        <div className="gameAndButton">
          {grid(squarePattern, changeStyle)}
          <button onClick={submitPattern}>Save Pattern</button>
        </div>
        <div className="instructions">
          <ul>
            <b>Rules:</b>
            <li>Create and submit a unique pattern by selecing boxes.</li>
            <li>After the pattern limit of {patternLimit} patterns is reached, 
            each new pattern submission will trigger a burn of the most common pattern</li>
            <li>A pattern submissionn fee of {submissionFee} Eth is collected and evenly divided up amongst current patterns</li>
            <li>If a pattern is elimainated, the rewards it has earned remain available, but the pattern will earn no additional rewards</li> 
            <li>Pattern owners can withdraw rewards earned by their patterns at anytime</li> 
            <li>The longer your pattern stays active, the more rewards you earn!</li> 
          </ul>
        </div>

      </div>
      <div>
        <h2 className="app-pattern-title">Your Active Patterns</h2>
        <div className="app-pattern">{multiGrid(patternGrid)}</div>
        <div className="burnMsg">{footer}</div>
      </div>
    </div>
  );
}

  
export default App
//