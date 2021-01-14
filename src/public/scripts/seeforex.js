// SEEFOREX

const MAINNET   = 'https://api.s0.t.hmny.io/';
const TESTNET   = 'https://api.s0.b.hmny.io/';
const ChainID   = { Mainnet:1, Testnet:2 };

let HarmonyJsx  = import('../modules/HarmonyJs.browser.js');
let HarmonyNetx = import('../modules/HarmonyNetwork.browser.js');

async function init(network=MAINNET){
    console.log('SeeForex init...', network)
    try {
        if(!seeforex.isLoaded) { await loadContracts(); }
        let chain = (network == MAINNET ? ChainID.Mainnet : ChainID.Testnet);
        let opts  = {chainType: 'hmy', chainId: chain};
        seeforex.network  = network;
        seeforex.chainId  = chain;
        seeforex.harmony  = await HarmonyJs.Harmony(seeforex.network, opts);
        seeforex.isLoaded = true;
    } catch(ex){
        console.error('Error loading seeforex', ex);
    }
    console.log('SeeForex loaded');
}

async function loadContracts() {
    console.log('Loading contracts...');
    try {
	    let res = await fetch('../contracts/forex.json',  {method:'get'});
	    let ctr = await res.json();
	    seeforex.contracts.forex = ctr;
	    console.log('Contract loaded');
	} catch(ex){
	    console.log('Error loading contract');
	}
}

async function connect(ext) {
    console.log('Wallet connect');
    try {
        let chain = (seeforex.network == MAINNET ? ChainID.Mainnet : ChainID.Testnet);
        seeforex.extension = await new seeforex.harmony.HarmonyExtension(ext);
        seeforex.extension.provider  = new HarmonyNetwork.Provider(seeforex.network).provider;
        seeforex.extension.messenger = new HarmonyNetwork.Messenger(seeforex.extension.provider, 'hmy', chain);
        seeforex.extension.setShardID(0);
        seeforex.extension.wallet.messenger       = seeforex.extension.messenger;
        seeforex.extension.blockchain.messenger   = seeforex.extension.messenger;
        seeforex.extension.transactions.messenger = seeforex.extension.messenger;
        seeforex.extension.contracts.wallet       = seeforex.extension.wallet;
        console.log('- Harmony',   seeforex.harmony);
        console.log('- Provider',  seeforex.harmony.provider);
        console.log('- Messenger', seeforex.harmony.messenger);
        console.log('- Extension', seeforex.extension);
        console.log('- WalletX',   seeforex.extension.wallet);
        console.log('- WalletC',   seeforex.extension.contracts.wallet);
        return true;
    } catch(ex){
        console.log('Wallet could not be initiated')
        console.log('Error:', ex.message)
        console.log('Error:', ex)
    }
    return false;
}

async function disconnect() {
    if(seeforex.extension) { 
    	//await seeforex.extension.wallet.forgetIdentity()
    	seeforex.extension.logout();
    }
    console.log('Wallet disconnected');
}

async function setSharding() {
    try {
        let res = await seeforex.harmony.blockchain.getShardingStructure();
        seeforex.harmony.shardingStructures(res.result);
    } catch (ex) {
        console.error('Sharding error', ex);
    }
}

async function getLastBlock() {
    let res = await seeforex.harmony.blockchain.getBlockNumber();
    console.log('Last block', res.result);
    return res.result;
}

function blockLapse(block, diff=35000) {
    //let diff =  34500; // 48 hrs
    //let diff = 100000; //  1 week
    let difx = (diff).toString(16);
    let last = '0x'+(parseInt(block, 16) - diff).toString(16);
    return last;
}

async function getAccount() {
    seeforex.account = await seeforex.extension.wallet.getAccount();
    console.log('Account', seeforex.account);
    return seeforex.account;
}

function addWallet(privKey) {
    // TODO: privKey is required, throw error if not present
    seeforex.wallet = seeforex.harmony.wallet.addByPrivateKey(privKey);
    seeforex.harmony.wallet.setSigner(seeforex.wallet.address);
    seeforex.wallet.oneAddress = seeforex.wallet.bech32Address;
    return seeforex.wallet.oneAddress;
}

function addSigner(address) {
    let hex = HarmonyJs.crypto.getAddress(address).checksum;
    console.log('Signer', address, hex);
    seeforex.harmony.wallet.setSigner(hex);
    //seeforex.extension.wallet.setSigner(hex);
    //seeforex.extension.contracts.wallet.setSigner(hex);
}

async function attachWallet(wallet, address, reject){
    if (!address) {
        let account = await seeforex.wallet.getAccount();
        address = HarmonyJs.crypto.getAddress(account.address).checksum;
    }
    console.log('Address:', address);
    wallet.defaultSigner = address;
    wallet.signTransaction = async function(tx, ad, rj) {
        console.log('Artifacts', tx, ad, rj)
        try {
            tx.from = address;
            let res = await seeforex.wallet.signTransaction(tx);
            console.log('Tx signed:', res);
            return res;
        } catch (ex) {
            console.log('Error signing tx:', ex);
            if(reject) { reject(ex, tx); }
        }
        return tx;
    }
}

