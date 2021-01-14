// Seeforex

var session = {
	oneusd: 0.0,
	pair: 'ONE/USD',
	base: 'ONE',
	quote: 'USD',
	buy: true,
	price: 0.0,
	prices: {},
	rates: {},
	lines: 0,
	wallet: null,
	connected: false,
	isMobile: false
}

const tokens = {
    USD: '0x78690Cf81a96b7f5A26b93F0e8464bBd5a1a3e90',
    EUR: '0x9cBACEd58014BD857900dfB673f4Bdd988704165',
    GBP: '0xF42055ac4dc87289Cca73B18441f999a565e8BC8',
    JPY: '0x6B13609F78c06A39803132a2fb92f57C205fE636',
    CNY: '0xE17F26fF1A353366623589eE8981A3EA5B074656',
    KRW: '0xc799f8F4A11806EBEF58bC7f45a062C1663E64B8',
    INR: '0x88629058205A0070029a6BA1807F1B77F577a050',
    RUB: '0xc3f065965bd8dD5B158084cFc1c622f1077E05c2',
    CHF: '0x15975afdd89F41a9F1815B2E0ff2788b0874F512',
    AUD: '0xa4cc5050DA6b0957e355109201614adc5d687ad0',
    CAD: '0x9019082CFB94CDf3BF80C591ab2Cc649e41C718c',
    HKD: '0x0e00c376c7Db89fAD302A4Fa2382750a3aAD3aF8',
    BRL: '0x13481A6f27BDA9022d9820d4A53122662997A7e6'
};

function $(id){ return document.getElementById(id); }
function checkMobile(){ 
	session.isMobile = (document.body.clientWidth<=720); 
	return session.isMobile;
}

function validNumber(text='') {
    let number, value;
    //let sep = Intl.NumberFormat(navigator.language).format(1000).substr(1,1) || ',';
    let sep = ',';
    if(sep==','){ value = text.replace(/\,/g,''); }
    else if(sep=='.'){ value = text.replace(/\./g,'').replace(',','.'); }
    try { number = parseFloat(value) || 0.0; } catch(ex){ console.log(ex); number = 0.0; }
    return number;
}

async function getRates() {
	let res, inf;
	let url = '/api/rates';
	let opt = {method: 'get'};
	try	{
		res = await fetch(url, opt);
		inf = await res.json();
		console.log('Rates',inf);
		session.rates  = inf.data;
		session.oneusd = session.rates['ONE/USD'].price || 0.0;
		let code = 'USD';
		session.prices[code] = session.oneusd; // USD
		for(var sym in session.rates){
			if(sym.startsWith('USD/')){ code = sym.substr(4).toUpperCase(); } else { continue; }
			session.prices[code] = (session.rates[sym].price * session.oneusd).toFixed(8);
		}
		console.log('Prices',session.prices);
	} catch(ex) {
		console.log('Error:', ex.message)
	}
}

async function showRates() {
	//$('oneusd').innerHTML  = session.oneusd;
	$('usd-one').innerHTML = parseFloat(session.rates['ONE/USD'].price).toFixed(6);
	$('usd-usd').innerHTML = '1.000000';
	for(var sym in session.rates){
		if(sym.startsWith('USD/')){ code = sym.substr(4).toLowerCase(); } else { continue; }
		$(code+'-one').innerHTML = (session.rates[sym].price * session.oneusd).toFixed(6);
		$(code+'-usd').innerHTML = parseFloat(session.rates[sym].price).toFixed(6);
		$(code+'-pct').innerHTML = parseFloat(session.rates[sym].diff).toFixed(2)+'%';
		$(code+'-one').className = (parseFloat(session.rates[sym].diff)<0 ? 'price-dn' : 'price-up');
	}
}

