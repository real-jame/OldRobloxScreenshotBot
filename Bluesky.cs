using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace OldRobloxScreenshotBot
{
    // A person with sanity would recognize defeat (there isn't a bluesky library for C#) and rewrite the pretty tiny codebase into Python, which does have one.
    // But I'm not a person with sanity. (Also I cheated with some copilot help, what are you gonna do about it?)

    public class BlueskyClient
    {
        private readonly string _pdsUrl;
        private readonly string _handle;
        private readonly string _password;

        public BlueskyClient(string pdsUrl, string handle, string password)
        {
            _pdsUrl = pdsUrl;
            _handle = handle;
            _password = password;
        }

        public async Task<string> GetSessionTokenAsync(HttpClient client)
        {
            var requestContent = new StringContent(JsonSerializer.Serialize(new { identifier = _handle, password = _password }), Encoding.UTF8, "application/json");
            var response = await client.PostAsync($"https://{_pdsUrl}/xrpc/com.atproto.server.createSession", requestContent);
            response.EnsureSuccessStatusCode();
            var responseContent = await response.Content.ReadAsStringAsync();
            var session = JsonSerializer.Deserialize<BlueskySession>(responseContent);
            return session.AccessJwt;
        }

        public async Task<BlueskyBlob> UploadImageAsync(HttpClient client, string accessToken, MemoryStream memoryStream, string mimeType)
        {
            var requestContent = new ByteArrayContent(memoryStream.ToArray());
            requestContent.Headers.ContentType = new MediaTypeHeaderValue(mimeType);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            var response = await client.PostAsync($"https://{_pdsUrl}/xrpc/com.atproto.repo.uploadBlob", requestContent);
            response.EnsureSuccessStatusCode();
            var responseContent = await response.Content.ReadAsStringAsync();
            Console.WriteLine(responseContent);
            var blob = JsonSerializer.Deserialize<BlueskyBlob>(responseContent);
            Console.WriteLine(blob.Size);
            return blob;
        }

        public async Task<string> CreatePostAsync(HttpClient client, string accessToken, string text, List<(string Description, BlueskyBlob Blob)> images)
        {
            Console.WriteLine(images[1].Blob);
            var record = new
            {
                text = text,
                createdAt = System.DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                embed = images != null && images.Count > 0 ? new
                {
                    Type = "app.bsky.embed.images",
                    Images = images.Select(image => new
                    {
                        Alt = image.Description,
                        Image = new
                        {
                            Type = "blob",
                            Ref = new { Link = image.Blob.TheRef.Link },
                            MimeType = image.Blob.MimeType,
                            Size = image.Blob.Size
                        }
                    }).ToArray()
                } : null
            };

            var requestContent = new StringContent(JsonSerializer.Serialize(new
            {
                repo = _handle,
                collection = "app.bsky.feed.post",
                record = record
            }), Encoding.UTF8, "application/json");

            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            var response = await client.PostAsync($"https://{_pdsUrl}/xrpc/com.atproto.repo.createRecord", requestContent);
            response.EnsureSuccessStatusCode();
            var responseContent = await response.Content.ReadAsStringAsync();
            return responseContent;
        }

        private class BlueskySession
        {
            [JsonPropertyName("accessJwt")]
            public string AccessJwt { get; set; }

            [JsonPropertyName("refreshJwt")]
            public string RefreshJwt { get; set; }
        }


        public class BlueskyBlob
        {
            [JsonPropertyName("$type")]
            public string Type { get; set; }

            [JsonPropertyName("ref")]
            public BlobRef TheRef { get; set; } // i dont know how else to name it that also pleases C# lol

            public class BlobRef
            {
                [JsonPropertyName("$link")]
                public string Link { get; set; }
            }

            [JsonPropertyName("mimeType")]
            public string MimeType { get; set; }

            [JsonPropertyName("size")]
            public long Size { get; set; }
        }
    }
}