import "dotenv/config";
import path from "path";
import fs from "fs";
import { screenshot } from "./screenshot";
import { createRestAPIClient } from "masto";
import AtpAgent from "@atproto/api";
import axios from "axios";

const mastodonInstanceUrl = process.env.MASTODON_INSTANCE_URL;
const mastodonAccessToken = process.env.MASTODON_ACCESS_TOKEN;
const blueskyPdsUrl = process.env.BLUESKY_PDS_URL;
const blueskyIdentifier = process.env.BLUESKY_IDENTIFIER;
const blueskyPassword = process.env.BLUESKY_PASSWORD;

const mapsFolder = path.join(process.cwd(), "maps");
if (mapsFolder == null) {
    throw new Error("No maps folder found");
}
const mapFiles = fs.readdirSync(mapsFolder);
if (mapFiles.length === 0) {
    throw new Error("No map files found in the maps folder.");
}


const randomMap = mapFiles[Math.floor(Math.random() * mapFiles.length)];
const randomMapFullName = path.join(mapsFolder, randomMap);
console.log(`Selected map: ${randomMap}`);

await screenshot.init();
const screenshotSky = await screenshot.getScreenshotAsync(randomMapFullName, false);
console.log("Screenshot complete (skybox on)");
const screenshotNoSky = await screenshot.getScreenshotAsync(randomMapFullName, true);
console.log("Screenshot complete (skybox off)");

if (screenshotSky == null || screenshotNoSky == null) {
    throw new Error("Something went wrong with the screenshots.");
}

const skyDescription = "An automatically generated thumbnail of a Roblox map in the 2008 client. It uses the camera angle set by the game developer for the thumbnail, and includes a skybox.";
const noSkyDescription = "An automatically generated thumbnail of a Roblox map in the 2008 client. It is likely a birds-eye view of the map, trying to fit it all in the image, and has a transparent background.";
const postText = `Check out this classic Roblox map I found called ${randomMap}!`;

if (mastodonInstanceUrl && mastodonAccessToken) {
    console.log("Posting to Mastodon...");
    const masto = createRestAPIClient({
        url: mastodonInstanceUrl,
        accessToken: mastodonAccessToken
    });
    console.log(masto.v2);

    // const skyAttachment = await masto.v2.media.create({
    //     file: "hi",
    //     description: skyDescription
    // });
    // const noSkyAttachment = await masto.v2.media.create({
    //     file: screenshotNoSky,
    //     description: noSkyDescription
    // });
    const axiosOptions = { headers: { Authorization: `Bearer ${mastodonAccessToken}`, "Content-Type": "multipart/form-data" } };
    const formDataSky = new FormData();
    formDataSky.append('file', screenshotSky, { filename: 'screenshotSky.webp' });
    formDataSky.append('description', skyDescription);

    const formDataNoSky = new FormData();
    formDataNoSky.append('file', screenshotNoSky, { filename: 'screenshotNoSky.webp' });
    formDataNoSky.append('description', noSkyDescription);

    const skyAttachment = await axios.postForm(`${mastodonInstanceUrl}/api/v2/media`, formDataSky, axiosOptions);
    const noSkyAttachment = await axios.postForm(`${mastodonInstanceUrl}/api/v2/media`, formDataNoSky, axiosOptions);;
    console.log(skyAttachment.data, noSkyAttachment.data);


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

    const status = await agent.post({
        text: postText,
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
        createdAt: new Date().toISOString()
    });
    console.log(status);
}