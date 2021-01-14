//REF: https://github.com/bandprotocol/bandchain.js/blob/master/src/BandChain.js#L223
const { Harmony } = require('@harmony-js/core')
const { Client }  = require("@bandprotocol/bandchain.js");
const fetch = require('node-fetch');
const db    = require('./database');
const Forex = require("./public/contracts/forex.json");
const KEY   = process.env.MANAGER;

function getDate(t){ 
    //return (new Date(t*1000)).toJSON();
    let d = new Date(t*1000);
    let j = d.toJSON() //d.toLocaleString();
    let x = j.substr(11,8);
    let h = x.substr(0,2)*1-4;
    if(h<0) { h = 24-h; }
    let z = x.substr(2);
    let y = h>12 ? h-12 : h;
    return y+z;
}

async function setPrice(hmy, tkn, adr, price) {
    //console.log(tkn, adr, price);
    if(!price){ console.log(tkn, 'No price'); return; }
    try {
        let ctr = hmy.contracts.createContract(Forex.abi, adr);
        ctr.wallet.addByPrivateKey(KEY);
        let gas = { gasPrice: 1000000000, gasLimit: 55000 };
        let wei = new hmy.utils.Unit(price).asOne().toWei();
        let wex = wei.toString();
        let res = await ctr.methods.setPrice(wex).send(gas);
        console.log(tkn, price, res.transaction.txStatus);
    } catch(ex) {
        console.log(tkn, 'Error:', ex);
    }
}

async function setPrices(prices){
    let tokens = {
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

    let CHN = parseInt(process.env.CHAINID);
    let hmy = new Harmony(process.env.NETURL, { chainType: 'hmy', chainId: CHN })
    let act = hmy.wallet.addByPrivateKey(KEY);
    hmy.wallet.setSigner(act.address);

    await setPrice(hmy, 'USD', tokens.USD, prices['ONE/USD']);
    await setPrice(hmy, 'EUR', tokens.EUR, prices['USD/EUR']);
    await setPrice(hmy, 'GBP', tokens.GBP, prices['USD/GBP']);
    await setPrice(hmy, 'JPY', tokens.JPY, prices['USD/JPY']);
    await setPrice(hmy, 'CNY', tokens.CNY, prices['USD/CNY']);
    await setPrice(hmy, 'KRW', tokens.KRW, prices['USD/KRW']);
    await setPrice(hmy, 'INR', tokens.INR, prices['USD/INR']);
    await setPrice(hmy, 'RUB', tokens.RUB, prices['USD/RUB']);
    await setPrice(hmy, 'CHF', tokens.CHF, prices['USD/CHF']);
    await setPrice(hmy, 'AUD', tokens.AUD, prices['USD/AUD']);
    await setPrice(hmy, 'CAD', tokens.CAD, prices['USD/CAD']);
    await setPrice(hmy, 'HKD', tokens.HKD, prices['USD/HKD']);
    await setPrice(hmy, 'BRL', tokens.BRL, prices['USD/BRL']);
}

async function getRatesTEST(){
    await setPrices({'ONE/USD':'0.004955'});
}

async function getRates(){
    console.log(new Date())

    // ONE price
    let url = 'https://api.binance.com/api/v3/ticker/price?symbol=ONEUSDT';
    let opt = {method: 'get'};
    let res = await fetch(url, opt);
    let one = await res.json();
    let prices = {};
    let data = [];
    data.push(['ONE/USD', one.price]);
    prices['ONE/USD'] = (1*one.price).toFixed(8);

    //const endpoint  = "https://poa-api.bandchain.org"; // MAINNET
    const endpoint  = "https://api-gm-lb.bandchain.org"; // MAINNET
    const bandchain = new Client(endpoint);
    const rates     = await bandchain.getReferenceData([
        "BTC/USD",
        "USD/EUR",
        "USD/GBP",
        "USD/JPY",
        "USD/CNY",
        "USD/KRW",
        "USD/INR",
        "USD/RUB",
        "USD/CHF",
        "USD/AUD",
        "USD/CAD",
        "USD/HKD",
        "USD/BRL",
        "XAU/USD",
        "XAG/USD"
    ]);

    //console.log(rates);
    for (var i = 0; i < rates.length; i++) {
        let x = rates[i];
        data.push([x.pair, x.rate]);
        prices[x.pair] = (x.rate * one.price).toFixed(8);
        //console.log(x.pair, x.rate.toFixed(8).padStart(18), getDate(x.updated.base), getDate(x.updated.quote));
    }

    // SAVE TO DB
    await db.saveRates(data);

    // UPDATE TOKENS
    await setPrices(prices);
}

exports.getRates = getRates;

// END