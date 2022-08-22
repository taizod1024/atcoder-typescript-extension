import * as vscode from "vscode";
import * as fs from "fs";
const path = require("path");
import child_process, { ExecFileSyncOptions } from "child_process";
import { XSite } from "./XSite";
import { XExtension } from "./XExtension";
import { atcoder } from "./xsite/AtCoder";
import { yukicoder } from "./xsite/Yukicoder";
import { typescript } from "./xextension/TypeScript";
import { javascript } from "./xextension/JavaScript";
import { python } from "./xextension/Python";
import { cc } from "./xextension/Cc";
import { cpp } from "./xextension/Cpp";
import { java } from "./xextension/Java";

// extension core
class AcTsExtension {
    // constant
    public appname: string;
    public appid: string;
    public appcfgkey: string;
    public statefile: string;
    public tmppath: string;

    // context
    public vscodeextensionpath: string;
    public projectfolder: vscode.WorkspaceFolder;
    public projectpath: string;
    public channel: vscode.OutputChannel;

    // param
    public site: string;
    public contest: string;
    public task: string;
    public extension: string;
    public language: string;

    // prop
    public xsite: XSite;
    public xextension: XExtension;
    public tasktmplfile: string;
    public usertasktmplfile: string;
    public taskpath: string;
    public taskfile: string;
    public testfile: string;
    public execfile: string;
    public tmpstdinfile: string;
    public tmpstdoutfile: string;
    public tmpstderrfile: string;
    public separator: string;
    public proxy: any;
    public timeout: number;

    // const
    public sites: string[];
    public extensions: string[];
    public xsites: XSite[];
    public xextensions: XExtension[];

    // setup function
    constructor() {
        // init constant
        this.appname = "AtCoder Extension";
        this.appid = "ac-ts-extension";
        this.appcfgkey = "atcoderExtension";
        if (process.env.WINDIR) {
            this.statefile = path.normalize(`${process.env.USERPROFILE}/.${this.appid}.json`);
            this.tmppath = path.normalize(`${process.env.TEMP}/${this.appid}`);
        } else {
            this.statefile = path.normalize(`${process.env.HOME}/.${this.appid}.json`);
            this.tmppath = path.normalize(`/tmp/${this.appid}/${process.env.USER}`);
        }

        // make tmppath
        if (!fs.existsSync(this.tmppath)) {
            fs.mkdirSync(this.tmppath, { recursive: true });
        }

        // coders and langs
        this.xsites = [atcoder, yukicoder];
        this.xextensions = [cpp, python, java, cc, javascript, typescript];

        // sites and extensions
        this.sites = this.xsites.map(val => val.site);
        this.extensions = this.xextensions.map(val => val.extension);

        // init context
        this.channel = vscode.window.createOutputChannel(this.appname);
        this.channel.show(true);
        this.channel.appendLine(`[${this.timestamp()}] ${this.appname}`);

        // load state
        this.loadState();
    }

    public async initPropAsync(withtask: boolean) {
        // init prop
        this.tasktmplfile = path.normalize(`${this.vscodeextensionpath}/template/template${this.extension}`);
        this.usertasktmplfile = path.normalize(`${this.projectpath}/template/template${this.extension}`);
        this.taskpath = path.normalize(`${this.projectpath}/src/${this.site}/${this.contest}`);
        this.taskfile = path.normalize(`${this.taskpath}/${this.task}${this.extension}`);
        this.testfile = path.normalize(`${this.taskpath}/${this.task}.txt`);
        this.execfile = path.normalize(`${this.taskpath}/${this.task}${process.env.WINDIR ? ".exe" : ".out"}`);
        this.tmpstdinfile = path.normalize(`${this.tmppath}/test_stdin.txt`);
        this.tmpstdoutfile = path.normalize(`${this.tmppath}/test_stdout.txt`);
        this.tmpstderrfile = path.normalize(`${this.tmppath}/test_stderr.txt`);
        this.separator = "\r\n--------\r\n";
        this.proxy = "";
        this.timeout = 5000;

        // site specific
        this.xsite = this.xsites.find(val => val.site === this.site);
        this.xextension = this.xextensions.find(val => val.extension === this.extension);

        // check and init coder
        this.xsite.checkLogin();
        await this.xsite.initPropAsync(withtask);

        // check lang if exists
        if (this.xextension) {
            // this.xextension is null when loginSite
            this.xextension.checkLang();
        }

        // save state
        this.saveState();
    }

