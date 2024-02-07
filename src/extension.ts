"use strict";

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as childProcess from "child_process";

class PandocFormatProvider
    implements
    vscode.DocumentFormattingEditProvider,
    vscode.DocumentRangeFormattingEditProvider {
    path: string = "pandoc";
    available: boolean = false;
    enabled: boolean = false;
    inputFamily: string = "commonmark";
    outputFamily: string = "commonmark";
    extraArgs: string[] = [];

    constructor(context: vscode.ExtensionContext) {
        console.log("creating format provider...");
        this.configure(context, true);
    }

    configure(context: vscode.ExtensionContext, register: boolean) {
        const config = vscode.workspace.getConfiguration("panfmt");

        this.enabled = config.get("enabled", this.enabled);

        if (this.enabled) {
            this.path = config.get("pandocExePath", this.path);
            this.inputFamily = config.get("inputFamily", this.inputFamily);
            this.outputFamily = config.get("outputFamily", this.outputFamily);
            this.extraArgs = config.get("extraArgs", this.extraArgs);
        }
        let result = childProcess.spawnSync(this.path, ["--version"], {
            shell: true,
        });
        this.available = !(result.error);

        if (register) {
            if (this.available) {
                console.log(
                    "panfmt: pandoc exe found. Registering.",
                );
                this.register(context);
            } else {
                this.handleError(result, "panfmt: could not find pandoc executable");
                console.log("panfmt: pandoc unavailable.");
            }
        } else {
            console.log("panfmt: No registration requested.")
        }
    }

    handleError(
        result: childProcess.SpawnSyncReturns<Buffer>,
        errMsg: string,
    ): string | undefined {
        if (result.error) {
            let message = result.error
                ? `${errMsg} (${this.path}): ${result.error.message}`
                : `${errMsg} (${this.path})`;
            vscode.window.showErrorMessage(message);
        } else {
            if (result.status) {
                vscode.window.showWarningMessage("panfmt: warnings when formatting string: " + result.stderr.toString());
            }
            return result.stdout.toString();
        }
        return undefined;
    }

    formatString(text: string): string | undefined {
        if (this.available) {
            let result = childProcess.spawnSync(
                this.path,
                ["--from", this.inputFamily, "--to", this.outputFamily].concat(
                    this.extraArgs,
                ),
                {
                    input: text,
                    shell: true,
                },
            );
            return this.handleError(result, "panfmt: could not format document");
        } else {
            vscode.window.showErrorMessage("panfmt: could not find pandoc executable");
        }
        return "";
    }

    formatEdit(
        document: vscode.TextDocument,
        range: vscode.Range,
    ): vscode.TextEdit | undefined {
        let text = document.getText(range);
        if (text.length > 0) {
            let formatted = this.formatString(text);
            if (formatted && formatted.length > 0) {
                console.log("panfmt: formatted document successfully!");
                return vscode.TextEdit.replace(range, formatted);
            }
        }
        return undefined;
    }

    register(context: vscode.ExtensionContext) {
        if (this.enabled) {
            context.subscriptions.push(vscode.languages
                .registerDocumentFormattingEditProvider(
                    "markdown",
                    this,
                ))
            console.log("panfmt: registered as format provider for 'markdown'");
        }
    }

    provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        _options: vscode.FormattingOptions,
        _token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        let result = this.formatEdit(document, range);
        return result ? [result] : result;
    }

    provideDocumentRangesFormattingEdits?(
        document: vscode.TextDocument,
        ranges: vscode.Range[],
        _options: vscode.FormattingOptions,
        _token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        let result = [];
        for (let range of ranges) {
            let e = this.formatEdit(document, range);
            if (e) {
                result.push(e);
            }
        }
        return result;
    }

    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        _options: vscode.FormattingOptions,
        _token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        let result = this.formatEdit(
            document,
            new vscode.Range(
                document.lineAt(0).range.start,
                document.lineAt(document.lineCount - 1).range.end,
            ),
        );
        return result ? [result] : result;
    }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    let formatProvider = new PandocFormatProvider(context);
    let configChangeHandler = vscode.workspace.onDidChangeConfiguration((_) => {
        formatProvider.configure(context, false);
    });
    context.subscriptions.push(configChangeHandler);
}

// This method is called when your extension is deactivated
export function deactivate() {
    // Everything is registered with context.subscriptions, so nothing to do
}
