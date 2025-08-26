interface Mammoth {
    convertToHtml: (input: Input, options?: Options) => Promise<Result>;
    extractRawText: (input: Input) => Promise<Result>;
    embedStyleMap: (input: Input, styleMap: string) => Promise<{
        toArrayBuffer: () => ArrayBuffer,
        toBuffer: () => Buffer,
    }>;
    images: Images;
    security: Security;
}

type Input = NodeJsInput | BrowserInput;

type NodeJsInput = PathInput | BufferInput;

interface PathInput {
    path: string;
}

interface BufferInput {
    buffer: Buffer;
}

type BrowserInput = ArrayBufferInput;

interface ArrayBufferInput {
    arrayBuffer: ArrayBuffer;
}

interface Options {
    styleMap?: string | Array<string>;
    includeEmbeddedStyleMap?: boolean;
    includeDefaultStyleMap?: boolean;
    convertImage?: ImageConverter;
    ignoreEmptyParagraphs?: boolean;
    idPrefix?: string;
    transformDocument?: (element: any) => any;
    security?: SecurityConfig | false;
}

interface ImageConverter {
    __mammothBrand: "ImageConverter";
}

interface Image {
    contentType: string;
    readAsArrayBuffer: () => Promise<ArrayBuffer>;
    readAsBase64String: () => Promise<string>;
    readAsBuffer: () => Promise<Buffer>;
    read: ImageRead;
}

interface ImageRead {
    (): Promise<Buffer>;
    (encoding: string): Promise<string>;
}

interface ImageAttributes {
    src: string;
}

interface Images {
    dataUri: ImageConverter;
    imgElement: (f: (image: Image) => Promise<ImageAttributes>) => ImageConverter;
}

interface Result {
    value: string;
    messages: Array<Message>;
}

type Message = Warning | Error;

interface Warning {
    type: "warning";
    message: string;
}

interface Error {
    type: "error";
    message: string;
    error: unknown;
}

type SecurityLevel = "strict" | "standard" | "permissive";

interface SecurityConfig {
    level?: SecurityLevel;
    allowedProtocols?: string[];
    allowRelativeUrls?: boolean;
    allowFragments?: boolean;
    allowDataUrls?: boolean;
    customSanitizer?: (url: string) => string;
    strict?: boolean;
}

interface SecuritySanitizer {
    sanitizeUrl: (url: string) => string;
    sanitizeAttributes: (attributes: any) => any;
    getConfig: () => SecurityConfig;
}

interface Security {
    createSanitizer: (config?: SecurityConfig) => SecuritySanitizer;
    sanitizeUrl: (url: string) => string;
    sanitizeAttributes: (attributes: any) => any;
    SECURITY_LEVELS: {
        STRICT: "strict";
        STANDARD: "standard";
        PERMISSIVE: "permissive";
    };
    DEFAULT_CONFIG: SecurityConfig;
    STRICT_CONFIG: SecurityConfig;
    PERMISSIVE_CONFIG: SecurityConfig;
}

declare const mammoth: Mammoth;

export = mammoth;
