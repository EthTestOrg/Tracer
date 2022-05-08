const ethers = require('ethers');

let getProvider = function(url) {
    return hre.ethers.provider;
    // const rpcServer = new URL(url);
    // var urlInfo;
    // var provider = ethers.providers.WebSocketProvider;

    // if (rpcServer.username != '' && rpcServer.password != '') {
    //     urlInfo = {
    //         url: `${rpcServer.origin}${rpcServer.pathName ? rpcServer.pathName : ''}`,
    //         user: rpcServer.username,
    //         password: rpcServer.password
    //     };
    // }
    // else {
    //     urlInfo = rpcServer.href;
    // }

    // if (rpcServer.protocol == 'http:' || rpcServer.protocol == 'https:') {
    //     provider = ethers.providers.JsonRpcProvider;
    // }
    // else if (rpcServer.protocol == 'ws:' || rpcServer.protocol == 'wss:') {
    //     provider = ethers.providers.WebSocketProvider;
    // }

    // return new provider(urlInfo);
};

const parseTrace = async (from, trace, provider) => {
    const opCodes = ['CALL', 'CALLCODE', 'DELEGATECALL', 'STATICCALL', 'CREATE', 'CREATE2'];
    const filteredData = trace.structLogs.filter(log => opCodes.indexOf(log.op) > -1 || log.pc == 1507);
    const parsedOps = [];
    for (const log of filteredData) {
        try { 
            switch(log.op) {
                case 'CALL':
                case 'CALLCODE':
                    const inputStart = parseInt(log.stack[log.stack.length - 4], 16) * 2;
                    const inputSize = parseInt(log.stack[log.stack.length - 5], 16) * 2;
                    const input = `0x${log.memory.join('').slice(inputStart, inputStart + inputSize)}`;
                    
                    const deeperLogs = trace.structLogs.filter(returnLog => returnLog.pc == log.pc + 1);
                    const outLog = trace.structLogs[trace.structLogs.indexOf(deeperLogs[0]) - 1];

                    const outLogMemory = Buffer.from(outLog.memory.join(''));
                    const outStart = parseInt(outLog.stack[outLog.stack.length - 1], 16) * 2;
                    const outSize = parseInt(outLog.stack[outLog.stack.length - 2], 16) * 2;
                    const out = `0x${outLogMemory.slice(outStart, outStart + outSize)}`;

                    const address = `0x${log.stack[log.stack.length - 2].slice(-40)}`.toLowerCase();
                    const bytecode = await provider.getCode(address);
                    parsedOps.push({
                        op: log.op,
                        address: address,
                        input: input,
                        returnData: out != '0x' ? out : '',
                        depth: log.depth,
                        contractHashedBytecode: ethers.utils.keccak256(bytecode)
                    })
                    break;
                case 'DELEGATECALL':
                case 'STATICCALL': {
                    const inputStart = parseInt(log.stack[log.stack.length - 3], 16) * 2;
                    const inputSize = parseInt(log.stack[log.stack.length - 4], 16) * 2;
                    const input = `0x${log.memory.join('').slice(inputStart, inputStart + inputSize)}`;
                    
                    const deeperLogs = trace.structLogs.filter(returnLog => returnLog.pc == log.pc + 1);
                    const outLog = trace.structLogs[trace.structLogs.indexOf(deeperLogs[0]) - 1];
                    const outLogMemory = Buffer.from(outLog.memory.join(''));
                    const outStart = parseInt(outLog.stack[outLog.stack.length - 1], 16) * 2;
                    const outSize = parseInt(outLog.stack[outLog.stack.length - 2], 16) * 2;
                    const out = `0x${outLogMemory.slice(outStart, outStart + outSize)}`;

                    const address = `0x${log.stack[log.stack.length - 2].slice(-40)}`.toLowerCase();
                    const bytecode = await provider.getCode(address);
                    parsedOps.push({
                        op: log.op,
                        address: address,
                        input: input,
                        returnData: out != '0x' ? out : '',
                        depth: log.depth,
                        contractHashedBytecode: ethers.utils.keccak256(bytecode)
                    })
                    break;
                }
                case 'CREATE':
                case 'CREATE2': {
                    const stackCopy = [...log.stack];
                    stackCopy.pop();
                    const p = parseInt(stackCopy.pop().valueOf(), 16) * 2;
                    const n = parseInt(stackCopy.pop().valueOf(), 16) * 2;
                    const s = `0x${stackCopy.pop()}`;

                    const creationBytecode = `0x${log.memory.join('').slice(p, p + n)}`;
                    const hashedCreationBytecode = ethers.utils.keccak256(creationBytecode);

                    const address = ethers.utils.getCreate2Address(from, s, hashedCreationBytecode);

                    const runtimeBytecode = await provider.getCode(address);
                    const contractHashedBytecode = ethers.utils.keccak256(runtimeBytecode);

                    parsedOps.push({
                        op: log.op,
                        address: address,
                        depth: log.depth,
                        contractHashedBytecode: contractHashedBytecode
                    });
                    break;
                }
                default:
            }
        } catch(error) {
            console.log(error);
            return [];
        }
    }

    return parsedOps
};