    public async loginSiteAsync() {
        // show channel
        this.channel.appendLine(`[${this.timestamp()}] site: ${this.site}`);

        // init command
        await this.initPropAsync(false);

        // login site
        await this.xsite.loginSiteAsync();

        acts.channel.appendLine(`---- SUCCESS: ${this.site} done ----`);
    }

    public async initTaskAsync() {
        // show channel
        this.channel.appendLine(`[${this.timestamp()}] site: ${this.site}`);
        this.channel.appendLine(`[${this.timestamp()}] contest: ${this.contest}`);
        this.channel.appendLine(`[${this.timestamp()}] task: ${this.task}`);
        this.channel.appendLine(`[${this.timestamp()}] extension: ${this.extension}`);

        // init command
        await this.initPropAsync(true);

        // check testfile not exits
        let text;
        if (!fs.existsSync(this.testfile)) {
            // get testtext
            text = await this.xsite.getTestAsync();
        }

        // create taskfile
        if (!fs.existsSync(this.taskpath)) {
            fs.mkdirSync(this.taskpath, { recursive: true });
        }
        if (fs.existsSync(this.taskfile)) {
            this.channel.appendLine(`[${this.timestamp()}] taskfile: ${this.taskfile} exist`);
        } else {
            if (fs.existsSync(this.usertasktmplfile)) {
                fs.copyFileSync(this.usertasktmplfile, this.taskfile);
                this.channel.appendLine(`[${this.timestamp()}] taskfile: ${this.taskfile} created from user template`);
            } else {
                fs.copyFileSync(this.tasktmplfile, this.taskfile);
                this.channel.appendLine(`[${this.timestamp()}] taskfile: ${this.taskfile} created from system template`);
            }
        }

        // create testfile
        if (fs.existsSync(this.testfile)) {
            this.channel.appendLine(`[${this.timestamp()}] testfile: ${this.testfile} exist`);
        } else {
            fs.writeFileSync(this.testfile, text);
            this.channel.appendLine(`[${this.timestamp()}] testfile: ${this.testfile} created`);
            if (text === "") {
                this.channel.appendLine(`[${this.timestamp()}] WARN: there is no test set`);
            }
        }

        // init task with extension
        this.xextension.initTask();

        // open file
        vscode.workspace.openTextDocument(this.taskfile).then(
            (a: vscode.TextDocument) => {
                vscode.window.showTextDocument(a, 1, false);
            },
            (err: any) => {
                throw err;
            }
        );
        this.channel.appendLine(`---- SUCCESS: ${this.task} initialized ----`);
    }

