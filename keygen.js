const fs = require('fs');
const { Keypair } = require('@solana/web3.js');

const kp = Keypair.generate();
fs.writeFileSync('owner.json', JSON.stringify(Array.from(kp.secretKey)));
console.log('Keypair generated: owner.json');
