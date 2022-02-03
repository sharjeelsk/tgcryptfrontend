import React, { useState } from 'react';
import {ethers} from 'ethers'
import {contractABI, contractAddress} from '../utils/constants'


export const TransactionContext = React.createContext();

const {ethereum} = window;

const getEthereumContract = ()=>{
    const provider = new ethers.providers.Web3Provider(ethereum)
    const signer = provider.getSigner();
    const transactionContract = new ethers.Contract(contractAddress, contractABI, signer);
    console.log({provider,signer,transactionContract})
    return transactionContract

}

export const TransactionProvider = ({children})=>{
    const [currentAccount, setCurrenctAccount] = useState("");
    const [formData,setFormData]=React.useState({addressTo:"",amount:"",keyword:"",message:""})
    const [isLoading,setIsLoading]=React.useState(false)
    const [transactionCount,setTransactionCount]=useState(localStorage.getItem("transactionCount"));
    const [transactions,setTransactions]=useState([])

    const handleChange = (e,name)=>{
        setFormData((prevState)=>({...prevState,[name]:e.target.value}))
    }


    const getAllTransactions = async ()=>{
        try{
            if(!ethereum) return alert("Please Install Metamask")
            let transactionContract = getEthereumContract()
            const availableTransactions = await transactionContract.getAllTransactions()
            const structuredTransactions = availableTransactions.map((t)=>({
                addressTo:t.receiver,
                addressFrom:t.sender,
                timestamp: new Date(t.timestamp.toNumber() * 1000).toLocaleString(),
                message:t.message,
                keyword:t.keyword,
                amount:parseInt(t.amount._hex)/(10**18)
            }))
            setTransactions(structuredTransactions)
            console.log(structuredTransactions);
        }catch(error){
            throw error
        }
    }

    const checkIfWalletIsConnected = async ()=>{

        

        if(!ethereum) return alert("Please Install Metamask")
        const accounts = await ethereum.request({method:"eth_accounts"})
        if(accounts.length){
            setCurrenctAccount(accounts[0])
            getAllTransactions()
            //get all transactions 
        }else{
            alert("no accoutns found")
        }
        console.log(accounts);
    }

    const checkIfTransactionsExist = async ()=>{
        try{
            let transactionContract = getEthereumContract()
            const transactionCount = await transactionContract.getTransactionCount();
            window.localStorage.setItem("transactionCount",transactionCount)
        }catch(err){
            console.log(err);
            throw new Error("no eth obj")
        }
    }


    const connectWallet = async ()=>{
        try{
            if(!ethereum) return alert("Please Install Metamask")
        const accounts = await ethereum.request({method:"eth_requestAccounts"})
        console.log("accoutnsis ",accounts);
        setCurrenctAccount(accounts[0])
        }catch(error){
            console.log(error);
            throw new Error("No Ethereum object")
        }
    }

    const sendTransaction = async ()=>{
        try{
            if(!ethereum) alert("please install metamask")
            const {addressTo, amount,keyword, message} = formData;
            let transactionContract = getEthereumContract()
            const parsedAmount = ethers.utils.parseEther(amount)
            await ethereum.request({
                method:"eth_sendTransaction",
                params:[{from:currentAccount, 
                    to:addressTo, 
                    gas:'0x5208', //21000 GWEI
                value:parsedAmount._hex //0.00001
            }]
            })
            const transactionHash = await transactionContract.addToBlockchain(addressTo, parsedAmount,message,keyword)
            setIsLoading(true)
            console.log(`loading - ${transactionHash.hash}`);
            await transactionHash.wait();
            setIsLoading(false)
            console.log(`success - ${transactionHash.hash}`);
            const transactionCount = await transactionContract.getTransactionCount();
            setTransactionCount(transactionCount.toNumber())
            window.location.reload(true)
        }catch(err){
            console.log(err);
            throw new Error("no eth obj")
        }
    }

    React.useEffect(()=>{
        checkIfWalletIsConnected()
        checkIfTransactionsExist()
    },[])

    return (
        <TransactionContext.Provider value={{connectWallet,currentAccount,formData,setFormData,handleChange,sendTransaction,transactions,isLoading}}>
            {children}
        </TransactionContext.Provider>
    )
}