    public async testTaskAsync(debug: boolean): Promise<void> {
        // show channel
        this.channel.appendLine(`[${this.timestamp()}] site: ${this.site}`);
        this.channel.appendLine(`[${this.timestamp()}] contest: ${this.contest}`);
        this.channel.appendLine(`[${this.timestamp()}] task: ${this.task}`);
        this.channel.appendLine(`[${this.timestamp()}] extension: ${this.extension}`);
        this.channel.appendLine(`[${this.timestamp()}] debug: ${debug}`);

        // init command
        await this.initPropAsync(true);

        // check taskfile
        this.channel.appendLine(`[${this.timestamp()}] taskfile: ${this.taskfile}`);
        if (!fs.existsSync(this.taskfile)) {
            throw `ERROR: missing taskfile="${this.taskfile}", do init task`;
        }

        // check testfile
        this.channel.appendLine(`[${this.timestamp()}] testfile: ${this.testfile}`);
        if (!fs.existsSync(this.testfile)) {
            throw `ERROR: missing testfile="${this.testfile}", do init task`;
        }

        // delete files in tmppath
        fs.readdirSync(this.tmppath).forEach(filename => {
            const filepath = path.normalize(`${this.tmppath}/${filename}`);
            fs.unlinkSync(filepath);
        });

        // read testfile
        const txt = fs.readFileSync(this.testfile).toString();
        const wrk = txt.split(this.separator.trim()).map(x => x.trim());
        if (wrk[wrk.length - 1] === "") {
            wrk.pop();
        }
        const ios: any[] = [];
        while (0 < wrk.length) {
            ios.push({
                in: wrk.shift(),
                out: wrk.shift(),
            });
        }

        // check test set
        if (ios.length === 0) {
            throw `WARN: there is no test set`;
        }

        // compile task
        this.xextension.compileTask();

        // run test set
        let ok = 0;
        let ng = 0;
        const that = this;
        let iosx = 0;
        return new Promise((resolve, reject) => {
            // run test
            (function runtest() {
                that.channel.show(true);

                // create test input file
                const io = ios[iosx];
                that.channel.appendLine(`[${that.timestamp()}] test-${iosx}:`);
                that.channel.appendLine(`[${that.timestamp()}] - input ="${io.in}"`);
                that.channel.appendLine(`[${that.timestamp()}] - output="${io.out}"`);
                fs.writeFileSync(that.tmpstdinfile, io.in);

                // exec command
                let child = null;
                let timecount = 0;
                let istimeout = false;

                // test or debug task
                if (debug) {
                    that.xextension.debugTask();
                } else {
                    child = that.xextension.testTask();
                }

                // wait child process
                (function waitchild() {
                    // - 通常実行時：
                    //   - コマンド実行中はchild.exitCodeがnullになるのでタイムアウトまで待つ
                    // - デバッグ実行時は、、、
                    //   - vscode.debug.activeDebugSessionがあてにならないのでリダイレクトのファイルの有無で判断する
                    //   - 戻り値は取得できないので制限とする
                    if (child?.exitCode === null) {
                        timecount += 500;
                        if (timecount < that.timeout) {
                            setTimeout(waitchild, 500);
                            return;
                        }
                        child_process.execSync(`taskkill /pid ${child.pid} /t /f`);
                        istimeout = true;
                    }
                    // wait output
                    (function waitoutput() {
                        if (!fs.existsSync(that.tmpstdoutfile)) {
                            setTimeout(waitoutput, 500);
                            return;
                        }
                        // wait command complete
                        (function waitunlock() {
                            try {
                                fs.unlinkSync(that.tmpstdinfile);
                            } catch (ex) {
                                if (ex instanceof Error) {
                                    if (!ex.message.match(/EBUSY/)) {
                                        reject(ex);
                                        return;
                                    }
                                }
                                setTimeout(waitunlock, 500);
                                return;
                            }
                            // test done
                            (function commanddone() {
                                console.log(vscode.debug.activeDebugSession);
                                that.channel.show(true);
                                // read output
                                const out = fs.readFileSync(that.tmpstdoutfile).toString().trim().replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
                                fs.unlinkSync(that.tmpstdoutfile);
                                // check error
                                const err = fs.readFileSync(that.tmpstderrfile).toString().trim().replace(/\r\n/g, "\n").replace(/\n/g, "\r\n");
                                fs.unlinkSync(that.tmpstderrfile);
                                that.channel.appendLine(`[${that.timestamp()}] - stdout="${out}"`);
                                that.channel.appendLine(`[${that.timestamp()}] - stderr=${err}`);
                                that.channel.appendLine(`[${that.timestamp()}] - exit  =${child?.exitCode}`);
                                if (child?.exitCode !== 0 && child?.exitCode !== undefined) {
                                    reject(`ERROR: error occurred`);
                                    return;
                                }
                                // check timeout
                                if (istimeout) {
                                    reject(`ERROR: timeout over ${that.timeout} ms`);
                                    return;
                                }
                                // chceck canceled
                                if (out === "") {
                                    that.channel.appendLine(`---- CANCELED OR NO OUTPUT ----`);
                                    // delete executable if canceled
                                    if (fs.existsSync(that.execfile)) {
                                        fs.unlinkSync(that.execfile);
                                    }
                                    resolve();
                                    return;
                                }
                                // check output
                                if (out === io.out) {
                                    that.channel.appendLine(`[${that.timestamp()}] -> OK`);
                                    ok++;
                                } else {
                                    that.channel.appendLine(`[${that.timestamp()}] -> NG`);
                                    ng++;
                                }
                                // next test
                                iosx++;
                                if (iosx < ios.length) {
                                    setTimeout(runtest, 500);
                                    return;
                                }
                                // delete files in tmppath
                                fs.readdirSync(that.tmppath).forEach(filename => {
                                    const filepath = path.normalize(`${that.tmppath}/${filename}`);
                                    // fs.unlinkSync(filepath);
                                });
                                // test set done
                                let msg = `${that.task} OK=${ok}, NG=${ng}`;
                                if (ng === 0) {
                                    that.channel.appendLine(`---- SUCCESS: ${msg} ----`);
                                    resolve();
                                    return;
                                } else {
                                    reject("ERROR: " + msg);
                                    return;
                                }
                            })();
                        })();
                    })();
                })();
            })();
        });
    }

