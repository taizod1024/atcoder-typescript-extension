import * as vscode from "vscode";
import * as fs from "fs";
import child_process, { ExecFileSyncOptions } from "child_process";
import { acts } from "./AcTsExtension";

class XExtensionHelper {
    checkLang(lang: string, opt: object = {}): void {
        // check
        const config = vscode.workspace.getConfiguration(acts.appcfgkey + "." + lang);
        const cmd = config.checker || "";
        acts.channel.appendLine(`[${acts.timestamp()}] checker: ${cmd}`);
        if (!cmd) {
            throw "ERROR: no checker";
        }
        const cmdexp = acts.expandString(String(cmd));
        const command = `(${cmdexp}) 1> ${acts.tmpstdoutfile} 2> ${acts.tmpstderrfile}`;
        const options = { cwd: acts.taskpath };
        Object.assign(options, opt);
        try {
            child_process.execSync(command, options);
        } catch (ex) {
            const err = fs.readFileSync(acts.tmpstderrfile).toString().trim().replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
            throw `ERROR: check failed\r\n${err}\r\n`;
        }
        const out = fs.readFileSync(acts.tmpstdoutfile).toString().trim().replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
        acts.channel.appendLine(`[${acts.timestamp()}] - stdout="${out}"`);
        const err = fs.readFileSync(acts.tmpstderrfile).toString().trim().replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
        acts.channel.appendLine(`[${acts.timestamp()}] - stderr="${err}"`);
    }

    compileTask(lang: string, opt: object = {}): void {
        // compile
        const config = vscode.workspace.getConfiguration(acts.appcfgkey + "." + lang);
        const cmd = config.compiler || "";
        if (!cmd) {
            acts.channel.appendLine(`[${acts.timestamp()}] compiler: ${cmd}`);
        } else {
            acts.channel.appendLine(`[${acts.timestamp()}] execfile: ${acts.execfile}`);
            acts.channel.appendLine(`[${acts.timestamp()}] compiler: ${cmd}`);
            const cmdexp = acts.expandString(cmd);
            const command = `(${cmdexp}) 1> ${acts.tmpstdoutfile} 2> ${acts.tmpstderrfile}`;
            const options = { cwd: acts.taskpath };
            Object.assign(options, opt);
            try {
                child_process.execSync(command, options);
            } catch (ex) {
                const err = fs.readFileSync(acts.tmpstderrfile).toString().trim().replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
                throw `ERROR: compile failed\r\n${err}\r\n`;
            }
            const out = fs.readFileSync(acts.tmpstdoutfile).toString().trim().replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
            acts.channel.appendLine(`[${acts.timestamp()}] - stdout="${out}"`);
            const err = fs.readFileSync(acts.tmpstderrfile).toString().trim().replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
            acts.channel.appendLine(`[${acts.timestamp()}] - stderr="${err}"`);
        }

        // show executor
        const cmdexe = config.executor || "";
        acts.channel.appendLine(`[${acts.timestamp()}] executor: ${cmdexe}`);
        if (!cmdexe) {
            throw "ERROR: no executor";
        }
    }

    testTask(lang: string, opt: object = {}): any {
        // test
        const config = vscode.workspace.getConfiguration(acts.appcfgkey + "." + lang);
        const cmd = config.executor || "";
        const cmdexp = acts.expandString(cmd);
        const command = `(${cmdexp}) < ${acts.tmpstdinfile} 1> ${acts.tmpstdoutfile} 2> ${acts.tmpstderrfile}`;
        const options = { cwd: acts.taskpath };
        Object.assign(options, opt);
        const child = child_process.exec(command, options);
        return child;
    }
}
export const xexthelper = new XExtensionHelper();
