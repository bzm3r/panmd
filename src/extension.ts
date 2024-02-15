"use strict";

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as childProcess from "child_process";
import {
  CancellationToken,
  DocumentFormattingEditProvider,
  DocumentRangeFormattingEditProvider,
  ExtensionContext,
  FormattingOptions,
  languages,
  ProviderResult,
  Range,
  TextDocument,
  TextEdit,
  TextEditor,
  window,
  workspace,
} from "vscode";

class PandocFormatProvider
  implements
    DocumentFormattingEditProvider,
    DocumentRangeFormattingEditProvider {
  path: string = "pandoc";
  available: boolean = false;
  enabled: boolean = false;
  extraArgs: string[] = [];
  currentEditor: TextEditor | undefined = undefined;

  constructor(ctx: ExtensionContext) {
    console.log("creating format provider...");
    this.configure(ctx, true);
  }

  configure(ctx: ExtensionContext, register: boolean) {
    const config = workspace.getConfiguration("panmd");

    this.enabled = config.get("enabled", this.enabled);

    if (this.enabled) {
      this.path = config.get("pandocExePath", this.path);
      this.extraArgs = config.get("extraArgs", this.extraArgs);
      this.currentEditor = this.getFocusedTextEditor(ctx);
    }
    let result = childProcess.spawnSync(this.path, ["--version"], {
      shell: true,
    });
    this.available = !(result.error);

    if (register) {
      if (this.available) {
        console.log(
          "panmd: pandoc exe found. Registering.",
        );
        this.register(ctx);
      } else {
        this.handleError(result, "panmd: could not find pandoc executable");
        console.log("panmd: pandoc unavailable.");
      }
    } else {
      console.log("panmd: No registration requested.");
    }
  }

  getFocusedTextEditor(
    ctx: ExtensionContext,
  ): TextEditor | undefined {
    return undefined;
  }

  handleError(
    result: childProcess.SpawnSyncReturns<Buffer>,
    errMsg: string,
  ): string | undefined {
    if (result.error) {
      let message = result.error
        ? `${errMsg} (${this.path}): ${result.error.message}`
        : `${errMsg} (${this.path})`;
      window.showErrorMessage(message);
    } else {
      if (result.status) {
        window.showWarningMessage(
          "panmd: warnings when formatting string: " +
            result.stderr.toString(),
        );
      }
      return result.stdout.toString();
    }
    return undefined;
  }

  mapLangId(langId: string): string | undefined {
    if (langId === "markdown") {
      return "commonmark";
    } else if (langId === "panmd") {
      return "markdown";
    }
    return undefined;
  }

  formatString(text: string, ioFamily: string | undefined): string | undefined {
    if (this.available && ioFamily) {
      if (ioFamily) {
        let result = childProcess.spawnSync(
          this.path,
          [
            "--from",
            ioFamily,
            "--to",
            ioFamily,
          ].concat(
            this.extraArgs,
          ),
          {
            input: text,
            shell: true,
          },
        );
        return this.handleError(result, "panmd: could not format document");
      }
    } else {
      window.showErrorMessage(
        "panmd: could not find pandoc executable",
      );
    }
    return undefined;
  }

  formatEdit(
    document: TextDocument,
    range: Range,
  ): TextEdit | undefined {
    let text = document.getText(range);
    if (text.length > 0) {
      let langId = this.mapLangId(document.languageId);
      let formatted = this.formatString(
        text,
        langId,
      );
      if (formatted && formatted.length > 0) {
        console.log(`panmd: formatted document successfully (${langId})!`);
        return TextEdit.replace(range, formatted);
      }
    }
    return undefined;
  }

  register(ctx: ExtensionContext) {
    if (this.enabled) {
      for (let langId of ["markdown", "panmd"]) {
        ctx.subscriptions.push(languages
          .registerDocumentFormattingEditProvider(
            langId,
            this,
          ));

        console.log(`panmd: registered as ${langId} formatting provider`);
      }
    }
  }

  provideDocumentRangeFormattingEdits(
    document: TextDocument,
    range: Range,
    _options: FormattingOptions,
    _token: CancellationToken,
  ): ProviderResult<TextEdit[]> {
    let result = this.formatEdit(document, range);
    return result ? [result] : result;
  }

  provideDocumentRangesFormattingEdits?(
    document: TextDocument,
    ranges: Range[],
    _options: FormattingOptions,
    _token: CancellationToken,
  ): ProviderResult<TextEdit[]> {
    let result: TextEdit[] = [];
    for (let range of ranges) {
      let e = this.formatEdit(document, range);
      if (e) {
        result.push(e);
      }
    }
    return result;
  }

  provideDocumentFormattingEdits(
    document: TextDocument,
    _options: FormattingOptions,
    _token: CancellationToken,
  ): ProviderResult<TextEdit[]> {
    let result = this.formatEdit(
      document,
      new Range(
        document.lineAt(0).range.start,
        document.lineAt(document.lineCount - 1).range.end,
      ),
    );
    return result ? [result] : result;
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(ctx: ExtensionContext) {
  let formatProvider = new PandocFormatProvider(ctx);
  let configChangeHandler = workspace.onDidChangeConfiguration((_) => {
    formatProvider.configure(ctx, false);
  });
  ctx.subscriptions.push(configChangeHandler);
}

// This method is called when your extension is deactivated
export function deactivate() {
  // Everything is registered with ctx.subscriptions, so nothing to do
}