    public async submitTaskAsync() {
        // show channel
        this.channel.appendLine(`[${this.timestamp()}] site: ${this.site}`);
        this.channel.appendLine(`[${this.timestamp()}] contest: ${this.contest}`);
        this.channel.appendLine(`[${this.timestamp()}] task: ${this.task}`);
        this.channel.appendLine(`[${this.timestamp()}] extension: ${this.extension}`);
        this.channel.appendLine(`[${this.timestamp()}] language: ${this.language}`);

        //  init command
        await this.initPropAsync(true);

        // check taskfile
        this.channel.appendLine(`[${this.timestamp()}] taskfile: ${this.taskfile}`);
        if (!fs.existsSync(this.taskfile)) {
            throw `ERROR: missing taskfile="${this.taskfile}", do init task`;
        }

        // submit task with extension
        this.xextension.submitTask();

        // submit task
        await this.xsite.submitTaskAsync();

        acts.channel.appendLine(`---- SUCCESS: ${acts.task} submitted ----`);
    }

    public async removeTaskAsync() {
        // show channel
        this.channel.appendLine(`[${this.timestamp()}] site: ${this.site}`);
        this.channel.appendLine(`[${this.timestamp()}] contest: ${this.contest}`);
        this.channel.appendLine(`[${this.timestamp()}] task: ${this.task}`);
        this.channel.appendLine(`[${this.timestamp()}] extension: ${this.extension}`);

        // init command
        await this.initPropAsync(true);

        // Remove Taskfile
        if (!fs.existsSync(this.taskfile)) {
            this.channel.appendLine(`[${this.timestamp()}] taskfile: ${this.taskfile} missing`);
        } else {
            fs.unlinkSync(this.taskfile);
            this.channel.appendLine(`[${this.timestamp()}] taskfile: ${this.taskfile} removed`);
        }

        // remove testfile
        if (!fs.existsSync(this.testfile)) {
            this.channel.appendLine(`[${this.timestamp()}] testfile: ${this.testfile} missing`);
        } else {
            fs.unlinkSync(this.testfile);
            this.channel.appendLine(`[${this.timestamp()}] testfile: ${this.testfile} removed`);
        }

        this.channel.appendLine(`---- SUCCESS: ${this.task} removed ----`);
    }

    public async browseTaskAsync() {
        // show channel
        this.channel.appendLine(`[${this.timestamp()}] site: ${this.site}`);
        this.channel.appendLine(`[${this.timestamp()}] contest: ${this.contest}`);
        this.channel.appendLine(`[${this.timestamp()}] task: ${this.task}`);
        this.channel.appendLine(`[${this.timestamp()}] extension: ${this.extension}`);

        // init command
        await this.initPropAsync(true);

        // open task
        this.xsite.browseTask();

        this.channel.appendLine(`---- SUCCESS: browse ${this.task} ----`);
    }

    // config
    public loadState() {
        const json = fs.existsSync(this.statefile)
            ? JSON.parse(fs.readFileSync(this.statefile).toString())
            : {
                  site: "",
                  contest: "",
                  task: "",
                  extension: "",
                  language: "",
              };
        this.site = json.site || "";
        this.contest = json.contest || "";
        this.task = json.task || "";
        this.extension = json.extension;
        this.language = json.language;
        this.xsites.forEach(val => val.loadState(json));
    }
    public saveState() {
        const json = {
            site: this.site,
            contest: this.contest,
            task: this.task,
            extension: this.extension,
            language: this.language,
        };
        this.xsites.forEach(val => val.saveState(json));
        fs.writeFileSync(this.statefile, JSON.stringify(json));
    }

    // expand command
    public expandString(str: string): string {
        return str
            .replace(/\$taskfile/g, this.taskfile)
            .replace(/\$execfile/g, this.execfile)
            .replace(/\$tmppath/g, this.tmppath)
            .replace(/\$taskpath/g, this.taskpath)
            .replace(/\$site/g, this.site)
            .replace(/\$contest/g, this.contest)
            .replace(/\$task/g, this.task)
            .replace(/\$extension/g, this.extension);
    }

    // message
    public responseToMessage(ex: any): string {
        let texts = [];
        if (ex.status) {
            texts.push(ex.status);
        }
        if (ex.message) {
            texts.push(ex.message);
        }
        if (ex.response?.text) {
            texts.push(ex.response.text);
        }
        let message = texts.join(" ");
        return message;
    }
    public timestamp(): string {
        return new Date().toLocaleString("ja-JP").split(" ")[1];
    }
}
export const acts = new AcTsExtension();
