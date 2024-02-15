# panmd

## Features

Format CommonMark files with `pandoc`!

## Requirements

Make sure you have the `pandoc` executable available on `PATH`, or
specify where it is located using the option `panmd.pandocExePath`.

## Extension Settings

This extension contributes the following settings:

``` json
"panmd.enabled": {
    "type": "boolean",
    "default": true,
    "description": "Enable panmd as a markdown formatter."
},
"panmd.pandocExePath": {
    "type": "string",
    "default": "pandoc",
    "description": "Path to pandoc executable to use for formatting operations."
},
"panmd.inputFormat": {
    "type": "string",
    "default": "commonmark",
    "description": "Value for --from flag for `pandoc`. See https://pandoc.org/MANUAL.html#general-options"
},
"panmd.outputFormat": {
    "type": "string",
    "default": "commonmark",
    "description": "Value for --to option. See https://pandoc.org/MANUAL.html#general-options"
},
"panmd.extraArgs": {
    "type": "array",
    "default": [],
    "description": "See https://pandoc.org/MANUAL.html#options"
}
```

## Known Issues

Check this repository's Issues tab for known issues.