function showIndices(info){
	if(!info){ return; }
	let open, close, high, low, spread, change;
	open  = 1*info[0][1];
	close = 1*info[info.length-1][1];
	high  = 0;
	low   = 999;
	for (var i = 0; i < info.length; i++) {
		high = Math.max(high, 1*info[i][1]);
		low  = Math.min(low,  1*info[i][1]);
	}
	spread = ((high / low) - 1) * 100;
	change = ((close / open) - 1) * 100;
	$('info-close').innerHTML  = close.toFixed(8);
	$('info-open').innerHTML   = open.toFixed(8);
	$('info-high').innerHTML   = high.toFixed(8);
	$('info-low').innerHTML    = low.toFixed(8);
	$('info-spread').innerHTML = spread.toFixed(4)+' %';
	$('info-change').innerHTML = change.toFixed(4)+' %';

	$('price-close').innerHTML  = close.toFixed(8);
	$('price-open').innerHTML   = open.toFixed(8);
	$('price-high').innerHTML   = high.toFixed(8);
	$('price-low').innerHTML    = low.toFixed(8);
}

async function updateForm() {
	$('calc-price').value      = session.price;
	$('calc-title').innerHTML  = session.base + ' for ' + session.quote;
	$('label-base').innerHTML  = session.base;
	$('label-price').innerHTML = session.pair;
	$('label-quote').innerHTML = session.quote;
	$('info-market').innerHTML = session.pair;
	if(session.buy){ calcBuy() } else { calcSell() }
}

function calcBuy() {
	let amount = validNumber($('calc-base').value);
	let price  = $('calc-price').value;
	if(session.buy){ total = amount * price; }
	else { total  = amount / price; }
	$('calc-quote').value = total.toFixed(8);
}

function calcSell() {
	let amount = validNumber($('calc-quote').value);
	let price  = $('calc-price').value;
	if(session.buy){ total = amount / price; }
	else { total  = amount * price; }
	$('calc-base').value = total.toFixed(8);
}

function onTableClick(event) {
	var row  = event.target.parentNode;
	var code = row.id;
	if(!code) { return; }
	selectCurrency(code);
}

function onTrade(){
	console.log('Trade', session.base, session.quote, session.buy?'BUY':'SELL', session.price);
	if(session.buy){
		code = session.quote;
		buyTokens(code);
	} else {
		code = session.base;
		sellTokens(code);
	}
}

async function buyTokens(code) {
	console.log('Buying', code);
	showMessage('Wait, trading...');
	let amt  = validNumber($('calc-base').value);
	let rej  = function(msg) { console.log('Rejected', msg); showMessage(msg); };
	let txid = await seeforex.buyTokens(tokens[code], amt, rej);
	if(txid){
		console.log('Buy', code, txid);
		showMessage('Transaction confirmed!');
        showBalance(session.address);
	}
}

async function sellTokens(code) {
	console.log('Selling', code);
	showMessage('Wait, trading...');
	let amt  = validNumber($('calc-base').value);
	let rej  = function(msg) { console.log('Rejected', msg); showMessage(msg); };
	let txid = await seeforex.sellTokens(tokens[code], amt, rej);
	if(txid){
		console.log('Sell', code, txid);
		showMessage('Transaction confirmed!');
        showBalance(session.address);
	}
}

function showMessage(txt){
	$('warn').innerHTML = txt;
}

function onSwitch(){
	let temp      = session.base;
	session.base  = session.quote;
	session.quote = temp;
	session.buy   = !session.buy;
	updateForm()
	//$('calc-title').innerHTML  = session.base + ' for' + session.quote;
	//$('label-base').innerHTML  = session.base;
	//$('label-quote').innerHTML = session.quote;
}

function selectCurrency(code){
	console.log('Selected', code);
	session.buy   = true;
	session.code  = code;
	session.base  = 'ONE';
	session.quote = code;
	session.pair  = 'ONE/'+code;
	session.price = session.prices[code];

	var table = $('coins');
	var rows  = table.tBodies[0].rows
	for (var i = 0; i < rows.length; i++) {
		rows[i].className = '';
		if(rows[i].id==code) { rows[i].className = 'select'; }
	}

	updateForm();
	updateChart();
}

