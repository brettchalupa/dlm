import * as path from "jsr:@std/path";

export enum LogOutput {
  "file",
  "stdout",
}
export class Logger {
  outputs: LogOutput[];
  file: string;
  prefix: string;
  dir: string;

  constructor(
    outputs: LogOutput[] = [LogOutput.file, LogOutput.stdout],
    prefix = "",
    file = "dlm.log",
    dir = Deno.cwd(),
  ) {
    this.outputs = outputs;
    this.file = file;
    this.prefix = prefix;
    this.dir = dir;
  }

  // deno-lint-ignore no-explicit-any
  log(...args: any[]) {
    this.outputs.forEach((output) => {
      switch (output) {
        case LogOutput.file:
          Deno.writeTextFile(
            path.join(this.dir, this.file),
            this.prefix + args.join(" ") + "\n",
            {
              append: true,
            },
          );
          break;
        case LogOutput.stdout:
          console.log(...args);
      }
    });
  }

  // deno-lint-ignore no-explicit-any
  debug(...args: any[]) {
    this.outputs.forEach((output) => {
      switch (output) {
        case LogOutput.file:
          Deno.writeTextFile(
            path.join(this.dir, this.file),
            "[DEBUG] " + this.prefix + args.join(" ") + "\n",
            { append: true },
          );
          break;
        case LogOutput.stdout:
          console.debug(...args);
      }
    });
  }

  error(...args: unknown[]) {
    this.outputs.forEach((output) => {
      switch (output) {
        case LogOutput.file:
          Deno.writeTextFile(
            path.join(this.dir, this.file),
            "[ERROR] " + this.prefix + args.join(" ") + "\n",
            { append: true },
          );
          break;
        case LogOutput.stdout:
          console.error(...args);
      }
    });
  }
}
