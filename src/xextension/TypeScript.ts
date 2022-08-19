import * as vscode from "vscode";
import * as fs from "fs";
import child_process, { ExecFileSyncOptions } from "child_process";
import { acts } from "../AcTsExtension";
import { XExtension } from "../XExtension";

class TypeScript implements XExtension {
    // implemente

    // prop
    extension = ".ts";

    // method
    checkLang(): void {
        if (!fs.existsSync(acts.packagejsonfile) || !fs.existsSync(acts.packagelockjsonfile)) {
            throw `ERROR: missing package.json or package-lock.json, install node.js, run "npm init && npm install --save-dev typescript ts-node @types/node"`;
        }
    }

    initTask(): void {}
    compileTask(): void {}

    debugTask(): any {
        const debugconfig = {
            name: acts.appid,
            type: "pwa-node",
            request: "launch",
            runtimeArgs: ["--require", "ts-node/register"],
            program: acts.taskfile,
            args: ["<", acts.tmpinfile, "1>", acts.tmpoutfile, "2>", acts.tmperrfile],
            console: "integratedTerminal",
            skipFiles: ["node_modules/**"],
            env: { TS_NODE_TRANSPILE_ONLY: "1" },
        };
        vscode.debug.startDebugging(acts.projectfolder, debugconfig);
    }

    testTask(): any {
        const command = `node --require ts-node/register ${acts.taskfile} < ${acts.tmpinfile} 1> ${acts.tmpoutfile} 2> ${acts.tmperrfile}`;
        const options = { cwd: acts.projectpath, env: { TS_NODE_TRANSPILE_ONLY: "1" } };
        const child = child_process.exec(command, options);
        return child;
    }

    submitTask(): void {}
}
export const typescript = new TypeScript();
