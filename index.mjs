import fs from 'fs';
import express from 'express';
import Componentry from "@metric-im/componentry";
import path from "path";
import {fileURLToPath} from "url";

export default class BridgeServer extends Componentry.Module {
    constructor(connector) {
        super(connector,import.meta.url);
        this.connector = connector;
        this.modules = {};
        this.processors = {};
        this.rootPath = path.dirname(fileURLToPath(import.meta.url));
    }
    static async mint(connector) {
        let instance = new BridgeServer(connector);
        let modules = fs.readdirSync(instance.rootPath+"/modules");
        for (let name of modules) {
            let module = await import(`${instance.rootPath}/modules/${name}/index.mjs`);
            instance.modules[name.toLowerCase()] = new module.default(instance.connector);
        }
        // let processors = fs.readdirSync(instance.rootPath+"/processors");
        // for (let name of processors) {
        //     let module = await import(`${instance.rootPath}/processors/${name}/index.mjs`);
        //     instance.processors[name.toLowerCase()] = new module.default(instance);
        // }
        return instance;
    }
    routes() {
        let router = express.Router();
        for (let name of Object.keys(this.modules)) {
            // let comp = new (await import('./modules/'+module))(this.connector);
            router.use('/bridge/' + name, this.modules[name].routes());
        }
        router.get('/bridgelist',(req,res)=>{
            try {
                res.json(this.list());
            } catch(e) {
                console.error(e);
                res.send("unable to list")
            }
        })
        return router;
    }
    list() {
        return Object.keys(this.modules);
    }
    async process() {
        let args = Array.from(arguments);
        let name = args.shift();
        return await this.processors[name].run(...args)
    }
}
