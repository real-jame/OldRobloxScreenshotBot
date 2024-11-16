using DotNetEnv;
using Mastonet;
using OldRobloxScreenshotBot;
using System.Net.Http;
using System.Threading.Tasks;

DotNetEnv.Env.Load();

var mapsFolder = Path.Combine(Directory.GetCurrentDirectory(), "maps");
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
Console.WriteLine("Got screenshot (skybox on)");
var screenshotNoSky = await Screenshot.GetScreenshotAsync(randomMap, true);
Console.WriteLine("Got screenshot (skybox off)");

var httpClient = new HttpClient();
httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("Mastonet");
var client = new MastodonClient(System.Environment.GetEnvironmentVariable("INSTANCE_URL"), System.Environment.GetEnvironmentVariable("ACCESS_TOKEN"), httpClient);
Console.WriteLine("Got client");

var skyUploadResult = await client.UploadMedia(screenshotSky, description: "An automatically generated thumbnail of a Roblox map in the 2008 client. It uses the camera angle set by the game developer for the thumbnail, and includes a skybox.");
Console.WriteLine(skyUploadResult.Id);
var noSkyUploadResult = await client.UploadMedia(screenshotNoSky, description: "An automatically generated thumbnail of a Roblox map in the 2008 client. It is likely a birds-eye view of the map, trying to fit it all in the image, and has a transparent background.");
Console.WriteLine(noSkyUploadResult.Id);

var postResult = await client.PublishStatus(status: $"Check out this classic Roblox map I found called {randomMap.Name}!", visibility: Visibility.Public, mediaIds: new[] { skyUploadResult.Id, noSkyUploadResult.Id });
Console.WriteLine(postResult);