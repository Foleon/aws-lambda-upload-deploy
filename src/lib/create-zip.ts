import archiver from "archiver";
import * as fs from "fs";
import * as zlib from "zlib";

type ZipOptions = {
  input: string;
  output: string;
};

type ZipResult = {
  input: string;
  output: string;
  outputSize: number;
};

export const createZip = ({
  input,
  output,
}: ZipOptions): Promise<ZipResult> => {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(output);
    const archive = archiver("zip", {
      zlib: { level: zlib.constants.Z_BEST_COMPRESSION },
    });

    writeStream.on("close", () => {
      resolve({
        input,
        output,
        outputSize: archive.pointer(),
      });
    });

    archive.on("warning", (err) => reject(err));

    archive.pipe(writeStream);
    archive.directory(input, false);
    archive.finalize();
  });
};
