using System.Xml.Linq;
using ServiceReference;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp;

namespace OldRobloxScreenshotBot
{
    public class Screenshot
    {
        private static readonly RCCServiceSoapClient client;

        static Screenshot()
        {
            // Inits the client
            var binding = new System.ServiceModel.BasicHttpBinding();
            binding.MaxReceivedMessageSize = 2147483647;
            var endpoint = new System.ServiceModel.EndpointAddress("http://localhost:64989/RCCService.asmx");
            client = new RCCServiceSoapClient(binding, endpoint);
        }

        public static async Task<MemoryStream> GetScreenshotAsync(FileInfo map, bool hideSky = false)
        {
            try
            {
                string scriptContent = File.ReadAllText("screenshot.lua");
                // The backslash in file paths have to be replaced with either double backslashes or a forward slash, because Lua interprets it as an escape character.
                scriptContent = scriptContent.Replace("INSERT_MAP_HERE", map.FullName.Replace("\\", "/")).Replace("HIDE_SKY_BOOLEAN", hideSky ? "true" : "false");

                var job = new Job
                {
                    id = Guid.NewGuid().ToString(),
                    expirationInSeconds = 30,
                    category = 1,
                    cores = 1
                };
                var script = new ScriptExecution
                {
                    name = "screenshot",
                    script = scriptContent,
                };
                var result = await client.OpenJobAsync(job, script);
                var base64 = result.OpenJobResult[0].value.ToString();

                // Now to convert the base64 into a file stream
                var bytes = Convert.FromBase64String(base64);
                var stream = new MemoryStream(bytes);
                var image = Image.Load(stream);
                var webpStream = new MemoryStream();
                image.SaveAsWebp(webpStream);
                webpStream.Position = 0;
                return webpStream;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}");
                return null;
            }
        }
    }
}