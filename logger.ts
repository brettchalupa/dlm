export enum LogOutput {
    "file",
    "stdout",
}
export class Logger {
    outputs: LogOutput[];
    file: string;
    prefix: string;

    constructor(outputs: LogOutput[] = [LogOutput.file, LogOutput.stdout], prefix = "", file = "dlm.log") {
        this.outputs = outputs;
        this.file = file;
        this.prefix = prefix;
    }

    // deno-lint-ignore no-explicit-any
    log(...args: any[]) {
        this.outputs.forEach((output) => {
            switch (output) {
                case LogOutput.file:
                    Deno.writeTextFile(this.file, this.prefix + args.join(" ") + "\n", { append: true });
                    break;
                case LogOutput.stdout:
                    console.log(...args);
            }

        })

    }

    // deno-lint-ignore no-explicit-any
    debug(...args: any[]) {
        this.outputs.forEach((output) => {
            switch (output) {
                case LogOutput.file:
                    Deno.writeTextFile(this.file, "[DEBUG] " + this.prefix + args.join(" ") + "\n", { append: true });
                    break;
                case LogOutput.stdout:
                    console.debug(...args);
            }
        })
    }

    // deno-lint-ignore no-explicit-any
    error(...args: any[]) {
        this.outputs.forEach((output) => {
            switch (output) {
                case LogOutput.file:
                    Deno.writeTextFile(this.file, "[ERROR] " + this.prefix + args.join(" ") + "\n", { append: true });
                    break;
                case LogOutput.stdout:
                    console.error(...args);
            }
        })
    }
}