const sanitize = (obj) => {
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([_, v]) => v != null)
            .map(([_, v]) => {
                if (typeof v == 'string' && v.length == 42 && v.startsWith('0x'))
                    return [_, v.toLowerCase()];
                else
                    return [_, v];
            })
    );
};


// const processTrace = async (userId, workspace, transactionHash, steps) => {
const processTrace = async (transactionHash, steps) => {
    const trace = [];
    for (const step of steps) {
        if (['CALL', 'CALLCODE', 'DELEGATECALL', 'STATICCALL', 'CREATE', 'CREATE2'].indexOf(step.op.toUpperCase()) > -1) {
            let contractRef;

            // Cansync is if user is premium or has not exceeded contract limit
            // const canSync = await canUserSyncContract(userId, workspace);
            const canSync = true;
            if (canSync) {
                const contractData = sanitize({
                    address: step.address.toLowerCase(),
                    hashedBytecode: step.contractHashedBytecode
                });

                // await storeContractData(userId, workspace, step.address, contractData);
                // contractRef = getContractRef(userId, workspace, step.address);
                contractRef = contractData;
            }

            trace.push(sanitize({ ...step, contract: contractRef }));
        }
    }
    console.log(`Processed Trace of ${transactionHash} is \n`, trace);
    // await storeTrace(userId, workspace, transactionHash, trace);
};

const getTransactionMethodDetails = (transaction, abi) => {
    const jsonInterface = new ethers.utils.Interface(abi);
    const parsedTransactionData = jsonInterface.parseTransaction(transaction);
    const fragment = parsedTransactionData.functionFragment;

    const label = [`${fragment.name}(`];
    const inputsLabel = [];
    for (let i = 0; i < fragment.inputs.length; i ++) {
        const input = fragment.inputs[i];
        const param = [];
        param.push(input.type)
        if (input.name)
            param.push(` ${input.name}`);
        if (parsedTransactionData.args[i])
            param.push(`: ${parsedTransactionData.args[i]}`)
        inputsLabel.push(param.join(''));
    }

    if (inputsLabel.length > 1)
        label.push('\n\t');

    label.push(inputsLabel.join(',\n\t'));

    if (inputsLabel.length > 1)
        label.push('\n');

    label.push(')');

    return {
        name: parsedTransactionData.name,
        label: label.join(''),
        signature: `${fragment.name}(` + fragment.inputs.map((input) => `${input.type} ${input.name}`).join(', ') + ')'
    };
};



class Tracer {
    constructor(server) {
        if (!server) throw '[Tracer] Missing parameter';
        this.provider = getProvider(server);
    }

    async process(transaction) {
        try {
            this.transaction = transaction;
            const rawTrace = await this.provider.send('debug_traceTransaction', [transaction.hash, {}]);
            this.parsedTrace = await parseTrace(transaction.from, rawTrace, this.provider);
        } catch(error) {
            if (error.error && error.error.code == '-32601')
                throw 'debug_traceTransaction is not available';
            else
                throw error;
        }
    }

    async saveTrace() {
        try {
            await processTrace(this.transaction.hash, this.parsedTrace);
        } catch(error) {
            console.log(error);
        }
    }
}

module.exports = {
    Tracer: Tracer,
    getTransactionMethodDetails: getTransactionMethodDetails,
}