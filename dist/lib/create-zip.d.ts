declare type ZipOptions = {
    input: string;
    output: string;
};
declare type ZipResult = {
    input: string;
    output: string;
    outputSize: number;
};
export declare const createZip: ({ input, output, }: ZipOptions) => Promise<ZipResult>;
export {};
