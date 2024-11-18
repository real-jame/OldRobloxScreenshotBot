import path from "path";
import soap from "soap";
import fs from "fs";
import sharp from "sharp";

export class screenshot {
    private static client: soap.Client;

    static async init() {
        const wsdlFile = path.join(process.cwd(), "RCCService.wsdl");
        if (!wsdlFile) {
            throw new Error("No RCCService.wsdl file found");
        }
        this.client = await soap.createClientAsync(wsdlFile, { endpoint: "http://localhost:64989" });
    }

    static async getScreenshotAsync(mapPath: string, hideSky: boolean = false): Promise<Blob | null> {
        try {
            let scriptContent = fs.readFileSync("screenshot.lua").toString();
            scriptContent = scriptContent.toString().replace("INSERT_MAP_HERE", mapPath.replace(/\\/g, '/')).replace("HIDE_SKY_BOOLEAN", hideSky ? "true" : "false");

            const job = {
                id: crypto.randomUUID(),
                expirationInSeconds: 30,
                category: "1",
                cores: "1"
            };

            const script = {
                name: "screenshot",
                script: scriptContent
            };

            const result = await this.client.OpenJob({ job, script });
            const base64 = result.OpenJobResult[0].value;

            const bytes = Buffer.from(base64, "base64");
            const webpBytes = await sharp(bytes).webp().toBuffer();
            return new Blob([webpBytes]);
        } catch (error) {
            console.error(`Error taking screenshot: ${error}`);
            return null;
        }
    }
}