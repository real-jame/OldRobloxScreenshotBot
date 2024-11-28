import "dotenv/config";
import path from "path";
import fs from "fs";
import { screenshot } from "./screenshot";
import { createRestAPIClient } from "masto";
import AtpAgent, { Facet } from "@atproto/api";
import axios from "axios";
import RichtextBuilder from "@atcute/bluesky-richtext-builder";

const mastodonInstanceUrl = process.env.MASTODON_INSTANCE_URL;
const mastodonAccessToken = process.env.MASTODON_ACCESS_TOKEN;
const blueskyPdsUrl = process.env.BLUESKY_PDS_URL;
const blueskyIdentifier = process.env.BLUESKY_IDENTIFIER;
const blueskyPassword = process.env.BLUESKY_PASSWORD;

const mapsFolder = path.join(process.cwd(), "maps");
if (mapsFolder == null) {
    throw new Error("No maps folder found");
}
function getAllMaps(dirPath: string, arrayOfFiles: string[] = []): string[] {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
            arrayOfFiles = getAllMaps(filePath, arrayOfFiles);
        } else if (filePath.endsWith('.rbxl')) {
            arrayOfFiles.push(filePath);
        }
    });

    return arrayOfFiles;
}
const allMaps = getAllMaps(mapsFolder);
const randomMap = allMaps[Math.floor(Math.random() * allMaps.length)];
const metadataFile = path.join(path.dirname(randomMap), "metadata.json");
console.log(`Selected map: ${randomMap}`);
console.log(metadataFile ? `Metadata file: ${metadataFile}` : "No metadata file found");

// await screenshot.init();
const screenshotSky = await screenshot.getScreenshotAsync(randomMap, false);
console.log("Screenshot complete (skybox on)");
const screenshotNoSky = await screenshot.getScreenshotAsync(randomMap, true);
console.log("Screenshot complete (skybox off)");

if (screenshotSky == null || screenshotNoSky == null) {
    throw new Error("Something went wrong with the screenshots.");
}

const skyDescription = "An automatically generated thumbnail of a Roblox map in the 2008 client. It uses the camera angle set by the game developer for the thumbnail, and includes a skybox.";
const noSkyDescription = "An automatically generated thumbnail of a Roblox map in the 2008 client. It is likely a birds-eye view of the map, trying to fit it all in the image, and has a transparent background.";

// Metadata and folder structure is meant for the 2006-08 Robloxopolis map archive.
let postText = `${path.basename(randomMap)}`;
console.log(postText);

if (mastodonInstanceUrl && mastodonAccessToken) {
    console.log("Posting to Mastodon...");
    const masto = createRestAPIClient({
        url: mastodonInstanceUrl,
        accessToken: mastodonAccessToken
    });

    // const skyAttachment = await masto.v2.media.create({
    //     file: screenshotSky,
    //     description: skyDescription
    // });
    // const noSkyAttachment = await masto.v2.media.create({
    //     file: screenshotNoSky,
    //     description: noSkyDescription
    // });
    const axiosOptions = { headers: { Authorization: `Bearer ${mastodonAccessToken}`, "Content-Type": "multipart/form-data" } };
    const formDataSky = new FormData();
    formDataSky.append('file', screenshotSky, 'screenshotSky.webp');
    formDataSky.append('description', skyDescription);

    const formDataNoSky = new FormData();
    formDataNoSky.append('file', screenshotNoSky, 'screenshotNoSky.webp');
    formDataNoSky.append('description', noSkyDescription);

    const skyAttachment = await axios.postForm(`${mastodonInstanceUrl}/api/v2/media`, formDataSky, axiosOptions);
    const noSkyAttachment = await axios.postForm(`${mastodonInstanceUrl}/api/v2/media`, formDataNoSky, axiosOptions);;
    console.log(skyAttachment.data, noSkyAttachment.data);

    if (metadataFile) {
        const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
        postText = `${metadata.Name ? metadata.Name : path.basename(randomMap)}${metadata.Name}

${metadata.Creator ? `By: ${metadata.Creator}` : ""}
Link: https://roblox.com/games/${path.basename(path.resolve(randomMap, "../.."))}
${metadata.Description ? `Description: "${metadata.Description.trimStart().trimEnd()}"` : ""}`;
    }

    const status = await masto.v1.statuses.create({
        status: postText,
        visibility: "public",
        mediaIds: [skyAttachment.data.id, noSkyAttachment.data.id],
    });
    console.log(status);
}
if (blueskyPdsUrl && blueskyIdentifier && blueskyPassword) {
    console.log("Posting to Bluesky...");
    const agent = new AtpAgent({
        service: blueskyPdsUrl,
    })
    await agent.login({ identifier: blueskyIdentifier, password: blueskyPassword });

    const skyAttachment = await agent.uploadBlob(screenshotSky);
    const noSkyAttachment = await agent.uploadBlob(screenshotNoSky);
    console.log(skyAttachment.data, noSkyAttachment.data);

    let textBuilder = new RichtextBuilder().addText(postText);
    if (metadataFile) {
        const metadata = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
        const gameLink = `https://roblox.com/games/${path.basename(path.resolve(randomMap, "../.."))}`;
        textBuilder = new RichtextBuilder()
            .addText(metadata.Name ? metadata.Name : path.basename(randomMap)).addText("\n\n")
            .addText(metadata.Creator ? `By: ${metadata.Creator}` : "").addText("\n")
            .addText("Link: ").addLink(gameLink, gameLink).addText("\n")
            .addText(metadata.Description ? `Description: "${metadata.Description.trimStart().trimEnd()}"` : "");
    }
    let blueskyText = Object.assign({ text: "", facets: "" }, textBuilder.build());
    if (blueskyText.text.length > 300) {
        blueskyText.text = blueskyText.text.substring(0, 296) + '...';
    }
    console.log(blueskyText.text, blueskyText.facets);

    const status = await agent.post({
        text: blueskyText.text,
        embed: {
            $type: "app.bsky.embed.images",
            images: [
                {
                    alt: skyDescription,
                    image: skyAttachment.data.blob
                },
                {
                    alt: noSkyDescription,
                    image: noSkyAttachment.data.blob
                }
            ]
        },
        facets: blueskyText.facets as any,
        createdAt: new Date().toISOString()
    });
    console.log(status);
}