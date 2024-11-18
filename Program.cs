using DotNetEnv;
using Mastonet;
using OldRobloxScreenshotBot;
using System.Net.Http;
using System.Threading.Tasks;

DotNetEnv.Env.Load();
var mastodonInstanceUrl = System.Environment.GetEnvironmentVariable("MASTODON_INSTANCE_URL");
var mastodonAccessToken = System.Environment.GetEnvironmentVariable("MASTODON_ACCESS_TOKEN");
var blueskyPdsUrl = System.Environment.GetEnvironmentVariable("BLUESKY_PDS_URL");
var blueskyHandle = System.Environment.GetEnvironmentVariable("BLUESKY_HANDLE");
var blueskyPassword = System.Environment.GetEnvironmentVariable("BLUESKY_PASSWORD");

var mapsFolder = Path.Combine(Directory.GetCurrentDirectory(), "maps");
if (mapsFolder == null)
{
    throw new DirectoryNotFoundException("No maps folder found.");
};
var randomMap = new DirectoryInfo(mapsFolder).GetFiles().OrderBy(f => Guid.NewGuid()).FirstOrDefault();
if (randomMap == null)
{
    throw new FileNotFoundException("No files found in the maps folder.");
}
else
{
    Console.WriteLine($"Selected map: {randomMap.Name}");
}

var screenshotSky = await Screenshot.GetScreenshotAsync(randomMap);
Console.WriteLine("Screenshot complete (skybox on)");
var screenshotNoSky = await Screenshot.GetScreenshotAsync(randomMap, true);
Console.WriteLine("Screenshot complete (skybox off)");

if (screenshotSky == null || screenshotNoSky == null)
{
    throw new Exception("Something went wrong with the screenshots.");
}

const string skyDescription = "An automatically generated thumbnail of a Roblox map in the 2008 client. It uses the camera angle set by the game developer for the thumbnail, and includes a skybox.";
const string noSkyDescription = "An automatically generated thumbnail of a Roblox map in the 2008 client. It is likely a birds-eye view of the map, trying to fit it all in the image, and has a transparent background.";
var postText = $"Check out this classic Roblox map I found called {randomMap.Name}!";

var httpClient = new HttpClient();
httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("OldRobloxScreenshotBot");
if (!String.IsNullOrEmpty(mastodonInstanceUrl) && !String.IsNullOrEmpty(mastodonAccessToken))
{
    Console.WriteLine("Posting to Mastodon...");
    var client = new MastodonClient(mastodonInstanceUrl, mastodonAccessToken, httpClient);
    Console.WriteLine("Got client");

    var skyUploadResult = await client.UploadMedia(screenshotSky, description: skyDescription);
    Console.WriteLine(skyUploadResult.Id);
    var noSkyUploadResult = await client.UploadMedia(screenshotNoSky, description: noSkyDescription);
    Console.WriteLine(noSkyUploadResult.Id);

    var postResult = await client.PublishStatus(status: postText, visibility: Visibility.Public, mediaIds: new[] { skyUploadResult.Id, noSkyUploadResult.Id });
    Console.WriteLine(postResult);
}

// if (!String.IsNullOrEmpty(blueskyPdsUrl) && !String.IsNullOrEmpty(blueskyHandle) && !String.IsNullOrEmpty(blueskyPassword))
// {
//     Console.WriteLine("Posting to Bluesky...");

//     var blueskyClient = new BlueskyClient(blueskyPdsUrl, blueskyHandle, blueskyPassword);
//     var accessToken = await blueskyClient.GetSessionTokenAsync(httpClient);
//     Console.WriteLine("Got client");

//     var skyBlob = await blueskyClient.UploadImageAsync(httpClient, accessToken, screenshotSky, "image/webp");
//     Console.WriteLine(skyBlob);
//     var noSkyBlob = await blueskyClient.UploadImageAsync(httpClient, accessToken, screenshotNoSky, "image/webp");
//     Console.WriteLine(noSkyBlob);

//     var postResponse = await blueskyClient.CreatePostAsync(httpClient, accessToken, postText, new List<(string Description, BlueskyClient.BlueskyBlob Blob)> { (skyDescription, skyBlob), (noSkyDescription, noSkyBlob) });
//     Console.WriteLine("Posted to Bluesky: " + postResponse);
// }