async function getAllowance(token, source, target) {
    let gas = { gasPrice: 1000000000, gasLimit: 31900 };
    let ctr = seeforex.harmony.contracts.createContract(seeforex.contracts.token.abi, token.address);
    let res = await ctr.methods.allowance(source, target).call(gas);
    if (res == null) {
        console.log('[ERROR] Unable to fetch allowance');
        return null;
    }
    let bal = money(res, token.decimals);
    return bal;
}

async function getBalance(address) {
    console.log('seeforex.getBalance', address);
    if(!address){
        address = seeforex.account.address; // Wallet must be loaded
    }
    address = addressToHex(address);
    console.log(address);
    let res = await seeforex.harmony.blockchain.getBalance({ address: address });
    console.log(res);
    let bal = new seeforex.harmony.utils.Unit(res.result).asWei().toEther()
    return bal;
}

async function tokenBalance(address, token) {
    console.log('seeforex.tokenBalance', address);
    let gas = { gasPrice: 1000000000, gasLimit: 31900 };
    let ctr = seeforex.harmony.contracts.createContract(seeforex.contracts.token.abi, token.address);
    let res = await ctr.methods.balanceOf(address).call(gas);
    if (res == null) {
        console.log('[ERROR] Unable to fetch balance');
        return null;
    }
    let bal = money(res, token.decimals);
    return bal;
}

//---- TOKEN METHODS

async function getTokenPrice(token) {
    console.log('Token price:', token);
    let hmy = seeforex.harmony;
    let ctx = seeforex.contracts.forex;
    let ctr = hmy.contracts.createContract(ctx.abi, token);
    let res, prc;
    try { 
        res = await ctr.methods.getPrice().call();
        prc = res / 10**18;
        console.log('Price', prc);
    } catch(ex){ 
        console.log(ex) 
    }
    return prc;
}

async function buyTokens(token, amount, reject) {
    console.log('Buy', token, amount);
    let hmy = seeforex.harmony;
    let ctx = seeforex.contracts.forex;
    let value = new hmy.utils.Unit(amount).asOne().toWei();
    console.log('Wei', value.toString());
    let txid  = null;
    try { 
        let gas = { gasPrice: 1000000000, gasLimit: 175000 };
        let ctr = hmy.contracts.createContract(ctx.abi, token)
        let att = await attachWallet(ctr.wallet, null, reject);
        let res = await ctr.methods.buy().send({value: value, ...gas})
        if(res.status=='called'){ 
            console.log(res.transaction.txStatus, res.transaction.id); 
            txid = res.transaction.id; 
        } else { 
            console.log('Buy failed:', res); 
            reject('Tx failed, try again later');
            return null;
        }
    } catch(ex){ 
        console.log('Buy error:', ex) ;
        //reject('Rejected by user');
        return null;
    }
    return txid;
}

async function sellTokens(token, amount, reject) {
    console.log('Sell', token, amount);
    let hmy = seeforex.harmony;
    let ctx = seeforex.contracts.forex;
    let value = new hmy.utils.Unit(amount).asOne().toWei();
    console.log('Wei', value.toString());
    let txid  = null;
    try { 
        let gas = { gasPrice: 1000000000, gasLimit: 175000 };
        let ctr = hmy.contracts.createContract(ctx.abi, token)
        let att = await attachWallet(ctr.wallet, null, reject);
        let res = await ctr.methods.sell(value).send(gas);
        if(res.status=='called'){ 
            console.log(res.transaction.txStatus, res.transaction.id); 
            txid = res.transaction.id; 
        } else { 
            console.log('Sell failed:', res); 
            reject('Tx failed, try again later');
            return null;
        }
    } catch(ex){ 
        console.log('Sell error:', ex) ;
        //reject('Rejected by user');
        return null;
    }
    return txid;
}


//---- MAIN

var seeforex = {
    // Vars
    version          : '1.0.0',
    isLoaded         : false,
    mainnet          : MAINNET,
    testnet          : TESTNET,
    network          : null,
    chainId          : 1,
    harmony          : null,
    extension        : null,
    wallet           : null,
    account          : null,
    contracts        : {},
    // Base Methods
    init             : init,
    connect          : connect,
    disconnect       : disconnect,
    setSharding      : setSharding,
    getAccount       : getAccount,
    addWallet        : addWallet,
    addSigner        : addSigner,
    getAllowance     : getAllowance,
    getBalance       : getBalance,
    tokenBalance     : tokenBalance,
    // Methods
    getTokenPrice    : getTokenPrice,
    buyTokens        : buyTokens,
    sellTokens       : sellTokens,
    // Utils
    addressToHex     : addressToHex,
    addressToOne     : addressToOne
};

window.seeforex = seeforex;
export default seeforex;


// UTILS

function money(amount, decs=18, digs=8, group=false) {
    if(!amount){ return 0; }
    var num = null;
    try { num = (amount / 10 ** decs).toLocaleString('en-US', { useGrouping:group, minimumFractionDigits: digs, maximumFractionDigits: digs}); }
    catch(ex) { console.log('Error parsing money units'); }
    return num;
}

function addressToOne(address) {
    if(address.startsWith('0x')){
        return seeforex.harmony.crypto.getAddress(address).bech32;
    }
    return address;
}

function addressToHex(address) {
    if(address.startsWith('one')){
        return seeforex.harmony.crypto.getAddress(address).checksum;
    }
    return address;
}


// END