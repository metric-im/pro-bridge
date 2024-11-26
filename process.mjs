// import TokenTransactions from './processors/TokenTransactions.mjs';
import PopulateNFL from './processors/PopulateNFL/index.mjs';

const main = (async()=>{
    // let process = new TokenTransactions();
    let process = new PopulateNFL();
    let result = await process.run();
    console.log(result.length);
})();