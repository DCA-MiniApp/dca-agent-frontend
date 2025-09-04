import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getNeynarUser } from "~/lib/neynar";
import { APP_NAME } from "~/lib/constants";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fid = searchParams.get('fid');

  const user = fid ? await getNeynarUser(Number(fid)) : null;

  return new ImageResponse(
    (
      <div
        tw="flex h-full w-full flex-col items-center justify-center relative"
        style={{
          background:
            "linear-gradient(135deg, rgba(193,153,228,0.25) 0%, rgba(52,30,100,0.6) 60%, rgba(26,15,56,0.9) 100%)",
        }}
      >
        {/* Header */}
        <div tw="absolute top-12 left-12 flex items-center">
          <div tw="w-20 h-20 rounded-2xl" style={{
            background: "linear-gradient(135deg, #c199e4 0%, #b380db 100%)",
          }} />
          <div tw="ml-6">
            <div tw="text-5xl text-white font-bold">{APP_NAME}</div>
            <div tw="text-2xl text-white/80">AI-powered DCA on Arbitrum</div>
          </div>
        </div>

        {/* Center */}
        <div tw="flex flex-col items-center justify-center">
          {user?.pfp_url && (
            <div tw="flex w-80 h-80 rounded-full overflow-hidden mb-8 border-8 border-white/90 shadow-2xl">
              <img src={user.pfp_url} alt="Profile" tw="w-full h-full object-cover" />
            </div>
          )}
          <h1 tw="text-7xl text-white font-bold tracking-tight">
            {user?.display_name
              ? `Welcome, ${user.display_name ?? user.username}`
              : "DCA Agent"}
          </h1>
          <p tw="text-4xl mt-6 text-white/85">
            • Talk to DCA agent • Create plans • Track executions 
          </p>
        </div>

        {/* Footer */}
        <div tw="absolute bottom-10 right-12 text-3xl text-white/70">
          Manage your crypto investments with ease
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 800,
    }
  );
}