function copyToClipboard(evt) {
    var elm = evt.target;
    if(document.body.createTextRange) { /* for Internet Explorer */
	    var range = document.body.createTextRange();
	    range.moveToElementText(elm);
	    range.select();
    	document.execCommand("copy");
    } else if(window.getSelection) { /* other browsers */
	    var selection = window.getSelection();
	    var range = document.createRange();
	    range.selectNodeContents(elm);
	    selection.removeAllRanges();
	    selection.addRange(range);
    	document.execCommand("copy");
    }
}

function enableEvents() {
	$('coins').addEventListener('click', function(event){onTableClick(event)},false);
	$('calc-base').addEventListener('keyup',  calcBuy,  true);
	$('calc-quote').addEventListener('keyup', calcSell, true);
}

//---- WALLET

async function connectState(n) {
    switch(n){
        case 0:
            $('connect').enabled = true;
            $('connect').innerHTML = 'Connect wallet';
            break;
        case 1:
            $('connect').enabled = false;
            $('connect').innerHTML = 'Connecting...';
            break;
        case 2:
            $('connect').enabled = true;
            $('connect').innerHTML = 'Connected';
            break;
    }
}

async function connectWallet(silent=false) {
    let ext = null; 
    connectState(1); // connecting
    if(window.onewallet && window.onewallet.isOneWallet){
        ext = window.onewallet;  // Harmony One wallet
        name = 'onewallet';
    } else if(window.harmony){
        ext = window.harmony;    // Math wallet
        name = 'harmony';
    } else {
        console.log('Error: Wallet not available');
        if(!silent){ alert('Error: Wallet not available'); }
        connectState(0); // Connect
        return false;
    }
    let connected = await seeforex.connect(ext);
    if(!connected){ 
        console.log('Error: Wallet not connected');
        if(!silent){ alert('Error: Wallet not connected'); }
        connectState(0);
        return false; 
    } else { 
        let account = await seeforex.getAccount();
        if(!account){
            if(!silent){ alert('Error: Account not selected'); }
            connectState(0); // connect
            return false; 
        }
        //console.log('Account', account.address, account.name);
        session.wallet = name;
        session.connected = true;
        session.address = account.address;
        connectState(2); // connected
        showBalance(session.address);
    }
    return true;
}

async function disconnectWallet() {
    $('connect').enabled = false;
    $('connect').innerHTML = 'Disconnecting...';
    await seeforex.disconnect();
    session.wallet = '';
    session.connected = false;
    session.address = null;
    $('connect').innerHTML = 'Connect wallet';
    $('connect').enabled = true;
    //$('user-address').innerHTML = 'Not connected';
    $('user-balance').innerHTML = 'Balance: 0.00';
}

function onWallet(){
    console.log('On wallet');
    if(!session.connected){
        connectWallet();
    } else {
        disconnectWallet();
    }
}

async function loadSeeForex() {
    console.log('SeeForex', seeforex.version)
	const MAINURL = 'https://api.s0.t.hmny.io/';
	const TESTURL = 'https://api.s0.b.hmny.io/';
    await seeforex.init(MAINURL);
    if(window.onewallet && window.onewallet.isOneWallet){
        seeforex.wallet = window.onewallet;  // Harmony One wallet
    } else if(window.harmony){
        seeforex.wallet = window.harmony;    // Math wallet
    }
    return seeforex.isLoaded;
}

async function showBalance(address) {
    if(!address){ return; }
    let res = await seeforex.getBalance(address);
    console.log('Balance', res);
    if(res){
    	let bal = parseFloat(res);
        $('connect').innerHTML = 'Address: ' + session.address.substr(0, 10);
        //$('user-address').innerHTML = 'Address: ' + session.address.substr(0, 10);
        $('user-balance').innerHTML = 'Balance: ' + bal.toFixed(4);
    }
}

async function main(silent=true) {
	console.log('SeeForex started');
	enableEvents();
	await getRates();
	await showRates();
	await selectCurrency('USD');
	if(checkMobile()){
		showMessage('Not available in mobile devices');
	} else {
	    if(await loadSeeForex()){ 
	        await connectWallet(silent);
	    }
	}
}

window.onload = main;


// END