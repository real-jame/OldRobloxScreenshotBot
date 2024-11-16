# Old Roblox Screenshots bot

A bot for Mastodon (and bridged to Bluesky) that generates and posts a thumbnail from a random old Roblox map using the 2008 version of Roblox, every few hours.

- Follow at `@oldrobloxscreenshots@toki.realja.me`
- See post history at https://toki.realja.me/@oldrobloxscreenshots

May or may not make a writeup on how I did this, if so it'll be linked here.
This code requires and does not come with 2008 RCCService, Roblox's backend service at the time for generating thumbnails (among other things). You will have to find it yourself, along with the WSDL definitions.

If you have the WSDL, put it in the project root and run `dotnet-svcutil` on it to generate the API definitions. https://learn.microsoft.com/en-us/dotnet/core/additional-tools/dotnet-svcutil-guide
