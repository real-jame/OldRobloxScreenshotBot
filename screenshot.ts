import path from "path";
import soap from "soap";
import fs from "fs";
import sharp from "sharp";
import axios from "axios";
import * as cheerio from 'cheerio';

export class screenshot {
    // private static client: soap.Client;

    static async init() {
        // const wsdlFile = path.join(process.cwd(), "RCCService.wsdl");
        // if (!wsdlFile) {
        //     throw new Error("No RCCService.wsdl file found");
        // }
        // this.client = await soap.createClientAsync(wsdlFile, { endpoint: "http://localhost:64989" });

        // console.log(this.client);
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

            // A hacky alternate way, because the soap library is not making a client with the RCCService WSDL!
            const postHeaders = {
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "SOAPAction": "OpenJob",
                "Accept": "text/xml",
                "Expect": "text/xml"
            }

            const postData = `
                <?xml version="1.0" encoding="UTF - 8"?>
                <SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:ns2="http://roblox.com/RCCServiceSoap" xmlns:ns1="http://roblox.com/" xmlns:ns3="http://roblox.com/RCCServiceSoap12">
                <SOAP-ENV:Body><ns1:OpenJob>
                <ns1:job>
                <ns1:id>${job.id}</ns1:id>
                <ns1:expirationInSeconds>${job.expirationInSeconds}</ns1:expirationInSeconds>
                <ns1:category>${job.category}</ns1:category>
                <ns1:cores>${job.cores}</ns1:cores></ns1:job>
                <ns1:script>
                <ns1:name>${script.name}</ns1:name>
                <ns1:script>${script.script}</ns1:script>
                <ns1:arguments></ns1:arguments></ns1:script>
                </ns1:OpenJob></SOAP-ENV:Body>
                </SOAP-ENV:Envelope>
            `

            // const result = await this.client.OpenJob({ job, script });
            // const base64 = result.OpenJobResult[0].value;
            const result = await axios.post("http://localhost:64989", postData, { headers: postHeaders });
            const $ = cheerio.load(result.data, { xml: true });
            const base64 = $("ns1\\:value").text();

            const bytes = Buffer.from(base64, "base64");
            const webpBytes = await sharp(bytes).webp().toBuffer();
            return new Blob([webpBytes]);
        } catch (error) {
            console.error(`Error taking screenshot: ${error}`);
            return null;
        }
    }
}